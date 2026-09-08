// Runtime domain-data adapter. This module contains no patient records: App installs
// the SQLite-backed /api/bootstrap response before rendering the workspace.

let store = null
export let ADMISSION_DATE = new Date(0)

export function installRuntimeData(payload) {
  if (!payload || payload.schema !== 'psychmap.bootstrap.v1') throw new Error('Unsupported Psych-MAP data response')
  store = payload
  ADMISSION_DATE = new Date(`${payload.patients[0]?.admissionDate || '1970-01-01'}T07:00:00+08:00`)
}

const requireStore = () => {
  if (!store) throw new Error('Psych-MAP data has not loaded')
  return store
}

export const getPatients = () => requireStore().patients
export const getPatient = patientId => getPatients().find(patient => patient.id === patientId)
export const getWardRegister = () => {
  const detailedIds = new Set(getPatients().map(patient => patient.id))
  return requireStore().wardRegister.filter(row => detailedIds.has(row.id))
}
export const computeDailyMetrics = patientId => requireStore().dailyMetrics.filter(row => row.patientId === patientId)
export const getVitalsForPatient = patientId => requireStore().vitals.filter(row => row.patientId === patientId)
export const getMocaForPatient = patientId => requireStore().assessments.filter(row => row.patientId === patientId && row.assessmentType === 'MoCA')
export const getClinicalDocumentsForPatient = patientId => requireStore().clinicalDocuments.filter(row => row.patientId === patientId)
export const getVisitorFormsForPatient = patientId => requireStore().visitorForms.filter(row => row.patientId === patientId)
export const getEventsForPatient = patientId => ({
  locationEvents: requireStore().locationEvents.filter(row => row.patientId === patientId),
  interactionEvents: requireStore().interactionEvents.filter(row => row.patientId === patientId),
  activityEvents: requireStore().activityEvents.filter(row => row.patientId === patientId),
  clinicalEvents: requireStore().clinicalEvents.filter(row => row.patientId === patientId),
})
export const getAllClinicalEvents = () => requireStore().clinicalEvents

export const getDailyVitals = patientId => {
  const observations = getVitalsForPatient(patientId)
  return [...new Set(observations.map(item => item.day))].map(day => {
    const rows = observations.filter(item => item.day === day)
    const mean = key => Math.round(rows.reduce((sum, row) => sum + row[key], 0) / rows.length)
    return { day, heartRate: mean('heartRate'), systolicBP: mean('systolicBP'), diastolicBP: mean('diastolicBP'), observationCount: rows.length }
  })
}

export const getDayNumber = timestamp => Math.floor((new Date(timestamp).getTime() - ADMISSION_DATE.getTime()) / 86400000) + 1
export const getStayDays = patientId => getPatient(patientId)?.lengthOfStay || computeDailyMetrics(patientId).length
export const getDayRange = (patientId, maxDays = getStayDays(patientId)) => Array.from({ length: maxDays }, (_, index) => index + 1)
export const getHomeCubicle = patientId => getPatient(patientId)?.assignedCubicle || 'cubicle_1'

export const getZoneTotals = (patientId, days = null) => {
  const totals = {}
  for (const event of getEventsForPatient(patientId).locationEvents) {
    const day = getDayNumber(event.enteredAt)
    if (days && !days.includes(day)) continue
    totals[event.zoneId] = (totals[event.zoneId] || 0) + event.durationMinutes
  }
  return totals
}

export const getHourlyZoneProfile = (patientId, days = null) => {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, zoneMinutes: {} }))
  const selectedDays = new Set()
  const homeCubicle = getHomeCubicle(patientId)
  for (const event of getEventsForPatient(patientId).locationEvents) {
    const day = getDayNumber(event.enteredAt)
    if (days && !days.includes(day)) continue
    selectedDays.add(day)
    const end = new Date(event.exitedAt || new Date(event.enteredAt).getTime() + event.durationMinutes * 60000)
    let cursor = new Date(event.enteredAt)
    while (cursor < end) {
      const hour = cursor.getHours()
      const nextHour = new Date(cursor)
      nextHour.setHours(hour + 1, 0, 0, 0)
      const segmentEnd = nextHour < end ? nextHour : end
      const minutes = (segmentEnd - cursor) / 60000
      buckets[hour].zoneMinutes[event.zoneId] = (buckets[hour].zoneMinutes[event.zoneId] || 0) + minutes
      cursor = nextHour
    }
  }
  const dayCount = Math.max(selectedDays.size, 1)
  return buckets.map(bucket => {
    const zoneMinutes = Object.fromEntries(Object.entries(bucket.zoneMinutes).map(([zone, minutes]) => [zone, Math.round(minutes / dayCount)]))
    return {
      hour: bucket.hour, label: `${String(bucket.hour).padStart(2, '0')}:00`, zoneMinutes,
      totalMins: Math.round(Object.values(bucket.zoneMinutes).reduce((sum, minutes) => sum + minutes, 0) / dayCount),
      activeMins: Math.round(Object.entries(bucket.zoneMinutes).filter(([zone]) => zone !== homeCubicle).reduce((sum, [, minutes]) => sum + minutes, 0) / dayCount),
    }
  })
}

