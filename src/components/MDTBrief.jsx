import { useRef } from 'react'
import { AlertCircle, CheckCircle, Minus, TrendingDown, TrendingUp, X } from 'lucide-react'
import { buildEvidencePacket } from '../data/evidenceEngine.js'

function DirIcon({ change }) {
  if (Math.abs(change) < 0.5) return <Minus size={13} className="shrink-0 text-amber-500" />
  return change > 0 ? <TrendingUp size={13} className="shrink-0 text-green-600" /> : <TrendingDown size={13} className="shrink-0 text-red-500" />
}

function SectionHeader({ number, title }) {
  return <div className="mb-3 flex items-center gap-2"><span className="font-mono text-xs text-slate-400">{number}</span><div className="h-px flex-1 bg-slate-200" /><span className="text-xs font-semibold uppercase tracking-widest text-slate-600">{title}</span><div className="h-px flex-1 bg-slate-200" /></div>
}

const PATTERN = {
  'PT-001': { title: 'Participation is broadening across ward spaces', focus: 'Explore what is supporting participation and clarify the context of neighbouring-cubicle visits with the patient and ward team.' },
  'PT-002': { title: 'Morning shower-area presence remains a functional routine concern', focus: 'Review distress, ritual content, patient goals and the effect of the morning routine on meals and participation.' },
  'PT-003': { title: 'Social roaming and reduced overnight rest require contextual review', focus: 'Review mood, sleep, interpersonal boundaries, peer accounts and the patient’s stated wish to form friendships.' },
}

export default function MDTBrief({ patientId, patient, range, onClose }) {
  const packet = buildEvidencePacket(patientId, range)
  const first = packet.periodComparison.firstHalf
  const second = packet.periodComparison.secondHalf
  const ref = useRef(null)
  const briefDate = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const pattern = PATTERN[patientId] || PATTERN['PT-001']
  const diff = (recent, baseline) => Math.round(((recent || 0) - (baseline || 0)) * 10) / 10
  const metrics = [
    { label: 'Beyond assigned cubicle', baseline: first.avgOutsideBedroomMins, recent: second.avgOutsideBedroomMins, unit: 'min/day' },
    { label: 'Other-cubicle presence', baseline: first.avgOtherCubicleMins, recent: second.avgOtherCubicleMins, unit: 'min/day' },
    { label: 'Shower-area presence', baseline: first.avgEnsuiteMins, recent: second.avgEnsuiteMins, unit: 'min/day' },
    { label: 'Overnight rest proxy', baseline: first.avgSleepWindowMins, recent: second.avgSleepWindowMins, unit: 'min/night' },
    { label: 'Activity Room', baseline: first.avgActivityMins, recent: second.avgActivityMins, unit: 'min/day' },
    { label: 'Zone transitions', baseline: first.avgZoneTransitions, recent: second.avgZoneTransitions, unit: '/day' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-800/60 p-4 backdrop-blur-sm" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div ref={ref} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div><p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-slate-400">MDT Brief · Synthetic data</p><p className="text-lg font-bold text-slate-800">{patient.displayName}</p><p className="mt-0.5 text-xs text-slate-400">{patient.id} · Days {range[0]}–{range[1]} · {briefDate}</p></div>
          <button onClick={onClose} aria-label="Close MDT Brief" className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="space-y-6 p-6">
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3"><AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-600" /><p className="text-xs leading-relaxed text-amber-700">Synthetic behavioural evidence only. Location does not prove activity, sleep, interaction or causality. Clinician review is required.</p></div>

          <section><SectionHeader number="01" title="Current pattern" /><div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="font-semibold text-slate-800">{pattern.title}</p><p className="mt-2 text-sm leading-relaxed text-slate-600">The selected evidence covers Days {range[0]}–{range[1]}. {packet.deterministicSignals.length ? `${packet.deterministicSignals.length} reproducible signal${packet.deterministicSignals.length === 1 ? '' : 's'} crossed configured review thresholds.` : 'No configured review threshold was crossed; this does not establish clinical stability.'}</p></div></section>

          <section><SectionHeader number="02" title="First half vs second half" /><p className="mb-3 text-xs text-slate-400">Averages within the currently selected period.</p><div className="space-y-1.5">{metrics.map(item => { const change = diff(item.recent, item.baseline); return <div key={item.label} className="flex flex-wrap items-center gap-3 rounded border border-slate-100 bg-slate-50 px-3 py-2"><DirIcon change={change} /><span className="min-w-40 flex-1 text-sm text-slate-700">{item.label}</span><span className="font-mono text-xs text-slate-400">{item.baseline} → {item.recent} {item.unit}</span><span className={`min-w-20 text-right font-mono text-sm font-semibold ${change > 0.4 ? 'text-green-700' : change < -0.4 ? 'text-red-600' : 'text-amber-600'}`}>{change > 0 ? '+' : ''}{change}</span></div> })}</div></section>

          <section><SectionHeader number="03" title="Automatically detected signals" /><div className="space-y-2">{packet.deterministicSignals.length ? packet.deterministicSignals.map(signal => <div key={signal.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3"><p className="text-sm font-semibold text-amber-800">{signal.title}</p><p className="mt-1 text-xs leading-relaxed text-amber-700">{signal.evidence} {signal.caveat}</p></div>) : <p className="text-sm text-slate-500">No configured signal threshold was crossed.</p>}</div></section>

          <section><SectionHeader number="04" title="Relevant clinical events" /><div className="space-y-1.5">{packet.clinicalEvents.length ? packet.clinicalEvents.map((event, index) => <div key={`${event.day}-${event.title}-${index}`} className="flex items-start gap-3 rounded border border-slate-100 bg-slate-50 px-3 py-2"><span className="shrink-0 font-mono text-xs font-semibold text-brand-700">Day {event.day}</span><div><p className="text-sm text-slate-700">{event.title}</p><p className="text-xs text-slate-400">{event.discipline}</p></div></div>) : <p className="text-sm text-slate-500">No clinical events were recorded inside this selection.</p>}</div></section>

          <section><SectionHeader number="05" title="Suggested MDT focus" /><div className="rounded-lg border border-amber-200 bg-amber-50 p-4"><div className="flex items-start gap-2"><CheckCircle size={14} className="mt-0.5 shrink-0 text-amber-600" /><p className="text-sm leading-relaxed text-amber-800">{pattern.focus}</p></div><p className="mt-2 text-xs text-amber-600">Discussion prompt only. Clinical decisions remain with the treating team.</p></div></section>

          <section className="pb-2"><SectionHeader number="06" title="Evidence caveats" /><ul className="space-y-1 text-xs leading-relaxed text-slate-400"><li>· Selected period: Days {range[0]}–{range[1]} · Source: synthetic simulation</li><li>· Threshold alerts are deterministic and are not validated clinical scales</li><li>· Temporal association does not imply causality</li><li>· Location presence does not establish sleep, self-care, consent or social quality</li></ul></section>
        </div>
      </div>
    </div>
  )
}
