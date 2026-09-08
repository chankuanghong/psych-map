import test from 'node:test'
import assert from 'node:assert/strict'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { buildCodeBuddyArgs, CODEBUDDY_MANIFEST_SCHEMA_VERSION, CODEBUDDY_REVIEW_SCHEMA_VERSION, parseCodeBuddyEvidenceReview, parseCodeBuddyManifest, selectCodeBuddyCandidates, validateUiActions } from '../server/codebuddySelector.js'
import { getDirectorAnalytics, getSuggestions, importQuestions, matchIntent, reviewNovelIntentWithCodeBuddy, sanitizeForLearning } from '../simulation/question-learning.mjs'
import { buildGroundedBlindSpot, decideReviewItem, getReviewDashboard, openReviewStore, reviewAdaptiveCaseWithCodeBuddy } from '../simulation/review-engine.mjs'
import { logQuestion, migrateQuestionStore, validateQuestionInput } from '../simulation/question-store.mjs'
import { queryJson, resolvePatientDatabase } from '../simulation/patient-gate.mjs'
import { isQuestionCronEnabled, startQuestionScheduler } from '../simulation/question-scheduler.mjs'
import { DEMO_JOB_ORDER, runDemoJobs } from '../simulation/run-demo-jobs.mjs'
import { resolveQuestionScope } from '../server/questionScope.js'
import { clarificationSelection, medicationClarification } from '../server/insightApi.js'
import { buildEvidenceSnapshot, buildVerifiedResponse } from '../src/data/verifiedEvidence.js'

const here = dirname(fileURLToPath(import.meta.url))
const sourceSimulation = join(here, '..', 'simulation')
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'psychmap-questions-'))
  mkdirSync(join(root, 'patients'), { recursive: true })
  copyFileSync(join(sourceSimulation, 'registry.sqlite'), join(root, 'registry.sqlite'))
  for (const folder of ['pf_7f3a1c', 'pf_91bd42', 'pf_c84e57']) {
    mkdirSync(join(root, 'patients', folder), { recursive: true })
    copyFileSync(join(sourceSimulation, 'patients', folder, 'clinical.sqlite'), join(root, 'patients', folder, 'clinical.sqlite'))
  }
  return root
}

test('patient/folder gate isolates stores and malformed scope is rejected', () => {
  const root = fixture()
  assert.throws(() => resolvePatientDatabase('PT-003', 'pf_91bd42', root), /mismatch/)
  assert.throws(() => validateQuestionInput({ question: 'x', professionId: 'psychiatry', range: [1, 2], selectedDays: [3] }), /selected days/)
})

test('logs exact synthetic clinician question with UTC and Singapore minute time', () => {
  const root = fixture()
  const receipt = logQuestion({ patientId: 'PT-003', folderId: 'pf_c84e57', question: '  What changed overnight? ', professionId: 'nursing', professionLabel: 'Nurse', range: [7, 11], selectedDays: [7, 9, 11], uiContext: { visibleMetricIds: ['overnightRestProxyMins'] } }, { root, questionUuid: 'test-question-001', askedAt: new Date('2026-09-04T02:30:59.999Z') })
  const row = queryJson(receipt.questionsPath, "SELECT * FROM questions WHERE question_uuid='test-question-001'")[0]
  assert.equal(row.patient_id, 'PT-003')
  assert.equal(row.synthetic_user_id, 'DR-DEMO-001')
  assert.equal(row.asked_at_utc, '2026-09-04T02:30:59.999Z')
  assert.equal(row.asked_at_singapore, '2026-09-04 10:30')
  assert.equal(row.processing_status, 'pending')
})

test('deterministic duplicate matching distinguishes exact and novel intents', () => {
  const existing = [{ intent_id: 'one', canonical_question: 'has participation improved in this period', category: 'participation' }]
  assert.equal(matchIntent('Has participation improved in this period?', existing).matchType, 'exact')
  assert.equal(matchIntent('What family context matters for discharge?', existing).isNew, true)
})

