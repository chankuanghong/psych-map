import { Fragment, useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Database, FileText, Radio, Sparkles, Users } from 'lucide-react'
import { buildEvidencePacket } from '../data/evidenceEngine.js'
import { computeDailyMetrics, getClinicalDocumentsForPatient, getDailyVitals, getMocaForPatient, getVitalsForPatient, getVisitorFormsForPatient } from '../data/runtimeData.js'
import InsightAgent from './InsightAgent.jsx'
import MDTBrief from './MDTBrief.jsx'
import ClinicalDocumentCard from './ClinicalDocumentCard.jsx'
import { formatDuration } from '../utils/duration.js'
import { applyLayerVisibility, MINUTES_PER_DAY, SPATIAL_LAYER_SERIES, to24HourLayerRow } from '../data/spatialCoverage.js'

const METRICS = {
  homeCubicleMins: { label: 'Assigned-cubicle presence', short: 'Assigned cubicle', unit: 'min/day', color: '#475569' },
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

const LAYER_SERIES = SPATIAL_LAYER_SERIES

const DIRECT_SERIES = {
  homeCubicleMins: [{ key: 'homeCubicleMins', label: 'Assigned cubicle', color: '#475569' }],
  activityMins: [{ key: 'activityMins', label: 'Activity room', color: '#059669' }],
  peerContacts: [
    { key: 'peerContacts', label: 'Peer contacts', color: '#7c3aed' },
    { key: 'staffContacts', label: 'Staff contacts', color: '#2563eb' },
  ],
  staffContacts: [{ key: 'staffContacts', label: 'Staff contacts', color: '#2563eb' }],
  overnightRestProxyMins: [{ key: 'overnightRestProxyMins', label: 'Overnight rest proxy', color: '#475569' }],
  showerMins: [{ key: 'showerMins', label: 'Shower-area presence', color: '#0ea5e9' }],
  zoneTransitions: [{ key: 'zoneTransitions', label: 'Zone transitions', color: '#b45309' }],
  heartRate: [{ key: 'heartRate', label: 'Heart rate', color: '#dc2626' }],
  systolicBP: [
    { key: 'systolicBP', label: 'Systolic BP', color: '#7c3aed' },
    { key: 'diastolicBP', label: 'Diastolic BP', color: '#a78bfa' },
    { key: 'heartRate', label: 'Heart rate', color: '#dc2626', secondaryAxis: true },
  ],
}

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
    homeCubicleMins: ['homeCubicleMins'],
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

const getChartSeries = focus => {
  const direct = DIRECT_SERIES[focus.metricKey] || []
  const controlledKeys = new Set(Array.isArray(focus.series) && focus.series.length ? focus.series : getGraphFocusKeys(focus))
  const directKeys = new Set(direct.map(item => item.key))
  const vitalFocus = ['heartRate', 'systolicBP'].includes(focus.metricKey)
  const spatial = SPACE_SERIES.filter(item => !directKeys.has(item.key)).map(item => vitalFocus ? { ...item, axisId: 'spatial-context' } : item)
  const combined = [...direct, ...spatial]
  return combined.map(item => ({ ...item, defaultOn: directKeys.has(item.key) || controlledKeys.has(item.key) }))
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
const sourceRecordSummary = source => {
  if (source.kind === 'clinical') return `${source.discipline} · ${source.title} — ${source.description}`
  if (source.kind === 'activity') return `${source.activityType} · ${source.location} · attendance ${source.attended ? 'recorded' : 'not recorded'}`
  if (source.kind === 'interaction') return `${source.note} · ${source.interactionType} · ${source.target}`
  return `${source.zoneId || source.kind} · ${source.durationMinutes ?? '—'} recorded minutes${source.isSleepWindow ? ' · overnight window' : ''}`
}
const citedEvidenceRecords = rows => {
  const records = (rows || []).filter(row => row.status === 'used').flatMap(row => row.sourceRecords || [])
  return [...new Map(records.map(record => [record.id, record])).values()]
}

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

function LayeredTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return <div className="max-w-72 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-xl">
    <div className="mb-2 flex items-center justify-between gap-4"><p className="font-semibold text-slate-800">Day {label}</p><span className="font-mono font-semibold text-slate-600">{row?.coveragePct ?? 0}% recorded</span></div>
    {payload.filter(item => item.value > 0).map(item => <div key={item.dataKey} className="flex min-w-52 items-center justify-between gap-4 py-0.5"><span className="flex min-w-0 items-center gap-1.5 text-slate-600"><span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: item.dataKey === 'hiddenLayerMins' ? '#94a3b8' : item.color }} />{item.name}</span><span className="shrink-0 font-mono font-semibold text-slate-800">{formatDuration(item.value)} · {Math.round(item.value / MINUTES_PER_DAY * 100)}%</span></div>)}
    <p className="mt-2 border-t border-slate-100 pt-2 text-[10px] leading-relaxed text-slate-500">All layers total 24 hours. Unrecorded or hidden time is never reassigned to another location.</p>
  </div>
}

