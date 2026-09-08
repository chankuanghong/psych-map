import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CalendarClock, CheckCircle2, ClipboardCheck, FileSearch, LoaderCircle, MinusCircle, Send, ShieldCheck, Sparkles, XCircle } from 'lucide-react'
import { parseInsightAnswer } from '../utils/insightPresentation.js'
import PlannerDetails from './PlannerDetails.jsx'

const BASE_QUESTIONS = {
  'PT-001': ['How has participation in activities changed during the past seven days?', 'How did participation change from Day 3 to Day 7?', 'How did participation change from 2026-08-03 to 2026-08-08?'],
  'PT-002': ['How prolonged is morning shower-area use?', 'Is shower duration changing in this period?', 'How might the documented routine affect participation?'],
  'PT-003': ['What was documented during the DAV episode?', 'How did overnight assigned-cubicle presence change?', 'What changed alongside medication titration?'],
}

const PROFESSION_QUESTIONS = {
  ward_manager: 'Which participation changes should be prioritised for ward review?', psychiatry: 'How do medication chronology and behavioural signals relate over time?',
  nursing: 'Which changes should be highlighted at handover and monitored overnight?', occupational_therapy: 'How have routines and occupational participation changed?',
  psychology: 'Which behavioural pattern and uncertainties warrant formulation?', social_work: 'Which social and functional patterns matter for family or discharge planning?',
}

const sourceSummary = source => {
  if (source.kind === 'clinical') return `${source.discipline} · ${source.title} — ${source.description}`
  if (source.kind === 'activity') return `${source.activityType} · ${source.location} · attendance ${source.attended ? 'recorded' : 'not recorded'}`
  if (source.kind === 'interaction') return `${source.note} · ${source.interactionType} · ${source.target}`
  return `${source.zoneId || source.kind} · ${source.durationMinutes ?? '—'} minutes recorded${source.isSleepWindow ? ' · overnight window' : ''}`
}
const sourceTime = source => source.occurredAtLocal24 || `${source.enteredAtLocal24 || '—'}–${source.exitedAtLocal24?.slice(-5) || '—'}`
const sourceIdSummary = ids => ids.length <= 3 ? ids.join(' · ') : `${ids.slice(0, 3).join(' · ')} · +${ids.length - 3} more`

