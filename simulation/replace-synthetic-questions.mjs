import { importQuestions, migrateLearningStore } from './question-learning.mjs'
import { listRegisteredPatients, queryJson } from './patient-gate.mjs'
import { migrateQuestionStore, runSql } from './question-store.mjs'
import { seedSyntheticQuestions } from './seed-synthetic-questions.mjs'

if (!process.argv.includes('--confirm-replace-synthetic')) {
  throw new Error('Refusing to clear question data without --confirm-replace-synthetic')
}

let clearedPatientQuestions = 0
for (const patient of listRegisteredPatients()) {
  const gated = migrateQuestionStore({ patientId: patient.patient_id, folderId: patient.folder_id })
  clearedPatientQuestions += Number(queryJson(gated.questionsPath, 'SELECT COUNT(*) AS count FROM questions')[0]?.count || 0)
  runSql(gated.questionsPath, 'BEGIN IMMEDIATE; DELETE FROM questions; DELETE FROM clinician_preferences; COMMIT;')
}

const learning = migrateLearningStore()
runSql(learning.databasePath, `BEGIN IMMEDIATE;
  DELETE FROM import_failures;
  DELETE FROM import_runs;
  DELETE FROM imported_questions;
  DELETE FROM intent_professions;
  DELETE FROM intents;
  COMMIT;`)

const seed = seedSyntheticQuestions()
const imported = importQuestions()
console.log(JSON.stringify({ status: 'replaced', clearedPatientQuestions, seed, imported }, null, 2))
