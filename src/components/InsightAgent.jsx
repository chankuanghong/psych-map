import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle, LoaderCircle, Send, Sparkles } from 'lucide-react'
import { buildEvidencePacket } from '../data/evidenceEngine.js'

const QUESTIONS = {
  'PT-001': [
    'Has participation improved in this period?',
    'Which ward spaces changed most?',
    'What clinical events occurred alongside the change?',
    'What might the other-cubicle visits mean?',
  ],
  'PT-002': [
    'How prolonged is morning shower-area use?',
    'Is shower duration improving in this period?',
    'How might the morning routine affect participation?',
    'What should the MDT clarify with the patient?',
  ],
  'PT-003': [
    'What was documented during the DAV episode?',
    'When were social roaming and sleep most concerning?',
    'What changed after medication titration?',
    'Is the patient improving in this period?',
    'Does visiting other cubicles mean the patient made friends?',
  ],
}

const PROFESSION_QUESTIONS = {
  ward_manager: 'Which participation changes should be prioritised for ward review?',
  psychiatry: 'How do the medication titration and behavioural signals relate over time?',
  nursing: 'Which changes should be highlighted at handover and monitored overnight?',
  occupational_therapy: 'How have routines and occupational participation changed?',
  psychology: 'Which behavioural pattern and uncertainties warrant formulation?',
  social_work: 'Which social and functional patterns matter for family or discharge planning?',
}

const SAFETY_AUTONOMY_QUESTION = 'What should the MDT consider about safety and autonomy?'

const PROFESSION_FOCUS = {
  ward_manager: 'review participation change, data completeness and which patterns warrant allocation at the next ward review',
  psychiatry: 'review medication chronology, mental-state documentation, tolerability and alternative explanations',
  nursing: 'clarify the pattern at handover and pair it with direct shift observations',
  occupational_therapy: 'review functional impact, meaningful participation and barriers with the patient',
  psychology: 'clarify context, patient meaning and possible maintaining factors without inferring internal states',
  social_work: 'review social context, supports and implications for discharge planning',
}

const findSignal = (signals, question) => {
  const q = question.toLowerCase()
  if (q.match(/sleep|rest|night/)) return signals.find(signal => signal.id === 'reduced-overnight-rest')
  if (q.match(/shower|wash|routine/)) return signals.find(signal => signal.id === 'prolonged-shower-presence')
  if (q.match(/cubicle|friend|social|peer/)) return signals.find(signal => signal.id === 'other-cubicle-escalation')
  return signals[0]
}

function deterministicFallback(question, packet, professionId) {
  const professionalFocus = PROFESSION_FOCUS[professionId] || PROFESSION_FOCUS.psychiatry
  if (question.toLowerCase().match(/dav|aggress|violent|behavio(u)?ral episode/)) {
    const episodes = packet.clinicalEvents.filter(event => event.type === 'dav_episode')
    if (!episodes.length) return `• Documentation: No DAV episode is recorded in the selected days.\n• Limitation: Absence of a selected-period record does not establish absence of risk or behaviour.\n• Clinical focus: ${professionalFocus}.`
    const episode = episodes[0]
    return `• Documented event: Day ${episode.day} — ${episode.title}.\n• Observed: ${episode.details?.observed || episode.description}\n• Nursing response: ${episode.details?.response || 'See the clinical-event documentation.'}\n• Outcome: ${episode.details?.outcome || 'See the clinical-event documentation.'}\n• Clinical focus: Review context and the patient’s perspective; the movement data did not detect or classify this episode.`
  }
  if (question.toLowerCase().match(/safety|safe|risk|autonomy|restrict|leave|observation/)) {
    const surfaced = packet.deterministicSignals.slice(0, 2)
    return `• Safety signals: ${surfaced.length ? surfaced.map(signal => signal.title).join('; ') : 'No configured safety-relevant threshold was crossed in the selected data.'}\n• Autonomy: Location data does not show the patient’s preferences, consent, goals or reasons for movement.\n• Uncertainty: Review direct observation, documentation and the patient’s account before changing support or restrictions.\n• Clinical focus: Discuss the least-restrictive response that addresses the specific observed concern; urgent concerns require prompt human clinical review.`
  }
  const signal = findSignal(packet.deterministicSignals, question)
  if (!signal) return `• Status: No configured deterministic threshold was crossed across the ${packet.selectedPeriod.days} selected days.\n• Limitation: This does not establish clinical stability.\n• Clinical focus: ${professionalFocus}.`
  const otherSignals = packet.deterministicSignals.filter(item => item.id !== signal.id).slice(0, 2).map(item => item.title.toLowerCase())
  return `• Pattern: ${signal.title}.\n• Evidence: ${signal.evidence}\n${otherSignals.length ? `• Also surfaced: ${otherSignals.join(' and ')}.\n` : ''}• Limitation: ${signal.caveat}\n• Clinical focus: ${professionalFocus}.`
}

