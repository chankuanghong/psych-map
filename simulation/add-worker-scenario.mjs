import { logQuestion, migrateQuestionStore } from './question-store.mjs'
import { queryJson } from './patient-gate.mjs'

const scenario = process.argv[2]
const cases = {
  similar: {
    questionUuid: 'demo-worker-similar-001',
    question: 'What clinical information was documented during the DAV episode?',
    professionId: 'nursing',
    askedAt: '2026-09-04T06:00:00.000Z',
  },
  novel: {
    questionUuid: 'demo-worker-novel-001',
    question: 'Are there missing data gaps in the recorded ward evidence?',
    professionId: 'ward_manager',
    askedAt: '2026-09-04T06:05:00.000Z',
  },
}

if (!cases[scenario]) {
  console.error('Usage: node simulation/add-worker-scenario.mjs <similar|novel>')
  process.exit(1)
}

const selected = cases[scenario]
const patientId = 'PT-003'
const folderId = 'pf_c84e57'
const gated = migrateQuestionStore({ patientId, folderId })
const exists = queryJson(gated.questionsPath, `SELECT 1 AS present FROM questions WHERE question_uuid='${selected.questionUuid}'`)[0]
if (!exists) {
  logQuestion({
    patientId, folderId, question: selected.question, professionId: selected.professionId,
    professionLabel: selected.professionId, range: [1, 14], selectedDays: [1, 2, 3, 4, 5, 6, 7],
    uiContext: { syntheticWorkerScenario: scenario },
  }, { questionUuid: selected.questionUuid, askedAt: new Date(selected.askedAt) })
}
console.log(JSON.stringify({ scenario, inserted: !exists, questionUuid: selected.questionUuid, question: selected.question }))
