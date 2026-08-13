// Lightweight synthetic ward summaries. These are intentionally not full patient histories.
// They support a management snapshot without implying a detailed record exists for every row.

const STATUS_SEQUENCE = [
  ...Array(8).fill('improving'),
  ...Array(15).fill('stable'),
  ...Array(6).fill('declining'),
  ...Array(5).fill('review'),
  ...Array(3).fill('insufficient'),
]

const STATUS_CONFIG = {
  improving: { label: 'Improving', changeBase: 14, band: 'Moderate' },
  stable: { label: 'Stable', changeBase: 1, band: 'Moderate' },
  declining: { label: 'Declining', changeBase: -16, band: 'Low' },
  review: { label: 'Needs context', changeBase: -4, band: 'Variable' },
  insufficient: { label: 'Insufficient data', changeBase: 0, band: 'Unknown' },
}

const DIAGNOSES = [
  'Schizophrenia',
  'Bipolar affective disorder',
  'Major depressive disorder',
  'Obsessive-compulsive disorder',
  'Schizoaffective disorder',
  'First-episode psychosis',
  'Generalised anxiety disorder',
  'Adjustment disorder',
]

export const LIGHTWEIGHT_WARD_PERSONAS = STATUS_SEQUENCE.map((status, index) => {
  const number = index + 4
  const config = STATUS_CONFIG[status]
  const variation = ((number * 7) % 9) - 4
  const completeness = status === 'insufficient' ? 42 + (number % 3) * 8 : 84 + (number % 6) * 3
  return {
    id: `PT-${String(number).padStart(3, '0')}`,
    displayName: `Ward patient ${String(number).padStart(2, '0')}`,
    age: 19 + ((number * 7) % 48),
    sex: number % 2 === 0 ? 'Female' : 'Male',
    diagnosis: DIAGNOSES[(number * 3) % DIAGNOSES.length],
    admissionDays: 3 + ((number * 11) % 58),
    assignedCubicle: `Cubicle #${((number - 1) % 4) + 1}`,
    status,
    statusLabel: config.label,
    participationBand: config.band,
    changePercent: status === 'insufficient' ? null : config.changeBase + variation,
    structuredSessions: status === 'insufficient' ? null : Math.max(0, ((number * 3) % 7) + (status === 'improving' ? 2 : 0)),
    spacesUsed: status === 'insufficient' ? null : 2 + ((number * 5) % 7),
    dataCompleteness: Math.min(99, completeness),
    reviewReason: status === 'declining'
      ? 'Reduced participation signal across recent 7 days'
      : status === 'review'
        ? 'Mixed space-use and documentation signals'
        : status === 'insufficient'
          ? 'Insufficient passive data for trajectory'
          : status === 'improving'
            ? 'Broader ward-space participation'
            : 'No material participation change detected',
  }
})

export const DETAILED_WARD_SUMMARIES = [
  { id: 'PT-001', displayName: 'Patient A', age: 34, sex: 'Male', diagnosis: 'Schizophrenia', admissionDays: 14, assignedCubicle: 'Cubicle #1', status: 'improving', statusLabel: 'Improving', participationBand: 'Moderate', changePercent: 31, structuredSessions: 5, spacesUsed: 7, dataCompleteness: 98, reviewReason: 'Broader participation across ward spaces' },
  { id: 'PT-002', displayName: 'Patient B', age: 28, sex: 'Female', diagnosis: 'Obsessive-compulsive disorder', admissionDays: 90, assignedCubicle: 'Cubicle #3', status: 'review', statusLabel: 'Needs context', participationBand: 'Low', changePercent: 8, structuredSessions: 4, spacesUsed: 5, dataCompleteness: 97, reviewReason: 'Morning routine continues to affect participation' },
  { id: 'PT-003', displayName: 'Patient C', age: 47, sex: 'Male', diagnosis: 'Hypomania', admissionDays: 14, assignedCubicle: 'Cubicle #4', status: 'improving', statusLabel: 'Improving', participationBand: 'Variable', changePercent: 19, structuredSessions: 3, spacesUsed: 8, dataCompleteness: 96, reviewReason: 'Roaming and overnight pattern settling' },
]

export const WARD_PARTICIPATION_SUMMARIES = [...DETAILED_WARD_SUMMARIES, ...LIGHTWEIGHT_WARD_PERSONAS]
