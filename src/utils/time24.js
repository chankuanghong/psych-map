export const DEFAULT_TIME_ZONE = 'Asia/Singapore'

const partsFor = (value, timeZone = DEFAULT_TIME_ZONE) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))
  return Object.fromEntries(parts.map(part => [part.type, part.value]))
}

// Deliberately minute-precision: seconds are dropped rather than rounded forward.
export const formatTimestamp24 = (value, timeZone = DEFAULT_TIME_ZONE) => {
  if (!value) return null
  const part = partsFor(value, timeZone)
  return `${part.year}-${part.month}-${part.day} ${part.hour}:${part.minute}`
}

export const formatTime24 = (value, timeZone = DEFAULT_TIME_ZONE) => {
  if (!value) return null
  const part = partsFor(value, timeZone)
  return `${part.hour}:${part.minute}`
}

export const floorToMinuteIso = value => {
  if (!value) return null
  const date = new Date(value)
  date.setUTCSeconds(0, 0)
  return date.toISOString()
}
