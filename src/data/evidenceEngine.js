import { PATIENTS } from './patients.js'
import { computeDailyMetrics, getDayNumber } from './metricsEngine.js'
import { getEventsForPatient } from './syntheticEvents.js'
import { formatDuration, formatDurationPerDay } from '../utils/duration.js'

const round = value => Math.round((value || 0) * 10) / 10
const average = (rows, key) => rows.length ? round(rows.reduce((sum, row) => sum + (row[key] || 0), 0) / rows.length) : 0

export function normaliseRange(patientId, range) {
  const daily = computeDailyMetrics(patientId)
  const fromDay = Math.max(1, Math.min(range?.[0] || 1, daily.length))
  const toDay = Math.max(fromDay, Math.min(range?.[1] || daily.length, daily.length))
  return [fromDay, toDay]
}

const summariseRows = rows => rows.length ? {
  days: rows.length,
  dayStart: rows[0].day,
  dayEnd: rows[rows.length - 1].day,
  avgHomeCubicleMins: average(rows, 'homeCubicleMins'),
  avgOtherCubicleMins: average(rows, 'otherCubicleMins'),
  avgEnsuiteMins: average(rows, 'ensuiteMins'),
  avgToiletMins: average(rows, 'toiletMins'),
  avgOutsideBedroomMins: average(rows, 'outsideBedroomMins'),
  avgDiningMins: average(rows, 'diningMins'),
  avgActivityMins: average(rows, 'activityMins'),
  avgBalconyMins: average(rows, 'balconyMins'),
  avgVisitorMins: average(rows, 'visitorMins'),
  avgCorridorMins: average(rows, 'corridorMins'),
  avgStructuredSessions: average(rows, 'structuredSessions'),
  avgZoneTransitions: average(rows, 'zoneTransitions'),
  avgSleepWindowMins: average(rows, 'sleepWindowMins'),
  avgOvernightAwayMins: average(rows, 'overnightAwayMins'),
} : null

export function detectSignals(patientId, range, selectedDaysOverride) {
  const daily = computeDailyMetrics(patientId)
  const [fromDay, toDay] = normaliseRange(patientId, range)
  const selectedSet = selectedDaysOverride?.length ? new Set(selectedDaysOverride) : null
  const rows = daily.filter(row => row.day >= fromDay && row.day <= toDay && (!selectedSet || selectedSet.has(row.day)))
  const split = Math.max(1, Math.floor(rows.length / 2))
  const early = rows.slice(0, split)
  const recent = rows.slice(split)
  const signals = []
  const davEvents = getEventsForPatient(patientId).clinicalEvents.filter(event => {
    const day = getDayNumber(event.timestamp)
    return event.eventType === 'dav_episode' && day >= fromDay && day <= toDay && (!selectedSet || selectedSet.has(day))
  })
  if (davEvents.length) signals.push({
    id: 'documented-dav-episode', severity: 'high', direction: 'review',
    title: `${davEvents.length} nurse-documented DAV episode${davEvents.length === 1 ? '' : 's'}`,
    evidence: davEvents.map(event => `Day ${getDayNumber(event.timestamp)}: ${event.title}`).join('; '),
    caveat: 'This is a documented historical event, not an inference from movement data or a determination of current risk.',
  })

  const lowestRest = Math.min(...rows.map(row => row.sleepWindowMins))
  const lowestRestDay = rows.find(row => row.sleepWindowMins === lowestRest)?.day
  if (lowestRest < 240) signals.push({
    id: 'reduced-overnight-rest', severity: lowestRest < 180 ? 'high' : 'moderate', direction: 'concern',
    title: 'Reduced overnight rest proxy',
    evidence: `Assigned-cubicle presence between 00:00–07:00 fell to ${formatDuration(lowestRest)} on Day ${lowestRestDay}.`,
    caveat: 'Assigned-cubicle presence does not confirm sleep.',
  })

  const peakShower = Math.max(...rows.map(row => row.ensuiteMins))
  const peakShowerDay = rows.find(row => row.ensuiteMins === peakShower)?.day
  if (peakShower >= 90) signals.push({
    id: 'prolonged-shower-presence', severity: peakShower >= 120 ? 'high' : 'moderate', direction: 'concern',
    title: 'Prolonged shower-area presence',
    evidence: `Shower-area presence reached ${formatDuration(peakShower)} on Day ${peakShowerDay}.`,
    caveat: 'Presence does not establish washing, ritual content or distress.',
  })

  const peakOtherCubicle = Math.max(...rows.map(row => row.otherCubicleMins))
  const peakOtherDay = rows.find(row => row.otherCubicleMins === peakOtherCubicle)?.day
  if (peakOtherCubicle >= 60) signals.push({
    id: 'other-cubicle-escalation', severity: peakOtherCubicle >= 150 ? 'high' : 'moderate', direction: 'review',
    title: 'Marked neighbouring-cubicle presence',
    evidence: `Presence in cubicles other than the assigned cubicle reached ${formatDuration(peakOtherCubicle)} on Day ${peakOtherDay}.`,
    caveat: 'Location cannot establish interaction, invitation, consent or friendship.',
  })

  if (recent.length) {
    const outsideChange = average(recent, 'outsideBedroomMins') - average(early, 'outsideBedroomMins')
    if (Math.abs(outsideChange) >= 30) signals.push({
      id: 'environmental-engagement-change', severity: 'moderate', direction: outsideChange > 0 ? 'positive' : 'concern',
      title: outsideChange > 0 ? 'Broader environmental engagement' : 'Reduced environmental engagement',
      evidence: `Average time beyond the assigned cubicle changed by ${outsideChange > 0 ? '+' : '−'}${formatDurationPerDay(Math.abs(outsideChange))} between the first and second halves of the selection.`,
      caveat: 'Location change is a behavioural proxy, not a clinical outcome score.',
    })
  }

  return signals
}

