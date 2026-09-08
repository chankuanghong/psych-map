import { ADMISSION_DATE } from '../src/data/syntheticEvents.js'
import { DEFAULT_TIME_ZONE, formatTimestamp24 } from '../src/utils/time24.js'

const WORD_NUMBERS = { three: 3, five: 5, seven: 7, fourteen: 14 }
const UTC_OFFSET = '+08:00'
const clampRange = (fromDay, toDay, availableDays) => {
  const available = new Set(availableDays)
  if (!Number.isInteger(fromDay) || !Number.isInteger(toDay) || fromDay > toDay || !available.has(fromDay) || !available.has(toDay)) return null
  return [fromDay, toDay]
}
const daysInRange = ([fromDay, toDay]) => Array.from({ length: toDay - fromDay + 1 }, (_, index) => fromDay + index)
const dayForDate = value => Math.floor((new Date(`${value}T00:00:00+08:00`).getTime() - ADMISSION_DATE.getTime()) / 86_400_000) + 1
const dayForInstant = value => Math.floor((new Date(value).getTime() - ADMISSION_DATE.getTime()) / 86_400_000) + 1
const dateForDay = day => formatTimestamp24(new Date(ADMISSION_DATE.getTime() + (day - 1) * 86_400_000)).slice(0, 10)
const parseClockMinute = (hourText, minuteText, meridiem) => {
  let hour = Number(hourText)
  const minute = Number(minuteText || 0)
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute > 59) return null
  if (meridiem) {
    if (hour < 1 || hour > 12) return null
    if (meridiem.toLowerCase() === 'pm' && hour !== 12) hour += 12
    if (meridiem.toLowerCase() === 'am' && hour === 12) hour = 0
  }
  return hour >= 0 && hour <= 23 ? hour * 60 + minute : null
}
const clockLabel = minute => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`

export function resolveQuestionScope(question, { range, selectedDays, availableDays, latestDataAt = null, now = new Date() }) {
  const text = String(question || '').toLowerCase()
  let resolved = null; let reason = 'selected_period'
  const explicitDays = text.match(/\bdays?\s*(\d{1,3})\s*(?:to|through|[-–])\s*(?:day\s*)?(\d{1,3})\b/)
  if (explicitDays) {
    resolved = clampRange(Number(explicitDays[1]), Number(explicitDays[2]), availableDays)
    reason = 'explicit_day_range'
  }
  const explicitDates = text.match(/\b(?:from\s*)?(\d{4}-\d{2}-\d{2})\s*(?:to|through|[-–])\s*(\d{4}-\d{2}-\d{2})\b/)
  if (!resolved && explicitDates) {
    resolved = clampRange(dayForDate(explicitDates[1]), dayForDate(explicitDates[2]), availableDays)
    reason = 'explicit_date_range'
  }
  const recent = text.match(/\b(?:past|last|previous)\s+(\d{1,2}|three|five|seven|fourteen)\s+days?\b/)
  if (!resolved && recent) {
    const count = Number(recent[1]) || WORD_NUMBERS[recent[1]]
    const latest = Math.max(...availableDays)
    resolved = clampRange(Math.max(Math.min(...availableDays), latest - count + 1), latest, availableDays)
    reason = 'recent_days'
  }
  let timeScope = null
  const recentHours = text.match(/\b(?:past|last|previous)\s+(\d{1,2}|three|five|seven|fourteen)\s+hours?\b/)
  if (recentHours && latestDataAt) {
    const count = Number(recentHours[1]) || WORD_NUMBERS[recentHours[1]]
    if (count >= 1 && count <= 72) {
      const to = new Date(latestDataAt)
      const from = new Date(to.getTime() - count * 3_600_000)
      const hourRange = clampRange(Math.max(Math.min(...availableDays), dayForInstant(from)), Math.min(Math.max(...availableDays), dayForInstant(to)), availableDays)
      if (hourRange) {
        resolved = hourRange
        reason = 'recent_hours'
        timeScope = { mode: 'rolling_hours', fromAtUtc: from.toISOString(), toAtUtc: to.toISOString(), hours: count }
      }
    }
  }
  const clockRange = text.match(/\b(?:from|between)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|through|and|[-–])\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/)
  if (!timeScope && clockRange) {
    const fromMinute = parseClockMinute(clockRange[1], clockRange[2], clockRange[3])
    const toMinute = parseClockMinute(clockRange[4], clockRange[5], clockRange[6])
    if (fromMinute != null && toMinute != null && fromMinute < toMinute) {
      timeScope = { mode: 'daily_time_window', fromMinute, toMinute, label: `${clockLabel(fromMinute)}–${clockLabel(toMinute)}` }
      reason = resolved ? `${reason}_with_hours` : 'selected_period_with_hours'
    }
  }
  const effectiveRange = resolved || range
  const effectiveDays = resolved ? daysInRange(effectiveRange) : selectedDays
  const changed = effectiveRange[0] !== range[0] || effectiveRange[1] !== range[1] || effectiveDays.length !== selectedDays.length || effectiveDays.some((day, index) => day !== selectedDays[index])
  return {
    range: effectiveRange, selectedDays: effectiveDays, reason, timeScope,
    timeEvidence: {
      timeZone: DEFAULT_TIME_ZONE,
      utcOffset: UTC_OFFSET,
      generatedAtUtc: new Date(now).toISOString(),
      generatedAtLocal24: formatTimestamp24(now),
      latestDataAtUtc: latestDataAt ? new Date(latestDataAt).toISOString() : null,
      latestDataAtLocal24: formatTimestamp24(latestDataAt),
      relativeAnchor: reason.startsWith('recent_') ? 'latest_available_data' : reason.startsWith('selected_period') ? 'ui_selected_period' : 'explicit_request',
      fromDayDate: dateForDay(effectiveRange[0]),
      toDayDate: dateForDay(effectiveRange[1]),
    },
    action: changed ? { type: 'set_day_range', fromDay: effectiveRange[0], toDay: effectiveRange[1] } : null,
  }
}

export function withoutTemporalScope(value) {
  return String(value || '')
    .replace(/\b(?:during|in|for)\s+the\s+selected\s+(?:period|days?|range)\b/gi, ' ')
    .replace(/\b(?:past|last|previous)\s+(?:\d{1,2}|three|five|seven|fourteen)\s+days?\b/gi, ' ')
    .replace(/\bdays?\s*\d{1,3}\s*(?:to|through|[-–])\s*(?:day\s*)?\d{1,3}\b/gi, ' ')
    .replace(/\b(?:from\s*)?\d{4}-\d{2}-\d{2}\s*(?:to|through|[-–])\s*\d{4}-\d{2}-\d{2}\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
