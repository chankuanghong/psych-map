import { useState } from 'react'
import { Activity, ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown, Clock, FileText, Filter, Map, Sparkles, TrendingDown, TrendingUp, Users, X } from 'lucide-react'
import { WARD_PARTICIPATION_SUMMARIES } from '../data/wardCensus.js'
import { computeDailyMetrics } from '../data/metricsEngine.js'
import { getDailyVitals } from '../data/syntheticVitals.js'
import { getMocaForPatient } from '../data/syntheticEpicData.js'
import { getClinicalDocumentsForPatient, getVisitorFormsForPatient } from '../data/syntheticDocumentation.js'
import ClinicalDocumentCard from './ClinicalDocumentCard.jsx'

const SIGNALS = {
  priority: { label: 'Priority review', dot: 'bg-rose-500', badge: 'border-rose-200 bg-rose-50 text-rose-800' },
  review: { label: 'Review', dot: 'bg-amber-500', badge: 'border-amber-200 bg-amber-50 text-amber-800' },
  clear: { label: 'No threshold crossed', dot: 'bg-emerald-500', badge: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  insufficient: { label: 'Insufficient data', dot: 'bg-slate-400', badge: 'border-slate-200 bg-slate-50 text-slate-700' },
}

const getWardSignal = row => {
  if (row.id === 'PT-001') return { level: 'review', detail: 'Activation ↑; peer engagement remains low' }
  if (row.id === 'PT-002') return { level: 'review', detail: 'Morning routine pattern persists' }
  if (row.id === 'PT-003') return { level: 'review', detail: 'Rest and roaming require context' }
  if (row.status === 'declining') return { level: 'priority', detail: row.reviewReason }
  if (row.status === 'review') return { level: 'review', detail: row.reviewReason }
  if (row.status === 'insufficient') return { level: 'insufficient', detail: row.reviewReason }
  return { level: 'clear', detail: row.status === 'improving' ? 'Positive participation change detected' : 'No material change detected' }
}

const SIGNAL_ORDER = { priority: 0, review: 1, insufficient: 2, clear: 3 }

function SortableHeader({ column, label, align = 'left', sort, onSort }) {
  const active = sort.key === column
  const Icon = active ? (sort.direction === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown
  return (
    <th className={`px-4 py-3 ${align === 'right' ? 'text-right' : ''}`} aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(column)} className={`inline-flex items-center gap-1.5 rounded px-1 py-0.5 font-semibold hover:bg-slate-200 hover:text-slate-800 ${align === 'right' ? 'ml-auto' : ''}`}>
        {label}<Icon size={13} aria-hidden="true" />
      </button>
    </th>
  )
}

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

function PatientPopup({ patient, onClose, onOpen, onOpenInsights }) {
  const [activeTab, setActiveTab] = useState('overview')
  const trajectory = getTrajectory(patient)
  const Icon = trajectory.Icon
  const daily = computeDailyMetrics(patient.id)
  const dailyVitals = getDailyVitals(patient.id)
  const moca = getMocaForPatient(patient.id)
  const documents = getClinicalDocumentsForPatient(patient.id)
  const visitors = getVisitorFormsForPatient(patient.id)
  const dateForDay = day => new Intl.DateTimeFormat('en-SG', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' }).format(new Date(new Date(`${patient.admissionDate}T00:00:00+08:00`).getTime() + (day - 1) * 86400000))
  const formatTime = value => new Intl.DateTimeFormat('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore' }).format(new Date(value))
  const tabs = [
    { id: 'overview', label: 'Overview', Icon: Sparkles, count: null },
    { id: 'spatial', label: 'Spatial', Icon: Map, count: daily.length },
    { id: 'flowsheet', label: 'Flowsheet', Icon: Activity, count: dailyVitals.length },
    { id: 'notes', label: 'Notes', Icon: FileText, count: documents.length },
    { id: 'visitors', label: 'Visitors', Icon: Users, count: visitors.length },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${patient.displayName} overview`}>
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5"><div><p className="text-[10px] font-semibold uppercase tracking-widest text-brand-600">Detailed demonstration patient</p><h2 className="mt-1 text-xl font-semibold text-slate-900">{patient.displayName}</h2><p className="mt-1 text-xs text-slate-500">{patient.age} years · {patient.sex} · {patient.primaryDiagnosis} · {patient.assignedCubicle.replace('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())} · Day {patient.lengthOfStay} of admission</p></div><button type="button" onClick={onClose} aria-label="Close patient overview" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button></div>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 pt-2" role="tablist" aria-label="Patient synthetic record">
          {tabs.map(tab => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-3 py-2.5 text-sm font-medium ${activeTab === tab.id ? 'border-brand-700 bg-white text-brand-800' : 'border-transparent text-slate-500 hover:bg-white hover:text-slate-800'}`}><tab.Icon size={15} />{tab.label}{tab.count !== null && <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">{tab.count}</span>}</button>)}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {activeTab === 'overview' && <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className={`rounded-lg border p-4 ${TONE[trajectory.tone]}`}><div className="flex items-center gap-2 text-xs font-semibold"><Icon size={14} />{trajectory.label}</div><h3 className="mt-2 font-semibold">{trajectory.headline}</h3><p className="mt-1 text-sm leading-relaxed text-slate-600">{trajectory.summary}</p></div>
            <div className="rounded-lg border border-slate-200 p-4"><div className="mb-2 flex items-center gap-2"><Sparkles size={13} className="text-brand-600" /><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Expected progress</p></div><ul className="space-y-2">{trajectory.progress.map(item => <li key={item} className="flex gap-2 text-sm text-slate-600"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />{item}</li>)}</ul><p className="mt-3 text-xs leading-relaxed text-slate-400">{trajectory.caveat}</p></div>
            <div className="grid gap-3 sm:grid-cols-4 lg:col-span-2">{[[`${daily.length}`, 'days of spatial data'], [`${dailyVitals.length}`, 'daily vital summaries'], [`${documents.length}`, 'clinical notes'], [`${visitors.length}`, 'visitor forms']].map(([value, label]) => <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xl font-semibold text-slate-800">{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>)}</div>
          </div>}

          {activeTab === 'spatial' && <section><div className="mb-3"><h3 className="font-semibold text-slate-900">Daily spatial measures</h3><p className="mt-1 text-sm text-slate-500">Objective synthetic averages and counts. Presence does not establish activity or interaction.</p></div><div className="max-h-[48vh] overflow-auto rounded-lg border border-slate-200"><table className="w-full min-w-[720px] text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2 text-right">Assigned cubicle</th><th className="px-3 py-2 text-right">Beyond cubicle</th><th className="px-3 py-2 text-right">Activity room</th><th className="px-3 py-2 text-right">Dining</th><th className="px-3 py-2 text-right">Transitions</th></tr></thead><tbody className="divide-y divide-slate-100">{daily.map(row => <tr key={row.day}><td className="px-3 py-2 font-medium text-slate-700">{dateForDay(row.day)} <span className="ml-1 text-xs text-slate-400">D{row.day}</span></td><td className="px-3 py-2 text-right font-mono">{row.homeCubicleMins} min</td><td className="px-3 py-2 text-right font-mono">{row.outsideBedroomMins} min</td><td className="px-3 py-2 text-right font-mono">{row.activityMins} min</td><td className="px-3 py-2 text-right font-mono">{row.diningMins} min</td><td className="px-3 py-2 text-right font-mono">{row.zoneTransitions}</td></tr>)}</tbody></table></div></section>}

          {activeTab === 'flowsheet' && <section><div className="mb-3"><h3 className="font-semibold text-slate-900">EPIC-style flowsheet</h3><p className="mt-1 text-sm text-slate-500">Synthetic daily vital summaries and the single mock MoCA result.</p></div>{moca.map(item => <div key={`${item.patientId}-${item.day}`} className="mb-3 rounded-lg border border-violet-200 bg-violet-50 p-3"><p className="text-xs font-semibold text-violet-700">MoCA · {dateForDay(item.day)} · Day {item.day}</p><p className="mt-1 text-lg font-semibold text-violet-900">{item.score}/{item.maximum} <span className="text-sm font-normal">· {item.version}</span></p><p className="mt-1 text-xs text-violet-600">Recorded synthetic result; no diagnostic inference.</p></div>)}<div className="max-h-[42vh] overflow-auto rounded-lg border border-slate-200"><table className="w-full min-w-[580px] text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2 text-right">Heart rate</th><th className="px-3 py-2 text-right">Blood pressure</th><th className="px-3 py-2 text-right">Observations</th></tr></thead><tbody className="divide-y divide-slate-100">{dailyVitals.map(row => <tr key={row.day}><td className="px-3 py-2 font-medium text-slate-700">{dateForDay(row.day)} <span className="ml-1 text-xs text-slate-400">D{row.day}</span></td><td className="px-3 py-2 text-right font-mono">{row.heartRate} bpm</td><td className="px-3 py-2 text-right font-mono">{row.systolicBP}/{row.diastolicBP}</td><td className="px-3 py-2 text-right font-mono">{row.observationCount}</td></tr>)}</tbody></table></div></section>}

          {activeTab === 'notes' && <section><div className="mb-3"><h3 className="font-semibold text-slate-900">Clinical documentation</h3><p className="mt-1 text-sm text-slate-500">Formats reflect the purpose of each record; not every discipline uses SOAP.</p></div><div className="space-y-3">{documents.length ? documents.map((document, index) => <ClinicalDocumentCard key={document.documentId} document={document} defaultOpen={index === 0} />) : <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No synthetic notes available for this patient.</p>}</div></section>}

          {activeTab === 'visitors' && <section><div className="mb-3"><h3 className="font-semibold text-slate-900">Visitor submissions</h3><p className="mt-1 text-sm text-slate-500">Synthetic FormSG-style records. Visitation does not establish the quality or effect of contact.</p></div><div className="grid gap-3 md:grid-cols-2">{visitors.length ? visitors.map(form => <article key={form.formId} className="rounded-lg border border-teal-200 bg-teal-50/50 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-teal-800">{form.visitDate} · Day {form.day}</p><span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">{form.status}</span></div><p className="mt-2 font-semibold text-slate-900">{form.visitorDisplayName}</p><p className="text-sm text-slate-600">{form.relationship} · {form.purpose}</p><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-slate-400">Check-in</dt><dd className="font-mono font-semibold text-slate-700">{formatTime(form.checkInAt)}</dd></div><div><dt className="text-xs text-slate-400">Check-out</dt><dd className="font-mono font-semibold text-slate-700">{formatTime(form.checkOutAt)}</dd></div></dl><p className="mt-3 border-t border-teal-100 pt-2 text-xs text-slate-400">{form.formId} · {form.source}</p></article>) : <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No synthetic visitor submissions for this patient.</p>}</div></section>}
        </div>
        <div className="grid shrink-0 gap-2 border-t border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"><button type="button" onClick={onOpen} className="flex items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-4 py-2.5 text-sm font-medium text-brand-800 hover:bg-brand-50">Open patient MAP <ChevronRight size={14} /></button><button type="button" onClick={onOpenInsights} className="flex items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800">Review clinical insights <ChevronRight size={14} /></button></div>
        </div>
    </div>
  )
}

export default function PatientSelector({ patients, onSelect, onOpenInsights }) {
  const [popupPatient, setPopupPatient] = useState(null)
  const [signalFilter, setSignalFilter] = useState('all')
  const [sort, setSort] = useState({ key: 'patient', direction: 'asc' })
  const patientById = Object.fromEntries(patients.map(patient => [patient.id, patient]))
  const changeSort = key => setSort(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }))
  const sortValue = row => {
    if (sort.key === 'patient') return row.displayName
    if (sort.key === 'signal') return SIGNAL_ORDER[row.signal.level]
    if (sort.key === 'diagnosis') return row.diagnosis
    if (sort.key === 'admission') return row.admissionDays
    return row.dataCompleteness
  }
  const rows = WARD_PARTICIPATION_SUMMARIES
    .map(row => ({ ...row, signal: getWardSignal(row) }))
    .filter(row => signalFilter === 'all' || row.signal.level === signalFilter)
    .sort((a, b) => {
      const first = sortValue(a)
      const second = sortValue(b)
      const result = typeof first === 'string' ? first.localeCompare(second, undefined, { numeric: true }) : first - second
      return sort.direction === 'asc' ? result : -result
    })
  const counts = WARD_PARTICIPATION_SUMMARIES.reduce((result, row) => {
    result[getWardSignal(row).level] += 1
    return result
  }, { priority: 0, review: 0, clear: 0, insufficient: 0 })

  return (
    <div className="mx-auto max-w-screen-xl px-6 py-8">
      <div className="mb-5"><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">Ward 4B — Acute Psychiatric Unit</p><h1 className="text-xl font-bold text-slate-800">Ward behavioural overview</h1><p className="mt-1 text-sm text-slate-500">Prioritise review from observable change, then open the supporting patient evidence.</p></div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(SIGNALS).map(([key, config]) => <button key={key} type="button" onClick={() => setSignalFilter(signalFilter === key ? 'all' : key)} className={`flex items-center justify-between rounded-lg border p-3 text-left transition ${signalFilter === key ? `${config.badge} ring-2 ring-offset-1` : 'border-slate-200 bg-white hover:border-slate-300'}`}><span className="flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${config.dot}`} /><span className="text-sm font-medium text-slate-700">{config.label}</span></span><span className="text-xl font-semibold text-slate-900">{counts[key]}</span></button>)}
      </div>

      <section className="card overflow-hidden">
        <div className="card-header flex flex-wrap items-center justify-between gap-2"><div><p className="panel-title">Current ward register</p><p className="mt-1 text-sm text-slate-500">Traffic lights indicate deterministic review priority—not clinical risk or safety.</p></div><div className="flex items-center gap-2"><Filter size={14} className="text-slate-400" /><span className="rounded bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">{rows.length} shown</span>{signalFilter !== 'all' && <button type="button" onClick={() => setSignalFilter('all')} className="text-xs font-medium text-brand-700">Clear filter</button>}</div></div>
        <div className="max-h-[580px] overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><SortableHeader column="patient" label="Patient profile" sort={sort} onSort={changeSort} /><SortableHeader column="signal" label="Behavioural signal" sort={sort} onSort={changeSort} /><SortableHeader column="diagnosis" label="Diagnosis context" sort={sort} onSort={changeSort} /><SortableHeader column="admission" label="Admission" align="right" sort={sort} onSort={changeSort} /><SortableHeader column="data" label="Data" align="right" sort={sort} onSort={changeSort} /></tr></thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map(row => {
                const detailed = patientById[row.id]
                const openProfile = () => detailed && setPopupPatient(detailed)
                const config = SIGNALS[row.signal.level]
                return <tr key={row.id} onClick={openProfile} onKeyDown={event => { if (detailed && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openProfile() } }} tabIndex={detailed ? 0 : undefined} role={detailed ? 'button' : undefined} aria-label={detailed ? `Open ${row.displayName} profile` : undefined} className={detailed ? 'cursor-pointer bg-brand-50/20 transition-colors hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500' : 'hover:bg-slate-50'}><td className="px-4 py-3"><span className={detailed ? 'font-semibold text-brand-700' : 'font-medium text-slate-700'}>{row.displayName}</span><span className="ml-2 text-xs text-slate-400">{row.id}</span><p className="mt-0.5 text-xs text-slate-500">{row.age} years · {row.sex}</p>{detailed && <span className="mt-1 inline-flex rounded bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700">View profile</span>}</td><td className="px-4 py-3"><button type="button" disabled={!detailed} onClick={event => { event.stopPropagation(); if (detailed) onOpenInsights(detailed) }} className={`w-full max-w-md rounded-lg border px-3 py-2 text-left ${config.badge} ${detailed ? 'hover:shadow-sm' : 'cursor-default'}`}><span className="flex items-center gap-2 text-sm font-semibold"><span className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />{config.label}</span><span className="mt-1 block text-xs leading-snug opacity-80">{row.signal.detail}</span></button></td><td className="px-4 py-3 text-slate-600">{row.diagnosis}</td><td className="px-4 py-3 text-right font-mono text-slate-600">Day {row.admissionDays}</td><td className="px-4 py-3 text-right"><span className={`font-mono text-sm font-semibold ${row.dataCompleteness < 60 ? 'text-slate-500' : 'text-slate-700'}`}>{row.dataCompleteness}%</span></td></tr>
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="disclaimer mt-5">Synthetic demonstration roster only. Green means no configured threshold was crossed; it does not establish clinical stability or safety.</p>
      {popupPatient && <PatientPopup patient={popupPatient} onClose={() => setPopupPatient(null)} onOpen={() => { setPopupPatient(null); onSelect(popupPatient) }} onOpenInsights={() => { setPopupPatient(null); onOpenInsights(popupPatient) }} />}
    </div>
  )
}
