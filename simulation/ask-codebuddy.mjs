import { buildEvidenceSnapshot, buildVerifiedResponse } from '../src/data/verifiedEvidence.js'
import { computeDailyMetrics } from '../src/data/metricsEngine.js'
import { askCodeBuddy, validateUiActions } from '../server/codebuddySelector.js'
import { resolvePatientDatabase } from './patient-gate.mjs'

const patientId = process.argv[2] || 'PT-003'
const folderId = process.argv[3] || 'pf_c84e57'
const question = process.argv.slice(4).join(' ') || 'I am having a family session soon to share the patient’s progress. Based on Days 7 to 11, how has the patient been?'

try {
  resolvePatientDatabase(patientId, folderId)
  const snapshot = buildEvidenceSnapshot(patientId, [7, 11], [7, 8, 9, 10, 11])
  const availableDays = computeDailyMetrics(patientId).map(row => row.day)
  const manifest = await askCodeBuddy({ question, snapshot, professionId: 'psychiatry', availableDays, timeoutMs: 120_000 })
  const actions = validateUiActions(manifest.actions, { availableDays })
  const response = buildVerifiedResponse(question, snapshot, manifest, 'psychiatry')
  console.log(JSON.stringify({ manifest, actions, verification: response.verification, answer: response.answer }, null, 2))
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
