import { useMemo, useState } from 'react'
import { LoaderCircle, Send, Sparkles } from 'lucide-react'
import { WARD_PARTICIPATION_SUMMARIES } from '../data/wardCensus.js'

const QUESTIONS = [
  'Is ward participation being underutilised?',
  'Which patients may need participation review?',
  'What should we consider about safety and autonomy?',
  'Are there important data gaps?',
]

const buildWardPacket = () => {
  const rows = WARD_PARTICIPATION_SUMMARIES
  const count = status => rows.filter(row => row.status === status).length
  const lowUse = rows.filter(row => row.spacesUsed != null && (row.spacesUsed <= 3 || row.structuredSessions <= 1))
  const longStay = rows.filter(row => row.admissionDays >= 30)
  return {
    scope: 'ward_management',
    synthetic: true,
    immediateConcern: false,
    selectedPeriod: { fromDay: 1, toDay: 7, days: 7, label: 'Recent 7 days' },
    wardSummary: {
      patientsOnWard: rows.length,
      improving: count('improving'), stable: count('stable'), declining: count('declining'),
      needsContext: count('review'), insufficientData: count('insufficient'),
      possibleUnderutilisation: lowUse.length,
      longStayThirtyDaysOrMore: longStay.length,
      averageDataCompleteness: Math.round(rows.reduce((sum, row) => sum + row.dataCompleteness, 0) / rows.length),
    },
    patientSummaries: rows.map(row => ({
      id: row.id, status: row.statusLabel, admissionDays: row.admissionDays,
      structuredSessions: row.structuredSessions, spacesUsed: row.spacesUsed,
      dataCompleteness: row.dataCompleteness, reasonSurfaced: row.reviewReason,
    })),
    interpretationRules: [
      'This is de-identified demonstration data.',
      'Underutilisation is a behavioural proxy based on recorded spaces and structured sessions, not a judgement of motivation.',
      'Aggregate ward patterns by default and name a patient only when the question requires review allocation.',
      'Do not infer staff performance, treatment quality or patient worth.',
    ],
  }
}

const deterministicAnswer = (question, packet) => {
  const q = question.toLowerCase()
  const rows = packet.patientSummaries
  if (q.match(/safety|safe|risk|autonomy|restrict|leave|observation/)) {
    return `• Safety: The aggregate participation dataset does not establish immediate risk or safety.\n• Autonomy: Low space use may reflect preference, access, restrictions, symptoms or missing data; it must not trigger automatic restriction.\n• Evidence needed: Review the patient’s account, direct observations, current care plan and documented risk context.\n• Clinical focus: Discuss proportionate, least-restrictive support and send any urgent concern for prompt human clinical review.`
  }
  if (q.match(/underutil|participation|activity|space/)) {
    const low = rows.filter(row => row.spacesUsed != null && (row.spacesUsed <= 3 || row.structuredSessions <= 1))
    return `• Status: ${low.length} of ${rows.length} patients meet the prototype underutilisation review rule.\n• Rule: Three or fewer recorded spaces, or one or fewer structured sessions.\n• Limitation: This is not evidence of low motivation.\n• Clinical focus: Review access, restrictions, documentation and patient preferences.`
  }
  if (q.match(/declin|need|priorit|review/)) {
    const review = rows.filter(row => ['Declining', 'Needs context'].includes(row.status))
    return `• Status: ${review.length} patients have declining or mixed participation signals.\n• Breakdown: ${packet.wardSummary.declining} declining; ${packet.wardSummary.needsContext} needing context.\n• Clinical focus: Start with declining patterns, then clarify mixed signals against documentation, restrictions and patient goals.`
  }
  if (q.match(/gap|missing|complete|quality/)) {
    return `• Data gap: ${packet.wardSummary.insufficientData} patients lack enough data for a trajectory.\n• Ward completeness: ${packet.wardSummary.averageDataCompleteness}% on average.\n• Clinical focus: Resolve missing location or activity records before interpreting low participation.`
  }
  return `• Ward status: ${packet.wardSummary.improving} improving; ${packet.wardSummary.stable} stable.\n• Review signals: ${packet.wardSummary.declining} declining; ${packet.wardSummary.needsContext} need context.\n• Limitation: Participation signals do not measure motivation or staff performance.\n• Clinical focus: Review declining participation and possible underutilisation.`
}

export default function WardInsightAgent({ profession }) {
  const packet = useMemo(buildWardPacket, [])
  const [question, setQuestion] = useState('')
  const [conversation, setConversation] = useState([])
  const [loading, setLoading] = useState(false)

  const ask = async (prompt = question) => {
    const cleaned = prompt.trim()
    if (!cleaned || loading) return
    setLoading(true)
    setQuestion('')
    let answer
    let source
    try {
      const response = await fetch('/api/insight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: cleaned, evidencePacket: packet, professionId: profession?.id || 'ward_manager' }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'AI unavailable')
      answer = payload.answer
      source = `${payload.provider} · ${payload.model}`
    } catch {
      answer = deterministicAnswer(cleaned, packet)
      source = 'Deterministic ward summary · local rules'
    }
    setConversation(items => [...items, { question: cleaned, answer, source }])
    setLoading(false)
  }

  return (
    <section className="card mt-6 overflow-hidden">
      <div className="card-header flex items-start gap-3"><div className="rounded-lg bg-brand-50 p-2 text-brand-600"><Sparkles size={17} /></div><div><p className="panel-title">Quick ward insight</p><h2 className="mt-1 text-sm font-semibold text-slate-800">Ask about ward participation status</h2><p className="mt-1 text-xs text-slate-400">Uses the hidden aggregate participation signals behind this demographic register. It does not assess staff performance or patient motivation.</p></div></div>
      <div className="card-body">
        <div className="mb-3 flex flex-wrap gap-2">{QUESTIONS.map(item => <button key={item} type="button" onClick={() => ask(item)} disabled={loading} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50">{item}</button>)}</div>
        {conversation.length > 0 && <div className="mb-3 max-h-72 space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">{conversation.map((item, index) => <div key={`${item.question}-${index}`}><p className="ml-auto max-w-[85%] rounded-lg bg-brand-700 px-3 py-2 text-xs text-white">{item.question}</p><div className="mt-1 max-w-[92%] rounded-lg border border-slate-200 bg-white px-3 py-2.5"><div className="mb-1 flex justify-between gap-2 text-[9px] uppercase tracking-wide text-slate-400"><span>Ward evidence response</span><span>{item.source}</span></div><p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{item.answer}</p></div></div>)}</div>}
        <form onSubmit={event => { event.preventDefault(); ask() }} className="flex gap-2"><input value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask about underutilisation, deterioration, data gaps…" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:text-sm" /><button type="submit" disabled={!question.trim() || loading} className="flex min-h-11 items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">{loading ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}{loading ? 'Analysing' : 'Ask'}</button></form>
      </div>
    </section>
  )
}
