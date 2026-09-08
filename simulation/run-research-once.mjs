import { openPsychMapDatabase } from '../server/database.js'
import { runWeeklyResearch } from './review-engine.mjs'

const { db } = openPsychMapDatabase(process.env)
try {
  process.stdout.write(`${JSON.stringify(runWeeklyResearch(db), null, 2)}\n`)
} finally {
  db.close()
}