export function buildEvidencePacket(patientId, range, selectedDaysOverride) {
  const patient = PATIENTS.find(item => item.id === patientId)
  const daily = computeDailyMetrics(patientId)
  const [fromDay, toDay] = normaliseRange(patientId, range)
  const selectedSet = selectedDaysOverride?.length ? new Set(selectedDaysOverride) : null
  const selected = daily.filter(row => row.day >= fromDay && row.day <= toDay && (!selectedSet || selectedSet.has(row.day)))
  const split = Math.max(1, Math.ceil(selected.length / 2))
  const firstHalf = summariseRows(selected.slice(0, split))
  const secondHalf = summariseRows(selected.slice(split)) || firstHalf
  const { clinicalEvents } = getEventsForPatient(patientId)

  return {
    immediateConcern: false,
    patient: {
      id: patient?.id,
      displayName: patient?.displayName,
      diagnosisContext: patient?.primaryDiagnosis,
      assignedCubicle: patient?.assignedCubicle,
      synthetic: true,
    },
    selectedPeriod: { fromDay, toDay, days: selected.length, selectedDays: selected.map(row => row.day) },
    deterministicSignals: detectSignals(patientId, [fromDay, toDay], selected.map(row => row.day)),
    periodComparison: { firstHalf, secondHalf },
    dailyMetrics: selected.map(row => ({
      day: row.day,
      assignedCubicleMins: row.homeCubicleMins,
      otherCubicleMins: row.otherCubicleMins,
      diningMins: row.diningMins,
      activityMins: row.activityMins,
      balconyMins: row.balconyMins,
      visitorMins: row.visitorMins,
      corridorMins: row.corridorMins,
      showerMins: row.ensuiteMins,
      toiletMins: row.toiletMins,
      overnightRestProxyMins: row.sleepWindowMins,
      overnightAwayMins: row.overnightAwayMins,
      zoneTransitions: row.zoneTransitions,
    })),
    clinicalEvents: clinicalEvents
      .filter(event => {
        const day = getDayNumber(event.timestamp)
        return day >= fromDay && day <= toDay && (!selectedSet || selectedSet.has(day))
      })
      .map(event => ({ day: getDayNumber(event.timestamp), discipline: event.discipline, type: event.eventType, title: event.title, description: event.description, details: event.details })),
    interpretationRules: [
      'All data is a de-identified, rehashed demonstration extract with no direct patient identifiers.',
      'Describe association and sequence, never causality.',
      'Location is presence only and does not prove activity, interaction, consent or sleep.',
      'Diagnosis is context supplied by the record, not inferred from behaviour.',
      'Clinical decisions remain with the treating MDT.',
    ],
  }
}
