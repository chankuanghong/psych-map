import { useMemo, useState } from 'react'
import { ZONES } from '../data/zones.js'
import { getEventsForPatient } from '../data/syntheticEvents.js'
import { getDayNumber } from '../data/metricsEngine.js'

const SVG_W = 390
const SVG_H = 410

// Heat fill — muted clinical blue-to-amber, not neon
function heatFill(level) {
  const fills = [
    'rgba(248,250,252,0.6)',  // 0 – absent
    'rgba(224,242,254,0.8)',  // 1
    'rgba(186,230,253,0.85)', // 2
    'rgba(125,211,252,0.85)', // 3
    'rgba(56,189,248,0.80)',  // 4
    'rgba(14,165,233,0.75)',  // 5
    'rgba(2,132,199,0.70)',   // 6
    'rgba(3,105,161,0.65)',   // 7
  ]
  return fills[level] ?? fills[0]
}

function heatStroke(level) {
  if (level === 0) return '#e2e8f0'
  if (level <= 2)  return '#bae6fd'
  if (level <= 4)  return '#38bdf8'
  return '#0369a1'
}

function toHeatLevel(minutes, max) {
  if (!minutes || !max) return 0
  const r = minutes / max
  if (r < 0.05) return 1
  if (r < 0.12) return 2
  if (r < 0.22) return 3
  if (r < 0.35) return 4
  if (r < 0.50) return 5
  if (r < 0.70) return 6
  return 7
}

const TIME_FILTERS = [
  { id: 'all',    label: 'Full 14 days',   days: null },
  { id: '7d',     label: 'Days 8–14',      days: [8,9,10,11,12,13,14] },
  { id: 'today',  label: 'Day 14',         days: [14] },
  { id: 'early',  label: 'Days 1–5 (early)', days: [1,2,3,4,5] },
]