test('nightly CodeBuddy review can only choose an allowlisted category or existing intent', () => {
  const existing = [{ intent_id: 'known', canonical_question: 'how has participation changed', category: 'participation' }]
  const matched = matchIntent('Did engagement improve after activities?', existing)
  const reviewed = reviewNovelIntentWithCodeBuddy(matched, existing, { env: { CODEBUDDY_QUESTION_SCAN_ENABLED: 'true' }, run: () => ({ status: 0, stdout: JSON.stringify({ category: 'participation', intentId: 'known' }) }) })
  assert.equal(reviewed.matched.intent.intent_id, 'known')
  assert.equal(reviewed.matched.isNew, false)
  const escaped = reviewNovelIntentWithCodeBuddy(matched, existing, { env: { CODEBUDDY_QUESTION_SCAN_ENABLED: 'true' }, run: () => ({ status: 0, stdout: JSON.stringify({ category: 'diagnosis', intentId: 'invented' }) }) })
  assert.equal(escaped.provider, 'deterministic_fallback')
  assert.deepEqual(escaped.matched, matched)
})

test('weekly CodeBuddy calibration review is a bounded classification, not a threshold author', () => {
  const evidence = { caseRef: 'case_demo', diagnosis: 'Synthetic diagnosis', observedDays: 14, spatial: { outsideBedroomMins: [10, 30], activityMins: [5, 20], overnightRestProxyMins: [400, 360], otherCubicleMins: [0, 5] }, clinicianAssessment: { direction: 'improving' }, assessmentCount: 1 }
  const reviewed = reviewAdaptiveCaseWithCodeBuddy(evidence, { env: { CODEBUDDY_RESEARCH_ENABLED: 'true' }, run: () => ({ status: 0, stdout: JSON.stringify({ alignment: 'aligned', evidenceKeys: ['clinician_direction', 'outside_change'] }) }) })
  assert.deepEqual(reviewed.evidenceKeys, ['clinician_direction', 'outside_change'])
  assert.equal(reviewed.alignment, 'aligned')
  const escaped = reviewAdaptiveCaseWithCodeBuddy(evidence, { env: { CODEBUDDY_RESEARCH_ENABLED: 'true' }, run: () => ({ status: 0, stdout: JSON.stringify({ alignment: 'aligned', evidenceKeys: ['new_sensor_claim'] }) }) })
  assert.equal(escaped.provider, 'deterministic_fallback')
  assert.equal(escaped.alignment, 'unclear')
  const inconsistent = reviewAdaptiveCaseWithCodeBuddy(evidence, { env: { CODEBUDDY_ENABLED: 'true' }, run: () => ({status:0,stdout:JSON.stringify({alignment:'aligned',clinicianDirection:'unclear',evidenceKeys:['clinician_direction']})}) })
  assert.equal(inconsistent.provider,'deterministic_fallback')
  assert.equal(inconsistent.alignment,'unclear')
})

test('supplementary blind spots must resolve to a different patient-scoped source fact', () => {
  const root = fixture()
  const snapshot = buildEvidenceSnapshot('PT-003', [1, 14], Array.from({ length: 14 }, (_, index) => index + 1))
  const direct = snapshot.facts.filter(fact => fact.metricId === 'activityMins').map(fact => fact.id)
  const pointer = buildGroundedBlindSpot({ snapshot, question: 'How did activity change?', professionId: 'psychiatry', directFactIds: direct, questionUuid: 'grounded-pointer-test', patientId: 'PT-003', root })
  assert.ok(pointer)
  assert.ok(snapshot.facts.some(fact => fact.id === pointer.factId && fact.sourceRecordIds.length > 0))
  assert.equal(direct.includes(pointer.factId), false)
})

test('admin review decisions persist notes without changing thresholds automatically', () => {
  const root = mkdtempSync(join(tmpdir(), 'psychmap-review-'))
  const db = openReviewStore(root)
  db.prepare(`INSERT INTO review_items
    (review_id, kind, profession_id, category, diagnosis, title, summary, recommendation, evidence_json, created_at_utc)
    VALUES ('threshold-test', 'threshold_review', NULL, 'longitudinal_change', 'Synthetic diagnosis', 'Review', 'Finding', 'Suggestion', '{}', '2026-09-06T00:00:00.000Z')`).run()
  db.close()
  decideReviewItem('threshold-test', 'accepted', 'Keep in shadow review.', root)
  const item = getReviewDashboard(root).items.find(candidate => candidate.review_id === 'threshold-test')
  assert.equal(item.status, 'accepted')
  assert.equal(item.admin_note, 'Keep in shadow review.')
  assert.equal(getReviewDashboard(root).policies.some(policy => policy.source === 'Administrator-approved review item' && policy.category === 'longitudinal_change'), false)
})

