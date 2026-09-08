import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const simulationRoot = dirname(fileURLToPath(import.meta.url))
const patientsRoot = join(simulationRoot, 'patients')

const patients = [
  {
    id: 'PT-001',
    folderId: 'pf_7f3a1c',
    displayName: 'Patient A',
    diagnosis: 'Schizophrenia',
    assignedCubicle: 'cubicle_1',
    active: false,
    metrics: Array.from({ length: 14 }, (_, index) => {
      const day = index + 1
      return {
        day,
        assignedOvernight: 400,
        otherCubicle: day < 7 ? 0 : Math.max(8, 22 - day),
        visitor: day < 7 ? 12 : 18 + day,
        activity: day < 6 ? 0 : 35 + Math.min(55, (day - 6) * 8),
        shower: 20,
        transitions: day < 6 ? 4 : 6 + day,
      }
    }),
    events: [
      [1, 'Psychiatry', 'psychiatrist_review', 'Admission psychiatric assessment', 'Withdrawal and reduced motivation were documented at admission.'],
      [5, 'Medication', 'medication_change', 'Risperidone increased — 4 mg daily', 'Synthetic titration occurred alongside later OT activation; the data do not establish causality.'],
      [6, 'OT', 'ot_intervention', 'Graded activity plan started', 'Individual OT and graded ward activity were introduced.'],
      [12, 'Psychiatry', 'psychiatrist_review', 'Participation review', 'Structured activity participation had increased; peer engagement remained a review question.'],
    ],
  },
  {
    id: 'PT-002',
    folderId: 'pf_91bd42',
    displayName: 'Patient B',
    diagnosis: 'Obsessive-compulsive disorder',
    assignedCubicle: 'cubicle_3',
    active: false,
    metrics: Array.from({ length: 14 }, (_, index) => {
      const day = index + 1
      return {
        day,
        assignedOvernight: 380,
        otherCubicle: 0,
        visitor: 20,
        activity: 15 + Math.floor(day / 3) * 5,
        shower: 78 + (day - 1) * 2,
        transitions: 7,
      }
    }),
    events: [
      [1, 'Psychiatry', 'psychiatrist_review', 'Admission assessment — OCD presentation', 'Contamination-related concerns and extended washing rituals affecting ward routine were documented.'],
      [1, 'Medication', 'medication_change', 'Sertraline initiated — 50 mg mane', 'Synthetic sertraline was initiated; this does not establish a treatment effect.'],
      [3, 'Nursing', 'nursing_intervention', 'Prolonged shower-area presence documented', 'Morning shower-area presence delayed breakfast attendance.'],
      [14, 'MDT', 'mdt_review', 'Morning routine review', 'The team planned continued functional and patient-perspective review.'],
    ],
  },
  {
    id: 'PT-003',
    folderId: 'pf_c84e57',
    displayName: 'Patient C',
    diagnosis: 'Hypomania',
    assignedCubicle: 'cubicle_4',
    active: true,
    metrics: [
      [1, 300, 10, 34], [2, 270, 20, 38], [3, 240, 35, 42],
      [4, 210, 60, 46], [5, 180, 100, 50], [6, 150, 150, 54],
      [7, 140, 210, 58], [8, 200, 180, 54], [9, 260, 140, 50],
      [10, 310, 100, 46], [11, 350, 70, 42], [12, 380, 50, 38],
      [13, 400, 35, 34], [14, 410, 25, 30],
    ].map(([day, assignedOvernight, otherCubicle, visitor]) => ({
      day,
      assignedOvernight,
      otherCubicle,
      visitor,
      activity: day >= 8 ? 20 : 0,
      shower: 15,
      transitions: day <= 7 ? 10 + day * 2 : Math.max(8, 24 - day),
    })),
    events: [
      [1, 'Psychiatry', 'psychiatrist_review', 'Admission assessment — elevated activation', 'Elevated mood, increased goal-directed activity and reduced rest were documented.'],
      [4, 'Medication', 'medication_change', 'Quetiapine initiated — 100 mg/day', 'Synthetic quetiapine was initiated while roaming and reduced overnight assigned-cubicle presence were escalating.'],
      [5, 'Medication', 'medication_change', 'Quetiapine increased — 200 mg/day', 'Behavioural signals remained elevated; location does not establish mental state, sleep or tolerability.'],
      [6, 'Nursing', 'dav_episode', 'Nurse-documented DAV episode', 'Raised voice, verbal threats toward a peer and striking a cubicle door twice were documented after staff set a boundary. Staff used verbal de-escalation and a lower-stimulation area, which the patient accepted. No physical contact or injury was documented.'],
      [6, 'Medication', 'medication_change', 'Quetiapine increased — 300 mg/day', 'Synthetic titration occurred while neighbouring-cubicle presence continued toward its Day 7 peak.'],
      [7, 'Medication', 'medication_change', 'Quetiapine increased — 400 mg/day', 'Neighbouring-cubicle presence later reduced while overnight assigned-cubicle presence increased; sequence does not prove medication effect.'],
      [8, 'Nursing', 'nursing_review', 'Post-DAV nursing review', 'The patient reviewed the documented episode with nursing staff. No further DAV episode was documented during the following two days.'],
      [9, 'Nursing', 'nursing_intervention', 'Social roaming beginning to settle', 'Visits to other cubicles and repeated movement through shared spaces began reducing.'],
      [12, 'Psychiatry', 'psychiatrist_review', 'Post-titration review', 'Behavioural activation was closer to the early-admission range; temporal association was noted without inferring causality.'],
    ],
  },
]