function ExactExcerpt({ excerpt }) {
  const terms = (excerpt.matchedTerms || []).filter(Boolean).sort((a, b) => b.length - a.length)
  if (!terms.length) return <span>{excerpt.text}</span>
  const escaped = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`(\\b(?:${escaped.join('|')})\\b)`, 'gi')
  return <>{excerpt.text.split(pattern).map((part, index) => terms.some(term => term.toLowerCase() === part.toLowerCase())
    ? <mark key={`${part}-${index}`} className="rounded bg-amber-200 px-0.5 text-slate-900">{part}</mark>
    : <span key={`${part}-${index}`}>{part}</span>)}</>
}

function PatientMapStyleChart({ activeMetric, focus, chartData, range, clinicalEvents }) {
  const series = getChartSeries(focus)
  const defaultVisibility = () => Object.fromEntries(series.map(item => [item.key, item.defaultOn]))
  const defaultEventVisibility = () => Array.isArray(focus.eventCategories)
    ? Object.fromEntries(clinicalEvents.map((event, index) => [eventKey(event, index), focus.eventCategories.includes(eventCategory(event))]))
    : getRelevantEventVisibility(clinicalEvents, focus)
  const [visible, setVisible] = useState(defaultVisibility)
  const [visibleEvents, setVisibleEvents] = useState(defaultEventVisibility)
  const [hoveredEvent, setHoveredEvent] = useState(null)
  const [chartMode, setChartMode] = useState('trend')
  const [visibleLayers, setVisibleLayers] = useState(() => Object.fromEntries(LAYER_SERIES.map(item => [item.key, true])))
  const rawLayeredData = useMemo(() => chartData.map(to24HourLayerRow), [chartData])
  const layeredData = useMemo(() => rawLayeredData.map(row => applyLayerVisibility(row, visibleLayers)), [rawLayeredData, visibleLayers])
  const averageCoverage = rawLayeredData.length ? Math.round(rawLayeredData.reduce((sum, row) => sum + row.coveragePct, 0) / rawLayeredData.length) : 0
  const ticks = chartData.length <= 21 ? chartData.map(row => row.day) : chartData.filter((row, index) => index === 0 || index === chartData.length - 1 || (row.day - range[0]) % 7 === 0).map(row => row.day)
  const span = Math.max(1, range[1] - range[0])
  const comparisonRanges = focus.comparisonRanges || []
  const hoveredPosition = hoveredEvent ? Math.max(0, Math.min(100, ((hoveredEvent.day - range[0]) / span) * 100)) : 50
  const popupPosition = hoveredPosition < 18
    ? { style: { left: `${hoveredPosition}%` }, className: '' }
    : hoveredPosition > 82
      ? { style: { right: `${100 - hoveredPosition}%` }, className: '' }
      : { style: { left: `${hoveredPosition}%` }, className: '-translate-x-1/2' }

  useEffect(() => setVisible(defaultVisibility()), [focus.metricKey, focus.query, focus.series?.join(',')])
  useEffect(() => {
    setVisibleEvents(defaultEventVisibility())
    setHoveredEvent(null)
  }, [focus.query, focus.range[0], focus.range[1], clinicalEvents, focus.eventCategories?.join(',')])

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

  const toggleLayer = key => setVisibleLayers(current => ({ ...current, [key]: !current[key] }))
  const hiddenLayerCount = Object.values(visibleLayers).filter(value => !value).length

  return (
    <div className="min-w-0 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><p className="panel-title">{chartMode === 'trend' ? 'Mode 1 · Question-specific trend' : 'Mode 2 · Layered 24-hour profile'}</p><p className="mt-1 text-xs text-slate-400">{chartMode === 'trend' ? `Showing ${chartData.length} selected day${chartData.length === 1 ? '' : 's'} within Days ${range[0]}–${range[1]}. Evidence requested for ${activeMetric.label.toLowerCase()}.` : `Every day totals 24 hours. Coloured layers are recorded locations; grey is unrecorded time. Average coverage ${averageCoverage}%.`}</p></div>
        <div className="flex rounded-lg border border-slate-300 bg-slate-100 p-1" role="group" aria-label="Chart display mode">
          <button type="button" onClick={() => setChartMode('trend')} aria-pressed={chartMode === 'trend'} className={`min-h-9 rounded-md px-3 py-1.5 text-xs font-semibold transition ${chartMode === 'trend' ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Mode 1 · Lines</button>
          <button type="button" onClick={() => setChartMode('layers')} aria-pressed={chartMode === 'layers'} className={`min-h-9 rounded-md px-3 py-1.5 text-xs font-semibold transition ${chartMode === 'layers' ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Mode 2 · Layers</button>
        </div>
      </div>

      {chartMode === 'trend' ? <div className="mt-3 flex flex-wrap justify-end gap-1.5">
          <button type="button" onClick={() => setVisible(Object.fromEntries(series.map(item => [item.key, false])))} className="rounded-full border border-slate-300 bg-white px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-50">Unselect all</button>
          {series.map(item => <button key={item.key} type="button" onClick={() => setVisible(current => ({ ...current, [item.key]: !current[item.key] }))} className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium ${visible[item.key] ? 'opacity-100' : 'border-slate-200 bg-white text-slate-400 opacity-50'}`} style={visible[item.key] ? { color: item.color, borderColor: `${item.color}55`, background: `${item.color}12` } : undefined}><span className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.label}</button>)}
        </div> : <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="24-hour location layer controls"><button type="button" onClick={() => setVisibleLayers(Object.fromEntries(LAYER_SERIES.map(item => [item.key, true])))} disabled={!hiddenLayerCount} className="rounded-full border border-slate-300 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 disabled:cursor-default disabled:opacity-40">Show all</button>{LAYER_SERIES.map(item => <button key={item.key} type="button" onClick={() => toggleLayer(item.key)} aria-pressed={visibleLayers[item.key]} className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium ${visibleLayers[item.key] ? 'opacity-100' : 'border-slate-300 bg-slate-100 text-slate-400 opacity-65'}`} style={visibleLayers[item.key] ? { color: item.key === 'unrecordedMins' ? '#475569' : item.color, borderColor: `${item.color}88`, background: `${item.color}18` } : undefined}><span className="h-2 w-2 rounded-sm" style={{ background: item.color }} />{item.label}</button>)}</div>}

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold text-slate-700">Clinical event categories</p><p className="mt-0.5 text-xs text-slate-400">Question-relevant categories are preselected. Category controls add or remove every matching event.</p></div><button type="button" onClick={() => { setVisibleEvents(Object.fromEntries(clinicalEvents.map((event, index) => [eventKey(event, index), false]))); setHoveredEvent(null) }} className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50">Clear events</button></div>
        <div className="mt-2 flex flex-wrap gap-1.5">{eventCategories.map(category => { const categoryEvents = clinicalEvents.filter(event => eventCategory(event) === category); const state = getCategoryState(category); const style = eventStyle(categoryEvents[0]); return <button key={category} type="button" onClick={() => toggleCategory(category)} aria-pressed={state !== 'none'} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium ${state === 'none' ? 'border-slate-200 bg-white text-slate-400 opacity-55' : state === 'partial' ? 'border-dashed opacity-80' : 'opacity-100'}`} style={state !== 'none' ? { color: style.color, borderColor: `${style.color}66`, background: `${style.color}10` } : undefined}><span className="h-2 w-2 rounded-full" style={{ background: style.color }} />{category}<span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px]">{categoryEvents.length}</span></button> })}</div>
      </div>

      <div className="mt-3 h-[335px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'trend' ? <AreaChart data={chartData} margin={{ top: 12, right: series.some(item => item.secondaryAxis) ? 4 : 12, bottom: 0, left: 0 }}>
            <defs>{series.map(item => <linearGradient key={item.key} id={`insight-fill-${item.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={item.color} stopOpacity={0.25} /><stop offset="95%" stopColor={item.color} stopOpacity={0.01} /></linearGradient>)}</defs>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="day" type="number" domain={[Math.max(0.5, range[0] - 0.45), range[1] + 0.45]} ticks={ticks} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} allowDataOverflow />
            <YAxis tickFormatter={value => activeMetric.unit.includes('min') ? formatDuration(value) : value} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={48} />
            {series.some(item => item.secondaryAxis) && <YAxis yAxisId="secondary" orientation="right" tick={{ fontSize: 10, fill: '#dc2626' }} tickLine={false} axisLine={false} width={36} />}
            {series.some(item => item.axisId === 'spatial-context') && <YAxis yAxisId="spatial-context" hide />}
            <Tooltip content={<EvidenceTooltip />} />
            {comparisonRanges.length === 2 ? <>
              <ReferenceArea x1={comparisonRanges[0][0]} x2={comparisonRanges[0][1]} fill="#2563eb" fillOpacity={0.1} stroke="#2563eb" strokeOpacity={0.35} ifOverflow="hidden" />
              <ReferenceArea x1={comparisonRanges[1][0]} x2={comparisonRanges[1][1]} fill="#059669" fillOpacity={0.11} stroke="#059669" strokeOpacity={0.4} ifOverflow="hidden" />
            </> : <ReferenceArea x1={focus.range[0]} x2={focus.range[1]} fill="#0ea5e9" fillOpacity={0.06} ifOverflow="hidden" />}
            {activeEvents.map((event, index) => <Fragment key={`${event.day}-${event.title}-${index}`}><ReferenceArea x1={event.day - 0.14} x2={event.day + 0.14} fill={eventStyle(event).color} fillOpacity={0.045} ifOverflow="hidden" /><ReferenceLine x={event.day} stroke={eventStyle(event).color} strokeWidth={1.25} strokeOpacity={0.7} strokeDasharray="4 4" ifOverflow="hidden" /></Fragment>)}
            {series.filter(item => visible[item.key]).map(item => <Area key={item.key} yAxisId={item.secondaryAxis ? 'secondary' : item.axisId} type="monotone" dataKey={item.key} name={item.label} stroke={item.color} fill={`url(#insight-fill-${item.key})`} strokeWidth={item.defaultOn ? 2.25 : 1.5} dot={point => <circle key={`${item.key}-${point.payload.day}`} cx={point.cx} cy={point.cy} r={item.defaultOn ? 3 : 2} fill={item.color} />} strokeOpacity={item.defaultOn ? 0.95 : 0.72} isAnimationActive={false} />)}
          </AreaChart> : <AreaChart data={layeredData} margin={{ top: 12, right: 12, bottom: 0, left: 0 }} stackOffset="none">
            <defs><pattern id="hidden-layer-pattern" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#f8fafc" /><line x1="0" y1="0" x2="0" y2="8" stroke="#94a3b8" strokeWidth="3" /></pattern></defs>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="day" type="number" domain={[Math.max(0.5, range[0] - 0.45), range[1] + 0.45]} ticks={ticks} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} allowDataOverflow />
            <YAxis domain={[0, MINUTES_PER_DAY]} ticks={[0, 360, 720, 1080, 1440]} tickFormatter={value => `${Math.round(value / MINUTES_PER_DAY * 100)}%`} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} width={42} />
            <Tooltip content={<LayeredTooltip />} />
            {LAYER_SERIES.map(item => <Area key={item.key} type="linear" dataKey={item.key} name={item.label} stackId="24h" stroke={item.color} strokeWidth={item.key === 'unrecordedMins' ? 1 : 1.25} fill={item.color} fillOpacity={item.key === 'unrecordedMins' ? 0.75 : 0.9} isAnimationActive={false} />)}
            <Area type="linear" dataKey="hiddenLayerMins" name="Hidden layers" stackId="24h" stroke="#64748b" strokeWidth={1} fill="url(#hidden-layer-pattern)" isAnimationActive={false} />
            {comparisonRanges.length === 2 ? <>
              <ReferenceArea x1={comparisonRanges[0][0]} x2={comparisonRanges[0][1]} fill="#2563eb" fillOpacity={0.025} stroke="#2563eb" strokeOpacity={0.55} ifOverflow="hidden" />
              <ReferenceArea x1={comparisonRanges[1][0]} x2={comparisonRanges[1][1]} fill="#059669" fillOpacity={0.025} stroke="#059669" strokeOpacity={0.6} ifOverflow="hidden" />
            </> : <ReferenceArea x1={focus.range[0]} x2={focus.range[1]} fill="#0ea5e9" fillOpacity={0.02} ifOverflow="hidden" />}
            {activeEvents.map((event, index) => <Fragment key={`${event.day}-${event.title}-${index}`}><ReferenceArea x1={event.day - 0.14} x2={event.day + 0.14} fill={eventStyle(event).color} fillOpacity={0.035} ifOverflow="hidden" /><ReferenceLine x={event.day} stroke={eventStyle(event).color} strokeWidth={1.5} strokeOpacity={0.9} strokeDasharray="4 4" ifOverflow="hidden" /></Fragment>)}
          </AreaChart>}
        </ResponsiveContainer>
      </div>

      {chartMode === 'layers' && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-xs text-slate-600"><strong>Fixed denominator:</strong> 1,440 minutes per day. Removed layers move into the striped band.</p><span className="rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-[10px] font-semibold text-slate-600">{averageCoverage}% average RFID coverage</span></div>}

      {comparisonRanges.length === 2 && <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium"><span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">Period 1 · Days {comparisonRanges[0][0]}–{comparisonRanges[0][1]}</span><span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">Period 2 · Days {comparisonRanges[1][0]}–{comparisonRanges[1][1]}</span></div>}

      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2"><p className="text-xs font-semibold text-slate-700">Clinical event nodes</p><p className="text-xs text-slate-400">Click a node to add or remove its dotted line. Hover for the source detail. Temporal proximity does not establish causality.</p></div>
        <div className="relative h-14">
          <div className="absolute left-0 right-0 top-5 h-px bg-slate-300" />
          {ticks.map(day => <span key={day} className="absolute top-7 -translate-x-1/2 text-[8px] text-slate-400" style={{ left: `${((day - range[0]) / span) * 100}%` }}>{day}</span>)}
          {clinicalEvents.map((event, index) => { const key = eventKey(event, index); const selected = Boolean(visibleEvents[key]); return <button key={key} type="button" aria-pressed={selected} onClick={() => setVisibleEvents(current => ({ ...current, [key]: !current[key] }))} onMouseEnter={() => setHoveredEvent(event)} onMouseLeave={() => setHoveredEvent(null)} onFocus={() => setHoveredEvent(event)} onBlur={() => setHoveredEvent(null)} aria-label={`${selected ? 'Remove' : 'Show'} ${eventCategory(event)} event on day ${event.day}: ${event.title}`} className={`absolute z-10 -translate-x-1/2 rounded-full border-2 border-white shadow-sm ring-offset-1 transition hover:scale-125 focus-visible:ring-2 ${selected ? 'h-4 w-4' : 'h-3.5 w-3.5 opacity-35 grayscale'}`} style={{ left: `${((event.day - range[0]) / span) * 100}%`, top: selected ? '13px' : '14px', background: eventStyle(event).color, '--tw-ring-color': eventStyle(event).color }}><title>{selected ? 'Shown on graph' : 'Hidden from graph'} · {event.title}: {event.description}</title></button> })}
          {hoveredEvent && <div className={`absolute bottom-12 z-30 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-xl ${popupPosition.className}`} style={popupPosition.style}><p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: eventStyle(hoveredEvent).color }}>{eventCategory(hoveredEvent)} · Day {hoveredEvent.day}</p><p className="mt-1 text-xs font-semibold text-slate-800">{hoveredEvent.title}</p><p className="mt-1 text-[10px] leading-relaxed text-slate-500">{hoveredEvent.description}</p></div>}
        </div>
      </div>
    </div>
  )
}

