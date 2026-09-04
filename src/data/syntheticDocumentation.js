// Fictional clinical documentation and visitor forms for demonstration only.
// No record represents a real person, clinician, encounter, or hospital system.

export const SYNTHETIC_CLINICAL_DOCUMENTS = [
  {
    documentId: 'DOC-PT001-ADM-01', patientId: 'PT-001', day: 1,
    seenAt: '2026-07-30T10:00:00+08:00', signedAt: '2026-07-30T11:05:00+08:00',
    discipline: 'Psychiatry', authorRole: 'Registrar', noteType: 'Admission note', noteFormat: 'Psychiatric admission assessment',
    title: 'Psychiatric admission assessment', source: 'Synthetic EPIC note', synthetic: true,
    sections: [
      { label: 'Presenting concern', text: 'Patient described reduced drive, spending most of the day alone, and difficulty initiating usual activities.' },
      { label: 'History and context', text: 'Family reported a gradual reduction in usual activity before admission. Initial ward observations recorded limited time outside the assigned cubicle.' },
      { label: 'Mental state examination', text: 'Engaged briefly with interview and gave short responses. Affect appeared constricted. No behavioural disturbance was observed during the assessment.' },
      { label: 'Risk assessment', text: 'Denied current intent to harm self or others during this review. Risk remains subject to ongoing multidisciplinary assessment.' },
      { label: 'Clinical impression', text: 'Reduced initiation and social withdrawal require longitudinal observation. Admission assessment alone does not establish the cause of the behavioural pattern.' },
      { label: 'Plan', text: 'Continue nursing observations, establish baseline ward participation, review medication and invite OT functional assessment.' },
    ],
  },
  {
    documentId: 'DOC-PT001-OT-09', patientId: 'PT-001', day: 9,
    seenAt: '2026-08-07T09:30:00+08:00', signedAt: '2026-08-07T11:20:00+08:00',
    discipline: 'OT', authorRole: 'Occupational Therapist', noteType: 'SOAP note', noteFormat: 'SOAP',
    title: 'Meal preparation — egg mayonnaise sandwich', source: 'Synthetic EPIC note', synthetic: true,
    subjective: 'Patient agreed to prepare a simple snack and stated, “I can try if the steps are written down.” Reported making sandwiches occasionally before admission.',
    objective: 'Attended the 45-minute kitchen session. Gathered bread, egg, mayonnaise and utensils from a written checklist. Required one verbal prompt to sequence egg peeling and mixing. Prepared and plated one sandwich, cleaned the work area with two prompts, and remained in the session throughout.',
    assessment: 'Demonstrated initiation with structure and completed a familiar multistep task. Performance supports emerging task participation; one session does not establish independent meal-management ability.',
    plan: 'Repeat a familiar cold-meal task with fewer prompts and review carry-over to the ward breakfast routine.',
  },
  {
    documentId: 'DOC-PT001-MSW-12', patientId: 'PT-001', day: 12,
    seenAt: '2026-08-10T15:00:00+08:00', signedAt: '2026-08-10T16:15:00+08:00',
    discipline: 'MSW', authorRole: 'Medical Social Worker', noteType: 'Family session note', noteFormat: 'Family session record',
    title: 'Family meeting with sister', source: 'Synthetic EPIC note', synthetic: true,
    sections: [
      { label: 'Attendees and purpose', text: 'Patient, sister and Medical Social Worker met to clarify family support, visit preferences and practical discharge needs.' },
      { label: 'Family perspective', text: 'Sister reported that the patient previously joined family meals but had withdrawn during the month before admission. She identified transport availability for post-discharge appointments.' },
      { label: 'Patient perspective', text: 'Patient said short visits felt manageable but longer conversations were tiring. He agreed to one further brief visit.' },
      { label: 'Session observation', text: 'Patient attended 30 minutes of the planned session and answered direct questions. Family contact appears available; preference for time-limited interaction should not be interpreted as unwillingness to engage.' },
      { label: 'Agreed actions', text: 'Arrange a 30-minute follow-up visit, provide the ward contact pathway, and bring practical support needs to MDT review.' },
    ],
  },
  {
    documentId: 'DOC-PT002-ADM-01', patientId: 'PT-002', day: 1,
    seenAt: '2026-07-30T11:00:00+08:00', signedAt: '2026-07-30T12:10:00+08:00',
    discipline: 'Psychiatry', authorRole: 'Consultant Psychiatrist', noteType: 'Admission note', noteFormat: 'Psychiatric admission assessment',
    title: 'Admission assessment — washing routine disruption', source: 'Synthetic EPIC note', synthetic: true,
    sections: [
      { label: 'Presenting concern', text: 'Patient described contamination concerns and repeated washing that delayed meals and leaving home. She requested privacy when discussing the content of the concerns.' },
      { label: 'Functional history', text: 'Morning routines had become progressively longer and were affecting punctuality, meals and community participation.' },
      { label: 'Mental state examination', text: 'Cooperative with assessment and able to describe distress and functional impact. No conclusion about washing behaviour was drawn from location data.' },
      { label: 'Clinical impression', text: 'Reported repetitive washing is affecting daily routine. Functional impact and distress require multidisciplinary review.' },
      { label: 'Plan', text: 'Record morning routine with consent, commence medication review, and refer to OT for collaborative routine planning.' },
    ],
  },
  {
    documentId: 'DOC-PT002-OT-22', patientId: 'PT-002', day: 22,
    seenAt: '2026-08-20T09:30:00+08:00', signedAt: '2026-08-20T10:40:00+08:00',
    discipline: 'OT', authorRole: 'Occupational Therapist', noteType: 'SOAP note', noteFormat: 'SOAP',
    title: 'Graded morning-routine planning', source: 'Synthetic EPIC note', synthetic: true,
    subjective: 'Patient identified arriving at breakfast on time as her preferred functional goal and agreed to trial a visual sequence.',
    objective: 'Collaboratively produced a five-step morning plan and selected a time cue. Patient rehearsed the sequence verbally and identified two anticipated barriers.',
    assessment: 'Patient participated in goal setting and generated strategies. Effect on routine duration requires repeated observation.',
    plan: 'Trial for seven mornings with patient agreement; review distress, completion and breakfast attendance rather than location duration alone.',
  },
  {
    documentId: 'DOC-PT003-ADM-01', patientId: 'PT-003', day: 1,
    seenAt: '2026-07-30T10:00:00+08:00', signedAt: '2026-07-30T11:30:00+08:00',
    discipline: 'Psychiatry', authorRole: 'Registrar', noteType: 'Admission note', noteFormat: 'Psychiatric admission assessment',
    title: 'Admission assessment — elevated activation', source: 'Synthetic EPIC note', synthetic: true,
    sections: [
      { label: 'Presenting concern', text: 'Patient reported increased energy, reduced perceived need for rest and several new plans.' },
      { label: 'History and collateral', text: 'Referral information described recent increased activity and interpersonal friction. Further collateral was planned with consent.' },
      { label: 'Mental state examination', text: 'Speech was rapid and the interview required redirection. Ward movement was elevated, but movement data alone was not used to infer mental state.' },
      { label: 'Risk assessment', text: 'Denied current intent to harm self or others during the assessment. Ongoing review was required because presentation and context can change.' },
      { label: 'Clinical impression', text: 'Elevated activation and reduced rest require ongoing mental-state, physical-health and behavioural review.' },
      { label: 'Plan', text: 'Continue nursing observation, obtain collateral with consent, review medication, and monitor rest-related location signals as a behavioural proxy only.' },
    ],
  },
  {
    documentId: 'DOC-PT003-DAV-06', patientId: 'PT-003', day: 6,
    seenAt: '2026-08-04T16:50:00+08:00', signedAt: '2026-08-04T17:35:00+08:00',
    discipline: 'Nursing', authorRole: 'Registered Nurse', noteType: 'DAV nursing entry', noteFormat: 'Nursing event entry',
    title: 'Documented ward escalation following boundary setting', source: 'Synthetic EPIC note', synthetic: true,
    sections: [
      { label: 'Context', text: 'Boundary set regarding repeated entry into another patient’s cubicle.' },
      { label: 'Patient account', text: 'Patient stated that staff were “stopping me from talking to people”.' },
      { label: 'Observed behaviour', text: 'Raised voice, made verbal threats toward a peer and struck the cubicle door twice. No physical contact or injury was observed.' },
      { label: 'Intervention', text: 'Staff used verbal de-escalation, reduced stimulation and offered the quiet area.' },
      { label: 'Outcome and handover', text: 'Patient accepted the quiet area and settled over approximately 20 minutes. Continue agreed observation level, offer post-incident review and hand over objective observations to the MDT. This historical entry does not determine current risk.' },
    ],
  },
  {
    documentId: 'DOC-PT003-MSW-09', patientId: 'PT-003', day: 9,
    seenAt: '2026-08-07T14:30:00+08:00', signedAt: '2026-08-07T15:25:00+08:00',
    discipline: 'MSW', authorRole: 'Medical Social Worker', noteType: 'Family session note', noteFormat: 'Family session record',
    title: 'Family session with spouse', source: 'Synthetic EPIC note', synthetic: true,
    sections: [
      { label: 'Attendees and purpose', text: 'Patient, spouse and Medical Social Worker attended a 35-minute facilitated session about practical concerns and family communication.' },
      { label: 'Family perspective', text: 'Spouse described concern about reduced rest and increased spending before admission. This is attributed collateral information.' },
      { label: 'Patient perspective', text: 'Patient agreed that practical financial safeguards could be discussed but did not agree to all proposed arrangements.' },
      { label: 'Areas of agreement and difference', text: 'Both agreed to postpone major purchases until after the next MDT review. Other proposed arrangements remained unresolved.' },
      { label: 'Agreed actions', text: 'Document the interim step, offer separate follow-up contacts, and review consent before sharing further clinical information.' },
    ],
  },
]

