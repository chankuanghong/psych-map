import { useState, useMemo } from 'react'
import { getHourlyZoneProfile, getDayRange } from '../data/metricsEngine.js'
import { ZONES } from '../data/zones.js'

// Colour bands for heat cells (0–60 min/day in that hour-zone cell)
const heatColour = (mins, maxMins) => {
  if (!mins || mins < 1) return { bg: '#f8fafc', text: '#cbd5e1' }
  const ratio = Math.min(mins / Math.max(maxMins, 1), 1)
  if (ratio < 0.15) return { bg: '#e0f2fe', text: '#0369a1' }
  if (ratio < 0.30) return { bg: '#bae6fd', text: '#0369a1' }
  if (ratio < 0.50) return { bg: '#7dd3fc', text: '#075985' }
  if (ratio < 0.70) return { bg: '#38bdf8', text: '#0c4a6e' }
  if (ratio < 0.85) return { bg: '#0ea5e9', text: '#ffffff' }
  return { bg: '#0369a1', text: '#ffffff' }
}

const PERIOD_OPTIONS = [
  { id: 'all',      label: 'All 14 days',  days: null },
  { id: 'early',    label: 'Days 1–5',     days: [1,2,3,4,5] },
  { id: 'mid',      label: 'Days 6–10',    days: [6,7,8,9,10] },
  { id: 'recent',   label: 'Days 11–14',   days: [11,12,13,14] },
]

// Show only zones that appear in location data (non-trivial)
const SHOWN_ZONES = ['bedroom', 'ensuite', 'corridor', 'dining', 'communal', 'activity_room', 'quiet_area', 'nursing_station', 'outdoor']

