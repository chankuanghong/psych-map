import { createHash } from 'node:crypto'
import { buildEvidenceSnapshot, buildVerifiedResponse, selectFactsHeuristically } from '../src/data/verifiedEvidence.js'
import { computeDailyMetrics } from '../src/data/metricsEngine.js'
import { AVAILABLE_METRICS, AVAILABLE_ZONES, askCodeBuddy, askCodeBuddyForEvidenceReview, validateUiActions } from './codebuddySelector.js'
import { CLINICIAN, getPreferences, logQuestion, savePreferences } from '../simulation/question-store.mjs'
import { getDirectorAnalytics, getSuggestions } from '../simulation/question-learning.mjs'
import { resolvePatientDatabase } from '../simulation/patient-gate.mjs'
import { isQuestionCronEnabled, QUESTION_CRON_EXPRESSION, startQuestionScheduler } from '../simulation/question-scheduler.mjs'
import { isResearchCronEnabled, RESEARCH_CRON_EXPRESSION, startResearchScheduler } from '../simulation/research-scheduler.mjs'
import { buildGroundedBlindSpot, decideReviewItem, getReviewDashboard, runWeeklyResearch, updateBlindSpotFeedback } from '../simulation/review-engine.mjs'
import { runLockedQuestionImport } from '../simulation/question-job-lock.mjs'
import { resolveQuestionScope } from './questionScope.js'
import { getEventsForPatient } from '../src/data/syntheticEvents.js'
import { openPsychMapDatabase, readApplicationData, readLiveRfidData } from './database.js'
import { runEvidencePlanner } from './evidencePlanner.js'
import { runBackgroundJob } from './backgroundJobs.js'
import { createAnswerAudit } from './answerAudit.js'

const readBody = request => new Promise((resolve, reject) => {
  let body = ''
  request.on('data', chunk => { body += chunk; if (body.length > 25_000) reject(new Error('Request is too large')) })
  request.on('end', () => { try { resolve(JSON.parse(body || '{}')) } catch { reject(new Error('Malformed JSON')) } })
  request.on('error', reject)
})
const sendJson = (response, status, payload) => {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(payload))
}
const isLoopback = request => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket?.remoteAddress)
const sealSnapshot = snapshot => {
  const canonical = JSON.stringify({ schemaVersion: snapshot.schemaVersion, metricVersion: snapshot.metricVersion, patientId: snapshot.patient.id, scope: snapshot.scope, sourceRecordIds: snapshot.sourceRecordIds, sources: snapshot.sources, facts: snapshot.facts })
  const hash = createHash('sha256').update(canonical).digest('hex')
  return Object.freeze({ ...snapshot, snapshotId: `snapshot:${snapshot.patient.id}:${hash.slice(0, 16)}`, hash, hashAlgorithm: 'sha256' })
}
const validateContext = context => {
  const visibleMetricIds = Array.isArray(context?.visibleMetricIds) ? context.visibleMetricIds : []
  const focusedZoneId = context?.focusedZoneId || null
  if (visibleMetricIds.some(id => !AVAILABLE_METRICS.includes(id))) throw new Error('Unknown UI metric')
  if (focusedZoneId && !AVAILABLE_ZONES.includes(focusedZoneId)) throw new Error('Unknown UI zone')
  return { visibleMetricIds: [...new Set(visibleMetricIds)], focusedZoneId }
}
const latestPatientDataAt = patientId => {
  const events = getEventsForPatient(patientId)
  const timestamps = [
    ...events.locationEvents.flatMap(event => [event.enteredAt, event.exitedAt]),
    ...events.interactionEvents.map(event => event.timestamp),
    ...events.activityEvents.map(event => event.timestamp),
    ...events.clinicalEvents.map(event => event.timestamp),
  ].filter(Boolean).map(value => new Date(value).getTime()).filter(Number.isFinite)
  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null
}

const CONVERSATION_ID = /^[a-zA-Z0-9_-]{8,80}$/
export const medicationClarification = (question, snapshot) => {
  if (!/\bafter\s+(?:the|a)?\s*medication change\b/i.test(question)) return null
  const options = snapshot.sources
    .filter(source => source.kind === 'clinical' && source.eventType === 'medication_change')
    .map(source => ({ day: source.day, label: `Day ${source.day} — ${source.title}`, reply: `Use the Day ${source.day} medication change.` }))
  return options.length > 1 ? { code: 'SELECT_MEDICATION_EVENT', prompt: 'Which medication event should I use as the reference point?', options } : null
}

