import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { CalendarDays, ChevronLeft, ChevronRight, FileText, Minus, Moon, Plus, RotateCcw } from 'lucide-react'
import { ARCHITECTURAL_AREAS, ENTRANCE, WARD_BOUNDARIES, ZONES } from '../data/zones.js'
import { ADMISSION_DATE, getEventsForPatient } from '../data/syntheticEvents.js'
import { computeDailyMetrics, getDayNumber, getHomeCubicle } from '../data/metricsEngine.js'
import { formatDuration } from '../utils/duration.js'

const SPACE_SERIES = [
  { key: 'homeCubicleMins', label: 'Assigned cubicle', color: '#64748b', defaultOn: true },
  { key: 'otherCubicleMins', label: 'Other cubicles', color: '#db2777', defaultOn: true },
  { key: 'diningMins',   label: 'Dining area',      color: '#d97706', defaultOn: true },
  { key: 'activityMins', label: 'Activity room',   color: '#059669', defaultOn: true },
  { key: 'balconyMins',  label: 'Balcony',          color: '#65a30d', defaultOn: true },
  { key: 'visitorMins',  label: 'Visitor area',     color: '#0f766e', defaultOn: true },
  { key: 'corridorMins', label: 'Corridor',         color: '#4f46e5', defaultOn: true },
  { key: 'ensuiteMins',  label: 'Shower',           color: '#0ea5e9', defaultOn: true },
  { key: 'toiletMins',   label: 'Toilet',           color: '#7c3aed', defaultOn: true },
]

const EVENT_STYLE = {
  DAV:        { color: '#b91c1c', label: 'DAV episode' },
  Medication: { color: '#ea580c', label: 'Medication' },
  Psychiatry: { color: '#7c3aed', label: 'Psychiatry' },
  Nursing:    { color: '#2563eb', label: 'Nursing' },
  OT:         { color: '#16a34a', label: 'Occupational therapy' },
  MDT:        { color: '#475569', label: 'MDT' },
  Psychology: { color: '#b45309', label: 'Psychology' },
}

const getEventCategory = event => event.eventType === 'dav_episode' ? 'DAV' : event.eventType === 'medication_change' ? 'Medication' : event.discipline
const getEventStyle = event => EVENT_STYLE[getEventCategory(event)] || EVENT_STYLE.MDT

const heatFill = level => [
  '#f8fafc', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1',
][level] || '#f8fafc'

const TIME_ZONE_STYLE = {
  home: { color: '#64748b', label: 'Assigned cubicle' },
  otherCubicle: { color: '#db2777', label: 'Other cubicle' },
  shower: { color: '#0ea5e9', label: 'Shower' },
  dining: { color: '#d97706', label: 'Dining Area' },
  activity_room: { color: '#059669', label: 'Activity Room' },
  balcony: { color: '#65a30d', label: 'Balcony' },
  corridor: { color: '#6366f1', label: 'Corridor' },
  visitor_area: { color: '#0f766e', label: 'Visitor Area' },
  other: { color: '#cbd5e1', label: 'Other space' },
}

const timeCategoryForZone = (zoneId, homeCubicle) => {
  if (zoneId === homeCubicle) return 'home'
  if (zoneId.startsWith('cubicle_')) return 'otherCubicle'
  if (zoneId.startsWith('shower_')) return 'shower'
  return TIME_ZONE_STYLE[zoneId] ? zoneId : 'other'
}

function SpaceTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-xl">
      <p className="mb-2 font-semibold text-slate-800">Day {label}</p>
      {payload.map(item => (
        <div key={item.dataKey} className="flex min-w-44 items-center justify-between gap-4 py-0.5">
          <span style={{ color: item.color }}>{item.name}</span>
          <span className="font-mono font-semibold text-slate-800">{formatDuration(item.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function IntegratedPatientView({ patientId, range, onRangeChange, selectedDays, onDayToggle }) {
  const daily = computeDailyMetrics(patientId)
  const dayCount = daily.length
  const { locationEvents, clinicalEvents } = getEventsForPatient(patientId)
  const homeCubicle = getHomeCubicle(patientId)
  const patientLabel = `Patient ${String.fromCharCode(64 + Number(patientId.split('-')[1]))}`
  const setRange = onRangeChange
  const [hoveredZone, setHoveredZone] = useState(null)
  const [hoveredEvent, setHoveredEvent] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [mapZoom, setMapZoom] = useState(0.75)
  const pinchRef = useRef(null)
  const rangeTrackRef = useRef(null)
  const rangeInteractionRef = useRef(null)
  const [visibleSpaces, setVisibleSpaces] = useState(
    Object.fromEntries(SPACE_SERIES.map(item => [item.key, item.defaultOn]))
  )
  const [eventFilters, setEventFilters] = useState(
    Object.fromEntries(Object.keys(EVENT_STYLE).map(key => [key, true]))
  )

  const selectedDaySet = useMemo(() => new Set(selectedDays), [selectedDays])
  const chartTicks = useMemo(() => {
    if (selectedDays.length <= 21) return selectedDays
    return selectedDays.filter((day, index) => index === 0 || index === selectedDays.length - 1 || (day - range[0]) % 7 === 0)
  }, [selectedDays, range])

  useEffect(() => {
    setSelectedEvent(null)
  }, [patientId])

  const zoneData = useMemo(() => {
    const totals = {}
    locationEvents.forEach(event => {
      const day = getDayNumber(event.enteredAt)
      if (selectedDaySet.has(day)) {
        totals[event.zoneId] = (totals[event.zoneId] || 0) + event.durationMinutes
      }
    })
    const averages = Object.fromEntries(
      Object.entries(totals).map(([zone, total]) => [zone, Math.round(total / selectedDays.length)])
    )
    return { totals, averages, max: Math.max(...Object.values(averages), 1) }
  }, [locationEvents, selectedDaySet, selectedDays.length])

  const filteredEvents = clinicalEvents.filter(event => eventFilters[getEventCategory(event)] !== false)
  const chartData = daily.filter(row => selectedDaySet.has(row.day))
  const dayDate = day => daily.find(row => row.day === day)?.date || `Day ${day}`
  const timeGrid = useMemo(() => selectedDays.map(day => {
    const cells = Array.from({ length: 24 }, (_, hour) => {
      const windowStart = ADMISSION_DATE.getTime() + (day - 1) * 86400000 + hour * 3600000
      const windowEnd = windowStart + 3600000
      const minutesByZone = {}
      locationEvents.forEach(event => {
        if (getDayNumber(event.enteredAt) !== day) return
        const start = new Date(event.enteredAt).getTime()
        const end = new Date(event.exitedAt).getTime()
        const overlap = Math.max(0, Math.min(end, windowEnd) - Math.max(start, windowStart)) / 60000
        if (overlap > 0) minutesByZone[event.zoneId] = (minutesByZone[event.zoneId] || 0) + overlap
      })
      const dominant = Object.entries(minutesByZone).sort((a, b) => b[1] - a[1])[0]
      if (!dominant) return { hour, zoneId: null, minutes: 0, category: 'other' }
      return { hour, zoneId: dominant[0], minutes: Math.round(dominant[1]), category: timeCategoryForZone(dominant[0], homeCubicle) }
    })
    return { day, date: dayDate(day), cells }
  }), [selectedDays, locationEvents, homeCubicle])
  const inputDateForDay = day => {
    const date = new Date(ADMISSION_DATE.getTime() + (day - 1) * 86400000)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  const dayFromInputDate = value => {
    const parsed = new Date(`${value}T07:00:00`)
    return Math.min(dayCount, Math.max(1, Math.round((parsed.getTime() - ADMISSION_DATE.getTime()) / 86400000) + 1))
  }

  const setSingleDay = day => setRange([day, day])
  const focusEvent = event => {
    const day = getDayNumber(event.timestamp)
    setSelectedEvent(event)
    setSingleDay(day)
  }

  const updateStart = value => setRange(([, end]) => [Math.max(1, Math.min(Number(value), end)), end])
  const updateEnd = value => setRange(([start]) => [start, Math.min(dayCount, Math.max(Number(value), start))])
  const startRangeInteraction = (event, mode) => {
    const trackWidth = rangeTrackRef.current?.getBoundingClientRect().width
    if (!trackWidth) return
    rangeInteractionRef.current = { mode, pointerId: event.pointerId, startX: event.clientX, start: range[0], end: range[1], trackWidth }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }
  const moveRangeInteraction = event => {
    const drag = rangeInteractionRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const pixelDelta = event.clientX - drag.startX
    const dayDelta = Math.round((pixelDelta / drag.trackWidth) * (dayCount - 1))
    if (drag.mode === 'start') return setRange([Math.max(1, Math.min(drag.start + dayDelta, drag.end)), drag.end])
    if (drag.mode === 'end') return setRange([drag.start, Math.min(dayCount, Math.max(drag.end + dayDelta, drag.start))])
    const width = drag.end - drag.start
    const nextStart = Math.min(dayCount - width, Math.max(1, drag.start + dayDelta))
    setRange([nextStart, nextStart + width])
  }
  const endRangeInteraction = event => {
    if (rangeInteractionRef.current?.pointerId === event.pointerId) rangeInteractionRef.current = null
  }
  const moveHandleByKey = (event, edge) => {
    const delta = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
    if (!delta) return
    event.preventDefault()
    edge === 'start' ? updateStart(range[0] + delta) : updateEnd(range[1] + delta)
  }
  const shiftRange = direction => setRange(([start, end]) => {
    const width = end - start + 1
    const delta = direction * width
    let nextStart = start + delta
    let nextEnd = end + delta
    if (nextStart < 1) { nextStart = 1; nextEnd = width }
    if (nextEnd > dayCount) { nextEnd = dayCount; nextStart = dayCount - width + 1 }
    return [nextStart, nextEnd]
  })
  const clampZoom = value => Math.min(2.5, Math.max(0.5, value))
  const zoomBy = delta => setMapZoom(value => clampZoom(Math.round((value + delta) * 10) / 10))
  const onTouchStart = event => {
    if (event.touches.length !== 2) return
    const [a, b] = event.touches
    pinchRef.current = { distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), zoom: mapZoom }
  }
  const onTouchMove = event => {
    if (event.touches.length !== 2 || !pinchRef.current) return
    const [a, b] = event.touches
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    setMapZoom(clampZoom(pinchRef.current.zoom * (distance / pinchRef.current.distance)))
  }

  return (
    <div className="space-y-4">
      <section className="card overflow-visible">
        <div className="card-header flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="panel-title">Integrated ward behaviour view</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-800">Where the patient spent time, and what occurred alongside it</h2>
            <p className="mt-1 text-xs text-slate-500">Location is a behavioural proxy. It does not establish activity, interaction, or causality.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => document.getElementById('night-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100">
              <Moon size={13} /> Night view
            </button>
            <button type="button" onClick={() => { setRange([1, dayCount]); setSelectedEvent(null) }} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
              <RotateCcw size={13} /> Reset {dayCount} days
            </button>
          </div>
        </div>

        <div className="border-b border-slate-100 px-4 py-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <CalendarDays size={15} className="text-brand-600" />
              {range[0] === range[1]
                ? `Day ${range[0]} · ${dayDate(range[0])}`
                : `Days ${range[0]}–${range[1]} · ${dayDate(range[0])} to ${dayDate(range[1])}`}
            </div>
            <span className="rounded bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">
              {selectedDays.length} {selectedDays.length === 1 ? 'day' : 'days'} selected
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className="w-36 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-center shadow-sm hover:border-brand-300 hover:bg-brand-50/40">
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-400">From</span>
              <input aria-label="From date" type="date" min={inputDateForDay(1)} max={inputDateForDay(range[1])} value={inputDateForDay(range[0])} onChange={event => updateStart(dayFromInputDate(event.target.value))} className="mt-0.5 w-full cursor-pointer border-0 bg-transparent p-0 text-center text-xs font-semibold text-slate-700 outline-none" />
            </label>
            <div ref={rangeTrackRef} className="relative h-8 flex-1" aria-label={`Selected period Day ${range[0]} to Day ${range[1]}. Drag the highlighted segment to move the period.`}>
              <div className="absolute left-0 right-0 top-3.5 h-1.5 rounded-full bg-slate-200" />
              <div
                className="absolute top-2.5 z-[1] h-3.5 touch-none select-none rounded-full bg-brand-700/90 shadow-sm cursor-grab active:cursor-grabbing"
                style={{ left: `${((range[0] - 1) / (dayCount - 1)) * 100}%`, right: `${100 - ((range[1] - 1) / (dayCount - 1)) * 100}%` }}
                onPointerDown={event => startRangeInteraction(event, 'middle')}
                onPointerMove={moveRangeInteraction}
                onPointerUp={endRangeInteraction}
                onPointerCancel={endRangeInteraction}
                title={range[0] === 1 && range[1] === dayCount ? 'Move a handle inward before dragging the selected period' : 'Drag to move the selected period'}
              />
              <button
                type="button" role="slider" aria-label="Start day" aria-valuemin="1" aria-valuemax={range[1]} aria-valuenow={range[0]}
                onPointerDown={event => startRangeInteraction(event, 'start')} onPointerMove={moveRangeInteraction} onPointerUp={endRangeInteraction} onPointerCancel={endRangeInteraction} onKeyDown={event => moveHandleByKey(event, 'start')}
                className="absolute top-1.5 z-10 h-5 w-5 -translate-x-1/2 touch-none rounded-full border-[3px] border-white bg-brand-700 shadow-[0_0_0_1px_#334e68,0_2px_5px_rgba(15,23,42,0.22)] cursor-grab active:cursor-grabbing"
                style={{ left: `${((range[0] - 1) / (dayCount - 1)) * 100}%` }} title={`Start: Day ${range[0]}`}
              />
              <button
                type="button" role="slider" aria-label="End day" aria-valuemin={range[0]} aria-valuemax={dayCount} aria-valuenow={range[1]}
                onPointerDown={event => startRangeInteraction(event, 'end')} onPointerMove={moveRangeInteraction} onPointerUp={endRangeInteraction} onPointerCancel={endRangeInteraction} onKeyDown={event => moveHandleByKey(event, 'end')}
                className="absolute top-1.5 z-10 h-5 w-5 -translate-x-1/2 touch-none rounded-full border-[3px] border-white bg-brand-700 shadow-[0_0_0_1px_#334e68,0_2px_5px_rgba(15,23,42,0.22)] cursor-grab active:cursor-grabbing"
                style={{ left: `${((range[1] - 1) / (dayCount - 1)) * 100}%` }} title={`End: Day ${range[1]}`}
              />
            </div>
            <label className="w-36 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-center shadow-sm hover:border-brand-300 hover:bg-brand-50/40">
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-400">To</span>
              <input aria-label="To date" type="date" min={inputDateForDay(range[0])} max={inputDateForDay(dayCount)} value={inputDateForDay(range[1])} onChange={event => updateEnd(dayFromInputDate(event.target.value))} className="mt-0.5 w-full cursor-pointer border-0 bg-transparent p-0 text-center text-xs font-semibold text-slate-700 outline-none" />
            </label>
          </div>

          <div className="mt-3 overflow-x-auto pb-1">
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${dayCount}, minmax(42px, 1fr))`, minWidth: `${Math.max(0, dayCount * 44)}px` }}>
            {daily.map(row => {
              const active = selectedDaySet.has(row.day)
              return (
                <button
                  key={row.day}
                  type="button"
                  onClick={() => onDayToggle(row.day)}
                  aria-label={`${active ? 'Remove' : 'Add'} Day ${row.day}, ${row.date}${active ? ' from selection' : ' to selection'}`}
                  title={`${active ? 'Remove' : 'Add'} ${row.date} ${active ? 'from' : 'to'} the selection`}
                  className={`rounded px-1 py-1.5 text-center transition-colors ${active ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  <span className="block text-[10px] font-semibold">D{row.day}</span>
                  <span className="block text-[8px] opacity-75">{row.date}</span>
                </button>
              )
            })}
            </div>
          </div>
        </div>

        <div className="grid gap-0 xl:grid-cols-[minmax(540px,1.15fr)_minmax(560px,1.25fr)]">
          <div className="relative border-b border-slate-100 bg-slate-50/70 p-4 xl:border-b-0 xl:border-r">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="panel-title">Ward blueprint · selected period</p>
                <p className="mt-1 text-xs text-slate-400">Pinch or Ctrl+wheel to zoom. Hover a space for recorded presence.</p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-sm">
                  <button type="button" onClick={() => shiftRange(-1)} disabled={range[0] === 1} className="flex items-center gap-1 rounded px-2 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Show previous date period"><ChevronLeft size={12} /> Previous period</button>
                  <button type="button" onClick={() => shiftRange(1)} disabled={range[1] === dayCount} className="flex items-center gap-1 rounded px-2 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Show next date period">Next period <ChevronRight size={12} /></button>
                </div>
                <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-sm">
                <button type="button" onClick={() => zoomBy(-0.2)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Zoom out"><Minus size={13} /></button>
                <span className="min-w-11 text-center text-[10px] font-semibold text-slate-600">{Math.round(mapZoom * 100)}%</span>
                <button type="button" onClick={() => zoomBy(0.2)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Zoom in"><Plus size={13} /></button>
                <button type="button" onClick={() => setMapZoom(0.75)} className="rounded px-2 py-1.5 text-[10px] font-medium text-brand-700 hover:bg-brand-50">Fit</button>
                </div>
              </div>
            </div>
            <div
              className="h-[650px] overflow-auto rounded-xl border border-slate-200 bg-slate-100/60 overscroll-contain"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={() => { pinchRef.current = null }}
              onWheel={event => {
                if (!event.ctrlKey && !event.metaKey) return
                event.preventDefault()
                zoomBy(event.deltaY > 0 ? -0.1 : 0.1)
              }}
            >
              <svg
                viewBox="0 0 760 840"
                width={760 * mapZoom}
                height={840 * mapZoom}
                className="block origin-top-left"
                role="img"
                aria-label="Ward 4B cubicle and shared-space heat map"
              >
                <defs>
                  <pattern id="blueprint-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M20 0H0V20" fill="none" stroke="#94a3b8" strokeOpacity="0.18" strokeWidth="0.7" />
                  </pattern>
                  <filter id="zone-shadow"><feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.08" /></filter>
                </defs>
                <rect width="760" height="840" fill="#f8fafc" />
                <rect width="760" height="840" fill="url(#blueprint-grid)" />
                <text x="24" y="28" fill="#64748b" fontSize="10" fontWeight="600" letterSpacing="1.8">WARD 4B · ORIENTATION IMPRESSION · NOT TO SCALE FOR CONSTRUCTION</text>
                {WARD_BOUNDARIES.map(boundary => (
                  <g key={boundary.id}>
                    <path d={boundary.d} fill="#fff" fillOpacity="0.45" stroke="#334155" strokeWidth="3" />
                    <text x={boundary.labelPos.x} y={boundary.labelPos.y} textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="700" letterSpacing="1.4">{boundary.label}</text>
                  </g>
                ))}
                {ARCHITECTURAL_AREAS.map(area => (
                  <g key={area.id}>
                    <rect x={area.shape.x} y={area.shape.y} width={area.shape.width} height={area.shape.height} rx={area.shape.rx} fill="#e2e8f0" stroke="#64748b" strokeWidth="1.25" strokeDasharray="5 3" />
                    <text x={area.label.x} y={area.label.y - 5} textAnchor="middle" fill="#475569" fontSize="8" fontWeight="700">{area.shortName.toUpperCase()}</text>
                    <text x={area.label.x} y={area.label.y + 9} textAnchor="middle" fill="#b91c1c" fontSize="6.8" fontWeight="700">OUT OF BOUNDS</text>
                    <title>{area.name}: {area.note}</title>
                  </g>
                ))}
                <path d={`M${ENTRANCE.x - 22} ${ENTRANCE.y} Q${ENTRANCE.x} ${ENTRANCE.y - 30} ${ENTRANCE.x + 22} ${ENTRANCE.y}`} fill="none" stroke="#0f766e" strokeWidth="2.5" />
                <text x={ENTRANCE.x} y={ENTRANCE.y + 17} textAnchor="middle" fill="#0f766e" fontSize="8" fontWeight="800" letterSpacing="1">{ENTRANCE.label}</text>
                {ZONES.map(zone => {
                  const average = zoneData.averages[zone.id] || 0
                  const total = zoneData.totals[zone.id] || 0
                  const level = average ? Math.max(1, Math.ceil((Math.log1p(average) / Math.log1p(zoneData.max)) * 7)) : 0
                  const hovered = hoveredZone === zone.id
                  const common = {
                    fill: heatFill(level),
                    stroke: hovered ? '#0f172a' : zone.id === homeCubicle ? '#0f766e' : '#64748b',
                    strokeWidth: hovered ? 3 : zone.id === homeCubicle ? 2.5 : 1.25,
                    filter: 'url(#zone-shadow)',
                  }
                  return (
                    <g
                      key={zone.id}
                      tabIndex="0"
                      role="button"
                      aria-label={`${zone.name}: ${formatDuration(average)} per day average`}
                      onMouseEnter={() => setHoveredZone(zone.id)}
                      onMouseLeave={() => setHoveredZone(null)}
                      onFocus={() => setHoveredZone(zone.id)}
                      onBlur={() => setHoveredZone(null)}
                      className="outline-none"
                    >
                      {zone.shape.kind === 'rect'
                        ? <rect x={zone.shape.x} y={zone.shape.y} width={zone.shape.width} height={zone.shape.height} rx={zone.shape.rx || 0} {...common} />
                        : <path d={zone.shape.d} {...common} />}
                      <text
                        x={zone.label.x} y={zone.label.y - 5}
                        textAnchor="middle" fill={level >= 6 ? '#fff' : '#334155'} fontSize={zone.type === 'cubicle' || zone.type === 'assigned_cubicle' ? 9 : 11} fontWeight="700"
                        transform={zone.label.rotate ? `rotate(${zone.label.rotate} ${zone.label.x} ${zone.label.y})` : undefined}
                      >{zone.shortName.toUpperCase()}</text>
                      {!zone.label.rotate && (
                        <text x={zone.label.x} y={zone.label.y + 11} textAnchor="middle" fill={level >= 6 ? '#e0f2fe' : '#64748b'} fontSize="8.5">
                          {average ? `${formatDuration(average)}/day` : 'No presence'}
                        </text>
                      )}
                      {zone.id === homeCubicle && <text x={zone.label.x} y={zone.label.y - 21} textAnchor="middle" fill="#0f766e" fontSize="7.5" fontWeight="800" letterSpacing="0.8">{patientLabel.toUpperCase()} · ASSIGNED</text>}
                      <title>{zone.name}: {formatDuration(average)}/day average; {formatDuration(total)} total in selection</title>
                    </g>
                  )
                })}
              </svg>
            </div>

            {hoveredZone && (() => {
              const zone = ZONES.find(item => item.id === hoveredZone)
              return (
                <div className="absolute right-5 top-16 z-10 min-w-48 rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
                  <p className="text-sm font-semibold text-slate-800">{zone?.name}</p>
                  <p className="mt-1 text-lg font-bold text-brand-700">{formatDuration(zoneData.averages[hoveredZone])}<span className="ml-1 text-xs font-normal text-slate-400">/day</span></p>
                  <p className="text-xs text-slate-500">{formatDuration(zoneData.totals[hoveredZone])} total in selected period</p>
                  <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                    {zone?.type === 'cubicle' && zone.id !== homeCubicle ? 'Presence outside the assigned cubicle may indicate possible social exposure; interaction is not established.' : 'Presence signal only; purpose and interaction are not inferred.'}
                  </p>
                </div>
              )
            })()}

            <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-slate-500">
              <span>Lower presence</span>
              {[0, 1, 2, 3, 4, 5, 6, 7].map(level => <span key={level} className="h-3 w-4 rounded-sm border border-slate-200" style={{ background: heatFill(level) }} />)}
              <span>Higher presence</span>
            </div>
          </div>

          <div className="min-w-0 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="panel-title">Daily space use</p>
                <p className="mt-1 text-xs text-slate-400">Showing {selectedDays.length} selected day{selectedDays.length === 1 ? '' : 's'} within Days {range[0]}–{range[1]}. Shower and toilet presence are separate routine proxies; self-care completion is not inferred.</p>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                <button type="button" onClick={() => setVisibleSpaces(Object.fromEntries(SPACE_SERIES.map(space => [space.key, false])))} className="rounded-full border border-slate-300 bg-white px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-50">Unselect all</button>
                {SPACE_SERIES.map(space => (
                  <button
                    key={space.key}
                    type="button"
                    onClick={() => setVisibleSpaces(current => ({ ...current, [space.key]: !current[space.key] }))}
                    className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium ${visibleSpaces[space.key] ? 'opacity-100' : 'border-slate-200 bg-white text-slate-400 opacity-50'}`}
                    style={visibleSpaces[space.key] ? { color: space.color, borderColor: `${space.color}55`, background: `${space.color}12` } : undefined}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: space.color }} /> {space.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 h-[335px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                  <defs>
                    {SPACE_SERIES.map(space => (
                      <linearGradient key={space.key} id={`fill-${space.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={space.color} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={space.color} stopOpacity={0.01} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="day" type="number" domain={[Math.max(0.5, range[0] - 0.45), Math.min(dayCount + 0.5, range[1] + 0.45)]} ticks={chartTicks} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} allowDataOverflow />
                  <YAxis tickFormatter={formatDuration} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={48} />
                  <Tooltip content={<SpaceTooltip />} />
                  {SPACE_SERIES.filter(space => visibleSpaces[space.key]).map(space => (
                    <Area
                      key={space.key}
                      type="monotone"
                      dataKey={space.key}
                      name={space.label}
                      stroke={space.color}
                      fill={`url(#fill-${space.key})`}
                      strokeWidth={2}
                      dot={point => {
                        return <circle key={`${space.key}-${point.payload.day}`} cx={point.cx} cy={point.cy} r={3} fill={space.color} />
                      }}
                      strokeOpacity={0.9}
                      isAnimationActive={false}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-700">Clinical event nodes</p>
                  <p className="text-[10px] text-slate-400">Hover for purpose. Click to open documentation. DAV means a nurse-documented disturbed, aggressive or violent episode; it is never inferred from location data.</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(EVENT_STYLE).map(([discipline, config]) => (
                    <button
                      key={discipline}
                      type="button"
                      onClick={() => setEventFilters(current => ({ ...current, [discipline]: !current[discipline] }))}
                      className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${eventFilters[discipline] ? 'text-white' : 'bg-white text-slate-400 opacity-50'}`}
                      style={eventFilters[discipline] ? { background: config.color } : undefined}
                    >{config.label}</button>
                  ))}
                </div>
              </div>
              <div className="relative h-14">
                <div className="absolute left-0 right-0 top-5 h-px bg-slate-300" />
                {chartTicks.map(day => <span key={day} className="absolute top-7 -translate-x-1/2 text-[8px] text-slate-400" style={{ left: `${((day - 0.5) / dayCount) * 100}%` }}>{day}</span>)}
                {filteredEvents.map((event, index) => {
                  const day = getDayNumber(event.timestamp)
                  const config = getEventStyle(event)
                  const sameDayOffset = filteredEvents.slice(0, index).filter(item => getDayNumber(item.timestamp) === day).length
                  return (
                    <button
                      key={`${event.timestamp}-${event.title}`}
                      type="button"
                      onMouseEnter={() => setHoveredEvent(event)}
                      onMouseLeave={() => setHoveredEvent(null)}
                      onFocus={() => setHoveredEvent(event)}
                      onBlur={() => setHoveredEvent(null)}
                      onClick={() => focusEvent(event)}
                      aria-label={`${getEventCategory(event)}${getEventCategory(event) === 'DAV' ? ' nursing documentation' : ''}, day ${day}: ${event.title}`}
                      className="absolute z-10 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white shadow-sm outline-none ring-offset-1 hover:scale-125 focus:ring-2"
                      style={{ left: `${((day - 0.5) / dayCount) * 100}%`, top: `${14 - sameDayOffset * 8}px`, background: config.color }}
                    ><title>{event.title}: {event.description}</title></button>
                  )
                })}
                {hoveredEvent && (
                  <div className="absolute bottom-12 left-1/2 z-30 w-72 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
                    <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: getEventStyle(hoveredEvent).color }}>{getEventCategory(hoveredEvent)} · Day {getDayNumber(hoveredEvent.timestamp)}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-800">{hoveredEvent.title}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{hoveredEvent.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="night-view" className="card scroll-mt-4 overflow-hidden">
        <div className="card-header flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="panel-title">Night & 24-hour view</p>
            <h3 className="mt-1 text-sm font-semibold text-slate-700">Compare overnight rest signals and hourly space use</h3>
            <p className="mt-1 text-xs text-slate-400">The trend shows 00:00–07:00 location signals; the grid shows the dominant recorded space for every hour.</p>
          </div>
          <span className="rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-700">Days {range[0]}–{range[1]}</span>
        </div>
        <div className="card-body">
          <div className="mb-5 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-700">Overnight location trend · 00:00–07:00</p>
                <p className="text-[10px] text-slate-400">Assigned-cubicle presence compared with recorded time elsewhere.</p>
              </div>
              <div className="flex gap-3 text-[10px] text-slate-500"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-indigo-600" />Rest proxy</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-500" />Away from cubicle</span></div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#dbeafe" strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="day" type="number" domain={[Math.max(0.5, range[0] - 0.45), Math.min(dayCount + 0.5, range[1] + 0.45)]} ticks={chartTicks} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} allowDataOverflow />
                  <YAxis domain={[0, 420]} ticks={[0, 120, 240, 360, 420]} tickFormatter={formatDuration} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={48} />
                  <Tooltip content={<SpaceTooltip />} />
                  <Area type="monotone" dataKey="sleepWindowMins" name="Assigned-cubicle rest proxy" stroke="#4f46e5" fill="#c7d2fe" strokeWidth={2.5} isAnimationActive={false} />
                  <Area type="monotone" dataKey="overnightAwayMins" name="Away from assigned cubicle" stroke="#d97706" fill="#fde68a" strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-x-auto">
          <div className="min-w-[1180px]">
            <p className="mb-2 text-xs font-semibold text-slate-700">24-hour space-use grid</p>
            <div className="grid grid-cols-[80px_repeat(24,minmax(40px,1fr))] gap-1">
              <div />
              {Array.from({ length: 24 }, (_, hour) => hour).map(hour => (
                <div key={hour} className="pb-1 text-center text-[9px] font-medium text-slate-400">{String(hour).padStart(2, '0')}:00</div>
              ))}
              {timeGrid.flatMap(row => [
                <div key={`label-${row.day}`} className="flex items-center text-xs font-semibold text-slate-600">D{row.day}<span className="ml-1 text-[9px] font-normal text-slate-400">{row.date}</span></div>,
                ...row.cells.map(cell => {
                  const style = TIME_ZONE_STYLE[cell.category]
                  const zoneName = ZONES.find(zone => zone.id === cell.zoneId)?.name || 'No recorded location'
                  return (
                    <div
                      key={`${row.day}-${cell.hour}`}
                      className="group relative h-7 rounded border border-white/70 transition-transform hover:z-20 hover:scale-110 hover:ring-2 hover:ring-slate-400"
                      style={{ background: cell.minutes ? style.color : '#f1f5f9', opacity: cell.minutes ? Math.max(0.38, cell.minutes / 60) : 1 }}
                      title={`Day ${row.day}, ${String(cell.hour).padStart(2, '0')}:00 · ${zoneName} · ${formatDuration(cell.minutes)} recorded`}
                    />
                  )
                }),
              ])}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3">
              {Object.entries(TIME_ZONE_STYLE).filter(([key]) => key !== 'other').map(([key, style]) => (
                <span key={key} className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: style.color }} />{style.label}</span>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-slate-400">Overnight assigned-cubicle presence from 00:00–07:00 is shown as a rest proxy. It does not confirm that the patient was asleep; review self-report and clinical observations.</p>
          </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header flex items-center gap-2">
          <FileText size={15} className="text-brand-600" />
          <div>
            <p className="panel-title">Clinical documentation context</p>
            <p className="mt-0.5 text-xs text-slate-400">Staff observations belong here as documented clinical context, not as inferred contact counts.</p>
          </div>
        </div>
        <div className="card-body">
          {selectedEvent ? (
            <div className="grid gap-4 md:grid-cols-[150px_1fr]">
              <div>
                <p className="text-xs text-slate-400">Selected event</p>
                <p className="mt-1 text-xl font-bold text-slate-800">Day {getDayNumber(selectedEvent.timestamp)}</p>
                <p className="text-xs text-slate-500">{dayDate(getDayNumber(selectedEvent.timestamp))}</p>
                <span className="mt-2 inline-block rounded px-2 py-1 text-xs font-medium text-white" style={{ background: getEventStyle(selectedEvent).color }}>{getEventCategory(selectedEvent)}</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">{selectedEvent.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{selectedEvent.description}</p>
                {selectedEvent.details && (
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      ['Observed behaviour', selectedEvent.details.observed],
                      ['Context', selectedEvent.details.context],
                      ['Nursing response', selectedEvent.details.response],
                      ['Outcome', selectedEvent.details.outcome],
                    ].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-xs leading-relaxed text-slate-700">{value}</dd></div>)}
                  </dl>
                )}
                <p className="mt-3 text-xs text-slate-400">Displayed as documentation recorded alongside the location pattern. No causal relationship is inferred.</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a clinical-event node above to review its documented purpose and observation.</p>
          )}
        </div>
      </section>
    </div>
  )
}
