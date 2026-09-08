import { runLockedQuestionImport } from './question-job-lock.mjs'

try {
  console.log(JSON.stringify(runLockedQuestionImport(), null, 2))
} catch (error) {
  console.error(JSON.stringify({ status: 'failed', error: error.message }))
  process.exit(1)
}