test('admin review shows only the newest pending proposal for each topic', () => {
  const root = mkdtempSync(join(tmpdir(), 'psychmap-review-dedupe-'))
  const db = openReviewStore(root)
  const insert = db.prepare(`INSERT INTO review_items
    (review_id, kind, profession_id, category, diagnosis, title, summary, recommendation, evidence_json, created_at_utc)
    VALUES (?, 'blind_spot', 'psychiatry', 'overnight_rest_proxy', NULL, ?, 'Finding', 'Suggestion', '{}', ?)`)
  insert.run('older-pending', 'Older proposal', '2026-09-01T00:00:00.000Z')
  insert.run('newer-pending', 'Newer proposal', '2026-09-02T00:00:00.000Z')
  db.close()
  const matching = getReviewDashboard(root).items.filter(item => item.status === 'pending' && item.profession_id === 'psychiatry' && item.category === 'overnight_rest_proxy')
  assert.deepEqual(matching.map(item => item.review_id), ['newer-pending'])
  decideReviewItem('newer-pending', 'ignored', 'Reviewed this class once.', root)
  const remaining = getReviewDashboard(root).items.filter(item => item.status === 'pending' && item.profession_id === 'psychiatry' && item.category === 'overnight_rest_proxy')
  assert.equal(remaining.length, 0, 'A hidden older proposal must not reappear after the newest is reviewed')
})

test('supplementary pointers do not repeat a metric already present in the answer', () => {
  const root = fixture()
  const db = openReviewStore(root)
  db.prepare('UPDATE profession_topic_policies SET active=0 WHERE profession_id=? AND category!=?').run('psychiatry', 'family_visitor_context')
  db.close()
  const snapshot = buildEvidenceSnapshot('PT-003', [7, 11], [7, 8, 9, 10, 11])
  const visitorFact = snapshot.facts.find(fact => fact.metricId === 'visitorMins')
  assert.ok(visitorFact)
  const pointer = buildGroundedBlindSpot({ snapshot, question: 'What changed?', professionId: 'psychiatry', directFactIds: [visitorFact.id], root })
  assert.ok(!pointer || snapshot.facts.find(fact => fact.id === pointer.factId).metricId !== 'visitorMins')
  assert.equal(buildGroundedBlindSpot({ snapshot, question: 'Were there caregiver visits?', professionId: 'psychiatry', root }), null)
})

test('approving a blind-spot class activates it while rejecting one leaves it inactive', () => {
  const root = mkdtempSync(join(tmpdir(), 'psychmap-policy-review-'))
  const db = openReviewStore(root)
  const insert = db.prepare(`INSERT INTO review_items
    (review_id, kind, profession_id, category, diagnosis, title, summary, recommendation, evidence_json, created_at_utc)
    VALUES (?, 'blind_spot', ?, ?, NULL, 'Review', 'Finding', 'Suggestion', '{"questions":[]}', '2026-09-06T00:00:00.000Z')`)
  insert.run('approve-class', 'social_work', 'overnight_rest_proxy')
  insert.run('reject-class', 'ward_manager', 'location_roaming')
  db.close()
  decideReviewItem('approve-class', 'accepted', '', root)
  decideReviewItem('reject-class', 'ignored', '', root)
  const policies = getReviewDashboard(root).policies
  assert.equal(policies.some(policy => policy.profession_id === 'social_work' && policy.category === 'overnight_rest_proxy' && policy.active === 1), true)
  assert.equal(policies.some(policy => policy.profession_id === 'ward_manager' && policy.category === 'location_roaming' && policy.active === 1), false)
})

test('time-window wording changes scope without splitting the underlying question group', () => {
  const availableDays = Array.from({ length: 14 }, (_, index) => index + 1)
  assert.deepEqual(resolveQuestionScope('How has participation changed over the past seven days?', { range: [1, 14], selectedDays: availableDays, availableDays }).range, [8, 14])
  assert.deepEqual(resolveQuestionScope('How has participation changed from Day 3 to Day 7?', { range: [1, 14], selectedDays: availableDays, availableDays }).range, [3, 7])
  assert.deepEqual(resolveQuestionScope('How has participation changed from 2026-08-03 to 2026-08-08?', { range: [1, 14], selectedDays: availableDays, availableDays }).range, [5, 10])
  const existing = [{ intent_id: 'participation', canonical_question: 'how has participation in activities changed during the selected period', category: 'participation' }]
  assert.equal(matchIntent('How has participation in activities changed during the past seven days?', existing).isNew, false)
})

