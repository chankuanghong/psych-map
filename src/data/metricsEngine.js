// ============================================================
// Deterministic Metrics Engine
// Reports objective, observable behavioural measures.
// All time figures are averages per day (minutes/day).
// LLMs are NOT used for arithmetic — only for interpretation.
// ============================================================

import { ADMISSION_DATE, getEventsForPatient } from './syntheticEvents.js'

const WAKING_HOURS_START = 7   // 07:00
const WAKING_HOURS_END   = 22  // 22:00 (waking window = 15 h = 900 min)
const WAKING_MINUTES     = (WAKING_HOURS_END - WAKING_HOURS_START) * 60

// Return day number (1-indexed) for a timestamp
export const getDayNumber = (timestamp) => {
  const ms = new Date(timestamp).getTime() - ADMISSION_DATE.getTime()
  return Math.floor(ms / 86400000) + 1
}

export const getStayDays = patientId => patientId === 'PT-002' ? 90 : 14

export const getDayRange = (patientId, maxDays = getStayDays(patientId)) =>
  Array.from({ length: maxDays }, (_, i) => i + 1)

// Zone category lists
const CUBICLE_ZONES  = ['cubicle_1', 'cubicle_2', 'cubicle_3', 'cubicle_4']
const COMMUNAL_ZONES = ['dining', 'quiet_area', 'balcony']
const ACTIVITY_ZONES = ['activity_room']
const STAFF_ZONES    = ['nursing_station']
const HOME_CUBICLE = { 'PT-001': 'cubicle_1', 'PT-002': 'cubicle_3', 'PT-003': 'cubicle_4' }

export const getHomeCubicle = patientId => HOME_CUBICLE[patientId] || 'cubicle_1'

// ----------------------------------------------------------------
// Total occupancy per zone across a set of days (for heat map)
// ----------------------------------------------------------------
export const getZoneTotals = (patientId, days = null) => {
  const { locationEvents } = getEventsForPatient(patientId)
  const totals = {}
  for (const event of locationEvents) {
    const day = getDayNumber(event.enteredAt)
    if (days && !days.includes(day)) continue
    totals[event.zoneId] = (totals[event.zoneId] || 0) + event.durationMinutes
  }
  return totals
}

// ----------------------------------------------------------------
// Zone transitions per day
// ----------------------------------------------------------------
export const getTransitionsByDay = (patientId) => {
  const { locationEvents } = getEventsForPatient(patientId)
  const byDay = {}
  const sorted = [...locationEvents].sort((a, b) => new Date(a.enteredAt) - new Date(b.enteredAt))
  let prevDay = null, prevZone = null
  for (const event of sorted) {
    const day = getDayNumber(event.enteredAt)
    if (!byDay[day]) byDay[day] = 0
    if (prevZone && prevDay === day && prevZone !== event.zoneId) byDay[day]++
    prevZone = event.zoneId
    prevDay = day
  }
  return byDay
}

// ----------------------------------------------------------------
// Hourly zone occupancy (for time-of-day view)
// Returns: array of 24 objects, each { hour, zoneMinutes: {zoneId: mins} }
// Aggregated across a set of days, averaged per day.
// ----------------------------------------------------------------
export const getHourlyZoneProfile = (patientId, days = null) => {
  const { locationEvents } = getEventsForPatient(patientId)
  const homeCubicle = getHomeCubicle(patientId)
  const hourBuckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, zoneMinutes: {} }))
  const daySet = new Set()

  for (const event of locationEvents) {
    const day = getDayNumber(event.enteredAt)
    if (days && !days.includes(day)) continue
    daySet.add(day)

    const start = new Date(event.enteredAt)
    const end   = new Date(event.exitedAt || new Date(event.enteredAt).getTime() + event.durationMinutes * 60000)

    // Distribute minutes across hours
    let cursor = new Date(start)
    while (cursor < end) {
      const h = cursor.getHours()
      const nextHour = new Date(cursor)
      nextHour.setHours(h + 1, 0, 0, 0)
      const segEnd = nextHour < end ? nextHour : end
      const mins = (segEnd - cursor) / 60000
      if (mins > 0) {
        const bucket = hourBuckets[h]
        bucket.zoneMinutes[event.zoneId] = (bucket.zoneMinutes[event.zoneId] || 0) + mins
      }
      cursor = nextHour
    }
  }

  // Average across days
  const nDays = Math.max(daySet.size, 1)
  return hourBuckets.map(b => ({
    hour: b.hour,
    label: `${String(b.hour).padStart(2,'0')}:00`,
    zoneMinutes: Object.fromEntries(
      Object.entries(b.zoneMinutes).map(([z, m]) => [z, Math.round(m / nDays)])
    ),
    // Total minutes in any zone this hour (avg/day)
    totalMins: Math.round(
      Object.values(b.zoneMinutes).reduce((s, m) => s + m, 0) / nDays
    ),
    // Active (outside bedroom) mins this hour
    activeMins: Math.round(
      Object.entries(b.zoneMinutes)
        .filter(([z]) => z !== homeCubicle)
        .reduce((s, [, m]) => s + m, 0) / nDays
    ),
  }))
}

