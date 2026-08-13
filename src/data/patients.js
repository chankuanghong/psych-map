// Synthetic patient roster — no real patient data

export const PATIENTS = [
  {
    id: 'PT-001',
    displayName: 'Patient A',
    ward: 'Ward 4B — Acute Psychiatric',
    admissionDate: '2026-07-30',
    broadContext: 'Assigned to Cubicle #1. Early cubicle-bound pattern with later participation during a synthetic risperidone titration and OT activation; attribution is uncertain.',
    primaryDiagnosis: 'Schizophrenia',
    personaFocus: 'Improvement in participation',
    assignedCubicle: 'cubicle_1',
    isPrimaryDemo: true,
    age: 34,
    sex: 'Male',
    lengthOfStay: 14,
  },
  {
    id: 'PT-002',
    displayName: 'Patient B',
    ward: 'Ward 4B — Acute Psychiatric',
    admissionDate: '2026-07-30',
    broadContext: 'Assigned to Cubicle #3. A 90-day admission showing prolonged morning shower occupancy across synthetic sertraline titration and a structured routine plan, followed by gradual functional change.',
    primaryDiagnosis: 'Obsessive-compulsive disorder',
    personaFocus: 'Excessive morning shower duration',
    assignedCubicle: 'cubicle_3',
    isPrimaryDemo: false,
    age: 28,
    sex: 'Female',
    lengthOfStay: 90,
  },
  {
    id: 'PT-003',
    displayName: 'Patient C',
    ward: 'Ward 4B — Acute Psychiatric',
    admissionDate: '2026-07-30',
    broadContext: 'Assigned to Cubicle #4. Escalating movement and reduced overnight rest followed by improvement during a synthetic quetiapine titration; temporal association does not establish effect.',
    primaryDiagnosis: 'Hypomania',
    personaFocus: 'Social roaming followed by improvement',
    assignedCubicle: 'cubicle_4',
    isPrimaryDemo: false,
    age: 47,
    sex: 'Male',
    lengthOfStay: 14,
  },
]

export const getPrimaryPatient = () => PATIENTS.find(p => p.isPrimaryDemo)
