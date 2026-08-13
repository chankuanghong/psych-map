export const PROFESSIONS = [
  {
    id: 'ward_manager',
    name: 'Ward Manager',
    shortName: 'Manager',
    description: 'Prioritise ward-level participation, emerging deterioration, caseload distribution, data completeness and review allocation.',
  },
  {
    id: 'psychiatry',
    name: 'Psychiatrist',
    shortName: 'Psychiatry',
    description: 'Prioritise longitudinal mental-state context, medication chronology, risk-relevant change and uncertainty.',
  },
  {
    id: 'nursing',
    name: 'Nurse',
    shortName: 'Nursing',
    description: 'Prioritise shift-to-shift patterns, routines, overnight observations, self-care signals and escalation cues.',
  },
  {
    id: 'occupational_therapy',
    name: 'Occupational Therapist',
    shortName: 'OT',
    description: 'Prioritise occupational participation, routines, environmental engagement and barriers to meaningful activity.',
  },
  {
    id: 'psychology',
    name: 'Psychologist',
    shortName: 'Psychology',
    description: 'Prioritise behavioural patterns, possible maintaining contexts, uncertainty and questions for collaborative formulation.',
  },
  {
    id: 'social_work',
    name: 'Medical Social Worker',
    shortName: 'Social Work',
    description: 'Prioritise social participation, family or leave context, environmental supports and discharge-related functioning.',
  },
]

export const getProfession = id => PROFESSIONS.find(item => item.id === id) || PROFESSIONS[1]