const quote = value => `'${String(value).replaceAll("'", "''")}'`

const runSql = (databasePath, sql) => {
  rmSync(databasePath, { force: true })
  const result = spawnSync('sqlite3', [databasePath], { input: sql, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || `sqlite3 failed for ${databasePath}`)
}

mkdirSync(patientsRoot, { recursive: true })

const registrySql = `
PRAGMA foreign_keys = ON;
CREATE TABLE patients (
  patient_id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  is_active_demo INTEGER NOT NULL CHECK (is_active_demo IN (0, 1)),
  synthetic INTEGER NOT NULL DEFAULT 1 CHECK (synthetic = 1)
);
${patients.map(patient => `INSERT INTO patients VALUES (${quote(patient.id)}, ${quote(patient.folderId)}, ${quote(patient.displayName)}, ${patient.active ? 1 : 0}, 1);`).join('\n')}
`
runSql(join(simulationRoot, 'registry.sqlite'), registrySql)

for (const patient of patients) {
  const patientDir = join(patientsRoot, patient.folderId)
  mkdirSync(patientDir, { recursive: true })
  const databasePath = join(patientDir, 'clinical.sqlite')
  const metrics = patient.metrics.map(row => `INSERT INTO daily_metrics VALUES (
    ${quote(patient.id)}, ${row.day}, ${row.assignedOvernight}, ${row.otherCubicle},
    ${row.visitor}, ${row.activity}, ${row.shower}, ${row.transitions}
  );`).join('\n')
  const events = patient.events.map(([day, discipline, type, title, description], index) => `INSERT INTO clinical_events VALUES (
    ${index + 1}, ${quote(patient.id)}, ${day}, ${quote(discipline)}, ${quote(type)}, ${quote(title)}, ${quote(description)}
  );`).join('\n')

  runSql(databasePath, `
PRAGMA foreign_keys = ON;
CREATE TABLE patient_profile (
  patient_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  diagnosis_context TEXT NOT NULL,
  assigned_cubicle TEXT NOT NULL,
  synthetic INTEGER NOT NULL DEFAULT 1 CHECK (synthetic = 1)
);
CREATE TABLE daily_metrics (
  patient_id TEXT NOT NULL,
  day INTEGER NOT NULL,
  assigned_cubicle_overnight_minutes INTEGER NOT NULL,
  other_cubicle_minutes INTEGER NOT NULL,
  visitor_minutes INTEGER NOT NULL,
  structured_activity_minutes INTEGER NOT NULL,
  shower_area_minutes INTEGER NOT NULL,
  zone_transitions INTEGER NOT NULL,
  PRIMARY KEY (patient_id, day)
);
CREATE TABLE clinical_events (
  event_id INTEGER PRIMARY KEY,
  patient_id TEXT NOT NULL,
  day INTEGER NOT NULL,
  discipline TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL
);
INSERT INTO patient_profile VALUES (
  ${quote(patient.id)}, ${quote(patient.displayName)}, ${quote(patient.diagnosis)},
  ${quote(patient.assignedCubicle)}, 1
);
${metrics}
${events}
`)
}

console.log(`Created registry and ${patients.length} synthetic patient databases in ${simulationRoot}`)
