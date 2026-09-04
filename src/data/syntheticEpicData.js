// Fictional structured assessments used to demonstrate an EPIC flowsheet feed.
// Scores are recorded observations only and are not interpreted diagnostically.

export const SYNTHETIC_MOCA_OBSERVATIONS = [
  { patientId: 'PT-001', day: 13, score: 24, maximum: 30, version: 'MoCA 8.1', source: 'Synthetic EPIC flowsheet' },
  { patientId: 'PT-002', day: 45, score: 26, maximum: 30, version: 'MoCA 8.2', source: 'Synthetic EPIC flowsheet' },
  { patientId: 'PT-003', day: 12, score: 25, maximum: 30, version: 'MoCA 8.1', source: 'Synthetic EPIC flowsheet' },
]

export const getMocaForPatient = patientId => SYNTHETIC_MOCA_OBSERVATIONS.filter(item => item.patientId === patientId)
