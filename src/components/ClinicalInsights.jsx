import { Fragment, useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Database, FileText, Radio, Users } from 'lucide-react'
import { buildEvidencePacket } from '../data/evidenceEngine.js'
import { computeDailyMetrics } from '../data/metricsEngine.js'
import { WARD_PARTICIPATION_SUMMARIES } from '../data/wardCensus.js'
import { getDailyVitals, getVitalsForPatient } from '../data/syntheticVitals.js'
import { getMocaForPatient } from '../data/syntheticEpicData.js'
import { getClinicalDocumentsForPatient, getVisitorFormsForPatient } from '../data/syntheticDocumentation.js'
import InsightAgent from './InsightAgent.jsx'
import WardInsightAgent from './WardInsightAgent.jsx'
import MDTBrief from './MDTBrief.jsx'
import ClinicalDocumentCard from './ClinicalDocumentCard.jsx'
import { formatDuration } from '../utils/duration.js'

const METRICS = {
  outsideBedroomMins: { label: 'Time beyond assigned cubicle', short: 'Outside cubicle', unit: 'min/day', color: '#0369a1' },
  activityMins: { label: 'Activity-room presence', short: 'Activity room', unit: 'min/day', color: '#059669' },
  peerContacts: { label: 'Peer contacts', short: 'Peer contacts', unit: '/day', color: '#7c3aed' },
  staffContacts: { label: 'Staff contacts', short: 'Staff contacts', unit: '/day', color: '#2563eb' },
  overnightRestProxyMins: { label: 'Overnight rest proxy', short: 'Overnight rest', unit: 'min/night', color: '#475569' },
  showerMins: { label: 'Shower', short: 'Shower', unit: 'min/day', color: '#0ea5e9' },
  zoneTransitions: { label: 'Zone transitions', short: 'Transitions', unit: '/day', color: '#b45309' },
  heartRate: { label: 'Heart rate', short: 'Heart rate', unit: 'bpm', color: '#dc2626', source: 'Flowsheet' },
  systolicBP: { label: 'Blood pressure', short: 'Blood pressure', unit: 'mmHg', color: '#7c3aed', secondaryKey: 'diastolicBP', secondaryLabel: 'Diastolic', secondaryColor: '#a78bfa', source: 'Flowsheet' },
}

const SPACE_SERIES = [
  { key: 'homeCubicleMins', label: 'Assigned cubicle', color: '#64748b' },
  { key: 'otherCubicleMins', label: 'Other cubicles', color: '#db2777' },
  { key: 'diningMins', label: 'Dining area', color: '#d97706' },
  { key: 'activityMins', label: 'Activity room', color: '#059669' },
  { key: 'balconyMins', label: 'Balcony', color: '#65a30d' },
  { key: 'visitorMins', label: 'Visitor area', color: '#0f766e' },
  { key: 'corridorMins', label: 'Corridor', color: '#4f46e5' },
  { key: 'ensuiteMins', label: 'Shower', color: '#0ea5e9' },
  { key: 'toiletMins', label: 'Toilet', color: '#7c3aed' },
]

const SIGNAL_METRIC = {
  'documented-dav-episode': 'zoneTransitions',
  'reduced-overnight-rest': 'overnightRestProxyMins',
  'prolonged-shower-presence': 'showerMins',
  'other-cubicle-escalation': 'outsideBedroomMins',
  'environmental-engagement-change': 'outsideBedroomMins',
}

const EVENT_STYLE = {
  DAV: { color: '#b91c1c', label: 'DAV episode' }, Medication: { color: '#ea580c', label: 'Medication' },
  Psychiatry: { color: '#7c3aed', label: 'Psychiatry' }, Nursing: { color: '#2563eb', label: 'Nursing' },
  OT: { color: '#16a34a', label: 'Occupational therapy' }, MDT: { color: '#475569', label: 'MDT' },
  Psychology: { color: '#b45309', label: 'Psychology' },
}

const eventCategory = event => event.type === 'dav_episode' ? 'DAV' : event.type === 'medication_change' ? 'Medication' : event.discipline
const eventStyle = event => EVENT_STYLE[eventCategory(event)] || EVENT_STYLE.MDT
const eventKey = (event, index) => `${event.day}-${event.title}-${index}`