test('hour wording is resolved against the latest available record in Singapore time', () => {
  const availableDays = Array.from({ length: 14 }, (_, index) => index + 1)
  const latestDataAt = '2026-08-12T14:00:00.000Z'
  const recent = resolveQuestionScope('Where was the patient during the past three hours?', { range: [1, 14], selectedDays: availableDays, availableDays, latestDataAt, now: new Date('2026-09-05T04:00:00.000Z') })
  assert.deepEqual(recent.range, [14, 14])
  assert.deepEqual(recent.timeScope, { mode: 'rolling_hours', fromAtUtc: '2026-08-12T11:00:00.000Z', toAtUtc: latestDataAt, hours: 3 })
  assert.equal(recent.timeEvidence.timeZone, 'Asia/Singapore')
  assert.equal(recent.timeEvidence.utcOffset, '+08:00')
  assert.equal(recent.timeEvidence.relativeAnchor, 'latest_available_data')
  assert.equal(recent.timeEvidence.generatedAtLocal24, '2026-09-05 12:00')

  const clock = resolveQuestionScope('What happened between 10am and 2pm?', { range: [8, 14], selectedDays: [8, 9, 10, 11, 12, 13, 14], availableDays, latestDataAt })
  assert.deepEqual(clock.timeScope, { mode: 'daily_time_window', fromMinute: 600, toMinute: 840, label: '10:00–14:00' })
})

test('hour-scoped snapshots expose only source-record facts rather than full-day aggregates', () => {
  const timeScope = { mode: 'rolling_hours', fromAtUtc: '2026-08-12T11:00:00.000Z', toAtUtc: '2026-08-12T14:00:00.000Z', hours: 3 }
  const snapshot = buildEvidenceSnapshot('PT-003', [14, 14], [14], { timeScope })
  assert.ok(snapshot.sources.length > 0)
  assert.ok(snapshot.facts.length > 0)
  assert.ok(snapshot.facts.every(fact => !['daily_metric', 'period_comparison', 'endpoint_change'].includes(fact.kind)))
  assert.ok(snapshot.facts.every(fact => fact.sourceRecordIds.length > 0))
})

test('ambiguous medication wording produces bounded source-backed choices', () => {
  const snapshot = buildEvidenceSnapshot('PT-001', [1, 14], Array.from({ length: 14 }, (_, index) => index + 1))
  const clarification = medicationClarification('What interactions were documented after the medication change?', snapshot)
  assert.equal(clarification.code, 'SELECT_MEDICATION_EVENT')
  assert.deepEqual(clarification.options.map(option => option.day), [1, 3, 5])
  assert.equal(clarificationSelection('Use the Day 5 medication change.', clarification).day, 5)
  assert.equal(clarificationSelection('Use another patient.', clarification), null)
})

test('CodeBuddy candidates prioritize the record type named by the question', () => {
  const snapshot = buildEvidenceSnapshot('PT-001', [5, 14], Array.from({ length: 10 }, (_, index) => index + 5))
  const candidates = selectCodeBuddyCandidates('What interactions with staff and peers were documented? Clarification: use Day 5 as the reference event.', snapshot)
  assert.equal(candidates[0].kind, 'interaction_event')
  assert.ok(candidates.some(fact => fact.kind === 'interaction_event' && fact.day === 14))
})

test('unsupported medication-administration questions state the data gap', () => {
  const snapshot = buildEvidenceSnapshot('PT-002', [15, 45], Array.from({ length: 31 }, (_, index) => index + 15))
  const factId = snapshot.facts.find(fact => fact.kind === 'clinical_event').id
  const response = buildVerifiedResponse('Have scheduled medication doses been taken?', snapshot, { factIds: [factId] }, 'psychiatry')
  assert.equal(response.verification.answerability, 'not_answerable_from_available_data')
  assert.equal(response.verification.status, 'pass')
  assert.equal(response.verification.usedFacts.length, 0)
  assert.match(response.answer, /no medication-administration record/i)
  assert.match(response.answer, /cannot be determined/i)
})