export const clarificationSelection = (question, pending) => {
  const day = Number(String(question || '').match(/\bday\s*(\d{1,3})\b/i)?.[1])
  return pending?.options?.find(option => option.day === day) || null
}

export function psychMapInsightPlugin(env = {}) {
  const conversations = new Map()
  const { db: applicationDb, dbPath: applicationDbPath } = openPsychMapDatabase(env)
  const recordAnswer = createAnswerAudit(applicationDb)
  applicationDb.exec(`CREATE TABLE IF NOT EXISTS planner_audit (
    audit_id INTEGER PRIMARY KEY, question_uuid TEXT NOT NULL, created_at_utc TEXT NOT NULL,
    stage_json TEXT NOT NULL CHECK(json_valid(stage_json)));`)
  const recordPlan = (questionUuid, stage) => applicationDb.prepare('INSERT INTO planner_audit(question_uuid,created_at_utc,stage_json) VALUES (?,?,?)').run(questionUuid, new Date().toISOString(), JSON.stringify(stage))
  const handler = async (request, response, next) => {
    const url = new URL(request.url, 'http://localhost')
    if (!url.pathname.startsWith('/api/')) return next()
    try {
      if (url.pathname === '/api/health') {
        if (request.method !== 'GET') return sendJson(response, 405, { error: 'GET required' })
        return sendJson(response, 200, {
          status: 'healthy', service: 'psych-map', synthetic: true,
          instanceId: env.PSYCHMAP_INSTANCE_ID || null,
          codebuddy: { enabled: String(env.CODEBUDDY_ENABLED || 'false').toLowerCase() === 'true' },
          questionWorker: { enabled: isQuestionCronEnabled(env), schedule: QUESTION_CRON_EXPRESSION },
          researchWorker: { enabled: isResearchCronEnabled(env), schedule: RESEARCH_CRON_EXPRESSION },
          database: { path: applicationDbPath },
        })
      }
      if (url.pathname === '/api/bootstrap') {
        if (request.method !== 'GET') return sendJson(response, 405, { error: 'GET required' })
        return sendJson(response, 200, readApplicationData(applicationDb))
      }
      if (url.pathname === '/api/rfid/live') {
        if (request.method !== 'GET') return sendJson(response, 405, { error: 'GET required' })
        return sendJson(response, 200, readLiveRfidData(applicationDb))
      }
      if (url.pathname === '/api/health/codebuddy') {
        if (request.method !== 'GET') return sendJson(response, 405, { error: 'GET required' })
        if (!isLoopback(request)) return sendJson(response, 403, { error: 'CodeBuddy health probe is localhost-only' })
        if (String(env.CODEBUDDY_ENABLED || 'false').toLowerCase() !== 'true') return sendJson(response, 503, { status: 'disabled', error: 'CODEBUDDY_ENABLED is not true' })
        const quick = url.searchParams.get('quick') === '1'
        const patientId = 'PT-003'
        const selectedDays = quick ? [11] : [7, 8, 9, 10, 11]
        const snapshot = sealSnapshot(buildEvidenceSnapshot(patientId, [selectedDays[0], selectedDays.at(-1)], selectedDays))
        const availableDays = computeDailyMetrics(patientId).map(row => row.day)
        const healthQuestion = quick ? 'Which verified fact shows activity-room presence on Day 11?' : 'What changed in the selected synthetic period?'
        const manifest = await askCodeBuddy({ question: healthQuestion, snapshot, professionId: 'psychiatry', availableDays, timeoutMs: 120_000 })
        const verified = buildVerifiedResponse(healthQuestion, snapshot, manifest, 'psychiatry')
        if (quick) return sendJson(response, verified.verification.status === 'pass' ? 200 : 503, {
          status: verified.verification.status === 'pass' ? 'healthy' : 'failed', mode: 'quick',
          service: 'codebuddy', model: 'fast-model', schemaVersion: manifest.schemaVersion,
          selectedFactCount: manifest.factIds.length, verification: verified.verification,
        })
        const evidenceReview = await askCodeBuddyForEvidenceReview({ question: healthQuestion, snapshot, verifiedResponse: verified, timeoutMs: 120_000 })
        return sendJson(response, verified.verification.status === 'pass' && evidenceReview.status === 'pass' ? 200 : 503, {
          status: verified.verification.status === 'pass' && evidenceReview.status === 'pass' ? 'healthy' : 'failed', mode: 'full',
          service: 'codebuddy', model: 'fast-model', schemaVersion: manifest.schemaVersion,
          selectedFactCount: manifest.factIds.length, verification: verified.verification, evidenceReview,
        })
      }
      if (url.pathname === '/api/director' || url.pathname === '/api/admin') {
        if (request.method !== 'GET') return sendJson(response, 405, { error: 'GET required' })
        if (!isLoopback(request)) return sendJson(response, 403, { error: 'Director analytics is localhost-only' })
        return sendJson(response, 200, { ...getDirectorAnalytics(), review: getReviewDashboard(), scheduler: { enabled: isQuestionCronEnabled(env), schedule: QUESTION_CRON_EXPRESSION }, researchScheduler: { enabled: isResearchCronEnabled(env), schedule: RESEARCH_CRON_EXPRESSION } })
      }
      if (url.pathname === '/api/admin/run-question-scan') {
        if (request.method !== 'POST') return sendJson(response, 405, { error: 'POST required' })
        if (!isLoopback(request)) return sendJson(response, 403, { error: 'Question scan is localhost-only' })
        const scan = await runBackgroundJob('questions',{env})
        return sendJson(response, 200, { status: 'completed', scan, analytics: { ...getDirectorAnalytics(), review: getReviewDashboard(), scheduler: { enabled: isQuestionCronEnabled(env), schedule: QUESTION_CRON_EXPRESSION }, researchScheduler: { enabled: isResearchCronEnabled(env), schedule: RESEARCH_CRON_EXPRESSION } } })
      }
      if (url.pathname === '/api/admin/run-research') {
        if (request.method !== 'POST') return sendJson(response, 405, { error: 'POST required' })
        if (!isLoopback(request)) return sendJson(response, 403, { error: 'Research review is localhost-only' })
        const research = await runBackgroundJob('research',{env,databasePath:applicationDbPath})
        return sendJson(response, 200, { status: 'completed', research, review: getReviewDashboard() })
      }
      if (url.pathname === '/api/admin/review') {
        if (request.method !== 'POST') return sendJson(response, 405, { error: 'POST required' })
        if (!isLoopback(request)) return sendJson(response, 403, { error: 'Review decisions are localhost-only' })
        const input = await readBody(request)
        const decision = decideReviewItem(input.reviewId, input.status, input.note)
        return sendJson(response, 200, { decision, review: getReviewDashboard() })
      }
      if (url.pathname === '/api/blind-spot-feedback') {
        if (request.method !== 'POST') return sendJson(response, 405, { error: 'POST required' })
        const input = await readBody(request)
        return sendJson(response, 200, updateBlindSpotFeedback(input.eventId, input.status))
      }
      if (url.pathname === '/api/questions/suggestions') {
        if (request.method !== 'GET') return sendJson(response, 405, { error: 'GET required' })
        const excluded = url.searchParams.getAll('exclude')
        return sendJson(response, 200, { schemaVersion: 'psychmap.suggestions.v1', suggestions: getSuggestions({ professionId: url.searchParams.get('professionId') || 'psychiatry', currentQuestion: url.searchParams.get('currentQuestion') || '', excluded }) })
      }
      if (url.pathname === '/api/clinician/preferences') {
        if (request.method === 'GET') {
          const input = Object.fromEntries(url.searchParams)
          resolvePatientDatabase(input.patientId, input.folderId)
          return sendJson(response, 200, { clinician: CLINICIAN, checklist: getPreferences(input) })
        }
        if (request.method === 'PUT') {
          const input = await readBody(request)
          resolvePatientDatabase(input.patientId, input.folderId)
          return sendJson(response, 200, { clinician: CLINICIAN, checklist: savePreferences(input) })
        }
        return sendJson(response, 405, { error: 'GET or PUT required' })
      }
      if (url.pathname === '/api/evidence/source') {
        if (request.method !== 'GET') return sendJson(response, 405, { error: 'GET required' })
        const patientId = url.searchParams.get('patientId') || ''
        const folderId = url.searchParams.get('folderId') || ''
        const sourceId = url.searchParams.get('sourceId') || ''
        resolvePatientDatabase(patientId, folderId)
        if (!/^source:(?:location|clinical|activity|interaction):PT-\d{3}:[a-f0-9]{8}$/.test(sourceId)) return sendJson(response, 400, { error: 'Invalid evidence source ID' })
        const availableDays = computeDailyMetrics(patientId).map(row => row.day)
        const snapshot = buildEvidenceSnapshot(patientId, [availableDays[0], availableDays.at(-1)], availableDays)
        const source = snapshot.sources.find(item => item.id === sourceId)
        return source ? sendJson(response, 200, { schemaVersion: snapshot.schemaVersion, snapshotId: snapshot.snapshotId, source }) : sendJson(response, 404, { error: 'Evidence source was not found in the authorized patient scope' })
      }
      if (url.pathname !== '/api/insight') return next()
      if (request.method !== 'POST') return sendJson(response, 405, { error: 'POST required' })
      const input = await readBody(request)
      resolvePatientDatabase(input.patientId, input.folderId)
      const conversationId = String(input.conversationId || '')
      if (!CONVERSATION_ID.test(conversationId)) throw new Error('Invalid conversation identifier')
      let conversation = conversations.get(conversationId)
      if (conversation && (conversation.patientId !== input.patientId || conversation.folderId !== input.folderId)) throw new Error('Conversation patient scope mismatch')
      if (!conversation) {
        conversation = { patientId: input.patientId, folderId: input.folderId, turns: [], pending: null }
        conversations.set(conversationId, conversation)
        if (conversations.size > 50) conversations.delete(conversations.keys().next().value)
      }
      const availableDays = computeDailyMetrics(input.patientId).map(row => row.day)
      const selectedClarification = clarificationSelection(input.question, conversation.pending)
      const questionForAnalysis = selectedClarification
        ? `${conversation.pending.question} Clarification: use ${selectedClarification.label} as the reference event.`
        : conversation.pending?.kind === 'planner'
          ? `${conversation.pending.question}\nUser clarification: ${input.question}` : input.question
      const scopeInput = selectedClarification
        ? { range: [selectedClarification.day, conversation.pending.scope.range[1]], selectedDays: conversation.pending.scope.selectedDays.filter(day => day >= selectedClarification.day) }
        : { range: input.range, selectedDays: input.selectedDays }
      const scope = resolveQuestionScope(questionForAnalysis, { ...scopeInput, availableDays, latestDataAt: latestPatientDataAt(input.patientId) })
      let snapshot = sealSnapshot(buildEvidenceSnapshot(input.patientId, scope.range, scope.selectedDays, { timeScope: scope.timeScope, timeEvidence: scope.timeEvidence }))
      const uiContext = validateContext(input.uiContext)
      const logged = selectedClarification
        ? { questionUuid: conversation.pending.questionUuid }
        : logQuestion({ ...input, range: scope.range, selectedDays: scope.selectedDays, clinicianId: CLINICIAN.id, professionLabel: input.professionLabel || input.professionId, uiContext })
      let provider = 'Deterministic selector'; let model = 'local rules v1'; let selectorWarning = null
      let planning = null
      let manifest = { factIds: selectFactsHeuristically(questionForAnalysis, snapshot), actions: [] }
      // Persist before delivery. A failed audit write fails the request instead of
      // returning an answer whose evidence cannot be reviewed later.
      const deliverAnswer = (response, status, payload) => {
        const auditId = recordAnswer({ questionUuid: logged.questionUuid,
          request: { question: input.question, questionForAnalysis, conversationId,
            patientId: input.patientId, professionId: input.professionId, scope },
          snapshot, proposal: { manifest, planning }, response: payload })
        return sendJson(response, status, { ...payload, auditId })
      }
      if (String(env.CODEBUDDY_ENABLED || 'false').toLowerCase() === 'true') {
        try {
          planning = await runEvidencePlanner({ question: questionForAnalysis, snapshot, professionId: input.professionId, conversationContext: conversation.turns, audit: stage => recordPlan(logged.questionUuid, stage) })
          provider = 'CodeBuddy structured planner'; model = 'fast-model'
          if (planning.clarification) {
            conversation.pending = { kind:'planner', question:questionForAnalysis, options:[] }
            return deliverAnswer(response,200,{status:'needs_clarification',answer:planning.clarification,clarification:{code:'PLANNER_CLARIFICATION',options:[]},planning:{plan:planning.plan,trace:[]},provider,model,questionReceipt:{questionUuid:logged.questionUuid,status:'pending_daily_import'}})
          }
          snapshot = sealSnapshot({ ...snapshot, facts:[...snapshot.facts, ...planning.facts.filter(f=>!snapshot.facts.some(existing=>existing.id===f.id))] })
          manifest = { factIds:planning.factIds, actions:planning.actions }
        } catch (error) {
          selectorWarning = `${error.message}; planner output withheld. Inspect sources or rephrase.`
          manifest = { factIds:[], actions:[] }
        }
      }
      const clarification = selectedClarification ? null : medicationClarification(input.question, snapshot)
      if (clarification) {
        conversation.pending = { question: input.question, questionUuid: logged.questionUuid, scope: { range: scope.range, selectedDays: scope.selectedDays }, options: clarification.options }
        return deliverAnswer(response, 200, {
          status: 'needs_clarification',
          answer: clarification.prompt,
          provider, model, selectorWarning, clarification,
          verification: { status: selectorWarning ? 'warning' : 'pass', checks: { patientScope: input.patientId, codeBuddyManifest: selectorWarning ? 'fallback_used' : 'valid', clarification: clarification.code }, usedFacts: [], rejected: [] },
          evidenceRows: [], citedSources: [], actions: [], rejectedActions: [], suggestions: [],
          questionReceipt: { questionUuid: logged.questionUuid, status: 'pending_daily_import' },
          scopeResolution: { reason: scope.reason, range: scope.range, selectedDays: scope.selectedDays, timeScope: scope.timeScope, timeEvidence: scope.timeEvidence },
          snapshot: { id: snapshot.snapshotId, hash: snapshot.hash, hashAlgorithm: snapshot.hashAlgorithm, patientId: snapshot.patient.id, scope: snapshot.scope, metricVersion: snapshot.metricVersion, sourceRecordCount: snapshot.sourceRecordIds.length },
        })
      }
      conversation.pending = null
      const actionValidation = validateUiActions([...(scope.action ? [scope.action] : []), ...manifest.actions], { availableDays })
      const verified = buildVerifiedResponse(questionForAnalysis, snapshot, manifest, input.professionId)
      if (selectorWarning) {
        verified.answer = '• Interpretation limit: CodeBuddy could not produce a valid source-backed answer. No conclusion about the patient can be drawn from this response. Review the original clinical records; additional directly relevant documentation for the selected period may be required.'
        verified.verification.answerability = 'unverified_answer_withheld'
      }
      let evidenceReview = null; let reviewerWarning = null
      if (provider.startsWith('CodeBuddy') && verified.verification.usedFacts.length) {
        try { evidenceReview = await askCodeBuddyForEvidenceReview({ question: questionForAnalysis, snapshot, verifiedResponse: verified, interpretations:planning?.interpretations || [] }) }
        catch (error) { reviewerWarning = error.message; evidenceReview = { status: 'fail', verdict: 'fail', supportedFactIds: [], issueCodes: ['missing_explanation'], completeness: `0/${verified.verification.usedFacts.length}` } }
      }
      verified.verification.checks.secondCodeBuddyReview = evidenceReview?.status || 'not_run'
      if (evidenceReview?.status === 'fail' && verified.verification.status !== 'fail') verified.verification.status = 'warning'
      if (planning?.answerability === 'insufficient') {
        verified.answer = 'The retrieved evidence does not adequately answer this question. Review the selected period and source records, or clarify the question. No interpretation is shown.'
        verified.verification.answerability = 'not_answerable_from_retrieved_data'
      }
      if (planning?.answerability === 'partial') verified.answer += '\n• Interpretation limit: This only partially answers your question; the selected evidence does not establish the full conclusion.'
      if (planning?.missingInformation?.length) verified.answer += `\n• Interpretation limit: Additional information requested by CodeBuddy (not a patient finding): ${planning.missingInformation.join('; ')}`
      else if (planning?.answerability === 'insufficient') verified.answer += '\n• Interpretation limit: More directly relevant clinical documentation for the selected period is required.'
      const supplementaryPointer = !selectorWarning && planning?.answerability !== 'insufficient' && verified.verification.status !== 'fail' && (!provider.startsWith('CodeBuddy') || evidenceReview?.status === 'pass')
        ? buildGroundedBlindSpot({ snapshot, question: input.question, professionId: input.professionId, directFactIds: verified.verification.usedFacts.map(fact => fact.id), questionUuid: logged.questionUuid, patientId: input.patientId })
        : null
      conversation.turns.push({ question: questionForAnalysis, resolvedScope: { range: scope.range, selectedDays: scope.selectedDays }, selectedFactIds: verified.verification.usedFacts.map(fact => fact.id) })
      conversation.turns = conversation.turns.slice(-3)
      const checklist = getPreferences({ patientId: input.patientId, folderId: input.folderId, professionId: input.professionId })
      const suggestions = getSuggestions({ professionId: input.professionId, currentQuestion: input.question, excluded: checklist })
      const plannerResult = planning ? { plan:planning.plan,trace:planning.trace,answerability:planning.answerability,interpretations:evidenceReview?.status === 'pass' ? planning.interpretations : [], interpretationStatus:evidenceReview?.status === 'pass' ? 'ai_reviewed_not_clinically_validated' : 'withheld' } : null
      if (plannerResult) plannerResult.retrievalAttempts = planning.retrievalAttempts || []
      if (planning) recordPlan(logged.questionUuid,{status:'delivered',snapshotId:snapshot.snapshotId,verification:verified.verification,evidenceReview,planning:plannerResult})
      verified.planning = plannerResult
      return deliverAnswer(response, 200, { ...verified, status: 'answered', supplementaryPointers: supplementaryPointer ? [supplementaryPointer] : [], conversation: { id: conversationId, retainedVerifiedTurns: conversation.turns.length, followedClarification: Boolean(selectedClarification) }, provider, model, selectorWarning, evidenceReview, reviewerWarning, questionReceipt: { questionUuid: logged.questionUuid, status: 'pending_daily_import' }, scopeResolution: { reason: scope.reason, range: scope.range, selectedDays: scope.selectedDays, timeScope: scope.timeScope, timeEvidence: scope.timeEvidence }, actions: evidenceReview?.status === 'pass' ? actionValidation.accepted : [], rejectedActions: evidenceReview?.status === 'pass' ? actionValidation.rejected : [...actionValidation.rejected, ...actionValidation.accepted.map(action => ({ type: action.type, reason: 'Withheld because the second CodeBuddy evidence review did not pass' }))], suggestions, snapshot: { id: snapshot.snapshotId, hash: snapshot.hash, hashAlgorithm: snapshot.hashAlgorithm, patientId: snapshot.patient.id, scope: snapshot.scope, metricVersion: snapshot.metricVersion, sourceRecordCount: snapshot.sourceRecordIds.length } })
    } catch (error) {
      const clientError = /Invalid|Unknown|mismatch|Malformed|required|Question must/.test(error.message)
      return sendJson(response, clientError ? 400 : 500, { error: error.message || 'Evidence pipeline failed', code: clientError ? 'INVALID_REQUEST' : 'EVIDENCE_PIPELINE_FAILED' })
    }
  }
  return {
    name: 'psych-map-question-learning-api',
    configureServer(server) { startQuestionScheduler({ env, run: () => runBackgroundJob('questions',{env}) }); startResearchScheduler({ env, run: now => runBackgroundJob('research',{env,databasePath:applicationDbPath,now:now.toISOString()}) }); server.middlewares.use(handler) },
    configurePreviewServer(server) { startQuestionScheduler({ env, run: () => runBackgroundJob('questions',{env}) }); startResearchScheduler({ env, run: now => runBackgroundJob('research',{env,databasePath:applicationDbPath,now:now.toISOString()}) }); server.middlewares.use(handler) },
  }
}