function EvidenceRail({
  focus, activeMetric, chartData, focusRanges, spatialEvidence, vitalEvidence,
  medicationEvidence, mocaEvidence, noteEvidence, visitorEvidence,
  selectedEvidence, onSelectEvidence,
}) {
  const summary = focus.evidenceSummary
  const citedRecords = citedEvidenceRecords(focus.evidenceRows)
  const citedRows = (focus.evidenceRows || []).filter(row => row.status === 'used')
  const currentAverage = average(chartData, focus.metricKey)
  const verifiedValue = focus.metricKey === 'systolicBP'
    ? `${currentAverage}/${average(chartData, 'diastolicBP')}`
    : currentAverage
  const sources = [
    ...(citedRows.length ? [{ id: 'cited', label: 'Used in answer', count: citedRecords.length || citedRows.length, Icon: CheckCircle2, tone: 'text-emerald-700' }] : []),
    { id: 'spatial', label: 'Spatial', count: spatialEvidence.length, Icon: Radio, tone: 'text-sky-700' },
    { id: 'vitals', label: 'Flowsheet', count: vitalEvidence.length, Icon: Activity, tone: 'text-violet-700' },
    { id: 'notes', label: 'Case notes', count: noteEvidence.length, Icon: FileText, tone: 'text-amber-700' },
    { id: 'visitors', label: 'Others', count: visitorEvidence.length, Icon: Users, tone: 'text-teal-700' },
  ]
  const selectedSource = sources.some(item => item.id === selectedEvidence) ? selectedEvidence : (citedRows.length ? 'cited' : 'spatial')
  return (
    <aside className="min-w-0 border-t border-slate-200 bg-slate-50/70 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:border-l lg:border-t-0" aria-label="Evidence inspector">
      <div className="space-y-3 p-4">
        {focus.verification && <section className={`rounded-xl border p-3 ${focus.verification.status === 'pass' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><div className="flex items-start gap-2"><CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${focus.verification.status === 'pass' ? 'text-emerald-700' : 'text-amber-700'}`} /><div><p className={`text-xs font-semibold ${focus.verification.status === 'pass' ? 'text-emerald-900' : 'text-amber-900'}`}>{focus.verification.status === 'pass' ? 'Answer matched to source data' : 'Answer requires evidence review'}</p><p className={`mt-1 text-[11px] ${focus.verification.status === 'pass' ? 'text-emerald-800' : 'text-amber-800'}`}>{citedRows.length} statement{citedRows.length === 1 ? '' : 's'} selected · {citedRecords.length} exact source record{citedRecords.length === 1 ? '' : 's'} linked</p></div></div></section>}

        {focus.semanticNarrative && <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-2"><div className="flex items-start gap-2"><Sparkles size={16} className="mt-0.5 shrink-0 text-amber-700" /><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">CodeBuddy semantic layer</p><h3 className="mt-1 text-sm font-semibold text-slate-900">Interpret with context</h3></div></div><span className="rounded-md border border-amber-300 bg-white px-2 py-1 text-[10px] font-semibold text-amber-800">Contextual · review required</span></div><p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-amber-950">{focus.semanticNarrative}</p>{focus.selectedEvidence?.length > 0 && <div className="mt-3 space-y-1.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">CodeBuddy-selected source records</p>{focus.selectedEvidence.map(record => <details key={record.id} className="rounded-md border border-amber-200 bg-white"><summary className="cursor-pointer px-2.5 py-2 text-xs font-medium text-slate-700">{record.sourceType} · {record.day ? `Day ${record.day}` : record.scopeLabel || 'Context'} · {record.title}</summary><div className="border-t border-amber-100 px-2.5 py-2"><p className="text-xs leading-relaxed text-slate-600">{record.statement}</p><p className="mt-1 break-all font-mono text-[9px] text-slate-400">{record.id}</p></div></details>)}</div>}{focus.groundingScan?.checks?.length > 0 && <div className="mt-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">Second deterministic scan · passed</p><div className="mt-2 flex flex-wrap gap-1.5">{focus.groundingScan.checks.map(check => <span key={check.id} className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-800">✓ {check.label}</span>)}</div></div>}{focus.retrieval && <p className="mt-3 text-[10px] text-amber-800">Considered {focus.retrieval.totalAuthorizedRecords} records across {Object.keys(focus.retrieval.sourceCoverage || {}).length} source types · {focus.retrieval.candidateRecords} bounded candidates{focus.usage ? ` · ${focus.usage.attemptCount} attempt${focus.usage.attemptCount === 1 ? '' : 's'} · ~${focus.usage.estimatedInputTokens} input / ~${focus.usage.estimatedOutputTokens} output tokens` : ''}</p>}<p className="mt-3 border-t border-amber-200 pt-2 text-[11px] text-amber-800">The green measurements and exact quotations remain authoritative.</p></section>}

        {!focus.semanticNarrative && focus.groundingScan?.status === 'rejected' && <section className="rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-800">CodeBuddy output withheld</p><p className="mt-2 text-xs leading-relaxed text-rose-700">A scanner rejected the generated response, so no model-authored content or action was rendered. {deterministicAnswer ? 'The deterministic facts remain available.' : 'No semantic answer is shown; inspect the source records instead.'}</p><div className="mt-3 flex flex-wrap gap-1.5">{focus.groundingScan.checks.map(check => <span key={check.id} className="rounded border border-rose-200 bg-white px-2 py-1 text-[10px] font-medium text-rose-800">✕ {check.label}</span>)}</div></section>}

        <button type="button" onClick={() => onSelectEvidence('metric')} aria-pressed={selectedEvidence === 'metric'} className={`w-full rounded-xl border bg-white p-3 text-left transition ${selectedEvidence === 'metric' ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-emerald-200 hover:border-emerald-400'}`}>
          <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Verified measurement</span><span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">SQLite</span></div>
          <p className="mt-2 text-lg font-semibold text-slate-900">{verifiedValue} <span className="text-xs font-medium text-slate-500">{activeMetric.unit}</span></p>
          {focus.metricKey === 'systolicBP' && <p className="mt-1 font-mono text-xs font-medium text-slate-600">Heart rate {average(chartData, 'heartRate')} bpm</p>}
          <p className="mt-1 text-xs text-slate-500">{activeMetric.label} · {chartData.length} daily rows · Days {focus.range[0]}–{focus.range[1]}</p>
          {summary?.comparisons?.length === 2 && <p className="mt-2 rounded bg-slate-50 px-2 py-1.5 font-mono text-xs text-slate-700">{summary.comparisons[0].average} → {summary.comparisons[1].average} {activeMetric.unit}</p>}
        </button>

        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2"><div><p className="text-xs font-semibold text-slate-800">Evidence sources</p><p className="mt-0.5 text-[11px] text-slate-500">Nothing is removed; choose a source to inspect it.</p></div><Database size={15} className="text-brand-600" /></div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {sources.map(({ id, label, count, Icon, tone }) => <button key={id} type="button" onClick={() => onSelectEvidence(id)} aria-pressed={selectedSource === id} className={`min-w-0 rounded-lg border p-2.5 text-left transition ${selectedSource === id ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-100' : 'border-slate-200 bg-white hover:border-brand-300'}`}><div className={`flex items-center gap-1.5 text-xs font-semibold ${tone}`}><Icon size={13} />{label}</div><p className="mt-1 text-xs text-slate-500">{count} record{count === 1 ? '' : 's'}</p></button>)}
          </div>
        </section>

        <section className={`rounded-xl border bg-white p-3 transition ${selectedSource === 'notes' ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}`} aria-live="polite">
          <div className="mb-3"><p className={`text-xs font-semibold uppercase tracking-[0.12em] ${selectedSource === 'notes' ? 'text-amber-800' : 'text-emerald-800'}`}>{selectedSource === 'notes' ? 'Interpret with context' : 'Deterministic source rows'}</p><h3 className="mt-1 text-sm font-semibold text-slate-900">{sources.find(item => item.id === selectedSource)?.label}</h3></div>

          {selectedSource === 'cited' && <div className="space-y-2">{citedRows.map(row => <article key={row.id} className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3"><p className="text-xs font-semibold text-emerald-900">Used in answer</p><p className="mt-1 text-xs leading-relaxed text-slate-700">{row.statement}</p>{row.sourceRecords?.length > 0 && <details className="mt-2 rounded-md border border-emerald-200 bg-white"><summary className="flex min-h-11 cursor-pointer list-none items-center px-2.5 text-[11px] font-semibold text-emerald-800">View {row.sourceRecords.length} exact source record{row.sourceRecords.length === 1 ? '' : 's'}</summary><div className="space-y-2 border-t border-emerald-100 p-2.5">{row.sourceRecords.map(source => <div key={source.id} className="rounded-md bg-slate-50 p-2"><p className="text-[10px] font-semibold text-slate-700">Day {source.day} · {source.kind}</p><p className="mt-1 text-xs leading-relaxed text-slate-700">{sourceRecordSummary(source)}</p><p className="mt-1 break-all font-mono text-[9px] text-slate-400">{source.id}</p></div>)}</div></details>}</article>)}</div>}

          {selectedSource === 'spatial' && <div className="space-y-2">{focusRanges.map(([start, end], index) => { const rows = spatialEvidence.filter(row => row.day >= start && row.day <= end); return <div key={`${start}-${end}`} className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3"><p className="text-xs font-semibold text-emerald-800">{focus.comparisonRanges ? `Period ${index + 1} · ` : ''}Days {start}–{end}</p><dl className="mt-2 grid grid-cols-2 gap-2 text-xs"><div><dt className="text-slate-500">Outside cubicle</dt><dd className="font-mono font-semibold text-slate-800">{average(rows, 'outsideBedroomMins')} min/day</dd></div><div><dt className="text-slate-500">Activity</dt><dd className="font-mono font-semibold text-slate-800">{average(rows, 'activityMins')} min/day</dd></div><div><dt className="text-slate-500">Transitions</dt><dd className="font-mono font-semibold text-slate-800">{average(rows, 'zoneTransitions')}/day</dd></div><div><dt className="text-slate-500">Peer contacts</dt><dd className="font-mono font-semibold text-slate-800">{average(rows, 'peerContacts')}/day</dd></div></dl></div>})}</div>}

          {selectedSource === 'vitals' && <div className="space-y-2">{focusRanges.map(([start, end], index) => { const rows = vitalEvidence.filter(row => row.day >= start && row.day <= end); return <div key={`${start}-${end}`} className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3"><p className="text-xs font-semibold text-emerald-800">{focus.comparisonRanges ? `Period ${index + 1} · ` : ''}Days {start}–{end}</p><p className="mt-2 text-xs text-slate-600">HR <span className="font-mono font-semibold text-slate-900">{average(rows, 'heartRate')} bpm</span></p><p className="mt-1 text-xs text-slate-600">BP <span className="font-mono font-semibold text-slate-900">{average(rows, 'systolicBP')}/{average(rows, 'diastolicBP')} mmHg</span></p><p className="mt-1 text-[11px] text-slate-500">{rows.length} timestamped observations</p></div>})}{medicationEvidence.map((event, index) => <div key={`med-${event.day}-${index}`} className="rounded-lg border border-amber-200 bg-amber-50 p-3"><p className="text-xs font-semibold text-amber-800">Day {event.day} · Medication context</p><p className="mt-1 text-xs text-amber-700">{event.title}</p></div>)}{mocaEvidence.map((item, index) => <div key={`moca-${item.day}-${index}`} className="rounded-lg border border-violet-200 bg-violet-50 p-3"><p className="text-xs font-semibold text-violet-800">Day {item.day} · MoCA {item.score}/{item.maximum}</p><p className="mt-1 text-[11px] text-violet-700">Recorded result; no diagnostic inference</p></div>)}</div>}

          {selectedSource === 'notes' && <div className="space-y-2">{focus.excerpts?.length > 0 && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3"><p className="text-xs font-semibold text-amber-900">Exact matched paragraphs</p><div className="mt-2 space-y-2">{focus.excerpts.map(excerpt => <blockquote key={excerpt.excerptId} className="rounded border border-amber-200 bg-white p-3"><p className="text-[10px] font-semibold text-amber-800">{excerpt.excerptId} · Day {excerpt.day} · {excerpt.section}</p><p className="mt-1.5 text-xs leading-relaxed text-slate-700"><ExactExcerpt excerpt={excerpt} /></p></blockquote>)}</div></div>}{noteEvidence.length ? noteEvidence.map(document => <ClinicalDocumentCard key={document.documentId} document={document} defaultOpen={false} />) : <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">No case notes fall inside this date range.</p>}</div>}

          {selectedSource === 'visitors' && <div className="space-y-2">{visitorEvidence.length ? visitorEvidence.map(form => <article key={form.formId} className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3"><p className="text-xs font-semibold text-emerald-800">{form.visitDate} · {form.status}</p><p className="mt-1 text-sm font-semibold text-slate-900">{form.visitorDisplayName}</p><p className="text-xs text-slate-600">{form.relationship} · {form.purpose}</p><p className="mt-2 text-[11px] text-slate-500">{formatTime(form.checkInAt)}–{formatTime(form.checkOutAt)} · submitted {formatSeenAt(form.submittedAt)}</p></article>) : <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">No visitor forms fall inside this date range.</p>}</div>}
        </section>

        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3"><AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-700" /><p className="text-xs leading-relaxed text-amber-800"><strong>Amber means interpretation required.</strong> Timing and semantics can provide context, but do not establish diagnosis, intent, consent, sleep, interaction, or causality.</p></div>
      </div>
    </aside>
  )
}

export default function ClinicalInsights({ patient, profession, range, selectedDays }) {
  const [showBrief, setShowBrief] = useState(false)
  const [focus, setFocus] = useState(null)
  const [selectedEvidence, setSelectedEvidence] = useState('metric')
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
  const displayRange = focus?.range || range
  const controlledDays = focus?.selectedDays?.length ? new Set(focus.selectedDays) : selectedSet
  const chartData = daily.filter(row => row.day >= displayRange[0] && row.day <= displayRange[1] && controlledDays.has(row.day))
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

  useEffect(() => {
    if (!focus) return
    setSelectedEvidence(focus.evidenceRows?.some(row => row.status === 'used') ? 'cited' : 'metric')
    window.requestAnimationFrame(() => {
      document.getElementById(focus.scrollTarget || 'evidence-cross-reference')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [focus])

  const updateFocus = next => setFocus({ ...next, range: next.range || range })
  const activateSignal = signal => {
    const metricKey = SIGNAL_METRIC[signal.id] || 'outsideBedroomMins'
    const initial = { metricKey, metricLabel: METRICS[metricKey].label, range, query: signal.title }
    updateFocus(initial)
  }
  const applyInsightActions = (actions, result) => {
    const dayAction = actions.find(action => action.type === 'set_day_range')
    const selectedAction = actions.find(action => action.type === 'select_days')
    const metricAction = actions.find(action => action.type === 'toggle_metric' && action.enabled)
    const actionRange = dayAction
      ? [dayAction.fromDay, dayAction.toDay]
      : selectedAction
        ? [Math.min(...selectedAction.days), Math.max(...selectedAction.days)]
        : result?.scopeResolution?.range || range
    const metricAliases = { assignedCubicleMins: 'homeCubicleMins' }
    const verifiedMetricId = result?.verification?.usedFacts?.find(fact => METRICS[metricAliases[fact.metricId] || fact.metricId])?.metricId
    const rawMetricKey = metricAction?.metricId || verifiedMetricId || 'outsideBedroomMins'
    const metricKey = metricAliases[rawMetricKey] || rawMetricKey
    updateFocus({
      metricKey: METRICS[metricKey] ? metricKey : 'outsideBedroomMins',
      metricLabel: (METRICS[metricKey] || METRICS.outsideBedroomMins).label,
      range: actionRange,
      selectedDays: selectedAction?.days,
      query: result?.question || 'CodeBuddy evidence selection',
      answer: result?.answer,
      answerSource: result?.source,
      verification: result?.verification,
      evidenceReview: result?.evidenceReview,
      evidenceRows: result?.evidenceRows || [],
      scopeResolution: result?.scopeResolution,
    })
  }

  return (
    <div className="mx-auto max-w-screen-2xl space-y-4 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="panel-title">Clinical insights</p><h1 className="mt-1 text-xl font-semibold text-slate-900">Ask a question and inspect the evidence</h1><p className="mt-1 text-sm text-slate-500">Answers, graph focus and exact source records update together.</p></div>
        <button type="button" onClick={() => setShowBrief(true)} className="flex min-h-11 items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-brand-800"><FileText size={15} />MDT Brief</button>
      </div>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div><p className="text-base font-semibold text-slate-900">{patient.displayName}</p><p className="mt-0.5 text-sm text-slate-500">{patient.id} · {patient.ward} · {profession?.name || 'MDT'} lens</p></div>
            <span className="text-sm font-medium text-slate-600">Days {range[0]}–{range[1]}</span>
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
            <div className="[&_.card]:h-full [&_.card]:border-slate-300 [&_.card]:shadow-sm"><InsightAgent patientId={patient.id} folderId={patient.folderId} range={range} selectedDays={selectedDays} profession={profession} onApplyActions={applyInsightActions} onEvidenceReady={result => applyInsightActions(result.actions || [], result)} showEvidenceLedger={false} /></div>
          </div>
        </section>

        {!focus ? (
          <section className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm"><Database size={18} /></div><div><h2 className="text-sm font-semibold text-slate-800">Evidence is ready when you ask</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">Ask a question or select a pattern. The relevant graph range and exact source rows will open automatically.</p></div>
          </section>
        ) : (
          <section id="evidence-cross-reference" className="scroll-mt-20 overflow-hidden rounded-xl border border-brand-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-100 bg-brand-50 px-5 py-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Evidence cross-reference</p><h2 className="mt-1 text-lg font-semibold text-slate-900">{activeMetric.label}</h2><p className="mt-1 text-sm text-slate-600">{focus.comparisonRanges ? `Comparing Days ${focus.comparisonRanges[0][0]}–${focus.comparisonRanges[0][1]} with Days ${focus.comparisonRanges[1][0]}–${focus.comparisonRanges[1][1]}` : `Days ${focus.range[0]}–${focus.range[1]} highlighted`} in response to: “{focus.query}”</p></div>
              <button type="button" onClick={() => setFocus(null)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Clear evidence</button>
            </div>
            <div className="grid min-w-0 items-start lg:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.75fr)]">
              <div className={`min-w-0 transition ${selectedEvidence === 'metric' ? 'ring-2 ring-inset ring-emerald-300' : ''}`}>
                {focus.comparisonRanges && <div className="border-b border-slate-100 p-4"><RequestedComparison metric={activeMetric} baseline={average(firstComparisonRows, focus.metricKey)} recent={average(secondComparisonRows, focus.metricKey)} /></div>}
                <PatientMapStyleChart activeMetric={activeMetric} focus={focus} chartData={chartData} range={displayRange} clinicalEvents={packet.clinicalEvents} />
              </div>
              <EvidenceRail
                focus={focus}
                activeMetric={activeMetric}
                chartData={chartData}
                focusRanges={focusRanges}
                spatialEvidence={spatialEvidence}
                vitalEvidence={vitalEvidence}
                medicationEvidence={medicationEvidence}
                mocaEvidence={mocaEvidence}
                noteEvidence={noteEvidence}
                visitorEvidence={visitorEvidence}
                selectedEvidence={selectedEvidence}
                onSelectEvidence={setSelectedEvidence}
              />
            </div>
          </section>
        )}

        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" /><p>Location and interaction data are behavioural proxies. They do not establish diagnosis, intent, consent, sleep, or causality. Clinician review remains required.</p></div>
      {showBrief && <MDTBrief patientId={patient.id} patient={patient} range={range} onClose={() => setShowBrief(false)} />}
    </div>
  )
}
