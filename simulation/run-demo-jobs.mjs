import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getDirectorAnalytics, importQuestions } from './question-learning.mjs'
import { migrateQuestionStores } from './migrate-questions.mjs'
import { listRegisteredPatients, queryJson, resolvePatientDatabase } from './patient-gate.mjs'
import { seedSyntheticQuestions, SYNTHETIC_QUESTION_SEEDS } from './seed-synthetic-questions.mjs'
import { acquireQuestionJobLock } from './question-job-lock.mjs'

const defaultRoot = dirname(fileURLToPath(import.meta.url))
export const DEMO_JOB_ORDER = Object.freeze([
  'validate synthetic patient sources',
  'migrate patient and organization stores',
  'seed deterministic synthetic questions',
  'run the daily question-learning import and rebuild the catalog',
  'verify patient queues and aggregate dashboard output',
])

function validateSyntheticSources(root) {
  const patients = listRegisteredPatients(root)
  if (!patients.length || patients.some(patient => patient.synthetic !== 1)) throw new Error('Synthetic patient registry validation failed')
  for (const patient of patients) {
    const gated = resolvePatientDatabase(patient.patient_id, patient.folder_id, root)
    const profile = queryJson(gated.databasePath, 'SELECT patient_id, synthetic FROM patient_profile LIMIT 1')[0]
    if (!profile || profile.patient_id !== patient.patient_id || profile.synthetic !== 1) throw new Error(`Synthetic clinical fixture validation failed for ${patient.patient_id}`)
  }
  return { patientStores: patients.length, synthetic: true }
}

function verifyDemoRun(root, importResult) {
  const patients = listRegisteredPatients(root)
  let pendingQuestions = 0
  let failedQuestions = 0
  for (const patient of patients) {
    const gated = resolvePatientDatabase(patient.patient_id, patient.folder_id, root)
    const counts = queryJson(gated.questionsPath, "SELECT processing_status, COUNT(*) AS count FROM questions GROUP BY processing_status")
    pendingQuestions += Number(counts.find(row => row.processing_status === 'pending')?.count || 0)
    failedQuestions += Number(counts.find(row => row.processing_status === 'failed')?.count || 0)
  }
  const analytics = getDirectorAnalytics(root)
  const catalog = readFileSync(importResult.catalogPath, 'utf8')
  const checks = {
    allSyntheticSeedsPresent: analytics.totals.question_count >= SYNTHETIC_QUESTION_SEEDS.length,
    noPendingQuestions: pendingQuestions === 0,
    noFailedQuestions: failedQuestions === 0,
    importCompleted: analytics.lastImport?.status === 'completed' && analytics.lastImport.failure_count === 0,
    catalogRendered: catalog.startsWith('# Psych-MAP de-identified question catalog'),
  }
  if (Object.values(checks).some(value => !value)) throw new Error(`Demo verification failed: ${JSON.stringify(checks)}`)
  return {
    status: 'passed', checks, pendingQuestions, failedQuestions,
    questionsLearned: analytics.totals.question_count,
    catalogIntents: analytics.totals.catalog_size,
  }
}

export function runDemoJobs({ root = defaultRoot, now = new Date(), report = () => {} } = {}) {
  const releaseLock = acquireQuestionJobLock(root)
  const results = []
  const runStep = (name, action) => {
    const number = results.length + 1
    report({ type: 'step_started', number, total: DEMO_JOB_ORDER.length, name })
    const result = action()
    results.push({ number, name, status: 'completed', result })
    report({ type: 'step_completed', number, total: DEMO_JOB_ORDER.length, name, result })
    return result
  }
  try {
    runStep(DEMO_JOB_ORDER[0], () => validateSyntheticSources(root))
    runStep(DEMO_JOB_ORDER[1], () => migrateQuestionStores({ root }))
    runStep(DEMO_JOB_ORDER[2], () => seedSyntheticQuestions({ root }))
    const imported = runStep(DEMO_JOB_ORDER[3], () => importQuestions({ root, now }))
    const verification = runStep(DEMO_JOB_ORDER[4], () => verifyDemoRun(root, imported))
    return { status: 'completed', synthetic: true, jobOrder: DEMO_JOB_ORDER, results, verification }
  } finally {
    releaseLock()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = runDemoJobs({ report: event => console.log(`[${event.number}/${event.total}] ${event.name}: ${event.type === 'step_started' ? 'running' : 'completed'}${event.result ? ` ${JSON.stringify(event.result)}` : ''}`) })
    console.log(JSON.stringify({ status: result.status, synthetic: result.synthetic, verification: result.verification }, null, 2))
  } catch (error) {
    console.error(JSON.stringify({ status: 'failed', error: error.message }))
    process.exitCode = 1
  }
}
