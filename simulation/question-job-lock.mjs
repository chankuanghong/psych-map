import { closeSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { importQuestions } from './question-learning.mjs'

const defaultRoot = dirname(fileURLToPath(import.meta.url))

export function acquireQuestionJobLock(root = defaultRoot) {
  const lockPath = join(root, '.question-learning-job.lock')
  let descriptor
  try {
    descriptor = openSync(lockPath, 'wx')
    writeFileSync(descriptor, JSON.stringify({ pid: process.pid, startedAtUtc: new Date().toISOString() }))
  } catch (error) {
    if (error.code === 'EEXIST') {
      let owner = 'unknown owner'
      try { owner = readFileSync(lockPath, 'utf8') } catch {}
      const locked = new Error(`Question-learning jobs are already running (lock: ${lockPath}; owner: ${owner})`)
      locked.code = 'QUESTION_JOB_LOCKED'
      throw locked
    }
    throw error
  }
  return () => {
    closeSync(descriptor)
    unlinkSync(lockPath)
  }
}

export function runLockedQuestionImport(options = {}) {
  const releaseLock = acquireQuestionJobLock(options.root)
  try { return importQuestions(options) } finally { releaseLock() }
}