export const getPeriodSummary = (metrics, dayStart, dayEnd) => {
  const rows = metrics.filter(row => row.day >= dayStart && row.day <= dayEnd)
  if (!rows.length) return null
  const average = key => Math.round(rows.reduce((sum, row) => sum + (row[key] || 0), 0) / rows.length * 10) / 10
  const percent = key => Math.round(rows.filter(row => row[key] > 0).length / rows.length * 100)
  return {
    days: rows.length, dayStart, dayEnd,
    avgBedroomMins: average('bedroomMins'), avgHomeCubicleMins: average('homeCubicleMins'),
    avgOtherCubicleMins: average('otherCubicleMins'), avgEnsuiteMins: average('ensuiteMins'),
    avgToiletMins: average('toiletMins'), avgOutsideBedroomMins: average('outsideBedroomMins'),
    avgDiningMins: average('diningMins'), avgCommunalMins: average('communalMins'),
    avgActivityMins: average('activityMins'), avgStaffZoneMins: average('staffZoneMins'),
    avgOutdoorMins: average('outdoorMins'), avgBalconyMins: average('balconyMins'),
    avgVisitorMins: average('visitorMins'), avgCorridorMins: average('corridorMins'),
    avgStaffContacts: average('staffContacts'), avgPeerContacts: average('peerContacts'),
    avgStructuredSessions: average('structuredSessions'), avgTotalSessions: average('totalActivitySessions'),
    avgZoneTransitions: average('zoneTransitions'), avgZoneVariety: average('zoneVariety'),
    pctShowered: percent('showered'), avgMealVisits: average('mealVisits'),
    avgSleepWindowMins: average('sleepWindowMins'), avgOvernightAwayMins: average('overnightAwayMins'),
  }
}

export const comparePeriods = patientId => {
  const metrics = computeDailyMetrics(patientId)
  const baseline = getPeriodSummary(metrics, 1, 5)
  const recent = getPeriodSummary(metrics, metrics.length > 14 ? metrics.length - 13 : 9, metrics.length)
  const diff = key => ({
    baseline: baseline?.[key] || 0, recent: recent?.[key] || 0,
    absoluteChange: Math.round(((recent?.[key] || 0) - (baseline?.[key] || 0)) * 10) / 10,
    percentChange: (baseline?.[key] || 0) > 0 ? Math.round((((recent?.[key] || 0) - baseline[key]) / baseline[key]) * 100) : null,
  })
  return { baseline, recent, changes: {
    outsideBedroomMins: diff('avgOutsideBedroomMins'), bedroomMins: diff('avgBedroomMins'),
    homeCubicleMins: diff('avgHomeCubicleMins'), otherCubicleMins: diff('avgOtherCubicleMins'),
    ensuiteMins: diff('avgEnsuiteMins'), toiletMins: diff('avgToiletMins'), activityMins: diff('avgActivityMins'),
    communalMins: diff('avgCommunalMins'), staffZoneMins: diff('avgStaffZoneMins'), outdoorMins: diff('avgOutdoorMins'),
    balconyMins: diff('avgBalconyMins'), visitorMins: diff('avgVisitorMins'), corridorMins: diff('avgCorridorMins'),
    staffContacts: diff('avgStaffContacts'), peerContacts: diff('avgPeerContacts'), structuredSessions: diff('avgStructuredSessions'),
    zoneTransitions: diff('avgZoneTransitions'), zoneVariety: diff('avgZoneVariety'), pctShowered: diff('pctShowered'),
    mealVisits: diff('avgMealVisits'), sleepWindowMins: diff('avgSleepWindowMins'), overnightAwayMins: diff('avgOvernightAwayMins'),
  } }
}
