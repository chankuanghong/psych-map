// Synthetic EPIC-style flowsheet observations for the three detailed demo patients.
// These values are fictional and are not intended to represent treatment response.

const START_DATE = new Date('2026-07-30T00:00:00+08:00')
const READING_TIMES = ['07:30', '14:00', '20:30']

const PROFILES = {
  'PT-001': {
    days: 14,
    values: day => ({
      heartRate: Math.round(91 - Math.min(day - 1, 9) * 1.15),
      systolicBP: Math.round(128 - Math.min(day - 1, 8) * 0.55),
      diastolicBP: Math.round(82 - Math.min(day - 1, 8) * 0.35),
    }),
  },
  'PT-002': {
    days: 90,
    values: day => ({
      heartRate: Math.round(84 - Math.min(day - 1, 55) * 0.1),
      systolicBP: Math.round(124 - Math.min(day - 1, 60) * 0.035),
      diastolicBP: Math.round(80 - Math.min(day - 1, 60) * 0.025),
    }),
  },
  'PT-003': {
    days: 14,
    values: day => ({
      heartRate: day <= 5 ? 101 + day : Math.round(105 - (day - 5) * 3.1),
      systolicBP: day <= 5 ? 137 + day : Math.round(142 - (day - 5) * 1.8),
      diastolicBP: day <= 5 ? 85 + Math.round(day / 2) : Math.round(88 - (day - 5) * 0.8),
    }),
  },
}

const timestampFor = (day, time) => {
  const date = new Date(START_DATE.getTime() + (day - 1) * 86400000)
  const [hours, minutes] = time.split(':').map(Number)
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

const makePatientVitals = (patientId, profile) => Array.from({ length: profile.days }, (_, index) => index + 1).flatMap(day => {
  const baseline = profile.values(day)
  return READING_TIMES.map((time, readingIndex) => {
    const variation = readingIndex === 0 ? 1 : readingIndex === 1 ? 3 : -1
    return {
      patientId,
      day,
      timestamp: timestampFor(day, time),
      recordedTime: time,
      heartRate: baseline.heartRate + variation,
      systolicBP: baseline.systolicBP + (readingIndex === 1 ? 3 : readingIndex === 2 ? -2 : 0),
      diastolicBP: baseline.diastolicBP + (readingIndex === 1 ? 2 : readingIndex === 2 ? -1 : 0),
      source: 'Synthetic EPIC-style flowsheet',
      status: 'recorded',
    }
  })
})

export const SYNTHETIC_VITALS = Object.entries(PROFILES).flatMap(([patientId, profile]) => makePatientVitals(patientId, profile))

export const getVitalsForPatient = patientId => SYNTHETIC_VITALS.filter(observation => observation.patientId === patientId)

export const getDailyVitals = patientId => {
  const observations = getVitalsForPatient(patientId)
  const days = [...new Set(observations.map(item => item.day))]
  return days.map(day => {
    const rows = observations.filter(item => item.day === day)
    const mean = key => Math.round(rows.reduce((sum, row) => sum + row[key], 0) / rows.length)
    return {
      day,
      heartRate: mean('heartRate'),
      systolicBP: mean('systolicBP'),
      diastolicBP: mean('diastolicBP'),
      observationCount: rows.length,
    }
  })
}