test('discharge-support answers state the patient-perspective limitation', () => {
  const snapshot = buildEvidenceSnapshot('PT-003', [4, 12], Array.from({ length: 9 }, (_, index) => index + 4))
  const factId = snapshot.facts.find(fact => fact.metricId === 'activityMins' && fact.kind === 'endpoint_change').id
  const response = buildVerifiedResponse('Which daily routines may need support before discharge?', snapshot, { factIds: [factId] }, 'social_work')
  assert.match(response.answer, /patient.s preferences or actual support requirements/i)
})

test('work-oriented care questions retain useful meaning and categories', () => {
  assert.equal(matchIntent('How has the time spent in the shower changed?', []).category, 'routine_self_care_proxy')
  assert.equal(matchIntent('Have caregivers visited during the selected period?', []).category, 'family_visitor_context')
  assert.equal(matchIntent('After a medication change, what changes were recorded in vital signs?', []).category, 'medication_chronology')
  assert.equal(matchIntent('Which activities did the patient join or leave early?', []).category, 'participation')
  assert.equal(matchIntent('Which daily routines need support before discharge?', []).category, 'discharge_support_planning')
  assert.match(sanitizeForLearning('Has the patient been going to the dining area for meals?'), /dining area for meals/)
})

test('one-shot importer is idempotent, de-identified and provides profession rankings/exclusions', () => {
  const root = fixture()
  const common = { patientId: 'PT-003', folderId: 'pf_c84e57', professionId: 'psychiatry', professionLabel: 'Psychiatrist', range: [1, 14], selectedDays: [1, 2] }
  logQuestion({ ...common, question: 'What was documented during the DAV episode?', uiContext: {} }, { root, questionUuid: 'import-001', askedAt: new Date('2026-09-03T01:00:00Z') })
  logQuestion({ ...common, question: 'What was documented during the DAV episode?', uiContext: {} }, { root, questionUuid: 'import-002', askedAt: new Date('2026-09-04T01:00:00Z') })
  logQuestion({ ...common, question: 'Does PT-003 with hypomania have missing data?', uiContext: {} }, { root, questionUuid: 'import-003', askedAt: new Date('2026-09-04T02:00:00Z') })
  const first = importQuestions({ root, now: new Date('2026-09-04T18:00:00Z') })
  const second = importQuestions({ root, now: new Date('2026-09-04T18:01:00Z') })
  assert.deepEqual([first.imported, first.newIntents, first.repeats], [3, 2, 1])
  assert.equal(second.imported, 0)
  const analytics = getDirectorAnalytics(root)
  assert.equal(analytics.totals.question_count, 3)
  assert.ok(analytics.topByProfession.some(row => row.profession_id === 'psychiatry' && row.count === 2))
  assert.ok(analytics.professionCategoryMix.some(row => row.profession_id === 'psychiatry' && row.category === 'documented_dav_context' && row.questions === 2))
  assert.ok(analytics.dataNeeds.length > 0)
  assert.ok(analytics.dataNeeds.every(item => item.recommendation))
  const suggestions = getSuggestions({ professionId: 'psychiatry', currentQuestion: 'What was documented during the DAV episode?', excluded: ['does subject with diagnosis have missing data'], root })
  assert.equal(suggestions.length, 0)
  const dbText = readFileSync(first.databasePath).toString('utf8')
  for (const forbidden of ['PT-003', 'pf_c84e57', 'hypomania']) assert.equal(dbText.includes(forbidden), false)
  assert.equal(sanitizeForLearning('Does PT-003 with hypomania have missing data?').includes('pt 003'), false)
  assert.equal(sanitizeForLearning('What changed for John Doe with an unlisted diagnosis?').includes('john'), false)
})

test('CodeBuddy contract parses strict JSON and rejects unsafe/cross-scope actions', () => {
  const manifest = { schemaVersion: CODEBUDDY_MANIFEST_SCHEMA_VERSION, factIds: ['fact:one'], actions: [{ type: 'set_day_range', fromDay: 2, toDay: 4 }, { type: 'focus_zone', zoneId: '../secret' }, { type: 'delete_file' }] }
  assert.deepEqual(parseCodeBuddyManifest(JSON.stringify({ result: JSON.stringify(manifest) })).factIds, ['fact:one'])
  const validated = validateUiActions(manifest.actions, { availableDays: [1, 2, 3, 4] })
  assert.equal(validated.accepted.length, 1)
  assert.equal(validated.rejected.length, 2)
  const args = buildCodeBuddyArgs('{}')
  assert.equal(args[args.indexOf('--tools') + 1], '')
  assert.equal(args[args.indexOf('--max-turns') + 1], '1')
  assert.equal(args.includes('--temperature'), false)
  assert.equal(args.includes('--json-schema'), false)
  assert.equal(args.some(arg => /Bash|Write|Edit|WebFetch/.test(arg)), false)
})