// ----------------------------------------------------------------
// Per-day objective metrics — all time values in minutes/day
// ----------------------------------------------------------------
export const computeDailyMetrics = (patientId) => {
  const { locationEvents, interactionEvents, activityEvents } = getEventsForPatient(patientId)
  const days = getDayRange(patientId)
  const transitions = getTransitionsByDay(patientId)
  const homeCubicle = getHomeCubicle(patientId)
  const metrics = []

  for (const day of days) {
    const dayLocationsAll = locationEvents.filter(e => getDayNumber(e.enteredAt) === day)
    const dayLocations    = dayLocationsAll.filter(e => !e.isSleepWindow)
    const sleepLocations  = dayLocationsAll.filter(e => e.isSleepWindow)
    const dayInteractions = interactionEvents.filter(e => getDayNumber(e.timestamp) === day)
    const dayActivities   = activityEvents.filter(e => getDayNumber(e.timestamp) === day)

    // ── Zone times (minutes) ──
    const bedroomMins   = dayLocations.filter(e => e.zoneId === homeCubicle).reduce((s,e) => s+e.durationMinutes, 0)
    const otherCubicleMins = dayLocations.filter(e => CUBICLE_ZONES.includes(e.zoneId) && e.zoneId !== homeCubicle).reduce((s,e) => s+e.durationMinutes, 0)
    const ensuiteMins   = dayLocations.filter(e => e.zoneId.startsWith('shower_')).reduce((s,e) => s+e.durationMinutes, 0)
    const toiletMins    = dayLocations.filter(e => e.zoneId.endsWith('_toilet')).reduce((s,e) => s+e.durationMinutes, 0)
    const diningMins    = dayLocations.filter(e => e.zoneId === 'dining').reduce((s,e) => s+e.durationMinutes, 0)
    const communalMins  = dayLocations.filter(e => COMMUNAL_ZONES.includes(e.zoneId)).reduce((s,e) => s+e.durationMinutes, 0)
    const activityMins  = dayLocations.filter(e => ACTIVITY_ZONES.includes(e.zoneId)).reduce((s,e) => s+e.durationMinutes, 0)
    const staffZoneMins = dayLocations.filter(e => STAFF_ZONES.includes(e.zoneId)).reduce((s,e) => s+e.durationMinutes, 0)
    const balconyMins   = dayLocations.filter(e => e.zoneId === 'balcony').reduce((s,e) => s+e.durationMinutes, 0)
    const outdoorMins   = balconyMins
    const quietMins     = dayLocations.filter(e => e.zoneId === 'quiet_area').reduce((s,e) => s+e.durationMinutes, 0)
    const corridorMins  = dayLocations.filter(e => e.zoneId === 'corridor').reduce((s,e) => s+e.durationMinutes, 0)
    const visitorMins   = dayLocations.filter(e => e.zoneId === 'visitor_area').reduce((s,e) => s+e.durationMinutes, 0)

    const outsideBedroomMins = dayLocations
      .filter(e => e.zoneId !== homeCubicle)
      .reduce((sum, event) => sum + event.durationMinutes, 0)
    const zoneVariety        = new Set(dayLocations.map(e => e.zoneId)).size

    // ── Interaction counts ──
    const staffContacts     = dayInteractions.filter(e => e.type === 'staff' || e.type === 'clinician').length
    const peerContacts      = dayInteractions.filter(e => e.type === 'peer').length

    // ── Activity counts ──
    const structuredSessions  = dayActivities.filter(e => e.structured).length
    const totalActivitySessions = dayActivities.length
    const zoneTransitions       = transitions[day] || 0

    // ── Shower proxy: ensuite visit ≥ 15 min = showered ──
    const showered = dayLocations.some(e => e.zoneId.startsWith('shower_') && e.durationMinutes >= 15) ? 1 : 0

    // ── Meal attendance: dining visits (each meal = separate visit) ──
    const mealVisits = dayLocations.filter(e => e.zoneId === 'dining').length
    const sleepWindowMins = sleepLocations.filter(e => e.zoneId === homeCubicle).reduce((sum, event) => sum + event.durationMinutes, 0)
    const overnightAwayMins = sleepLocations.filter(e => e.zoneId !== homeCubicle).reduce((sum, event) => sum + event.durationMinutes, 0)

    metrics.push({
      day,
      date: new Date(ADMISSION_DATE.getTime() + (day - 1) * 86400000)
        .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      // Objective time measurements (minutes that day)
      bedroomMins,
      homeCubicleMins: bedroomMins,
      otherCubicleMins,
      ensuiteMins,
      toiletMins,
      outsideBedroomMins,
      diningMins,
      communalMins,
      activityMins,
      staffZoneMins,
      outdoorMins,
      balconyMins,
      quietMins,
      corridorMins,
      visitorMins,
      // Interaction counts
      staffContacts,
      peerContacts,
      // Activity
      structuredSessions,
      totalActivitySessions,
      // Movement
      zoneTransitions,
      zoneVariety,
      // Routine proxies
      showered,
      mealVisits,
      sleepWindowMins,
      overnightAwayMins,
    })
  }

  return metrics
}