function AnswerContent({ answer, planning, evidenceRows }) {
  const sections = parseInsightAnswer(answer)
  return <div className="space-y-3">
    {sections.changes.length > 0 && <section><h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">What changed</h3><div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2">
      {sections.changes.map((change, index) => <article key={`${change.label}-${index}`} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold text-brand-800">{change.region}</p><p className="mt-0.5 text-[10px] text-slate-500">{change.label}</p><div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2"><div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-800">{change.fromValue}</p><p className="text-[10px] text-slate-500">{change.fromPeriod}</p></div><ArrowRight size={14} className="text-slate-400" /><div className="min-w-0 text-right"><p className="break-words text-sm font-semibold text-brand-700">{change.toValue}</p><p className="text-[10px] text-slate-500">{change.toPeriod}</p></div></div></article>)}
    </div></section>}
    {sections.context.length > 0 && <section><h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Relevant context</h3><div className="mt-2 space-y-2">{sections.context.map((item, index) => <article key={`${item.region}-${index}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"><p className="text-xs font-semibold text-slate-800">{item.region}</p><p className="mt-1 text-xs leading-relaxed text-slate-600">{item.text}</p></article>)}</div></section>}
    {sections.clinicalFocus.length > 0 && <section className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5"><p className="text-xs font-semibold text-blue-900">Clinical focus</p>{sections.clinicalFocus.map((text, index) => <p key={index} className="mt-1 text-xs leading-relaxed text-blue-800">{text}</p>)}</section>}
    {sections.cautions.length > 0 && <section className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5"><p className="text-xs font-semibold text-amber-900">Interpret with care</p>{sections.cautions.map((text, index) => <p key={index} className="mt-1 text-xs leading-relaxed text-amber-800">{text}</p>)}</section>}
    <PlannerDetails planning={planning} evidenceRows={evidenceRows} />
  </div>
}

function AnswerStatus({ item }) {
  const primaryPass = item.verification?.status === 'pass'
  const reviewPass = item.evidenceReview?.status === 'pass'
  return <div className="mb-3 flex flex-wrap gap-2 text-[10px] font-semibold"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${primaryPass ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}><ShieldCheck size={12} />{primaryPass ? 'Data checked' : 'Check warning'}</span>{item.evidenceReview && <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${reviewPass ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}><ShieldCheck size={12} />{reviewPass ? `Evidence checked · ${item.evidenceReview.completeness}` : `Evidence review needed · ${item.evidenceReview.completeness}`}</span>}</div>
}

function EvidenceLedger({ latest }) {
  return <aside className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white" aria-labelledby="evidence-ledger-title"><div className="border-b border-slate-200 bg-slate-50 px-3 py-2.5"><p id="evidence-ledger-title" className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Evidence citations</p><p className="mt-0.5 text-[9px] text-slate-400">Green citations were used in the answer and link to exact de-identified source records.</p></div><div className="max-h-[30rem] overflow-auto"><table className="w-full table-fixed border-collapse text-left"><thead className="sticky top-0 bg-white text-[9px] uppercase tracking-wide text-slate-400"><tr><th className="w-20 border-b border-slate-100 px-3 py-2">Status</th><th className="border-b border-slate-100 px-3 py-2">Claim and source records</th></tr></thead><tbody>{[...(latest?.evidenceRows || [])].sort((a, b) => ({ used: 0, rejected: 1, unused: 2 }[a.status] - { used: 0, rejected: 1, unused: 2 }[b.status])).map(row => <tr key={row.id} className={row.status === 'used' ? 'bg-emerald-50/70' : row.status === 'rejected' ? 'bg-red-50/70' : 'bg-white'}><td className="border-b border-slate-100 px-3 py-2 align-top"><span className={`inline-flex items-center gap-1 text-[9px] font-semibold ${row.status === 'used' ? 'text-emerald-700' : row.status === 'rejected' ? 'text-red-700' : 'text-slate-400'}`}>{row.status === 'used' ? <CheckCircle2 size={11} /> : row.status === 'rejected' ? <XCircle size={11} /> : <MinusCircle size={11} />}{row.status}</span></td><td className="border-b border-slate-100 px-3 py-2 align-top"><p className="[overflow-wrap:anywhere] text-[10px] leading-relaxed text-slate-600">{row.statement}</p>{row.sourceRecordIds?.length > 0 && <p className="mt-1 [overflow-wrap:anywhere] font-mono text-[8px] leading-relaxed text-slate-400">Sources: {sourceIdSummary(row.sourceRecordIds)}</p>}{row.sourceRecords?.length > 0 && <details className="mt-2 rounded border border-slate-200 bg-white p-2"><summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-[9px] font-semibold text-brand-700"><FileSearch size={12} />View {row.sourceRecords.length} source record{row.sourceRecords.length === 1 ? '' : 's'}</summary><div className="space-y-2">{row.sourceRecords.map(source => <article key={source.id} className="rounded bg-slate-50 p-2"><p className="[overflow-wrap:anywhere] font-mono text-[8px] text-slate-500">{source.id}</p><p className="mt-1 text-[9px] font-medium text-slate-700">{source.kind} · Day {source.day} · {sourceTime(source)} SGT</p><p className="mt-1 [overflow-wrap:anywhere] text-[9px] leading-relaxed text-slate-600">{sourceSummary(source)}</p></article>)}</div></details>}</td></tr>)}</tbody></table></div></aside>
}

export default function InsightAgent({ patientId, folderId, range, selectedDays, profession, onApplyActions, onEvidenceReady, showEvidenceLedger = true }) {
  const conversationId = useMemo(() => `psychmap_${patientId}_${crypto.randomUUID()}`, [patientId])
  const defaults = useMemo(() => [PROFESSION_QUESTIONS[profession?.id] || PROFESSION_QUESTIONS.psychiatry, ...(BASE_QUESTIONS[patientId] || [])], [patientId, profession?.id])
  const [question, setQuestion] = useState('')
  const [conversation, setConversation] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [peopleAlsoAsk, setPeopleAlsoAsk] = useState([])
  const latest = conversation.at(-1)

  useEffect(() => {
    let active = true
    fetch(`/api/questions/suggestions?professionId=${encodeURIComponent(profession?.id || 'psychiatry')}`).then(response => response.ok ? response.json() : Promise.reject(new Error('suggestions unavailable'))).then(payload => { if (active) setPeopleAlsoAsk(payload.suggestions || []) }).catch(() => { if (active) setPeopleAlsoAsk([]) })
    return () => { active = false }
  }, [profession?.id])

  const askQuestion = async (prompt = question) => {
    const cleaned = prompt.trim()
    if (!cleaned || loading) return
    setLoading(true); setQuestion(''); setError('')
    try {
      const response = await fetch('/api/insight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: cleaned, conversationId, patientId, folderId, range, selectedDays, professionId: profession?.id || 'psychiatry', professionLabel: profession?.name || 'MDT', uiContext: { visibleMetricIds: [], focusedZoneId: null } }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Question service unavailable')
      const result = { planning: payload.planning, question: cleaned, answer: payload.answer, source: `${payload.provider} · ${payload.model}`, verification: payload.verification, evidenceReview: payload.evidenceReview, reviewerWarning: payload.reviewerWarning, evidenceRows: payload.evidenceRows || [], supplementaryPointers: payload.supplementaryPointers || [], snapshot: payload.snapshot, scopeResolution: payload.scopeResolution, selectorWarning: payload.selectorWarning, receipt: payload.questionReceipt, actions: payload.actions || [], clarification: payload.clarification }
      setConversation(items => [...items, result])
      setPeopleAlsoAsk(payload.suggestions || [])
      if (!payload.clarification) onEvidenceReady?.(result)
    } catch (askError) { setError(`${askError.message}. No answer was generated or saved.`) }
    finally { setLoading(false) }
  }

  const ratePointer = async (eventId, status) => {
    try {
      const response = await fetch('/api/blind-spot-feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId, status }) })
      if (!response.ok) throw new Error('Feedback could not be saved')
      setConversation(items => items.map(item => ({ ...item, supplementaryPointers: (item.supplementaryPointers || []).map(pointer => pointer.eventId === eventId ? { ...pointer, status } : pointer) })))
    } catch (feedbackError) { setError(feedbackError.message) }
  }

  const suggestedQuestions = [...new Set([...defaults, ...peopleAlsoAsk.map(item => item.canonical_question)])].slice(0, 4)
  return <div className="card-body min-w-0"><div className="mb-4 flex min-w-0 items-start gap-3"><div className="mt-0.5 rounded-lg bg-brand-50 p-2 text-brand-600"><Sparkles size={17} /></div><div className="min-w-0"><h2 className="text-sm font-semibold text-slate-800">Ask Psych-MAP · {profession?.name || 'MDT'} lens</h2><p className="mt-0.5 text-xs text-slate-500">{selectedDays.length} selected day{selectedDays.length === 1 ? '' : 's'} · de-identified synthetic data</p><p className="mt-1 text-[10px] text-slate-400">CodeBuddy selects the relevant evidence; deterministic checks validate facts and citations before display.</p></div></div>
    <section className="mb-4"><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Try asking</p><div className="flex flex-wrap gap-2">{suggestedQuestions.map(prompt => <button key={prompt} type="button" onClick={() => askQuestion(prompt)} disabled={loading} className="min-h-11 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50">{prompt}</button>)}</div></section>
    {conversation.length > 0 && <div className={`mb-4 grid min-w-0 gap-3 ${showEvidenceLedger ? 'lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]' : ''}`}><div className={`min-w-0 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 ${showEvidenceLedger ? 'max-h-[36rem] overflow-y-auto' : ''}`}>{conversation.map((item, index) => <div key={item.receipt?.questionUuid || index} className="min-w-0 space-y-1.5"><p className="ml-auto max-w-[90%] [overflow-wrap:anywhere] rounded-lg bg-brand-700 px-3 py-2 text-xs text-white">{item.question}</p><article className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-semibold uppercase tracking-wider text-brand-700">{item.clarification ? 'One detail needed' : 'Clinical evidence summary'}</p><span className="text-[9px] text-slate-400">{item.source}</span></div>{!item.clarification && <AnswerStatus item={item} />}{item.scopeResolution?.timeEvidence && <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-2 text-[10px] text-blue-800"><CalendarClock size={13} /><strong>{item.scopeResolution.timeEvidence.fromDayDate} → {item.scopeResolution.timeEvidence.toDayDate}</strong><span>Singapore time · {item.scopeResolution.timeEvidence.relativeAnchor.replaceAll('_', ' ')}</span></div>}{item.clarification ? <p className="text-sm leading-relaxed text-slate-700">{item.answer}</p> : <AnswerContent answer={item.answer} planning={item.planning} evidenceRows={item.evidenceRows} />}{item.supplementaryPointers?.map(pointer => <section key={pointer.eventId} className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Evidence-backed blind spot</p><p className="mt-1 text-xs font-semibold text-indigo-900">{pointer.title}</p><p className="mt-1 text-xs leading-relaxed text-indigo-800">{pointer.statement}</p><p className="mt-1 break-all font-mono text-[9px] text-indigo-600">Verified source: {pointer.sourceRecordIds.join(' · ')}</p>{pointer.status ? <p className="mt-2 text-[10px] font-semibold text-indigo-700">Marked {pointer.status}</p> : <div className="mt-2 flex gap-2"><button type="button" onClick={() => ratePointer(pointer.eventId, 'helpful')} className="min-h-10 rounded border border-indigo-200 bg-white px-3 text-xs font-medium text-indigo-800">Helpful</button><button type="button" onClick={() => ratePointer(pointer.eventId, 'dismissed')} className="min-h-10 rounded border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600">Dismiss</button></div>}</section>)}{item.clarification?.options?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{item.clarification.options.map(option => <button key={option.day} type="button" onClick={() => askQuestion(option.reply)} disabled={loading} className="min-h-11 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs text-brand-800">{option.label}</button>)}</div>}{item.actions.length > 0 && <button type="button" onClick={() => onApplyActions?.(item.actions, item)} className="mt-3 flex min-h-11 items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-medium text-brand-700"><ClipboardCheck size={14} />Apply suggested graph view</button>}<details className="mt-3 border-t border-slate-100 pt-2"><summary className="flex min-h-11 cursor-pointer list-none items-center text-[10px] font-medium text-slate-500">Audit details</summary><div className="pb-1 text-[9px] leading-relaxed text-slate-500">{item.selectorWarning && <p>CodeBuddy selection warning: {item.selectorWarning}</p>}{item.reviewerWarning && <p>Evidence review warning: {item.reviewerWarning}</p>}<p className="break-all font-mono">Question record: {item.receipt?.questionUuid || 'not available'}</p></div></details></article></div>)}</div>{showEvidenceLedger && <EvidenceLedger latest={latest} />}</div>}
    {error && <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}<form onSubmit={event => { event.preventDefault(); askQuestion() }} className="flex min-w-0 flex-col gap-2 sm:flex-row"><input value={question} onChange={event => setQuestion(event.target.value)} maxLength={1000} placeholder="Ask about movements, routines, observations or case notes…" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-base text-slate-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-100" /><button type="submit" disabled={!question.trim() || loading} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">{loading ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}<span>{loading ? 'Analysing' : 'Ask'}</span></button></form></div>
}
