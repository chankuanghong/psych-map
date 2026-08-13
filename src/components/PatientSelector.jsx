import { useState } from 'react'
import { ChevronRight, Clock, Sparkles, TrendingDown, TrendingUp, X } from 'lucide-react'
import { WARD_PARTICIPATION_SUMMARIES } from '../data/wardCensus.js'
import WardInsightAgent from './WardInsightAgent.jsx'

function getTrajectory(patient) {
  if (patient.id === 'PT-002') {
    return { label: 'Routine concern', tone: 'amber', Icon: Clock, headline: 'Expected progress over a longer admission', summary: 'The 90-day view should make gradual routine change visible without treating shower-area presence as proof of a particular behaviour.', progress: ['Reduce prolonged morning shower-area presence over time.', 'Transition into breakfast and the morning routine earlier.', 'Participate more consistently in ward activities.', 'Review distress and rituals clinically; location alone cannot explain them.'], caveat: 'These are demonstration expectations for discussion, not treatment targets or validated outcomes.' }
  }
  if (patient.id === 'PT-003') {
    return { label: 'Improving after escalation', tone: 'green', Icon: TrendingDown, headline: 'Expected settling after an activated period', summary: 'The trajectory shows increased roaming and reduced overnight rest around a nurse-documented DAV episode, followed by a more settled pattern after clinical review.', progress: ['Reduce roaming through neighbouring cubicles and shared spaces after the peak.', 'Increase overnight presence in the assigned cubicle as a rest proxy.', 'Show fewer rapid transitions between ward spaces.', 'Review whether further DAV episodes are documented, alongside the patient’s account and direct observation.'], caveat: 'The DAV episode comes from nursing documentation, not location inference. Diagnosis does not explain or predict violence, and the timing does not establish medication effect.' }
  }
  return { label: 'Improving participation', tone: 'green', Icon: TrendingUp, headline: 'Expected broader participation', summary: 'The trajectory should make a gradual move beyond the assigned cubicle visible while keeping social participation distinct from general activation.', progress: ['Spend progressively more time outside assigned Cubicle #1.', 'Attend the Dining Area and Activity Room more consistently.', 'Sustain participation across the later admission days.', 'Continue reviewing limited social engagement separately from activation.'], caveat: 'These are behavioural proxies and demonstration expectations, not a validated recovery outcome.' }
}

const TONE = {
  green: 'border-green-200 bg-green-50 text-green-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
}

function PatientPopup({ patient, onClose, onOpen }) {
  const trajectory = getTrajectory(patient)
  const Icon = trajectory.Icon
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${patient.displayName} overview`}>
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5"><div><p className="text-[10px] font-semibold uppercase tracking-widest text-brand-600">Detailed demonstration patient</p><h2 className="mt-1 text-xl font-semibold text-slate-900">{patient.displayName}</h2><p className="mt-1 text-xs text-slate-500">{patient.age} years · {patient.sex} · {patient.primaryDiagnosis} · {patient.assignedCubicle.replace('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())} · Day {patient.lengthOfStay} of admission</p></div><button type="button" onClick={onClose} aria-label="Close patient overview" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button></div>
        <div className="p-5">
          <div className={`rounded-lg border p-4 ${TONE[trajectory.tone]}`}><div className="flex items-center gap-2 text-xs font-semibold"><Icon size={14} />{trajectory.label}</div><h3 className="mt-2 font-semibold">{trajectory.headline}</h3><p className="mt-1 text-sm leading-relaxed text-slate-600">{trajectory.summary}</p></div>
          <div className="mt-4"><div className="mb-2 flex items-center gap-2"><Sparkles size={13} className="text-brand-600" /><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Expected progress</p></div><ul className="space-y-2">{trajectory.progress.map(item => <li key={item} className="flex gap-2 text-xs text-slate-600"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />{item}</li>)}</ul><p className="mt-3 text-[10px] leading-relaxed text-slate-400">{trajectory.caveat}</p></div>
          <button type="button" onClick={onOpen} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800">Open patient map, timeline and AI evidence <ChevronRight size={14} /></button>
        </div>
      </div>
    </div>
  )
}

export default function PatientSelector({ patients, onSelect, profession }) {
  const [popupPatient, setPopupPatient] = useState(null)
  const patientById = Object.fromEntries(patients.map(patient => [patient.id, patient]))

  return (
    <div className="mx-auto max-w-screen-xl px-6 py-8">
      <div className="mb-6"><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">Ward 4B — Acute Psychiatric Unit</p><h1 className="text-xl font-bold text-slate-800">Ward Patient Register</h1><p className="mt-1 text-sm text-slate-500">40 fictional patients for demonstrating ward-level participation intelligence. Select Patient A, B or C for a detailed overview.</p></div>

      <section className="card overflow-hidden">
        <div className="card-header flex flex-wrap items-center justify-between gap-2"><div><p className="panel-title">Current ward register</p><p className="mt-1 text-xs text-slate-400">Demographic and admission context only</p></div><span className="rounded bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">40 patients</span></div>
        <div className="max-h-[580px] overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Age</th><th className="px-4 py-3">Male / Female</th><th className="px-4 py-3">Diagnoses</th><th className="px-4 py-3 text-right">Days of Admission</th></tr></thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {WARD_PARTICIPATION_SUMMARIES.map(row => {
                const detailed = patientById[row.id]
                const openProfile = () => detailed && setPopupPatient(detailed)
                return <tr key={row.id} onClick={openProfile} onKeyDown={event => { if (detailed && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openProfile() } }} tabIndex={detailed ? 0 : undefined} role={detailed ? 'button' : undefined} aria-label={detailed ? `Open ${row.displayName} profile` : undefined} className={detailed ? 'cursor-pointer bg-brand-50/30 transition-colors hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500' : 'hover:bg-slate-50'}><td className="px-4 py-3"><span className={detailed ? 'font-semibold text-brand-700' : 'font-medium text-slate-700'}>{row.displayName}</span><span className="ml-2 text-[9px] text-slate-400">{row.id}</span></td><td className="px-4 py-3 text-slate-600">{row.age}</td><td className="px-4 py-3 text-slate-600">{row.sex}</td><td className="px-4 py-3 text-slate-600">{row.diagnosis}</td><td className="px-4 py-3 text-right font-mono text-slate-600">{row.admissionDays}</td></tr>
              })}
            </tbody>
          </table>
        </div>
      </section>

      <WardInsightAgent profession={profession} />
      <p className="disclaimer mt-5">Synthetic demonstration roster only. Ward insight uses hidden behavioural proxies and requires clinical context.</p>
      {popupPatient && <PatientPopup patient={popupPatient} onClose={() => setPopupPatient(null)} onOpen={() => { setPopupPatient(null); onSelect(popupPatient) }} />}
    </div>
  )
}