const getGraphFocusKeys = focus => {
  const keysByMetric = {
    showerMins: ['ensuiteMins'],
    activityMins: ['activityMins'],
    overnightRestProxyMins: ['homeCubicleMins'],
    zoneTransitions: ['corridorMins'],
    peerContacts: ['otherCubicleMins', 'diningMins', 'activityMins', 'visitorMins'],
    staffContacts: ['corridorMins'],
    outsideBedroomMins: ['otherCubicleMins', 'diningMins', 'activityMins', 'balconyMins', 'visitorMins', 'corridorMins', 'ensuiteMins', 'toiletMins'],
  }
  return keysByMetric[focus.metricKey] || []
}

const getRelevantEventVisibility = (clinicalEvents, focus) => {
  const query = `${focus.query || ''} ${focus.metricLabel || ''}`.toLowerCase()
  const categories = new Set()
  if (/dav|aggress|violen|incident|escalat/.test(query)) ['DAV', 'Nursing', 'Psychiatry', 'MDT'].forEach(item => categories.add(item))
  if (/shower|wash|routine/.test(query)) ['OT', 'Nursing', 'Medication', 'MDT'].forEach(item => categories.add(item))
  if (/activit|session|occupation|engagement|outside|cubicle|participat/.test(query)) ['OT', 'Nursing', 'Medication', 'MDT'].forEach(item => categories.add(item))
  if (/sleep|rest|night|roam|movement|transition/.test(query)) ['Nursing', 'Psychiatry', 'Medication', 'MDT'].forEach(item => categories.add(item))
  if (/social|peer|family|visit/.test(query)) ['OT', 'MSW', 'Psychology', 'MDT'].forEach(item => categories.add(item))
  if (/medicat|dose|risperidone|sertraline|quetiapine/.test(query)) categories.add('Medication')
  if (/vital|blood pressure|heart rate|\bbp\b|\bhr\b|pulse/.test(query)) ['Medication', 'Nursing', 'Psychiatry'].forEach(item => categories.add(item))
  return Object.fromEntries(clinicalEvents.map((event, index) => [eventKey(event, index), categories.has(eventCategory(event))]))
}

const average = (rows, key) => rows.length ? Math.round(rows.reduce((sum, row) => sum + (row[key] || 0), 0) / rows.length * 10) / 10 : 0
const formatSeenAt = value => new Intl.DateTimeFormat('en-SG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore' }).format(new Date(value))
const formatTime = value => new Intl.DateTimeFormat('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore' }).format(new Date(value))