// ----------------------------------------------------------------
// Average-per-day summary for a period
// All figures are averages per day within the period.
// ----------------------------------------------------------------
export const getPeriodSummary = (metrics, dayStart, dayEnd) => {
  const slice = metrics.filter(m => m.day >= dayStart && m.day <= dayEnd)
  if (!slice.length) return null
  const avg = (key) => Math.round(slice.reduce((s, m) => s + m[key], 0) / slice.length * 10) / 10
  const pct = (key) => Math.round(slice.filter(m => m[key] > 0).length / slice.length * 100)

  return {
    days: slice.length,
    dayStart,
    dayEnd,
    // Averages per day (minutes)
    avgBedroomMins:        avg('bedroomMins'),
    avgHomeCubicleMins:    avg('homeCubicleMins'),
    avgOtherCubicleMins:   avg('otherCubicleMins'),
    avgEnsuiteMins:        avg('ensuiteMins'),
    avgToiletMins:         avg('toiletMins'),
    avgOutsideBedroomMins: avg('outsideBedroomMins'),
    avgDiningMins:         avg('diningMins'),
    avgCommunalMins:       avg('communalMins'),
    avgActivityMins:       avg('activityMins'),
    avgStaffZoneMins:      avg('staffZoneMins'),
    avgOutdoorMins:        avg('outdoorMins'),
    avgBalconyMins:        avg('balconyMins'),
    avgVisitorMins:        avg('visitorMins'),
    avgCorridorMins:       avg('corridorMins'),
    // Interaction averages
    avgStaffContacts:      avg('staffContacts'),
    avgPeerContacts:       avg('peerContacts'),
    // Activity averages
    avgStructuredSessions: avg('structuredSessions'),
    avgTotalSessions:      avg('totalActivitySessions'),
    avgZoneTransitions:    avg('zoneTransitions'),
    avgZoneVariety:        avg('zoneVariety'),
    // Routine %
    pctShowered:           pct('showered'),
    avgMealVisits:         avg('mealVisits'),
    avgSleepWindowMins:    avg('sleepWindowMins'),
    avgOvernightAwayMins:  avg('overnightAwayMins'),
  }
}

// ----------------------------------------------------------------
// Compare early admission with the most recent observation window.
// ----------------------------------------------------------------
export const comparePeriods = (patientId) => {
  const metrics = computeDailyMetrics(patientId)
  const baseline = getPeriodSummary(metrics, 1, 5)
  const recentStart = metrics.length > 14 ? metrics.length - 13 : 9
  const recent   = getPeriodSummary(metrics, recentStart, metrics.length)

  const diff = (key) => {
    const base = baseline[key] ?? 0
    const rec  = recent[key]  ?? 0
    return {
      baseline: base,
      recent: rec,
      absoluteChange: Math.round((rec - base) * 10) / 10,
      percentChange: base > 0 ? Math.round(((rec - base) / base) * 100) : null,
    }
  }

  return {
    baseline,
    recent,
    changes: {
      outsideBedroomMins: diff('avgOutsideBedroomMins'),
      bedroomMins:        diff('avgBedroomMins'),
      homeCubicleMins:    diff('avgHomeCubicleMins'),
      otherCubicleMins:   diff('avgOtherCubicleMins'),
      ensuiteMins:        diff('avgEnsuiteMins'),
      toiletMins:         diff('avgToiletMins'),
      activityMins:       diff('avgActivityMins'),
      communalMins:       diff('avgCommunalMins'),
      staffZoneMins:      diff('avgStaffZoneMins'),
      outdoorMins:        diff('avgOutdoorMins'),
      balconyMins:        diff('avgBalconyMins'),
      visitorMins:        diff('avgVisitorMins'),
      corridorMins:       diff('avgCorridorMins'),
      staffContacts:      diff('avgStaffContacts'),
      peerContacts:       diff('avgPeerContacts'),
      structuredSessions: diff('avgStructuredSessions'),
      zoneTransitions:    diff('avgZoneTransitions'),
      zoneVariety:        diff('avgZoneVariety'),
      pctShowered:        diff('pctShowered'),
      mealVisits:         diff('avgMealVisits'),
      sleepWindowMins:    diff('avgSleepWindowMins'),
      overnightAwayMins:  diff('avgOvernightAwayMins'),
    },
  }
}

