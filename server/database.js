import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { PATIENTS } from '../src/data/patients.js'
import { WARD_PARTICIPATION_SUMMARIES } from '../src/data/wardCensus.js'
import { getEventsForPatient } from '../src/data/syntheticEvents.js'
import { SYNTHETIC_VITALS } from '../src/data/syntheticVitals.js'
import { SYNTHETIC_MOCA_OBSERVATIONS } from '../src/data/syntheticEpicData.js'
import { SYNTHETIC_CLINICAL_DOCUMENTS, SYNTHETIC_VISITOR_FORMS } from '../src/data/syntheticDocumentation.js'
import { computeDailyMetrics } from '../src/data/metricsEngine.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const DEFAULT_DB_PATH = path.join(ROOT, 'data', 'psych-map.sqlite')

const schema = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS app_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    ward TEXT NOT NULL,
    admission_date TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    assigned_cubicle TEXT NOT NULL,
    age INTEGER NOT NULL,
    sex TEXT NOT NULL,
    length_of_stay INTEGER NOT NULL,
    broad_context TEXT NOT NULL,
    persona_focus TEXT NOT NULL,
    synthetic INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS ward_census (
    patient_id TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );
  CREATE TABLE IF NOT EXISTS ward_register (
    patient_id TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS daily_metrics (
    patient_id TEXT NOT NULL,
    day INTEGER NOT NULL,
    date TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    PRIMARY KEY(patient_id, day),
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );
  CREATE TABLE IF NOT EXISTS location_events (
    id INTEGER PRIMARY KEY,
    patient_id TEXT NOT NULL,
    zone_id TEXT NOT NULL,
    entered_at TEXT NOT NULL,
    exited_at TEXT,
    duration_minutes REAL NOT NULL,
    source TEXT NOT NULL DEFAULT 'Synthetic spatial data',
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );
  CREATE TABLE IF NOT EXISTS activity_events (
    id INTEGER PRIMARY KEY,
    patient_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    location TEXT,
    structured INTEGER NOT NULL,
    attended INTEGER NOT NULL,
    payload_json TEXT NOT NULL,
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );
  CREATE TABLE IF NOT EXISTS interaction_events (
    id INTEGER PRIMARY KEY,
    patient_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    interaction_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );
  CREATE TABLE IF NOT EXISTS clinical_events (
    id INTEGER PRIMARY KEY,
    patient_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    day INTEGER NOT NULL,
    discipline TEXT NOT NULL,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    details_json TEXT,
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );
  CREATE TABLE IF NOT EXISTS vitals (
    id INTEGER PRIMARY KEY,
    patient_id TEXT NOT NULL,
    day INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    heart_rate INTEGER NOT NULL,
    systolic_bp INTEGER NOT NULL,
    diastolic_bp INTEGER NOT NULL,
    source TEXT NOT NULL,
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );
  CREATE TABLE IF NOT EXISTS assessments (
    id INTEGER PRIMARY KEY,
    patient_id TEXT NOT NULL,
    day INTEGER NOT NULL,
    assessment_type TEXT NOT NULL,
    score INTEGER NOT NULL,
    maximum INTEGER NOT NULL,
    version TEXT NOT NULL,
    source TEXT NOT NULL,
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );
  CREATE TABLE IF NOT EXISTS clinical_documents (
    document_id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    day INTEGER NOT NULL,
    seen_at TEXT NOT NULL,
    signed_at TEXT NOT NULL,
    discipline TEXT NOT NULL,
    author_role TEXT NOT NULL,
    note_type TEXT NOT NULL,
    note_format TEXT NOT NULL,
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    synthetic INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );
  CREATE TABLE IF NOT EXISTS clinical_document_sections (
    id INTEGER PRIMARY KEY,
    document_id TEXT NOT NULL,
    section_order INTEGER NOT NULL,
    label TEXT NOT NULL,
    text TEXT NOT NULL,
    UNIQUE(document_id, section_order),
    FOREIGN KEY(document_id) REFERENCES clinical_documents(document_id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS visitor_forms (
    form_id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    day INTEGER NOT NULL,
    payload_json TEXT NOT NULL,
    FOREIGN KEY(patient_id) REFERENCES patients(id)
  );

  -- These are deliberately schema-compatible with the sibling RFID scanner app.
  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag TEXT NOT NULL,
    source TEXT NOT NULL,
    scanned_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS presence_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag TEXT NOT NULL,
    name TEXT NOT NULL,
    room TEXT NOT NULL,
    entered_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    left_at TEXT,
    read_count INTEGER NOT NULL DEFAULT 1,
    scanner_id TEXT NOT NULL DEFAULT 'yrm100-usb-01',
    venue_id TEXT NOT NULL DEFAULT 'corridor',
    venue_label TEXT NOT NULL DEFAULT 'Corridor',
    subject_id TEXT,
    exit_inferred INTEGER NOT NULL DEFAULT 0,
    closed_reason TEXT
  );
  CREATE TABLE IF NOT EXISTS scanner_state (
    scanner_id TEXT PRIMARY KEY,
    venue_id TEXT NOT NULL,
    venue_label TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_daily_metrics_patient_day ON daily_metrics(patient_id, day);
  CREATE INDEX IF NOT EXISTS idx_documents_patient_day ON clinical_documents(patient_id, day);
  CREATE INDEX IF NOT EXISTS idx_sections_document ON clinical_document_sections(document_id, section_order);
  CREATE INDEX IF NOT EXISTS idx_presence_subject_time ON presence_sessions(subject_id, entered_at);
`

const json = value => JSON.stringify(value ?? null)
const getDay = (timestamp, patientId) => {
  const patient = PATIENTS.find(item => item.id === patientId)
  const start = new Date(`${patient?.admissionDate || '2026-07-30'}T00:00:00+08:00`)
  return Math.max(1, Math.floor((new Date(timestamp).getTime() - start.getTime()) / 86400000) + 1)
}

export function seedSynthetic(db) {
  const allEvents = PATIENTS.map(patient => getEventsForPatient(patient.id))
  const locationEvents = allEvents.flatMap(events => events.locationEvents)
  const activityEvents = allEvents.flatMap(events => events.activityEvents)
  const interactionEvents = allEvents.flatMap(events => events.interactionEvents)
  const clinicalEvents = allEvents.flatMap(events => events.clinicalEvents)
  const deleteOrder = ['clinical_document_sections', 'visitor_forms', 'clinical_documents', 'assessments', 'vitals', 'clinical_events', 'interaction_events', 'activity_events', 'location_events', 'daily_metrics', 'ward_census', 'ward_register', 'patients']
  db.exec('BEGIN IMMEDIATE')
  try {
    for (const table of deleteOrder) db.exec(`DELETE FROM ${table}`)

    const patientInsert = db.prepare(`INSERT INTO patients VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    for (const patient of PATIENTS) patientInsert.run(
      patient.id, patient.displayName, patient.ward, patient.admissionDate, patient.primaryDiagnosis,
      patient.assignedCubicle, patient.age, patient.sex, patient.lengthOfStay, patient.broadContext,
      patient.personaFocus, 1,
    )

    const wardInsert = db.prepare('INSERT INTO ward_census (patient_id, payload_json) VALUES (?, ?)')
    for (const row of WARD_PARTICIPATION_SUMMARIES.filter(row => PATIENTS.some(patient => patient.id === row.id))) wardInsert.run(row.id, json(row))
    const wardRegisterInsert = db.prepare('INSERT INTO ward_register (patient_id, payload_json) VALUES (?, ?)')
    for (const row of WARD_PARTICIPATION_SUMMARIES) wardRegisterInsert.run(row.id, json(row))

    const metricInsert = db.prepare('INSERT INTO daily_metrics VALUES (?, ?, ?, ?)')
    for (const patient of PATIENTS) for (const row of computeDailyMetrics(patient.id)) metricInsert.run(patient.id, row.day, row.date, json(row))

    const locationInsert = db.prepare('INSERT INTO location_events (id, patient_id, zone_id, entered_at, exited_at, duration_minutes) VALUES (?, ?, ?, ?, ?, ?)')
    locationEvents.forEach((row, index) => locationInsert.run(index + 1, row.patientId, row.zoneId, row.enteredAt, row.exitedAt || null, row.durationMinutes))

    const activityInsert = db.prepare('INSERT INTO activity_events VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    activityEvents.forEach((row, index) => activityInsert.run(index + 1, row.patientId, row.timestamp, row.activityType, row.location || null, Number(Boolean(row.structured)), Number(Boolean(row.attended)), json(row)))

    const interactionInsert = db.prepare('INSERT INTO interaction_events VALUES (?, ?, ?, ?, ?)')
    interactionEvents.forEach((row, index) => interactionInsert.run(index + 1, row.patientId, row.timestamp, row.type, json(row)))

    const clinicalInsert = db.prepare('INSERT INTO clinical_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    clinicalEvents.forEach((row, index) => clinicalInsert.run(index + 1, row.patientId, row.timestamp, getDay(row.timestamp, row.patientId), row.discipline, row.eventType, row.title, row.description, json(row.details)))

    const vitalInsert = db.prepare('INSERT INTO vitals VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    SYNTHETIC_VITALS.forEach((row, index) => vitalInsert.run(index + 1, row.patientId, row.day, row.timestamp, row.heartRate, row.systolicBP, row.diastolicBP, row.source))

    const assessmentInsert = db.prepare('INSERT INTO assessments VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    SYNTHETIC_MOCA_OBSERVATIONS.forEach((row, index) => assessmentInsert.run(index + 1, row.patientId, row.day, 'MoCA', row.score, row.maximum, row.version, row.source))

    const documentInsert = db.prepare('INSERT INTO clinical_documents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    const sectionInsert = db.prepare('INSERT INTO clinical_document_sections (document_id, section_order, label, text) VALUES (?, ?, ?, ?)')
    for (const document of SYNTHETIC_CLINICAL_DOCUMENTS) {
      documentInsert.run(document.documentId, document.patientId, document.day, document.seenAt, document.signedAt, document.discipline, document.authorRole, document.noteType, document.noteFormat, document.title, document.source, 1)
      const sections = document.sections || [
        ['Subjective', document.subjective], ['Objective', document.objective],
        ['Assessment', document.assessment], ['Plan', document.plan],
      ].filter(([, text]) => text).map(([label, text]) => ({ label, text }))
      sections.forEach((section, index) => sectionInsert.run(document.documentId, index, section.label, section.text))
    }

    const visitorInsert = db.prepare('INSERT INTO visitor_forms VALUES (?, ?, ?, ?)')
    for (const form of SYNTHETIC_VISITOR_FORMS) visitorInsert.run(form.formId, form.patientId, form.day, json(form))

    db.prepare(`INSERT INTO app_metadata (key, value) VALUES ('synthetic_seed', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(new Date().toISOString())
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function openPsychMapDatabase(env = process.env) {
  const configuredPath = env.PSYCHMAP_DB || DEFAULT_DB_PATH
  const dbPath = configuredPath === ':memory:' ? configuredPath : path.resolve(configuredPath)
  if (dbPath !== ':memory:') mkdirSync(path.dirname(dbPath), { recursive: true })
  const db = new DatabaseSync(dbPath)
  db.exec(schema)
  if (!Number(db.prepare('SELECT COUNT(*) AS count FROM patients').get().count)) seedSynthetic(db)
  return { db, dbPath }
}

export function databaseCounts(db) {
  const tables = ['patients', 'ward_register', 'daily_metrics', 'location_events', 'interaction_events', 'activity_events', 'clinical_events', 'vitals', 'assessments', 'clinical_documents', 'clinical_document_sections', 'visitor_forms', 'scans', 'presence_sessions']
  return Object.fromEntries(tables.map(table => [table, Number(db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count)]))
}

const parseJson = value => value ? JSON.parse(value) : null

export function readApplicationData(db) {
  const patients = db.prepare(`SELECT id, display_name, ward, admission_date, diagnosis, assigned_cubicle, age, sex, length_of_stay, broad_context, persona_focus, synthetic FROM patients ORDER BY id`).all()
    .map((row, index) => ({
      id: row.id, folderId: PATIENTS.find(patient => patient.id === row.id)?.folderId, displayName: row.display_name, ward: row.ward, admissionDate: row.admission_date,
      primaryDiagnosis: row.diagnosis, assignedCubicle: row.assigned_cubicle, age: row.age,
      sex: row.sex, lengthOfStay: row.length_of_stay, broadContext: row.broad_context,
      personaFocus: row.persona_focus, isPrimaryDemo: index === 0, synthetic: Boolean(row.synthetic),
    }))
  const wardRegister = db.prepare('SELECT payload_json FROM ward_register ORDER BY patient_id').all().map(row => parseJson(row.payload_json))
  const dailyMetrics = db.prepare('SELECT patient_id, payload_json FROM daily_metrics ORDER BY patient_id, day').all()
    .map(row => ({ ...parseJson(row.payload_json), patientId: row.patient_id }))
  const locationEvents = db.prepare('SELECT patient_id, zone_id, entered_at, exited_at, duration_minutes, source FROM location_events ORDER BY patient_id, entered_at').all()
    .map(row => ({ patientId: row.patient_id, zoneId: row.zone_id, enteredAt: row.entered_at, exitedAt: row.exited_at, durationMinutes: row.duration_minutes, source: row.source }))
  const interactionEvents = db.prepare('SELECT payload_json FROM interaction_events ORDER BY patient_id, timestamp').all().map(row => parseJson(row.payload_json))
  const activityEvents = db.prepare('SELECT payload_json FROM activity_events ORDER BY patient_id, timestamp').all().map(row => parseJson(row.payload_json))
  const clinicalEvents = db.prepare('SELECT patient_id, timestamp, discipline, event_type, title, description, details_json FROM clinical_events ORDER BY patient_id, timestamp').all()
    .map(row => ({ patientId: row.patient_id, timestamp: row.timestamp, discipline: row.discipline, eventType: row.event_type, title: row.title, description: row.description, details: parseJson(row.details_json) }))
  const vitals = db.prepare('SELECT patient_id, day, timestamp, heart_rate, systolic_bp, diastolic_bp, source FROM vitals ORDER BY patient_id, day, timestamp').all()
    .map(row => ({ patientId: row.patient_id, day: row.day, timestamp: row.timestamp, heartRate: row.heart_rate, systolicBP: row.systolic_bp, diastolicBP: row.diastolic_bp, source: row.source }))
  const assessments = db.prepare('SELECT patient_id, day, assessment_type, score, maximum, version, source FROM assessments ORDER BY patient_id, day').all()
    .map(row => ({ patientId: row.patient_id, day: row.day, assessmentType: row.assessment_type, score: row.score, maximum: row.maximum, version: row.version, source: row.source }))
  const sectionsByDocument = new Map()
  for (const row of db.prepare('SELECT document_id, section_order, label, text FROM clinical_document_sections ORDER BY document_id, section_order').all()) {
    if (!sectionsByDocument.has(row.document_id)) sectionsByDocument.set(row.document_id, [])
    sectionsByDocument.get(row.document_id).push({ label: row.label, text: row.text })
  }
  const clinicalDocuments = db.prepare('SELECT * FROM clinical_documents ORDER BY patient_id, day, seen_at').all().map(row => ({
    documentId: row.document_id, patientId: row.patient_id, day: row.day, seenAt: row.seen_at,
    signedAt: row.signed_at, discipline: row.discipline, authorRole: row.author_role,
    noteType: row.note_type, noteFormat: row.note_format, title: row.title, source: row.source,
    synthetic: Boolean(row.synthetic), sections: sectionsByDocument.get(row.document_id) || [],
  }))
  const visitorForms = db.prepare('SELECT payload_json FROM visitor_forms ORDER BY patient_id, day').all().map(row => parseJson(row.payload_json))
  return { schema: 'psychmap.bootstrap.v1', patients, wardRegister, dailyMetrics, locationEvents, interactionEvents, activityEvents, clinicalEvents, vitals, assessments, clinicalDocuments, visitorForms }
}

export function readLiveRfidData(db, { recentLimit = 20 } = {}) {
  const scanner = db.prepare(`
    SELECT scanner_id, venue_id, venue_label, updated_at
    FROM scanner_state
    ORDER BY updated_at DESC
    LIMIT 1
  `).get() || null
  const rows = db.prepare(`
    SELECT id, tag, name, room, entered_at, last_seen_at, left_at, read_count,
           scanner_id, venue_id, venue_label, subject_id, exit_inferred, closed_reason
    FROM presence_sessions
    WHERE subject_id IS NOT NULL
    ORDER BY COALESCE(left_at, last_seen_at) DESC, id DESC
    LIMIT ?
  `).all(Math.max(1, Math.min(100, Number(recentLimit) || 20)))
  const sessions = rows.map(row => ({
    id: Number(row.id), tag: row.tag, name: row.name, room: row.room,
    enteredAt: row.entered_at, lastSeenAt: row.last_seen_at, leftAt: row.left_at,
    readCount: Number(row.read_count), scannerId: row.scanner_id, venueId: row.venue_id,
    venueLabel: row.venue_label, patientId: row.subject_id,
    active: row.left_at === null, exitInferred: Boolean(row.exit_inferred), closedReason: row.closed_reason,
  }))
  return {
    schema: 'psychmap.rfid.live.v1',
    scanner: scanner ? {
      scannerId: scanner.scanner_id, venueId: scanner.venue_id,
      venueLabel: scanner.venue_label, updatedAt: scanner.updated_at,
    } : null,
    activeSessions: sessions.filter(session => session.active),
    recentSessions: sessions,
    generatedAt: new Date().toISOString(),
  }
}

export function importRfidDatabase(db, sourcePath) {
  if (!sourcePath || path.resolve(sourcePath) === path.resolve(DEFAULT_DB_PATH)) return { scans: 0, sessions: 0, scannerState: 0 }
  db.exec('ATTACH DATABASE ' + JSON.stringify(path.resolve(sourcePath)) + ' AS source_rfid')
  try {
    const hasTable = name => Boolean(db.prepare("SELECT 1 FROM source_rfid.sqlite_master WHERE type='table' AND name=?").get(name))
    let scans = 0
    let sessions = 0
    let scannerState = 0
    if (hasTable('scans')) {
      const before = db.prepare('SELECT COUNT(*) AS count FROM scans').get().count
      db.exec(`INSERT OR IGNORE INTO scans (id, tag, source, scanned_at) SELECT id, tag, source, scanned_at FROM source_rfid.scans`)
      scans = Number(db.prepare('SELECT COUNT(*) AS count FROM scans').get().count - before)
    }
    if (hasTable('presence_sessions')) {
      const before = db.prepare('SELECT COUNT(*) AS count FROM presence_sessions').get().count
      db.exec(`INSERT OR IGNORE INTO presence_sessions (id, tag, name, room, entered_at, last_seen_at, left_at, read_count, scanner_id, venue_id, venue_label, subject_id, exit_inferred, closed_reason)
        SELECT id, tag, name, room, entered_at, last_seen_at, left_at, read_count, scanner_id, venue_id, venue_label, subject_id, exit_inferred, closed_reason FROM source_rfid.presence_sessions`)
      sessions = Number(db.prepare('SELECT COUNT(*) AS count FROM presence_sessions').get().count - before)
    }
    if (hasTable('scanner_state')) {
      const before = db.prepare('SELECT COUNT(*) AS count FROM scanner_state').get().count
      db.exec(`INSERT OR REPLACE INTO scanner_state SELECT scanner_id, venue_id, venue_label, updated_at FROM source_rfid.scanner_state`)
      scannerState = Number(db.prepare('SELECT COUNT(*) AS count FROM scanner_state').get().count - before)
    }
    return { scans, sessions, scannerState }
  } finally {
    db.exec('DETACH DATABASE source_rfid')
  }
}