function RequestedComparison({ metric, baseline, recent }) {
  const change = Math.round((recent - baseline) * 10) / 10
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-medium text-slate-700">Requested comparison · first half to second half</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="text-sm text-slate-500"><span className="font-mono">{baseline}</span><ArrowRight size={13} className="mx-1 inline" /><span className="font-mono text-lg font-semibold text-brand-700">{recent}</span> <span className="text-xs">{metric.unit}</span></div>
        <span className={`rounded px-2 py-1 text-xs font-semibold ${change > 0 ? 'bg-emerald-50 text-emerald-700' : change < 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{change > 0 ? '+' : ''}{change}</span>
      </div>
    </div>
  )
}

function EvidenceTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-xl"><p className="mb-2 font-semibold text-slate-800">Day {label}</p>{payload.map(item => <div key={item.dataKey} className="flex min-w-44 items-center justify-between gap-4 py-0.5"><span style={{ color: item.color }}>{item.name}</span><span className="font-mono font-semibold text-slate-800">{item.value}</span></div>)}</div>
}

function PatientMapStyleChart({ activeMetric, focus, chartData, range, clinicalEvents }) {
  const series = SPACE_SERIES
  const requestedKeys = new Set(getGraphFocusKeys(focus))
  const defaultVisibility = () => Object.fromEntries(series.map(item => [item.key, requestedKeys.has(item.key)]))
  const [visible, setVisible] = useState(defaultVisibility)
  const [visibleEvents, setVisibleEvents] = useState(() => getRelevantEventVisibility(clinicalEvents, focus))
  const [hoveredEvent, setHoveredEvent] = useState(null)
  const ticks = chartData.length <= 21 ? chartData.map(row => row.day) : chartData.filter((row, index) => index === 0 || index === chartData.length - 1 || (row.day - range[0]) % 7 === 0).map(row => row.day)
  const span = Math.max(1, range[1] - range[0])
  const comparisonRanges = focus.comparisonRanges || []
  const hoveredPosition = hoveredEvent ? Math.max(0, Math.min(100, ((hoveredEvent.day - range[0]) / span) * 100)) : 50
  const popupPosition = hoveredPosition < 18
    ? { style: { left: `${hoveredPosition}%` }, className: '' }
    : hoveredPosition > 82
      ? { style: { right: `${100 - hoveredPosition}%` }, className: '' }
      : { style: { left: `${hoveredPosition}%` }, className: '-translate-x-1/2' }

  useEffect(() => setVisible(defaultVisibility()), [focus.metricKey, focus.query])
  useEffect(() => {
    setVisibleEvents(getRelevantEventVisibility(clinicalEvents, focus))
    setHoveredEvent(null)
  }, [focus.query, focus.range[0], focus.range[1], clinicalEvents])

  const activeEvents = clinicalEvents.filter((event, index) => visibleEvents[eventKey(event, index)])
  const eventCategories = [...new Set(clinicalEvents.map(eventCategory))]
  const getCategoryState = category => {
    const categoryEvents = clinicalEvents.map((event, index) => ({ event, index })).filter(item => eventCategory(item.event) === category)
    const selectedCount = categoryEvents.filter(item => visibleEvents[eventKey(item.event, item.index)]).length
    return selectedCount === 0 ? 'none' : selectedCount === categoryEvents.length ? 'all' : 'partial'
  }
  const toggleCategory = category => {
    const turnOn = getCategoryState(category) !== 'all'
    setVisibleEvents(current => Object.fromEntries(clinicalEvents.map((event, index) => [eventKey(event, index), eventCategory(event) === category ? turnOn : Boolean(current[eventKey(event, index)])])))
    setHoveredEvent(null)
  }

  return (
    <div className="min-w-0 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="panel-title">Daily space use</p><p className="mt-1 text-xs text-slate-400">Showing {chartData.length} selected day{chartData.length === 1 ? '' : 's'} within Days {range[0]}–{range[1]}. Evidence requested for {activeMetric.label.toLowerCase()}.</p></div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <button type="button" onClick={() => setVisible(Object.fromEntries(series.map(item => [item.key, false])))} className="rounded-full border border-slate-300 bg-white px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-50">Unselect all</button>
          {series.map(item => <button key={item.key} type="button" onClick={() => setVisible(current => ({ ...current, [item.key]: !current[item.key] }))} className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium ${visible[item.key] ? 'opacity-100' : 'border-slate-200 bg-white text-slate-400 opacity-50'}`} style={visible[item.key] ? { color: item.color, borderColor: `${item.color}55`, background: `${item.color}12` } : undefined}><span className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.label}</button>)}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold text-slate-700">Clinical event categories</p><p className="mt-0.5 text-xs text-slate-400">Question-relevant categories are preselected. Category controls add or remove every matching event.</p></div><button type="button" onClick={() => { setVisibleEvents(Object.fromEntries(clinicalEvents.map((event, index) => [eventKey(event, index), false]))); setHoveredEvent(null) }} className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50">Clear events</button></div>
        <div className="mt-2 flex flex-wrap gap-1.5">{eventCategories.map(category => { const categoryEvents = clinicalEvents.filter(event => eventCategory(event) === category); const state = getCategoryState(category); const style = eventStyle(categoryEvents[0]); return <button key={category} type="button" onClick={() => toggleCategory(category)} aria-pressed={state !== 'none'} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium ${state === 'none' ? 'border-slate-200 bg-white text-slate-400 opacity-55' : state === 'partial' ? 'border-dashed opacity-80' : 'opacity-100'}`} style={state !== 'none' ? { color: style.color, borderColor: `${style.color}66`, background: `${style.color}10` } : undefined}><span className="h-2 w-2 rounded-full" style={{ background: style.color }} />{category}<span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px]">{categoryEvents.length}</span></button> })}</div>
      </div>

      <div className="mt-3 h-[335px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            <defs>{series.map(item => <linearGradient key={item.key} id={`insight-fill-${item.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={item.color} stopOpacity={0.25} /><stop offset="95%" stopColor={item.color} stopOpacity={0.01} /></linearGradient>)}</defs>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="day" type="number" domain={[Math.max(0.5, range[0] - 0.45), range[1] + 0.45]} ticks={ticks} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} allowDataOverflow />
            <YAxis tickFormatter={value => activeMetric.unit.includes('min') ? formatDuration(value) : value} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={48} />
            <Tooltip content={<EvidenceTooltip />} />
            {comparisonRanges.length === 2 ? <>
              <ReferenceArea x1={comparisonRanges[0][0]} x2={comparisonRanges[0][1]} fill="#2563eb" fillOpacity={0.1} stroke="#2563eb" strokeOpacity={0.35} ifOverflow="hidden" />
              <ReferenceArea x1={comparisonRanges[1][0]} x2={comparisonRanges[1][1]} fill="#059669" fillOpacity={0.11} stroke="#059669" strokeOpacity={0.4} ifOverflow="hidden" />
            </> : <ReferenceArea x1={focus.range[0]} x2={focus.range[1]} fill="#0ea5e9" fillOpacity={0.06} ifOverflow="hidden" />}
            {activeEvents.map((event, index) => <Fragment key={`${event.day}-${event.title}-${index}`}><ReferenceArea x1={event.day - 0.14} x2={event.day + 0.14} fill={eventStyle(event).color} fillOpacity={0.045} ifOverflow="hidden" /><ReferenceLine x={event.day} stroke={eventStyle(event).color} strokeWidth={1.25} strokeOpacity={0.7} strokeDasharray="4 4" ifOverflow="hidden" /></Fragment>)}
            {series.filter(item => visible[item.key]).map(item => <Area key={item.key} type="monotone" dataKey={item.key} name={item.label} stroke={item.color} fill={`url(#insight-fill-${item.key})`} strokeWidth={2} dot={point => <circle key={`${item.key}-${point.payload.day}`} cx={point.cx} cy={point.cy} r={3} fill={item.color} />} strokeOpacity={0.9} isAnimationActive={false} />)}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {comparisonRanges.length === 2 && <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium"><span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">Period 1 · Days {comparisonRanges[0][0]}–{comparisonRanges[0][1]}</span><span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">Period 2 · Days {comparisonRanges[1][0]}–{comparisonRanges[1][1]}</span></div>}

      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2"><p className="text-xs font-semibold text-slate-700">Clinical event nodes</p><p className="text-xs text-slate-400">Click a node to add or remove its dotted line. Hover for the source detail. Temporal proximity does not establish causality.</p></div>
        <div className="relative h-14">
          <div className="absolute left-0 right-0 top-5 h-px bg-slate-300" />
          {ticks.map(day => <span key={day} className="absolute top-7 -translate-x-1/2 text-[8px] text-slate-400" style={{ left: `${((day - range[0]) / span) * 100}%` }}>{day}</span>)}
          {clinicalEvents.map((event, index) => { const key = eventKey(event, index); const selected = Boolean(visibleEvents[key]); return <button key={key} type="button" aria-pressed={selected} onClick={() => setVisibleEvents(current => ({ ...current, [key]: !current[key] }))} onMouseEnter={() => setHoveredEvent(event)} onMouseLeave={() => setHoveredEvent(null)} onFocus={() => setHoveredEvent(event)} onBlur={() => setHoveredEvent(null)} aria-label={`${selected ? 'Remove' : 'Show'} ${eventCategory(event)} event on day ${event.day}: ${event.title}`} className={`absolute z-10 -translate-x-1/2 rounded-full border-2 border-white shadow-sm outline-none ring-offset-1 transition hover:scale-125 focus:ring-2 ${selected ? 'h-4 w-4' : 'h-3.5 w-3.5 opacity-35 grayscale'}`} style={{ left: `${((event.day - range[0]) / span) * 100}%`, top: selected ? '13px' : '14px', background: eventStyle(event).color, '--tw-ring-color': eventStyle(event).color }}><title>{selected ? 'Shown on graph' : 'Hidden from graph'} · {event.title}: {event.description}</title></button> })}
          {hoveredEvent && <div className={`absolute bottom-12 z-30 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-xl ${popupPosition.className}`} style={popupPosition.style}><p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: eventStyle(hoveredEvent).color }}>{eventCategory(hoveredEvent)} · Day {hoveredEvent.day}</p><p className="mt-1 text-xs font-semibold text-slate-800">{hoveredEvent.title}</p><p className="mt-1 text-[10px] leading-relaxed text-slate-500">{hoveredEvent.description}</p></div>}
        </div>
      </div>
    </div>
  )
}