export default function WardHeatMap({ patientId }) {
  const [timeFilter, setTimeFilter] = useState('all')
  const [compareMode, setCompareMode] = useState(false)
  const [hoveredZone, setHoveredZone] = useState(null)

  const { locationEvents } = getEventsForPatient(patientId)

  const activeDays = compareMode
    ? [1,2,3,4,5]
    : TIME_FILTERS.find(f => f.id === timeFilter)?.days ?? null

  const zoneTotals = useMemo(() => {
    const totals = {}
    for (const evt of locationEvents) {
      const day = getDayNumber(evt.enteredAt)
      if (!activeDays || activeDays.includes(day)) {
        totals[evt.zoneId] = (totals[evt.zoneId] || 0) + evt.durationMinutes
      }
    }
    return totals
  }, [locationEvents, activeDays?.join(','), compareMode])

  // Convert to avg per day if multiple days
  const nDays = activeDays ? activeDays.length : 14
  const zoneAvg = Object.fromEntries(
    Object.entries(zoneTotals).map(([z, m]) => [z, Math.round(m / nDays)])
  )
  const maxAvg = Math.max(...Object.values(zoneAvg), 1)

  const hoveredData = hoveredZone
    ? { zone: ZONES.find(z => z.id === hoveredZone), avgMins: zoneAvg[hoveredZone] || 0, totalMins: zoneTotals[hoveredZone] || 0 }
    : null

  const periodLabel = compareMode
    ? 'Days 1–5 (early period)'
    : TIME_FILTERS.find(f => f.id === timeFilter)?.label ?? ''

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="card-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="panel-title">Ward heat map</span>
          <p className="text-xs text-slate-400 mt-0.5">
            Colour intensity = avg time per day (min/day). Hover a zone for details.
            {' '}{periodLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Time filter */}
          {!compareMode && TIME_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setTimeFilter(f.id)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                timeFilter === f.id
                  ? 'bg-brand-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
          {/* Compare toggle */}
          <button
            onClick={() => setCompareMode(m => !m)}
            className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
              compareMode
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            {compareMode ? '← Back to filters' : 'Compare: early (D1–5)'}
          </button>
        </div>
      </div>

      {/* SVG floor plan */}
      <div className="relative bg-slate-50 p-3">
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ maxHeight: 420 }}>
          <defs>
            <pattern id="gridpat" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          {/* Background */}
          <rect width={SVG_W} height={SVG_H} fill="#f8fafc" />
          <rect width={SVG_W} height={SVG_H} fill="url(#gridpat)" />

          {/* Outer ward boundary */}
          <rect
            x="10" y="10" width={SVG_W - 20} height={SVG_H - 20}
            fill="none" stroke="#cbd5e1" strokeWidth="1.5" rx="4"
          />

          {/* Zone rooms */}
          {ZONES.map(zone => {
            const { x, y, w, h } = zone.svgRect
            const avgMins = zoneAvg[zone.id] || 0
            const level   = toHeatLevel(avgMins, maxAvg)
            const isHovered = hoveredZone === zone.id

            return (
              <g
                key={zone.id}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
                style={{ cursor: 'default' }}
              >
                {/* Zone fill */}
                <rect
                  x={x} y={y} width={w} height={h} rx="3"
                  fill={heatFill(level)}
                  stroke={isHovered ? '#0369a1' : heatStroke(level)}
                  strokeWidth={isHovered ? 1.5 : 1}
                />

                {/* Zone label */}
                {zone.labelVertical ? (
                  <text
                    x={zone.labelPos.x} y={zone.labelPos.y}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="#475569" fontSize="8" fontFamily="Inter, sans-serif"
                    transform={`rotate(-90, ${zone.labelPos.x}, ${zone.labelPos.y})`}
                  >
                    {zone.name}
                  </text>
                ) : (
                  <>
                    <text
                      x={zone.labelPos.x} y={zone.labelPos.y - (avgMins > 0 ? 6 : 0)}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="#334155" fontSize="8.5" fontFamily="Inter, sans-serif"
                    >
                      {zone.name}
                    </text>
                    {avgMins > 0 && (
                      <text
                        x={zone.labelPos.x} y={zone.labelPos.y + 8}
                        textAnchor="middle" dominantBaseline="middle"
                        fill={level >= 5 ? '#0c4a6e' : '#64748b'}
                        fontSize="9" fontFamily="Inter, sans-serif" fontWeight="600"
                      >
                        {avgMins >= 60 ? `${Math.round(avgMins/60)}h` : `${avgMins}m`}/d
                      </text>
                    )}
                  </>
                )}
              </g>
            )
          })}
        </svg>

        {/* Hover tooltip */}
        {hoveredData && hoveredData.zone && (
          <div className="absolute top-4 right-4 bg-white border border-slate-200 rounded-lg shadow-md p-3 text-sm min-w-40 z-10 fade-in">
            <p className="font-semibold text-slate-700">{hoveredData.zone.name}</p>
            <p className="text-brand-700 font-bold text-base mt-1">
              {hoveredData.avgMins >= 60
                ? `${Math.floor(hoveredData.avgMins / 60)}h ${hoveredData.avgMins % 60}m`
                : `${hoveredData.avgMins} min`}
              <span className="text-slate-400 font-normal text-xs ml-1">/day avg</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Total {hoveredData.totalMins >= 60
                ? `${Math.floor(hoveredData.totalMins / 60)}h ${hoveredData.totalMins % 60}m`
                : `${hoveredData.totalMins} min`} in period
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-2.5 border-t border-slate-100 flex items-center gap-3 text-xs text-slate-500">
        <span>Low</span>
        <div className="flex gap-0.5">
          {[0,1,2,3,4,5,6,7].map(l => (
            <div
              key={l}
              className="w-4 h-3 rounded-sm border"
              style={{ background: heatFill(l), borderColor: heatStroke(l) }}
            />
          ))}
        </div>
        <span>High</span>
        <span className="text-slate-400 ml-2">— avg min/day</span>
        {compareMode && <span className="ml-auto text-amber-600 font-medium">Showing early period (D1–5)</span>}
      </div>
    </div>
  )
}