test('CodeBuddy contract parses the current CLI event-array envelope', () => {
  const manifest = { schemaVersion: CODEBUDDY_MANIFEST_SCHEMA_VERSION, factIds: ['fact:one'], actions: [] }
  const output = JSON.stringify([{ type: 'message', role: 'assistant' }, { type: 'result', subtype: 'success', result: `\`\`\`json\n${JSON.stringify(manifest)}\n\`\`\`` }])
  assert.deepEqual(parseCodeBuddyManifest(output), manifest)
})

test('CodeBuddy contract parses a fenced text manifest without the verbose event stream', () => {
  const manifest = { schemaVersion: CODEBUDDY_MANIFEST_SCHEMA_VERSION, factIds: [], actions: [] }
  assert.deepEqual(parseCodeBuddyManifest(`\`\`\`json\n${JSON.stringify(manifest)}\n\`\`\``), manifest)
})

test('second CodeBuddy review must substantiate every selected evidence fact', () => {
  const selected = ['fact:one', 'fact:two']
  const pass = { schemaVersion: CODEBUDDY_REVIEW_SCHEMA_VERSION, verdict: 'pass', supportedFactIds: selected, issueCodes: [] }
  assert.equal(parseCodeBuddyEvidenceReview(JSON.stringify(pass), selected).status, 'pass')
  assert.equal(parseCodeBuddyEvidenceReview(JSON.stringify({ ...pass, supportedFactIds: ['fact:one'] }), selected).status, 'fail')
  assert.throws(() => parseCodeBuddyEvidenceReview(JSON.stringify({ ...pass, supportedFactIds: ['fact:other'] }), selected), /allowlist/)
})

test('question scheduler is disabled by default and prevents overlapping daily runs', async () => {
  assert.equal(isQuestionCronEnabled({}), false)
  const disabled = startQuestionScheduler({ env: {} })
  assert.equal(disabled.enabled, false)
  let release; let calls = 0
  const scheduler = startQuestionScheduler({ env: { QUESTION_CRON_ENABLED: 'true' }, intervalMs: 3_600_000, now: () => new Date('2026-09-04T18:00:00Z'), run: () => { calls += 1; return new Promise(resolve => { release = resolve }) } })
  const first = scheduler.tick(); const second = await scheduler.tick()
  assert.equal(second, false); assert.equal(calls, 1)
  release(); assert.equal(await first, true)
  assert.equal(await scheduler.tick(), false)
  scheduler.stop()
})

test('manual demo orchestration runs every prerequisite and the scheduled importer in order', () => {
  const root = fixture()
  const progress = []
  const result = runDemoJobs({ root, now: new Date('2026-09-04T18:00:00.000Z'), report: event => progress.push(event) })
  assert.equal(result.status, 'completed')
  assert.equal(result.synthetic, true)
  assert.deepEqual(result.results.map(step => step.name), [...DEMO_JOB_ORDER])
  assert.deepEqual(progress.filter(event => event.type === 'step_completed').map(event => event.name), [...DEMO_JOB_ORDER])
  assert.equal(result.results[2].result.inserted, 36)
  assert.equal(result.results[3].result.imported, 36)
  assert.equal(result.verification.status, 'passed')
  assert.equal(result.verification.pendingQuestions, 0)
  assert.equal(result.verification.questionsLearned, 36)
  assert.match(readFileSync(join(root, 'organization', 'QUESTION_CATALOG.md'), 'utf8'), /Aggregated synthetic analytics only/)
})

test('manual demo orchestration rejects an overlapping run before doing work', () => {
  const root = fixture()
  writeFileSync(join(root, '.question-learning-job.lock'), '{"pid":123,"startedAtUtc":"synthetic-test"}')
  assert.throws(() => runDemoJobs({ root }), /already running/)
})
