import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Legend, ResponsiveContainer
} from 'recharts'
import { computeDailyMetrics } from '../data/metricsEngine.js'
import { getEventsForPatient } from '../data/syntheticEvents.js'
import { getDayNumber } from '../data/metricsEngine.js'

// Metric definitions — objective, observable
const METRICS = [
  { key: 'outsideBedroomMins', label: 'Outside bedroom',   color: '#0369a1', unit: 'min', defaultOn: true },
  { key: 'bedroomMins',        label: 'Bedroom',           color: '#94a3b8', unit: 'min', defaultOn: false },
  { key: 'activityMins',       label: 'Activity room',     color: '#059669', unit: 'min', defaultOn: true },
  { key: 'communalMins',       label: 'Communal lounge',   color: '#7c3aed', unit: 'min', defaultOn: true },
  { key: 'staffContacts',      label: 'Staff contacts',    color: '#b45309', unit: '/day', defaultOn: true },
  { key: 'peerContacts',       label: 'Peer contacts',     color: '#db2777', unit: '/day', defaultOn: true },
  { key: 'zoneTransitions',    label: 'Zone transitions',  color: '#64748b', unit: '/day', defaultOn: false },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-2">Day {label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono font-semibold text-slate-800">{p.value} {METRICS.find(m=>m.key===p.dataKey)?.unit}</span>
        </div>
      ))}
    </div>
  )
}

export default function TrendChart({ patientId }) {
  const dailyMetrics = computeDailyMetrics(patientId)
  const { clinicalEvents } = getEventsForPatient(patientId)

  const [visible, setVisible] = useState(
    Object.fromEntries(METRICS.map(m => [m.key, m.defaultOn]))
  )

  const toggleMetric = (key) => setVisible(v => ({ ...v, [key]: !v[key] }))

  // Prepare chart data: map outsideBedroomMins etc from the computed metrics
  const data = dailyMetrics.map(m => ({
    day:     m.day,
    label:   m.date,
    outsideBedroomMins: m.outsideBedroomMins,
    bedroomMins:        m.bedroomMins,
    activityMins:       m.activityMins,
    communalMins:       m.communalMins,
    staffContacts:      m.staffContacts,
    peerContacts:       m.peerContacts,
    zoneTransitions:    m.zoneTransitions,
  }))

  // Key clinical event reference lines
  const keyEvents = clinicalEvents.filter(e =>
    ['medication_change', 'ot_intervention', 'group_session', 'psychiatrist_review'].includes(e.eventType)
  ).slice(0, 6)

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="panel-title">14-day trend — daily values (min/day or count/day)</span>
            <p className="text-xs text-slate-400 mt-0.5">
              Reference lines show key clinical events. All figures are actual daily values.
            </p>
          </div>
        </div>
        {/* Metric toggles */}
        <div className="flex flex-wrap gap-2 mt-3">
          {METRICS.map(m => (
            <button
              key={m.key}
              onClick={() => toggleMetric(m.key)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border transition-opacity ${
                visible[m.key] ? 'border-transparent opacity-100' : 'border-slate-200 opacity-40'
              }`}
              style={visible[m.key] ? { background: m.color + '20', color: m.color } : {}}
            >
              <span
                className="inline-block w-3 h-0.5 rounded"
                style={{ background: m.color }}
              />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card-body p-4">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              label={{ value: 'Day', position: 'insideRight', offset: -2, fontSize: 11, fill: '#94a3b8' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Clinical event reference lines */}
            {keyEvents.map((ev, i) => {
              const day = getDayNumber(ev.timestamp)
              const colors = { medication_change: '#f97316', ot_intervention: '#16a34a', group_session: '#7c3aed', psychiatrist_review: '#2563eb' }
              const col = colors[ev.eventType] || '#94a3b8'
              return (
                <ReferenceLine
                  key={i}
                  x={day}
                  stroke={col}
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{ value: ev.title.substring(0, 10), position: 'top', fontSize: 9, fill: col, dy: -2 }}
                />
              )
            })}

            {METRICS.filter(m => visible[m.key]).map(m => (
              <Line
                key={m.key}
                type="monotone"
                dataKey={m.key}
                name={m.label}
                stroke={m.color}
                strokeWidth={2}
                dot={{ r: 2.5, fill: m.color, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Legend for reference lines */}
        <div className="flex flex-wrap gap-3 mt-2 pt-2 border-t border-slate-100">
          {[
            { color: '#f97316', label: 'Medication change' },
            { color: '#16a34a', label: 'OT intervention' },
            { color: '#7c3aed', label: 'Group session' },
            { color: '#2563eb', label: 'Review' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