const SIGNAL_STYLE = {
  high: 'border-red-200 bg-red-50 text-red-800',
  moderate: 'border-amber-200 bg-amber-50 text-amber-800',
}

export default function InsightAgent({ patientId, range, selectedDays, profession }) {
  const packet = useMemo(() => buildEvidencePacket(patientId, range, selectedDays), [patientId, range, selectedDays])
  const [question, setQuestion] = useState('')
  const [conversation, setConversation] = useState([])
  const [loading, setLoading] = useState(false)
  const suggestedQuestions = [PROFESSION_QUESTIONS[profession?.id] || PROFESSION_QUESTIONS.psychiatry, SAFETY_AUTONOMY_QUESTION, ...(QUESTIONS[patientId] || QUESTIONS['PT-001'])].slice(0, 4)

  const askQuestion = async (prompt = question) => {
    const cleaned = prompt.trim()
    if (!cleaned || loading) return
    setLoading(true)
    setQuestion('')
    let answer
    let source
    try {
      const response = await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: cleaned, evidencePacket: packet, professionId: profession?.id }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'AI service unavailable')
      answer = payload.answer
      source = `${payload.provider} · ${payload.model}`
    } catch {
      answer = deterministicFallback(cleaned, packet, profession?.id)
      source = 'Deterministic fallback · Gemini unavailable'
    }
    setConversation(items => [...items, { question: cleaned, answer, source }])
    setLoading(false)
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-body">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-brand-50 p-2 text-brand-600"><Sparkles size={17} /></div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Ask Psych-MAP · {profession?.name || 'MDT'} lens</h2>
              <p className="mt-0.5 text-xs text-slate-500">Ask about evidence from {packet.selectedPeriod.days} selected day{packet.selectedPeriod.days === 1 ? '' : 's'} within Days {packet.selectedPeriod.fromDay}–{packet.selectedPeriod.toDay}.</p>
              <p className="mt-1 text-[10px] text-slate-400">Deterministic detectors find signals · Gemini translates them when configured · clinician interpretation required.</p>
            </div>
          </div>
          <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">Shared evidence · personalised emphasis</span>
        </div>

        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2"><CheckCircle size={13} className="text-brand-600" /><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Automatically detected in selected period</p></div>
          {packet.deterministicSignals.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {packet.deterministicSignals.map(signal => (
                <div key={signal.id} className={`rounded-lg border p-3 ${SIGNAL_STYLE[signal.severity] || SIGNAL_STYLE.moderate}`}>
                  <div className="flex items-start gap-2"><AlertTriangle size={13} className="mt-0.5 shrink-0" /><div><p className="text-xs font-semibold">{signal.title}</p><p className="mt-1 text-[10px] leading-relaxed opacity-80">{signal.evidence}</p></div></div>
                </div>
              ))}
            </div>
          ) : <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">No configured signal threshold was crossed. This does not establish clinical stability.</p>}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {suggestedQuestions.map(prompt => (
            <button key={prompt} type="button" onClick={() => askQuestion(prompt)} disabled={loading} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50">{prompt}</button>
          ))}
        </div>

        {conversation.length > 0 && (
          <div className="mb-4 max-h-96 space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
            {conversation.map((item, index) => (
              <div key={`${item.question}-${index}`} className="space-y-1.5">
                <p className="ml-auto max-w-[85%] rounded-lg bg-brand-700 px-3 py-2 text-xs text-white">{item.question}</p>
                <div className="max-w-[92%] rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2"><p className="text-[9px] font-semibold uppercase tracking-wider text-brand-600">Evidence response</p><span className="text-[9px] text-slate-400">{item.source}</span></div>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{item.answer}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={event => { event.preventDefault(); askQuestion() }} className="flex gap-2">
          <input value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask a question the MDT wants answered…" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
          <button type="submit" disabled={!question.trim() || loading} className="flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
            {loading ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />} {loading ? 'Analysing' : 'Ask'}
          </button>
        </form>
      </div>
    </div>
  )
}