// Hour labels — compact
const hourLabel = (h) => {
  if (h === 0)  return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h-12}pm`
}

export default function TimeOfDayView({ patientId }) {
  const [period, setPeriod] = useState('all')
  const [hoveredCell, setHoveredCell] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'activity'

  const days = PERIOD_OPTIONS.find(p => p.id === period)?.days ?? null
  const hourlyProfile = useMemo(
    () => getHourlyZoneProfile(patientId, days),
    [patientId, period]
  )

  // Find global max for colour scaling
  const globalMax = useMemo(() => {
    let m = 1
    for (const h of hourlyProfile) {
      for (const z of SHOWN_ZONES) {
        const v = h.zoneMinutes[z] || 0
        if (v > m) m = v
      }
    }
    return m
  }, [hourlyProfile])

  const zoneLabels = Object.fromEntries(
    SHOWN_ZONES.map(id => [id, ZONES.find(z => z.id === id)?.label ?? id])
  )

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="panel-title">Time-of-day behaviour pattern</span>
            <p className="text-xs text-slate-400 mt-0.5">
              Average minutes per day spent in each zone by hour. Averaged across selected period.
            </p>
          </div>

          {/* Period selector */}
          <div className="flex gap-1">
            {PERIOD_OPTIONS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  period === p.id
                    ? 'bg-brand-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* View toggle */}
        <div className="flex gap-1 mt-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'grid' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Zone grid
          </button>
          <button
            onClick={() => setViewMode('activity')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'activity' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Active vs bedroom
          </button>
        </div>
      </div>

      <div className="card-body overflow-x-auto">

        {viewMode === 'grid' && (
          <>
            {/* Zone-hour heatmap grid */}
            <div className="min-w-max">
              {/* Column headers: zones */}
              <div className="flex mb-1" style={{ paddingLeft: 44 }}>
                {SHOWN_ZONES.map(zid => (
                  <div
                    key={zid}
                    className="text-center"
                    style={{ width: 56, fontSize: 9, color: '#64748b', lineHeight: '1.1' }}
                  >
                    {zoneLabels[zid]}
                  </div>
                ))}
                <div style={{ width: 48 }} />
              </div>

              {/* Rows: hours */}
              {hourlyProfile.map(h => {
                // Only show waking hours prominently; dim sleeping hours
                const isWaking = h.hour >= 7 && h.hour < 22
                return (
                  <div
                    key={h.hour}
                    className="flex items-center mb-0.5"
                    style={{ opacity: isWaking ? 1 : 0.45 }}
                  >
                    {/* Hour label */}
                    <div
                      className="text-right shrink-0 text-slate-400"
                      style={{ width: 38, fontSize: 10, paddingRight: 6 }}
                    >
                      {hourLabel(h.hour)}
                    </div>

                    {/* Zone cells */}
                    {SHOWN_ZONES.map(zid => {
                      const mins = h.zoneMinutes[zid] || 0
                      const { bg, text } = heatColour(mins, globalMax)
                      const isHovered = hoveredCell?.h === h.hour && hoveredCell?.z === zid
                      return (
                        <div
                          key={zid}
                          onMouseEnter={() => setHoveredCell({ h: h.hour, z: zid, mins })}
                          onMouseLeave={() => setHoveredCell(null)}
                          title={`${hourLabel(h.hour)} · ${zoneLabels[zid]}: ${mins} min/day avg`}
                          style={{
                            width: 52,
                            height: 18,
                            margin: '0 2px',
                            borderRadius: 3,
                            background: bg,
                            color: text,
                            fontSize: 9,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'default',
                            outline: isHovered ? '1.5px solid #0369a1' : 'none',
                            transition: 'outline 0.1s',
                          }}
                        >
                          {mins > 0 ? mins : ''}
                        </div>
                      )
                    })}

                    {/* Row total */}
                    <div
                      className="text-slate-400 text-right tabular-nums shrink-0"
                      style={{ width: 44, fontSize: 10, paddingLeft: 6 }}
                    >
                      {h.totalMins > 0 ? `${h.totalMins}m` : ''}
                    </div>
                  </div>
                )
              })}

              {/* Colour legend */}
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-400">Low</span>
                {['#e0f2fe','#bae6fd','#7dd3fc','#38bdf8','#0ea5e9','#0369a1'].map(c => (
                  <span key={c} className="w-5 h-3 rounded-sm inline-block" style={{ background: c }} />
                ))}
                <span className="text-xs text-slate-400">High — avg min/day</span>
              </div>
            </div>

            {/* Tooltip when hovering */}
            {hoveredCell && (
              <div className="mt-2 text-xs text-slate-500 fade-in">
                <span className="font-medium text-slate-700">{hourLabel(hoveredCell.h)}</span>
                {' · '}{zoneLabels[hoveredCell.z]}
                {': '}<span className="font-semibold text-brand-700">{hoveredCell.mins} min/day avg</span>
              </div>
            )}
          </>
        )}

        {viewMode === 'activity' && (
          <div className="min-w-max">
            <p className="text-xs text-slate-400 mb-3">
              Each bar = 1 hour. Blue = avg time outside bedroom, grey = avg time in bedroom. (min/day)
            </p>
            {hourlyProfile.map(h => {
              const active    = h.activeMins
              const bedroom   = h.zoneMinutes['bedroom'] || 0
              const maxMins   = 60
              const isWaking  = h.hour >= 7 && h.hour < 22
              return (
                <div
                  key={h.hour}
                  className="flex items-center mb-1 gap-2"
                  style={{ opacity: isWaking ? 1 : 0.35 }}
                >
                  <div className="text-right shrink-0 text-slate-400" style={{ width: 38, fontSize: 10 }}>
                    {hourLabel(h.hour)}
                  </div>
                  <div className="relative flex items-center" style={{ width: 260, height: 14 }}>
                    {/* Active bar */}
                    <div
                      style={{
                        width: `${(active / maxMins) * 100}%`,
                        height: '100%',
                        background: '#0369a1',
                        borderRadius: 2,
                        marginRight: 2,
                      }}
                    />
                    {/* Bedroom bar */}
                    <div
                      style={{
                        width: `${(bedroom / maxMins) * 100}%`,
                        height: '100%',
                        background: '#cbd5e1',
                        borderRadius: 2,
                      }}
                    />
                  </div>
                  <div className="text-xs text-slate-400 tabular-nums" style={{ width: 80 }}>
                    {active > 0 && <span className="text-brand-700 font-medium">{active}m active</span>}
                    {bedroom > 0 && active > 0 && <span className="mx-1 text-slate-300">|</span>}
                    {bedroom > 0 && <span className="text-slate-400">{bedroom}m bed</span>}
                  </div>
                </div>
              )
            })}

            <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2.5 rounded-sm inline-block bg-brand-700" /> Outside bedroom
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2.5 rounded-sm inline-block bg-slate-300" /> Bedroom
              </span>
              <span className="text-slate-400">Bar max = 60 min</span>
            </div>
          </div>
        )}

        <p className="disclaimer mt-3">Synthetic demonstration data — averaged across selected period</p>
      </div>
    </div>
  )
}
