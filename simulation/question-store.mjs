import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { resolvePatientDatabase, queryJson } from './patient-gate.mjs'
import { formatTimestamp24 } from '../src/utils/time24.js'

export const QUESTION_SCHEMA_VERSION = 'psychmap.questions.v1'
export const CLINICIAN = Object.freeze({ id: 'DR-DEMO-001', professionId: 'psychiatry', professionName: 'Psychiatrist', synthetic: true })
export const PROFESSIONS = new Set(['ward_manager', 'psychiatry', 'nursing', 'occupational_therapy', 'psychology', 'social_work'])

const sql = value => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`
const runSql = (databasePath, script) => {
  const result = spawnSync('sqlite3', [databasePath], { input: `PRAGMA foreign_keys=ON;\nPRAGMA busy_timeout=5000;\n${script}`, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || 'SQLite write failed')
}

export const normalizeQuestion = value => String(value || '')
  .normalize('NFKC')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export function migrateQuestionStore({ patientId, folderId, root }) {
  const gated = resolvePatientDatabase(patientId, folderId, root)
  const profile = queryJson(gated.databasePath, 'SELECT patient_id, synthetic FROM patient_profile LIMIT 1')[0]
  if (!profile || profile.patient_id !== patientId || profile.synthetic !== 1) throw new Error('Clinical database identity mismatch')
  runSql(gated.questionsPath, `
BEGIN IMMEDIATE;
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at_utc TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS questions (
  question_uuid TEXT PRIMARY KEY,
  schema_version TEXT NOT NULL CHECK (schema_version = '${QUESTION_SCHEMA_VERSION}'),
  patient_id TEXT NOT NULL CHECK (patient_id = ${sql(patientId)}),
  synthetic_user_id TEXT NOT NULL,
  profession_id TEXT NOT NULL,
  profession_label TEXT NOT NULL,
  asked_at_utc TEXT NOT NULL,
  asked_at_singapore TEXT NOT NULL,
  from_day INTEGER NOT NULL CHECK (from_day >= 1),
  to_day INTEGER NOT NULL CHECK (to_day >= from_day),
  selected_days_json TEXT NOT NULL CHECK (json_valid(selected_days_json)),
  normalized_question TEXT NOT NULL,
  original_question TEXT NOT NULL,
  validated_ui_context_json TEXT NOT NULL CHECK (json_valid(validated_ui_context_json)),
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending','imported','failed')),
  imported_at_utc TEXT
);
CREATE INDEX IF NOT EXISTS questions_import_status_idx ON questions(processing_status, asked_at_utc);
CREATE TABLE IF NOT EXISTS clinician_preferences (
  synthetic_user_id TEXT NOT NULL,
  profession_id TEXT NOT NULL,
  checklist_json TEXT NOT NULL CHECK (json_valid(checklist_json)),
  updated_at_utc TEXT NOT NULL,
  PRIMARY KEY (synthetic_user_id, profession_id)
);
INSERT OR IGNORE INTO schema_migrations VALUES ('${QUESTION_SCHEMA_VERSION}', ${sql(new Date().toISOString())});
COMMIT;`)
  return gated
}

export function validateQuestionInput(input) {
  const question = typeof input.question === 'string' ? input.question.trim() : ''
  if (!question || question.length > 1000) throw new Error('Question must contain 1–1000 characters')
  if (!PROFESSIONS.has(input.professionId)) throw new Error('Unknown profession')
  if (!Array.isArray(input.range) || input.range.length !== 2 || !input.range.every(Number.isInteger)) throw new Error('Invalid day range')
  const [fromDay, toDay] = input.range
  if (fromDay < 1 || toDay < fromDay || toDay > 365) throw new Error('Invalid day range')
  const selectedDays = Array.isArray(input.selectedDays) ? [...new Set(input.selectedDays)] : []
  if (!selectedDays.length || selectedDays.some(day => !Number.isInteger(day) || day < fromDay || day > toDay)) throw new Error('Invalid selected days')
  return { question, fromDay, toDay, selectedDays: selectedDays.sort((a, b) => a - b) }
}

export function logQuestion(input, options = {}) {
  const valid = validateQuestionInput(input)
  const gated = migrateQuestionStore({ patientId: input.patientId, folderId: input.folderId, root: options.root })
  const askedAt = options.askedAt || new Date()
  const questionUuid = options.questionUuid || randomUUID()
  const uiContext = input.uiContext && typeof input.uiContext === 'object' && !Array.isArray(input.uiContext) ? input.uiContext : {}
  runSql(gated.questionsPath, `INSERT INTO questions (
    question_uuid, schema_version, patient_id, synthetic_user_id, profession_id, profession_label,
    asked_at_utc, asked_at_singapore, from_day, to_day, selected_days_json,
    normalized_question, original_question, validated_ui_context_json, processing_status
  ) VALUES (
    ${sql(questionUuid)}, '${QUESTION_SCHEMA_VERSION}', ${sql(input.patientId)}, ${sql(input.clinicianId || CLINICIAN.id)},
    ${sql(input.professionId)}, ${sql(input.professionLabel || input.professionId)}, ${sql(askedAt.toISOString())},
    ${sql(formatTimestamp24(askedAt))}, ${valid.fromDay}, ${valid.toDay}, ${sql(JSON.stringify(valid.selectedDays))},
    ${sql(normalizeQuestion(valid.question))}, ${sql(valid.question)}, ${sql(JSON.stringify(uiContext))}, 'pending'
  );`)
  return { questionUuid, questionsPath: gated.questionsPath, ...valid }
}

export function getPreferences({ patientId, folderId, clinicianId = CLINICIAN.id, professionId, root }) {
  const gated = migrateQuestionStore({ patientId, folderId, root })
  const rows = queryJson(gated.questionsPath, `SELECT checklist_json FROM clinician_preferences WHERE synthetic_user_id=${sql(clinicianId)} AND profession_id=${sql(professionId)}`)
  return rows[0] ? JSON.parse(rows[0].checklist_json) : []
}

export function savePreferences({ patientId, folderId, clinicianId = CLINICIAN.id, professionId, checklist, root }) {
  if (!PROFESSIONS.has(professionId)) throw new Error('Unknown profession')
  if (!Array.isArray(checklist) || checklist.length > 12 || checklist.some(item => typeof item !== 'string' || !item.trim() || item.length > 240)) throw new Error('Invalid report checklist')
  const gated = migrateQuestionStore({ patientId, folderId, root })
  const cleaned = [...new Set(checklist.map(item => item.trim()))]
  runSql(gated.questionsPath, `INSERT INTO clinician_preferences VALUES (${sql(clinicianId)}, ${sql(professionId)}, ${sql(JSON.stringify(cleaned))}, ${sql(new Date().toISOString())})
    ON CONFLICT(synthetic_user_id, profession_id) DO UPDATE SET checklist_json=excluded.checklist_json, updated_at_utc=excluded.updated_at_utc;`)
  return cleaned
}

export { runSql, sql }