export const SYNTHETIC_VISITOR_FORMS = [
  {
    formId: 'VIS-PT001-01', patientId: 'PT-001', day: 8,
    submittedAt: '2026-08-06T13:42:00+08:00', visitDate: '2026-08-06',
    checkInAt: '2026-08-06T14:00:00+08:00', checkOutAt: '2026-08-06T14:35:00+08:00',
    visitorDisplayName: 'Ms L. Tan', relationship: 'Sister', purpose: 'Social visit', status: 'Completed',
    source: 'Synthetic FormSG visitor form', synthetic: true,
  },
  {
    formId: 'VIS-PT001-02', patientId: 'PT-001', day: 12,
    submittedAt: '2026-08-10T13:20:00+08:00', visitDate: '2026-08-10',
    checkInAt: '2026-08-10T14:20:00+08:00', checkOutAt: '2026-08-10T15:00:00+08:00',
    visitorDisplayName: 'Ms L. Tan', relationship: 'Sister', purpose: 'Pre-family-session visit', status: 'Completed',
    source: 'Synthetic FormSG visitor form', synthetic: true,
  },
  {
    formId: 'VIS-PT002-01', patientId: 'PT-002', day: 24,
    submittedAt: '2026-08-22T11:15:00+08:00', visitDate: '2026-08-22',
    checkInAt: '2026-08-22T15:00:00+08:00', checkOutAt: '2026-08-22T15:45:00+08:00',
    visitorDisplayName: 'Mr R. Lim', relationship: 'Father', purpose: 'Social visit', status: 'Completed',
    source: 'Synthetic FormSG visitor form', synthetic: true,
  },
  {
    formId: 'VIS-PT003-01', patientId: 'PT-003', day: 9,
    submittedAt: '2026-08-07T12:10:00+08:00', visitDate: '2026-08-07',
    checkInAt: '2026-08-07T13:45:00+08:00', checkOutAt: '2026-08-07T14:30:00+08:00',
    visitorDisplayName: 'Mr J. Lee', relationship: 'Spouse', purpose: 'Family-session visit', status: 'Completed',
    source: 'Synthetic FormSG visitor form', synthetic: true,
  },
]

export const getClinicalDocumentsForPatient = patientId => SYNTHETIC_CLINICAL_DOCUMENTS.filter(item => item.patientId === patientId)
export const getVisitorFormsForPatient = patientId => SYNTHETIC_VISITOR_FORMS.filter(item => item.patientId === patientId)