function WardScope({ profession }) {
  const counts = WARD_PARTICIPATION_SUMMARIES.reduce((result, row) => {
    if (row.status === 'declining') result.priority += 1
    else if (['review', 'improving'].includes(row.status)) result.review += 1
    else if (row.status === 'insufficient') result.insufficient += 1
    else result.clear += 1
    return result
  }, { priority: 0, review: 0, clear: 0, insufficient: 0 })
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Priority review', counts.priority, 'border-rose-200 bg-rose-50 text-rose-800'],
          ['Review', counts.review, 'border-amber-200 bg-amber-50 text-amber-800'],
          ['No threshold crossed', counts.clear, 'border-emerald-200 bg-emerald-50 text-emerald-800'],
          ['Insufficient data', counts.insufficient, 'border-slate-200 bg-slate-50 text-slate-700'],
        ].map(([label, count, tone]) => <div key={label} className={`rounded-lg border p-4 ${tone}`}><p className="text-sm font-medium">{label}</p><p className="mt-1 text-3xl font-semibold">{count}</p><p className="mt-1 text-xs">patients · recent ward review</p></div>)}
      </div>
      <WardInsightAgent profession={profession} />
    </div>
  )
}

export default function ClinicalInsights({ patient, profession, range, selectedDays, onRangeChange }) {
  const [scope, setScope] = useState('patient')
  const [showBrief, setShowBrief] = useState(false)
  const [focus, setFocus] = useState(null)
  const packet = useMemo(() => buildEvidencePacket(patient.id, range, selectedDays), [patient.id, range, selectedDays])
  const dailyVitals = useMemo(() => getDailyVitals(patient.id), [patient.id])
  const rawVitals = useMemo(() => getVitalsForPatient(patient.id), [patient.id])
  const mocaObservations = useMemo(() => getMocaForPatient(patient.id), [patient.id])
  const clinicalDocuments = useMemo(() => getClinicalDocumentsForPatient(patient.id), [patient.id])
  const visitorForms = useMemo(() => getVisitorFormsForPatient(patient.id), [patient.id])
  const daily = useMemo(() => {
    const vitalsByDay = Object.fromEntries(dailyVitals.map(row => [row.day, row]))
    return computeDailyMetrics(patient.id).map(row => ({ ...row, ...vitalsByDay[row.day], overnightRestProxyMins: row.sleepWindowMins, showerMins: row.ensuiteMins }))
  }, [patient.id, dailyVitals])
  const activeMetric = focus ? (METRICS[focus.metricKey] || METRICS.outsideBedroomMins) : null
  const selectedSet = useMemo(() => new Set(selectedDays), [selectedDays])
  const chartData = daily.filter(row => selectedSet.has(row.day))
  const selectedVitals = focus?.metricKey === 'heartRate' || focus?.metricKey === 'systolicBP'
  const focusRanges = focus ? (focus.comparisonRanges || [focus.range]) : []
  const isInFocus = day => focusRanges.some(([start, end]) => day >= start && day <= end)
  const spatialEvidence = focus ? daily.filter(row => isInFocus(row.day)) : []
  const vitalEvidence = focus ? rawVitals.filter(row => isInFocus(row.day)) : []
  const mocaEvidence = focus ? mocaObservations.filter(row => isInFocus(row.day)) : []
  const medicationEvidence = focus ? packet.clinicalEvents.filter(event => event.type === 'medication_change' && isInFocus(event.day)) : []
  const noteEvidence = focus ? clinicalDocuments.filter(document => isInFocus(document.day)) : []
  const visitorEvidence = focus ? visitorForms.filter(form => isInFocus(form.day)) : []
  const split = Math.max(1, Math.ceil(chartData.length / 2))
  const early = chartData.slice(0, split)
  const recent = chartData.slice(split).length ? chartData.slice(split) : early
  const comparisonRows = focus?.comparisonRanges?.map(([start, end]) => chartData.filter(row => row.day >= start && row.day <= end))
  const firstComparisonRows = comparisonRows?.[0] || early
  const secondComparisonRows = comparisonRows?.[1] || recent

  useEffect(() => setFocus(null), [patient.id, range[0], range[1]])

  const updateFocus = next => setFocus({ ...next, range: next.range || range })
  const activateSignal = signal => {
    const metricKey = SIGNAL_METRIC[signal.id] || 'outsideBedroomMins'
    updateFocus({ metricKey, metricLabel: METRICS[metricKey].label, range, query: signal.title })
  }
  const changePeriod = value => {
    onRangeChange(value)
    setFocus(null)
  }

  return (
    <div className="mx-auto max-w-screen-2xl space-y-4 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="panel-title">Clinical insights</p><h1 className="mt-1 text-xl font-semibold text-slate-900">Evidence requiring clinical attention</h1></div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-1">
            <button type="button" onClick={() => setScope('patient')} className={`rounded-md px-3 py-1.5 text-sm font-medium ${scope === 'patient' ? 'bg-brand-700 text-white' : 'text-slate-600'}`}>Selected patient</button>
            <button type="button" onClick={() => setScope('ward')} className={`rounded-md px-3 py-1.5 text-sm font-medium ${scope === 'ward' ? 'bg-brand-700 text-white' : 'text-slate-600'}`}>Ward</button>
          </div>
          {scope === 'patient' && <button type="button" onClick={() => setShowBrief(true)} className="flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-brand-800"><FileText size={15} />MDT Brief</button>}
        </div>
      </div>

      {scope === 'ward' ? <WardScope profession={profession} /> : <>
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div><p className="text-base font-semibold text-slate-900">{patient.displayName}</p><p className="mt-0.5 text-sm text-slate-500">{patient.id} · {patient.ward} · {profession?.name || 'MDT'} lens</p></div>
            <div className="flex items-center gap-2">
              {[
                ['Full stay', [1, patient.lengthOfStay]],
                ['Early', [1, Math.min(5, patient.lengthOfStay)]],
                ['Recent', [Math.max(1, patient.lengthOfStay - 5), patient.lengthOfStay]],
              ].map(([label, value]) => <button key={label} type="button" onClick={() => changePeriod(value)} className={`rounded-md border px-3 py-1.5 text-sm ${range[0] === value[0] && range[1] === value[1] ? 'border-brand-700 bg-brand-50 font-medium text-brand-800' : 'border-slate-200 text-slate-600'}`}>{label}</button>)}
              <span className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">Days {range[0]}–{range[1]}</span>
            </div>
          </div>

          <div className="grid gap-4 p-4 xl:grid-cols-[0.9fr_1.35fr]">
            <div className="overflow-hidden rounded-xl border border-emerald-300 bg-emerald-50 shadow-sm">
              <div className="border-b border-emerald-200 bg-emerald-700 px-5 py-4">
                <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">Clinical attention</p><h2 className="mt-1 text-xl font-semibold text-white">Patterns for review</h2></div><span className="rounded-full bg-white/15 px-2.5 py-1 text-sm font-semibold text-white">{packet.deterministicSignals.length}</span></div>
                <p className="mt-2 text-sm text-emerald-50">Select a pattern to reveal only its supporting evidence.</p>
              </div>
              <div className="space-y-2 p-3">
                {packet.deterministicSignals.length ? packet.deterministicSignals.map(signal => (
                  <button key={signal.id} type="button" onClick={() => activateSignal(signal)} className={`w-full rounded-lg border p-4 text-left transition ${focus?.query === signal.title ? 'border-sky-300 bg-sky-50 ring-2 ring-sky-300/30' : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50'}`}>
                    <div className="flex items-start gap-3"><span className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ${signal.severity === 'high' ? 'bg-rose-500 ring-rose-100' : 'bg-amber-500 ring-amber-100'}`} /><div><div className="flex flex-wrap items-center gap-2"><p className="text-base font-semibold text-slate-900">{signal.title}</p><span className="text-xs font-semibold uppercase tracking-wide text-brand-700">View evidence</span></div><p className="mt-1.5 text-sm leading-relaxed text-slate-600">{signal.evidence}</p><p className="mt-2 text-xs leading-relaxed text-slate-500">{signal.caveat}</p></div></div>
                  </button>
                )) : <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={16} className="mb-2" />No configured threshold crossed. This does not establish clinical stability.</div>}
              </div>
            </div>
            <div className="[&_.card]:h-full [&_.card]:border-slate-300 [&_.card]:shadow-sm"><InsightAgent patientId={patient.id} range={range} selectedDays={selectedDays} profession={profession} onEvidenceFocus={updateFocus} /></div>
          </div>
        </section>

        {!focus ? (
          <section className="flex min-h-56 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
            <div className="max-w-lg"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm"><Database size={22} /></div><h2 className="mt-4 text-lg font-semibold text-slate-800">Evidence will appear here when requested</h2><p className="mt-2 text-sm leading-relaxed text-slate-500">Select a pattern for review or ask Psych-MAP a clinical question. The relevant comparison, graph, date range, event markers, and source rows will load together.</p></div>
          </section>
        ) : (
          <section className="overflow-hidden rounded-xl border border-brand-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-100 bg-brand-50 px-5 py-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Evidence cross-reference · E1</p><h2 className="mt-1 text-lg font-semibold text-slate-900">{activeMetric.label}</h2><p className="mt-1 text-sm text-slate-600">{focus.comparisonRanges ? `Comparing Days ${focus.comparisonRanges[0][0]}–${focus.comparisonRanges[0][1]} with Days ${focus.comparisonRanges[1][0]}–${focus.comparisonRanges[1][1]}` : `Days ${focus.range[0]}–${focus.range[1]} highlighted`} in response to: “{focus.query}”</p></div>
              <button type="button" onClick={() => setFocus(null)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Clear evidence</button>
            </div>
            {focus.comparisonRanges && <div className="border-b border-slate-100 p-4"><RequestedComparison metric={activeMetric} baseline={average(firstComparisonRows, focus.metricKey)} recent={average(secondComparisonRows, focus.metricKey)} /></div>}
            <PatientMapStyleChart activeMetric={activeMetric} focus={focus} chartData={chartData} range={range} clinicalEvents={packet.clinicalEvents} />
            <div className="border-t border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-3"><div className="flex items-center gap-2"><Database size={16} className="text-brand-700" /><h3 className="text-base font-semibold text-slate-800">Evidence by source</h3></div><p className="mt-1 text-sm text-slate-500">Cross-referenced records for the requested period{focus.comparisonRanges ? 's' : ''}. All records are synthetic.</p></div>
              <div className="grid gap-3 xl:grid-cols-4">
                <section className="overflow-hidden rounded-lg border border-sky-200 bg-white">
                  <div className="border-b border-sky-100 bg-sky-50 px-4 py-3"><div className="flex items-center gap-2 text-sky-800"><Radio size={16} /><h4 className="font-semibold">Spatial data</h4></div><p className="mt-1 text-xs text-sky-700">Ward scanners and interaction logs</p></div>
                  <div className="max-h-80 space-y-2 overflow-auto p-3">{focusRanges.map(([start, end], index) => { const rows = spatialEvidence.filter(row => row.day >= start && row.day <= end); return <div key={`${start}-${end}`} className="rounded border border-slate-200 p-3"><p className={`text-xs font-semibold ${index === 0 && focus.comparisonRanges ? 'text-blue-700' : 'text-emerald-700'}`}>{focus.comparisonRanges ? `Period ${index + 1} · ` : ''}Days {start}–{end}</p><dl className="mt-2 grid grid-cols-2 gap-2 text-xs"><div><dt className="text-slate-400">Outside cubicle</dt><dd className="font-mono font-semibold text-slate-700">{average(rows, 'outsideBedroomMins')} min/day</dd></div><div><dt className="text-slate-400">Activity room</dt><dd className="font-mono font-semibold text-slate-700">{average(rows, 'activityMins')} min/day</dd></div><div><dt className="text-slate-400">Transitions</dt><dd className="font-mono font-semibold text-slate-700">{average(rows, 'zoneTransitions')}/day</dd></div><div><dt className="text-slate-400">Peer contacts</dt><dd className="font-mono font-semibold text-slate-700">{average(rows, 'peerContacts')}/day</dd></div></dl></div>})}</div>
                </section>

                <section className="overflow-hidden rounded-lg border border-violet-200 bg-white">
                  <div className="border-b border-violet-100 bg-violet-50 px-4 py-3"><div className="flex items-center gap-2 text-violet-800"><Activity size={16} /><h4 className="font-semibold">EPIC flowsheet</h4></div><p className="mt-1 text-xs text-violet-700">Medication changes, vitals and MoCA</p></div>
                  <div className="max-h-80 space-y-2 overflow-auto p-3">{focusRanges.map(([start, end], index) => { const rows = vitalEvidence.filter(row => row.day >= start && row.day <= end); return <div key={`${start}-${end}`} className="rounded border border-slate-200 p-3"><p className={`text-xs font-semibold ${index === 0 && focus.comparisonRanges ? 'text-blue-700' : 'text-emerald-700'}`}>{focus.comparisonRanges ? `Period ${index + 1} · ` : ''}Days {start}–{end}</p><p className="mt-2 text-xs text-slate-600">HR <span className="font-mono font-semibold text-slate-800">{average(rows, 'heartRate')} bpm</span> · BP <span className="font-mono font-semibold text-slate-800">{average(rows, 'systolicBP')}/{average(rows, 'diastolicBP')} mmHg</span></p><p className="mt-1 text-[11px] text-slate-400">{rows.length} recorded observations</p></div>})}{medicationEvidence.map((event, index) => <div key={`med-${event.day}-${index}`} className="rounded border border-orange-200 bg-orange-50 p-3"><p className="text-xs font-semibold text-orange-800">Day {event.day} · Medication change</p><p className="mt-1 text-xs text-orange-700">{event.title}</p></div>)}{mocaEvidence.map((item, index) => <div key={`moca-${item.day}-${index}`} className="rounded border border-violet-200 bg-violet-50 p-3"><p className="text-xs font-semibold text-violet-800">Day {item.day} · MoCA</p><p className="mt-1 text-sm text-violet-900"><span className="font-mono font-semibold">{item.score}/{item.maximum}</span> · {item.version}</p><p className="mt-1 text-[11px] text-violet-600">Recorded result; no diagnostic inference</p></div>)}</div>
                </section>

                <section className="overflow-hidden rounded-lg border border-amber-200 bg-white">
                  <div className="border-b border-amber-100 bg-amber-50 px-4 py-3"><div className="flex items-center gap-2 text-amber-800"><FileText size={16} /><h4 className="font-semibold">EPIC notes</h4></div><p className="mt-1 text-xs text-amber-700">Dated SOAP and discipline notes</p></div>
                  <div className="max-h-[30rem] space-y-2 overflow-auto p-3">{noteEvidence.length ? noteEvidence.map((document, index) => <ClinicalDocumentCard key={document.documentId} document={document} defaultOpen={index === 0} />) : <p className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">No relevant clinical notes recorded in the requested period.</p>}</div>
                </section>

                <section className="overflow-hidden rounded-lg border border-teal-200 bg-white">
                  <div className="border-b border-teal-100 bg-teal-50 px-4 py-3"><div className="flex items-center gap-2 text-teal-800"><Users size={16} /><h4 className="font-semibold">Others</h4></div><p className="mt-1 text-xs text-teal-700">FormSG visitor submissions</p></div>
                  <div className="max-h-[30rem] space-y-2 overflow-auto p-3">{visitorEvidence.length ? visitorEvidence.map(form => <article key={form.formId} className="rounded border border-teal-100 bg-teal-50/40 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-teal-800">Visit · {form.visitDate}</p><span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">{form.status}</span></div><p className="mt-2 text-sm font-semibold text-slate-800">{form.visitorDisplayName}</p><p className="text-xs text-slate-500">{form.relationship} · {form.purpose}</p><dl className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><dt className="text-slate-400">Check-in</dt><dd className="font-mono font-semibold text-slate-700">{formatTime(form.checkInAt)}</dd></div><div><dt className="text-slate-400">Check-out</dt><dd className="font-mono font-semibold text-slate-700">{formatTime(form.checkOutAt)}</dd></div></dl><p className="mt-3 border-t border-teal-100 pt-2 text-[11px] text-slate-400">Submitted {formatSeenAt(form.submittedAt)} · {form.source}</p></article>) : <p className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">No visitor forms recorded in the requested period.</p>}</div>
                </section>
              </div>
            </div>
          </section>
        )}

        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" /><p>Location and interaction data are behavioural proxies. They do not establish diagnosis, intent, consent, sleep, or causality. Clinician review remains required.</p></div>
      </>}

      {showBrief && <MDTBrief patientId={patient.id} patient={patient} range={range} onClose={() => setShowBrief(false)} />}
    </div>
  )
}