// ----------------------------------------------------------------
// Agent tool functions
// ----------------------------------------------------------------
export const agentTools = {
  get_location_history: (patientId, period = '14d') => {
    const maxDay = period === '7d' ? 7 : 14
    const { locationEvents } = getEventsForPatient(patientId)
    const relevant = locationEvents.filter(e => getDayNumber(e.enteredAt) <= maxDay)
    const byZone = {}
    for (const e of relevant) byZone[e.zoneId] = (byZone[e.zoneId] || 0) + e.durationMinutes
    return { period, avgMinPerDay: Object.fromEntries(Object.entries(byZone).map(([z,m]) => [z, Math.round(m/maxDay)])), totalEvents: relevant.length }
  },

  get_zone_summary: (patientId, period = '14d') => {
    const maxDay = period === '7d' ? 7 : 14
    const days = Array.from({ length: maxDay }, (_, i) => i + 1)
    const totals = getZoneTotals(patientId, days)
    return { period, avgMinPerDay: Object.fromEntries(Object.entries(totals).map(([z,m]) => [z, Math.round(m/maxDay)])) }
  },

  get_activity_participation: (patientId, period = '14d') => {
    const maxDay = period === '7d' ? 7 : 14
    const { activityEvents } = getEventsForPatient(patientId)
    const relevant = activityEvents.filter(e => getDayNumber(e.timestamp) <= maxDay)
    return {
      period,
      totalSessions: relevant.length,
      structuredSessions: relevant.filter(e => e.structured).length,
      avgSessionsPerDay: Math.round(relevant.length / maxDay * 10) / 10,
      activities: [...new Set(relevant.map(e => e.activityType))],
    }
  },

  get_social_exposure: (patientId, period = '14d') => {
    const maxDay = period === '7d' ? 7 : 14
    const { interactionEvents } = getEventsForPatient(patientId)
    const relevant = interactionEvents.filter(e => getDayNumber(e.timestamp) <= maxDay)
    return {
      period,
      totalPeerContacts: relevant.filter(e => e.type === 'peer').length,
      totalStaffContacts: relevant.filter(e => e.type === 'staff' || e.type === 'clinician').length,
      avgPeerContactsPerDay: Math.round(relevant.filter(e => e.type === 'peer').length / maxDay * 10) / 10,
    }
  },

  get_staff_engagement: (patientId, period = '14d') => {
    const maxDay = period === '7d' ? 7 : 14
    const { interactionEvents } = getEventsForPatient(patientId)
    const relevant = interactionEvents.filter(e =>
      getDayNumber(e.timestamp) <= maxDay && (e.type === 'staff' || e.type === 'clinician')
    )
    return {
      period,
      contactCount: relevant.length,
      avgPerDay: Math.round(relevant.length / maxDay * 10) / 10,
    }
  },

  get_clinical_events: (patientId, period = '14d') => {
    const maxDay = period === '7d' ? 7 : 14
    const { clinicalEvents } = getEventsForPatient(patientId)
    return {
      period,
      events: clinicalEvents
        .filter(e => getDayNumber(e.timestamp) <= maxDay)
        .map(e => ({ day: getDayNumber(e.timestamp), discipline: e.discipline, eventType: e.eventType, title: e.title })),
    }
  },

  compare_periods: (patientId) => comparePeriods(patientId),

  generate_mdt_summary: (patientId) => {
    const c = comparePeriods(patientId)
    return {
      patientId,
      analysisDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      comparison: c,
      keyFindings: [
        `Time beyond assigned Cubicle #1: ${c.baseline.avgOutsideBedroomMins} min/day (baseline) → ${c.recent.avgOutsideBedroomMins} min/day (recent) [${c.changes.outsideBedroomMins.absoluteChange > 0 ? '+' : ''}${c.changes.outsideBedroomMins.absoluteChange} min/day]`,
        `Activity room time: ${c.baseline.avgActivityMins} min/day → ${c.recent.avgActivityMins} min/day`,
        `Other cubicle presence: ${c.baseline.avgOtherCubicleMins} min/day → ${c.recent.avgOtherCubicleMins} min/day; purpose not established by location`,
        `Balcony time: ${c.baseline.avgBalconyMins} min/day → ${c.recent.avgBalconyMins} min/day`,
        `Structured sessions: ${c.baseline.avgStructuredSessions}/day → ${c.recent.avgStructuredSessions}/day`,
        `Zone transitions: ${c.baseline.avgZoneTransitions}/day → ${c.recent.avgZoneTransitions}/day`,
        `Shower routine: ${c.baseline.pctShowered}% of days → ${c.recent.pctShowered}% of days`,
      ],
    }
  },
}
