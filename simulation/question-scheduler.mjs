import { runLockedQuestionImport } from './question-job-lock.mjs'

export const QUESTION_CRON_EXPRESSION = '02:00 daily Asia/Singapore'
export const isQuestionCronEnabled = (env = process.env) => String(env.QUESTION_CRON_ENABLED || 'false').toLowerCase() === 'true'

export function startQuestionScheduler({ env = process.env, run = runLockedQuestionImport, intervalMs = 60_000, now = () => new Date() } = {}) {
  if (!isQuestionCronEnabled(env)) return { enabled: false, stop() {} }
  let running = false
  let lastRunDate = null
  const tick = async () => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now()).filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
    const localDate = `${parts.year}-${parts.month}-${parts.day}`
    if (parts.hour !== '02' || parts.minute !== '00' || running || lastRunDate === localDate) return false
    running = true
    try { await run(); lastRunDate = localDate }
    catch (error) { if (error.code === 'QUESTION_JOB_LOCKED') return false; throw error }
    finally { running = false }
    return true
  }
  const timer = setInterval(() => { tick().catch(error => console.error('Question scheduler:', error.message)) }, intervalMs)
  timer.unref?.()
  return { enabled: true, tick, stop: () => clearInterval(timer), get running() { return running } }
}
