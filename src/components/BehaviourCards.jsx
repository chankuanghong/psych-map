import { TrendingUp, TrendingDown, Minus, Bed, Users, UserCheck, Dumbbell, Droplets } from 'lucide-react'
import { comparePeriods } from '../data/metricsEngine.js'

const fmt = (v) => {
  if (v === null || v === undefined) return '—'
  return typeof v === 'number' ? v : v
}

const TrendBadge = ({ change, unit = 'min/day', higherBetter = true }) => {
  if (change === null || change === undefined) return null
  const positive = higherBetter ? change > 0 : change < 0
  const negative = higherBetter ? change < 0 : change > 0
  const sign = change > 0 ? '+' : ''
  if (Math.abs(change) < 0.5) {
    return (
      <span className="badge-flat inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium">
        <Minus size={10} /> Unchanged
      </span>
    )
  }
  if (positive) {
    return (
      <span className="badge-up inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium">
        <TrendingUp size={10} /> {sign}{fmt(change)} {unit}
      </span>
    )
  }
  return (
    <span className="badge-down inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium">
      <TrendingDown size={10} /> {sign}{fmt(change)} {unit}
    </span>
  )
}

const MetricRow = ({ label, baseline, recent, unit = 'min/day', change, higherBetter = true }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
    <span className="text-sm text-slate-600">{label}</span>
    <div className="flex items-center gap-3 text-right">
      <span className="text-xs text-slate-400 tabular-nums">{fmt(baseline)} {unit}</span>
      <span className="text-slate-300 text-xs">→</span>
      <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(recent)} {unit}</span>
      <TrendBadge change={change} unit={unit} higherBetter={higherBetter} />
    </div>
  </div>
)

export default function BehaviourCards({ patientId }) {
  const { baseline, recent, changes } = comparePeriods(patientId)

  return (
    <div className="space-y-3">
      {/* Divergence callout */}
      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
        <span className="font-semibold">Key pattern: </span>
        Time outside bedroom and activity participation have increased, but peer contacts remain
        low (&lt;1/day). Consider reviewing barriers to peer interaction.
      </div>

      <p className="panel-title">Objective behavioural measures — avg per day (baseline days 1–5 vs recent days 9–14)</p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* ── Environmental Engagement ── */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Bed size={14} className="text-brand-600" />
            <span className="font-medium text-sm text-slate-700">Environmental Engagement</span>
          </div>
          <div className="card-body space-y-0 divide-y divide-slate-50">
            <MetricRow
              label="Time outside bedroom"
              baseline={baseline.avgOutsideBedroomMins}
              recent={recent.avgOutsideBedroomMins}
              change={changes.outsideBedroomMins.absoluteChange}
              unit="min/day"
            />
            <MetricRow
              label="Time in bedroom"
              baseline={baseline.avgBedroomMins}
              recent={recent.avgBedroomMins}
              change={changes.bedroomMins.absoluteChange}
              unit="min/day"
              higherBetter={false}
            />
            <MetricRow
              label="Zones visited"
              baseline={baseline.avgZoneVariety}
              recent={recent.avgZoneVariety}
              change={changes.zoneVariety.absoluteChange}
              unit="zones/day"
            />
            <MetricRow
              label="Zone transitions"
              baseline={baseline.avgZoneTransitions}
              recent={recent.avgZoneTransitions}
              change={changes.zoneTransitions.absoluteChange}
              unit="/day"
            />
          </div>
        </div>

        {/* ── Space Use ── */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Dumbbell size={14} className="text-accent-500" />
            <span className="font-medium text-sm text-slate-700">Space Use</span>
          </div>
          <div className="card-body divide-y divide-slate-50">
            <MetricRow
              label="Activity room"
              baseline={baseline.avgActivityMins}
              recent={recent.avgActivityMins}
              change={changes.activityMins.absoluteChange}
              unit="min/day"
            />
            <MetricRow
              label="Communal lounge"
              baseline={baseline.avgCommunalMins}
              recent={recent.avgCommunalMins}
              change={changes.communalMins.absoluteChange}
              unit="min/day"
            />
            <MetricRow
              label="Outdoor / courtyard"
              baseline={baseline.avgOutdoorMins}
              recent={recent.avgOutdoorMins}
              change={changes.outdoorMins.absoluteChange}
              unit="min/day"
            />
            <MetricRow
              label="Nursing station"
              baseline={baseline.avgStaffZoneMins}
              recent={recent.avgStaffZoneMins}
              change={changes.staffZoneMins.absoluteChange}
              unit="min/day"
            />
          </div>
        </div>

        {/* ── Interaction ── */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Users size={14} className="text-purple-600" />
            <span className="font-medium text-sm text-slate-700">Interaction</span>
          </div>
          <div className="card-body divide-y divide-slate-50">
            <MetricRow
              label="Staff contacts"
              baseline={baseline.avgStaffContacts}
              recent={recent.avgStaffContacts}
              change={changes.staffContacts.absoluteChange}
              unit="/day"
            />
            <MetricRow
              label="Peer contacts"
              baseline={baseline.avgPeerContacts}
              recent={recent.avgPeerContacts}
              change={changes.peerContacts.absoluteChange}
              unit="/day"
            />
            <MetricRow
              label="Structured sessions"
              baseline={baseline.avgStructuredSessions}
              recent={recent.avgStructuredSessions}
              change={changes.structuredSessions.absoluteChange}
              unit="/day"
            />
          </div>
        </div>

        {/* ── Routine ── */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Droplets size={14} className="text-sky-600" />
            <span className="font-medium text-sm text-slate-700">Daily Routine</span>
          </div>
          <div className="card-body divide-y divide-slate-50">
            <MetricRow
              label="Showered (ensuite ≥15 min)"
              baseline={`${baseline.pctShowered}%`}
              recent={`${recent.pctShowered}%`}
              change={changes.pctShowered.absoluteChange}
              unit="% of days"
            />
            <MetricRow
              label="Dining visits"
              baseline={baseline.avgMealVisits}
              recent={recent.avgMealVisits}
              change={changes.mealVisits.absoluteChange}
              unit="/day"
            />
          </div>
        </div>

      </div>

      <p className="disclaimer mt-1">
        All figures are averages per day within the period. Baseline = Days 1–5, Recent = Days 9–14.
        Synthetic demonstration data only.
      </p>
    </div>
  )
}
