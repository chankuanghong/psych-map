import { useEffect, useState } from 'react'
import { CheckCircle2, ListChecks, Play, RefreshCw, SlidersHorizontal, X, XCircle } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const CATEGORY_LABELS = {
  longitudinal_change: 'Change over time',
  overnight_rest_proxy: 'Overnight patterns',
  location_roaming: 'Movement & ward areas',
  participation: 'Activities & documented contact',
  family_visitor_context: 'Caregiver visits',
  medication_chronology: 'Medication & observed change',
  documented_dav_context: 'Documented incidents',
  routine_self_care_proxy: 'Daily routine, meals & self-care',
  discharge_support_planning: 'Discharge support',
  data_quality: 'Data quality',
  safety_autonomy: 'Safety & autonomy',
}

const CATEGORY_LABEL = value => CATEGORY_LABELS[value] || String(value || '').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
const DISPLAY_QUESTION = value => {
  const text = String(value || '').trim()
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}${text.endsWith('?') ? '' : '?'}` : ''
}

function LoadingState() {
  return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500"><RefreshCw size={18} className="mx-auto mb-2 animate-spin" />Loading de-identified aggregates…</div>
}

function ChartCard({ title, note, children }) {
  return <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-sm font-semibold text-slate-800">{title}</h2><p className="mt-1 text-[10px] text-slate-400">{note}</p><div className="mt-4 min-w-0 overflow-hidden" style={{ height: 288 }}>{children}</div></section>
}

function QuestionHeatmap({ data, onReview }) {
  const categories = [...new Set(data.professionCategoryMix.map(row => row.category))]
  const professions = [...new Set(data.professionCategoryMix.map(row => row.profession_id))]
  const maximum = Math.max(1, ...data.professionCategoryMix.map(row => row.questions))
  return <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
    <h2 className="text-base font-semibold text-slate-800">Care questions by staff group</h2>
    <p className="mt-1 text-xs text-slate-400">The core admin view: darker cells mean that staff group asked more questions about that care topic.</p>
    <div className="mt-4 overflow-x-auto" aria-label="Profession by question class matrix">
      <table className="w-full border-separate border-spacing-1 text-xs" style={{ minWidth: 940 }}>
        <thead><tr><th className="sticky left-0 z-10 bg-white p-2 text-left text-[10px] uppercase tracking-wide text-slate-400">Staff group</th>{categories.map(category => <th key={category} className="max-w-28 p-1 text-center"><button type="button" onClick={() => onReview({ category })} className="min-h-11 w-full rounded px-1 py-2 text-[9px] font-semibold text-slate-500 hover:bg-brand-50 hover:text-brand-800" title={`Review all ${CATEGORY_LABEL(category)} questions`}>{CATEGORY_LABEL(category)}</button></th>)}</tr></thead>
        <tbody>{professions.map(professionId => <tr key={professionId}><th className="sticky left-0 z-10 bg-white p-2 text-left font-semibold text-slate-700">{CATEGORY_LABEL(professionId)}</th>{categories.map(category => { const count = data.professionCategoryMix.find(row => row.profession_id === professionId && row.category === category)?.questions || 0; return <td key={category} className="p-0.5"><button type="button" onClick={() => onReview({ professionId, category })} className="h-12 w-full rounded border border-white text-center font-semibold hover:ring-2 hover:ring-slate-400" style={{ background: count ? `rgba(15,118,110,${0.12 + (count / maximum) * 0.7})` : '#f8fafc', color: count ? '#134e4a' : '#cbd5e1' }} title={`Review ${CATEGORY_LABEL(professionId)} · ${CATEGORY_LABEL(category)}: ${count}`}>{count}</button></td> })}</tr>)}</tbody>
      </table>
    </div>
    <p className="mt-3 text-[10px] text-slate-400">Select a topic heading to review that topic across all staff, or select a cell to review one staff group.</p>
  </section>
}

function QuestionLibrary({ data, filter, onFilterChange }) {
  const professions = data.professionMix.map(item => item.profession_id)
  const categories = data.categoryMix.map(item => item.category)
  const professionQuestions = filter.professionId ? new Set(data.topByProfession.filter(item => item.profession_id === filter.professionId).map(item => item.canonical_question)) : null
  const questions = data.allQuestions.filter(item => (!filter.category || item.category === filter.category) && (!professionQuestions || professionQuestions.has(item.canonical_question)))
  return <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="border-b border-slate-100 p-4 sm:p-5"><div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-base font-semibold text-slate-800">Question Library</h2><p className="mt-1 text-xs text-slate-400">De-identified wording; semantically matched questions share one count.</p></div><span className="text-xs font-semibold text-brand-700">{questions.length} question themes</span></div>
      <div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Staff group<select value={filter.professionId || ''} onChange={event => onFilterChange({ ...filter, professionId: event.target.value || null })} className="mt-1 block min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium normal-case text-slate-700"><option value="">All staff groups</option>{professions.map(item => <option key={item} value={item}>{CATEGORY_LABEL(item)}</option>)}</select></label><label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Care topic<select value={filter.category || ''} onChange={event => onFilterChange({ ...filter, category: event.target.value || null })} className="mt-1 block min-h-11 max-w-72 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium normal-case text-slate-700"><option value="">All care topics</option>{categories.map(item => <option key={item} value={item}>{CATEGORY_LABEL(item)}</option>)}</select></label>{(filter.professionId || filter.category) && <button type="button" onClick={() => onFilterChange({ professionId: null, category: null })} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"><X size={14} />Clear filters</button>}</div>
    </div>
    {questions.length ? <div className="max-h-[42rem] overflow-auto"><table className="w-full text-left text-xs" style={{ minWidth: 620 }}><thead className="sticky top-0 bg-white text-[10px] uppercase tracking-wide text-slate-400"><tr><th className="p-4">Question</th><th className="p-4">Care topic</th><th className="p-4">Count</th><th className="p-4">Last seen</th></tr></thead><tbody>{questions.map(item => <tr key={`${item.category}-${item.canonical_question}`} className="border-t border-slate-100"><td className="p-4 [overflow-wrap:anywhere] text-slate-700">{DISPLAY_QUESTION(item.canonical_question)}</td><td className="p-4"><span className="rounded bg-brand-50 px-2 py-1 text-[10px] font-medium text-brand-700">{CATEGORY_LABEL(item.category)}</span></td><td className="p-4 font-semibold text-slate-800">{item.total_count}</td><td className="p-4 text-slate-500">{item.last_seen_date}</td></tr>)}</tbody></table></div> : <p className="p-8 text-center text-sm text-slate-400">No imported question themes yet.</p>}
  </section>
}

function ScannedQuestions({ item }) {
  const questions = item.evidence?.questions || []
  if (!questions.length) return null
  return <div className="mt-4 overflow-hidden rounded-lg border border-slate-200"><p className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Questions found by the nightly scan</p><ul className="divide-y divide-slate-100">{questions.map((question, index) => <li key={question.intentId || `${item.review_id}-${index}`} className="flex min-w-0 items-start gap-3 px-3 py-3"><span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" /><span className="min-w-0 flex-1 text-xs leading-relaxed text-slate-700">{DISPLAY_QUESTION(question.question)}</span><span className="shrink-0 text-[10px] font-semibold text-slate-400">{question.count}×</span></li>)}</ul></div>
}

function SpatialEvidence({ item }) {
  const spatial = item.evidence?.spatial
  if (!spatial) return null
  const rows = [
    ['Outside assigned cubicle', spatial.outsideBedroomMins],
    ['Activity-room presence', spatial.activityMins],
    ['Other-cubicle presence', spatial.otherCubicleMins],
    ['Overnight rest proxy', spatial.overnightRestProxyMins],
  ].filter(([, values]) => Array.isArray(values))
  return <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Calculated evidence</p>{item.evidence?.clinicianAssessment && <span className="text-[10px] text-slate-500">Clinician assessment: <strong>{item.evidence.clinicianAssessment.direction}</strong></span>}</div><dl className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">{rows.map(([label, values]) => <div key={label} className="min-w-0 rounded-md bg-white px-3 py-2"><dt className="text-[10px] text-slate-500">{label}</dt><dd className="mt-0.5 font-mono text-xs font-semibold text-slate-800">{values[0]} → {values[1]} min/day</dd></div>)}</dl>{item.evidence?.thresholdProposal && <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">Current rule: ±{item.evidence.thresholdProposal.currentAbsoluteChangeThreshold} min/day · proposed shadow review band: {item.evidence.thresholdProposal.proposedShadowRange[0]}–{item.evidence.thresholdProposal.proposedShadowRange[1]} min/day</p>}</div>
}

function ReviewQueue({ data, onDecision, onRunResearch, busy }) {
  const [notes, setNotes] = useState({})
  const items = data.review?.items || []
  const questionItems = items.filter(item => item.kind === 'blind_spot' && item.status === 'pending')
  const researchItems = items.filter(item => item.kind !== 'blind_spot' && item.status === 'pending')
  const reviewed = items.filter(item => item.status !== 'pending')
  const Item = ({ item, compact = false }) => {
    const acceptedLabel = item.kind === 'blind_spot' ? 'Approved' : 'Kept for review'
    const statusLabel = item.status === 'pending' ? 'Needs decision' : item.status === 'accepted' ? acceptedLabel : 'Rejected'
    return <article className={`min-w-0 rounded-xl border bg-white ${item.status === 'accepted' ? 'border-emerald-200' : item.status === 'ignored' ? 'border-slate-200' : 'border-slate-200'} ${compact ? 'p-4' : 'p-4 sm:p-5'}`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-brand-700">{item.kind === 'blind_spot' ? `${CATEGORY_LABEL(item.profession_id)} · question class` : item.kind.replaceAll('_', ' ')}</p><h3 className="mt-1 text-sm font-semibold text-slate-900">{item.kind === 'blind_spot' ? CATEGORY_LABEL(item.category) : item.title}</h3>{item.diagnosis && <p className="mt-1 text-xs text-slate-500">Diagnosis context: {item.diagnosis}</p>}</div><span className={`rounded px-2 py-1 text-[10px] font-semibold ${item.status === 'pending' ? 'bg-amber-50 text-amber-800' : item.status === 'accepted' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{statusLabel}</span></div><p className="mt-3 text-xs leading-relaxed text-slate-700">{item.summary}</p><ScannedQuestions item={item} /><SpatialEvidence item={item} /><div className="mt-3 rounded-lg border border-brand-100 bg-brand-50/60 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-brand-700">{item.kind === 'blind_spot' ? 'Policy effect' : 'Recommendation only'}</p><p className="mt-1 text-xs leading-relaxed text-brand-900">{item.recommendation}</p></div>{item.status === 'pending' ? <div className="mt-4"><label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Optional admin note<textarea value={notes[item.review_id] || ''} onChange={event => setNotes(current => ({ ...current, [item.review_id]: event.target.value }))} maxLength={1000} rows={2} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-base font-normal normal-case text-slate-700" placeholder="Reason for this decision…" /></label><div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => onDecision(item.review_id, 'accepted', notes[item.review_id] || '')} className="flex min-h-11 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white disabled:opacity-50"><CheckCircle2 size={14} />{item.kind === 'blind_spot' ? 'Approve class' : 'Keep recommendation'}</button><button type="button" disabled={busy} onClick={() => onDecision(item.review_id, 'ignored', notes[item.review_id] || '')} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-medium text-slate-600 disabled:opacity-50"><XCircle size={14} />Reject</button></div></div> : item.admin_note && <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500"><strong>Admin note:</strong> {item.admin_note}</p>}</article>
  }
  return <div className="space-y-5"><section className="rounded-xl border border-brand-200 bg-brand-50/70 p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-base font-semibold text-slate-900">Review new findings</h2><p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600">Approve or reject each class directly here. Approval makes a class eligible for evidence-backed blind-spot prompts; it does not manufacture patient information. Threshold recommendations remain shadow-review suggestions only.</p><p className="mt-2 text-[10px] text-slate-500">Literature connection: {data.review?.literatureStatus || 'Future feature'}</p></div><button type="button" disabled={busy} onClick={onRunResearch} className="flex min-h-11 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white disabled:opacity-50"><Play size={14} />{busy ? 'Running…' : 'Run weekly review'}</button></div></section>
    <section><div className="mb-3 flex items-center gap-2"><ListChecks size={17} className="text-brand-700" /><div><h2 className="text-base font-semibold text-slate-900">Blind-spot question classes</h2><p className="text-xs text-slate-500">Representative questions are shown inline; this section never opens the Question Library.</p></div></div>{questionItems.length ? <div className="grid min-w-0 gap-4 lg:grid-cols-2">{questionItems.map(item => <Item key={item.review_id} item={item} />)}</div> : <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No question classes are awaiting a decision.</div>}</section>
    <section><div className="mb-3 flex items-center gap-2"><SlidersHorizontal size={17} className="text-brand-700" /><div><h2 className="text-base font-semibold text-slate-900">Threshold and signal recommendations</h2><p className="text-xs text-slate-500">Calculated from the synthetic spatial and clinician-assessment records already in Psych-MAP.</p></div></div>{researchItems.length ? <div className="grid min-w-0 gap-4 lg:grid-cols-2">{researchItems.map(item => <Item key={item.review_id} item={item} />)}</div> : <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No research recommendations are awaiting a decision.</div>}</section>
    <section><div className="mb-3"><h2 className="text-base font-semibold text-slate-900">Decision history</h2><p className="text-xs text-slate-500">Synthetic examples show both an approved and a rejected question class.</p></div><div className="grid min-w-0 gap-4 lg:grid-cols-2">{reviewed.map(item => <Item key={item.review_id} item={item} compact />)}</div></section>
  </div>
}

