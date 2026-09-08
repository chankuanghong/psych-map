export const RESEARCH_CRON_EXPRESSION = '03:00 every Monday Asia/Singapore'
export const isResearchCronEnabled = (env = process.env) => String(env.RESEARCH_CRON_ENABLED || 'false').toLowerCase() === 'true'

export function startResearchScheduler({ env = process.env, run, intervalMs = 60_000, now = () => new Date() } = {}) {
  if (!isResearchCronEnabled(env) || typeof run !== 'function') return { enabled: false, stop() {} }
  let running = false
  let lastRunDate = null
  const tick = async () => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now()).filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
    const localDate = `${parts.year}-${parts.month}-${parts.day}`
    if (parts.weekday !== 'Mon' || parts.hour !== '03' || parts.minute !== '00' || running || lastRunDate === localDate) return false
    running = true
    try { await run(now()); lastRunDate = localDate } finally { running = false }
    return true
  }
  const timer = setInterval(() => { tick().catch(error => console.error('Research scheduler:', error.message)) }, intervalMs)
  timer.unref?.()
  return { enabled: true, tick, stop: () => clearInterval(timer), get running() { return running } }
}
