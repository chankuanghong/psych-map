const baseUrl = process.argv[2] || 'http://127.0.0.1:5182'

const patients = {
  A: { patientId: 'PT-001', folderId: 'pf_7f3a1c' },
  B: { patientId: 'PT-002', folderId: 'pf_91bd42' },
  C: { patientId: 'PT-003', folderId: 'pf_c84e57' },
}
const days = (from, to) => Array.from({ length: to - from + 1 }, (_, index) => from + index)

const allCases = [
  { id: 'A1', patient: 'A', conversationId: 'evaluation_patient_a', range: [7, 14], question: 'How has participation in activities changed during the selected period?', expect: 'answered' },
  { id: 'A2', patient: 'A', conversationId: 'evaluation_patient_a', range: [1, 14], question: 'What interactions with staff, peers, or caregivers were documented after the medication change?', expect: 'needs_clarification' },
  { id: 'A2-followup', patient: 'A', conversationId: 'evaluation_patient_a', range: [1, 14], expectedRange: [5, 14], question: 'Use the Day 5 medication change.', expect: 'answered', answerPattern: /staff|peer|caregiver/i, factPattern: /fact:source:interaction/ },
  { id: 'B1', patient: 'B', conversationId: 'evaluation_patient_b', range: [15, 45], question: 'How did the daily routine change around structured sessions?', expect: 'answered', answerPattern: /routine|shower/i },
  { id: 'B2', patient: 'B', conversationId: 'evaluation_patient_b', range: [15, 45], question: 'Have scheduled medication doses been taken?', expect: 'answered', expectGap: true },
  { id: 'C1', patient: 'C', conversationId: 'evaluation_patient_c', range: [1, 14], question: 'What changes were documented in overnight activity and rest patterns?', expect: 'answered' },
  { id: 'C2', patient: 'C', conversationId: 'evaluation_patient_c', range: [4, 12], question: 'After a medication change, how has participation in activities changed?', expect: 'needs_clarification' },
  { id: 'C2-followup', patient: 'C', conversationId: 'evaluation_patient_c', range: [4, 12], expectedRange: [7, 12], question: 'Use the Day 7 medication change.', expect: 'answered' },
  { id: 'C3', patient: 'C', conversationId: 'evaluation_patient_c', range: [4, 12], question: 'Which daily routines may need support before discharge?', expect: 'answered', answerPattern: /patient.s preferences|support requirements/i },
]
const requestedIds = new Set(String(process.argv[3] || '').split(',').filter(Boolean))
const cases = requestedIds.size ? allCases.filter(testCase => requestedIds.has(testCase.id)) : allCases

const results = []
for (const testCase of cases) {
  const patient = patients[testCase.patient]
  const response = await fetch(`${baseUrl}/api/insight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...patient,
      conversationId: testCase.conversationId,
      question: testCase.question,
      range: testCase.range,
      selectedDays: days(...testCase.range),
      professionId: testCase.patient === 'B' ? 'occupational_therapy' : 'psychiatry',
      professionLabel: testCase.patient === 'B' ? 'Occupational therapist' : 'Doctor',
      uiContext: { visibleMetricIds: [], focusedZoneId: null },
    }),
  })
  const payload = await response.json()
  const expectedRange = testCase.expectedRange || testCase.range
  const checks = {
    httpOk: response.ok,
    expectedStatus: payload.status === testCase.expect,
    realCodeBuddy: testCase.expect === 'needs_clarification' || (payload.provider === 'CodeBuddy evidence selector' && !payload.selectorWarning),
    deterministicVerification: testCase.expect === 'needs_clarification' || payload.verification?.status === 'pass',
    secondCodeBuddyReview: testCase.expect === 'needs_clarification' || payload.evidenceReview?.status === 'pass',
    patientScope: payload.snapshot?.patientId === patient.patientId,
    scopeMatches: payload.scopeResolution?.range?.[0] === expectedRange[0] && payload.scopeResolution?.range?.[1] === expectedRange[1],
    evidenceCited: testCase.expect === 'needs_clarification' || testCase.expectGap || (payload.citedSources?.length || 0) > 0,
    gapHandled: !testCase.expectGap || payload.verification?.answerability === 'not_answerable_from_available_data',
    answerRelevant: !testCase.answerPattern || testCase.answerPattern.test(payload.answer || ''),
    factTypeRelevant: !testCase.factPattern || (payload.verification?.usedFacts || []).some(fact => testCase.factPattern.test(fact.id)),
  }
  results.push({
    id: testCase.id,
    patient: testCase.patient,
    question: testCase.question,
    status: payload.status,
    provider: payload.provider,
    checks,
    passed: Object.values(checks).every(Boolean),
    resolvedScope: payload.scopeResolution,
    clarification: payload.clarification || null,
    answer: payload.answer,
    selectedFactIds: payload.verification?.usedFacts?.map(fact => fact.id) || [],
    citedSourceIds: payload.citedSources?.map(source => source.id) || [],
    actions: payload.actions || [],
    rejectedActions: payload.rejectedActions || [],
    conversation: payload.conversation || null,
    evidenceReview: payload.evidenceReview || null,
    error: payload.error || null,
  })
}

const summary = { totalCalls: results.length, passed: results.filter(result => result.passed).length, failed: results.filter(result => !result.passed).map(result => result.id), results }
console.log(JSON.stringify(summary, null, 2))
if (summary.failed.length) process.exitCode = 1