export default function DirectorDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [view, setView] = useState('metrics')
  const [libraryFilter, setLibraryFilter] = useState({ professionId: null, category: null })
  const [scanLoading, setScanLoading] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [scanStatus, setScanStatus] = useState('')

  const load = () => {
    setError('')
    fetch('/api/admin').then(async response => {
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error)
      setData(payload)
    }).catch(loadError => setError(loadError.message || 'Analytics unavailable'))
  }

  const runQuestionScan = async () => {
    setScanLoading(true); setScanStatus('Scanning new questions…'); setError('')
    try {
      const response = await fetch('/api/admin/run-question-scan', { method: 'POST' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Question scan failed')
      setData(payload.analytics)
      setScanStatus(`Scan complete · ${payload.scan.imported} processed · ${payload.scan.newIntents} new · ${payload.scan.repeats} repeats`)
    } catch (scanError) { setError(scanError.message || 'Question scan failed'); setScanStatus('') }
    finally { setScanLoading(false) }
  }

  useEffect(load, [])

  const reviewQuestions = filter => { setLibraryFilter({ professionId: filter.professionId || null, category: filter.category || null }); setView('library') }

  const runResearch = async () => {
    setReviewLoading(true); setError('')
    try { const response = await fetch('/api/admin/run-research', { method: 'POST' }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Weekly review failed'); setData(current => ({ ...current, review: payload.review })) }
    catch (runError) { setError(runError.message || 'Weekly review failed') } finally { setReviewLoading(false) }
  }
  const decideReview = async (reviewId, status, note) => {
    setReviewLoading(true); setError('')
    try { const response = await fetch('/api/admin/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewId, status, note }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Review decision failed'); setData(current => ({ ...current, review: payload.review })) }
    catch (decisionError) { setError(decisionError.message || 'Review decision failed') } finally { setReviewLoading(false) }
  }

  return <div className="mx-auto max-w-screen-xl space-y-4 px-4 py-6">
    <header className="rounded-xl border border-brand-100 bg-brand-50/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">Localhost admin console</p><h1 className="mt-2 text-2xl font-bold text-slate-900">Hospital Admin Tool</h1><p className="mt-1 text-sm font-medium text-brand-700">Question intelligence</p></div><span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Synthetic demo · localhost only</span></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-brand-100 pt-4"><div className="flex flex-wrap rounded-lg border border-slate-200 bg-white p-1" role="tablist" aria-label="Question intelligence views">{[['metrics', 'Metrics'], ['library', 'Question Library'], ['review', 'Review']].map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`min-h-10 rounded-md px-4 text-sm font-medium ${view === id ? 'bg-brand-50 text-brand-800' : 'text-slate-500'}`}>{label}</button>)}</div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={load} className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600"><RefreshCw size={14} />Refresh</button><button type="button" onClick={runQuestionScan} disabled={scanLoading} className="flex min-h-10 items-center gap-2 rounded-lg bg-brand-700 px-3 text-xs font-semibold text-white disabled:opacity-50"><Play size={14} />{scanLoading ? 'Scanning…' : 'Run question scan'}</button></div></div>
      {scanStatus && <p role="status" className="mt-3 rounded bg-white/70 p-2 text-xs text-brand-800">{scanStatus}</p>}
    </header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {!data && !error && <LoadingState />}
    {data && view === 'metrics' && <>
      <QuestionHeatmap data={data} onReview={reviewQuestions} />
      <div><p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Additional information</p><section className="mt-2 grid min-w-0 gap-4 lg:grid-cols-2">
        <ChartCard title="Questions by care topic" note="What staff need to know to support day-to-day care."><ResponsiveContainer width="100%" height="100%"><BarChart data={data.categoryMix} layout="vertical" margin={{ left: 10, right: 12 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 4" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="category" width={122} tickFormatter={CATEGORY_LABEL} tick={{ fontSize: 9 }} /><Tooltip labelFormatter={CATEGORY_LABEL} wrapperStyle={{ maxWidth: 180, whiteSpace: 'normal' }} /><Bar dataKey="questions" name="Questions" fill="#0f766e" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Question volume over time" note="New and repeated intents by Singapore asked date."><ResponsiveContainer width="100%" height="100%"><LineChart data={data.trends} margin={{ left: -20, right: 12 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="asked_date" tick={{ fontSize: 9 }} /><YAxis allowDecimals={false} /><Tooltip wrapperStyle={{ maxWidth: 180, whiteSpace: 'normal' }} /><Legend wrapperStyle={{ fontSize: 10 }} /><Line type="monotone" dataKey="new_intents" name="New" stroke="#2563eb" strokeWidth={2} /><Line type="monotone" dataKey="repeats" name="Repeat" stroke="#d97706" strokeWidth={2} /></LineChart></ResponsiveContainer></ChartCard>
      </section></div>
    </>}
    {data && view === 'library' && <QuestionLibrary data={data} filter={libraryFilter} onFilterChange={setLibraryFilter} />}
    {data && view === 'review' && <ReviewQueue data={data} onDecision={decideReview} onRunResearch={runResearch} busy={reviewLoading} />}
  </div>
}
