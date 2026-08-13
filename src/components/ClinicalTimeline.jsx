import { useState } from 'react'
import { CLINICAL_EVENTS } from '../data/syntheticEvents.js'
import { getDayNumber } from '../data/metricsEngine.js'
import { Pill, Activity, Users, Brain, Stethoscope, ClipboardList } from 'lucide-react'

const DISC = {
  Psychiatry: { cls: 'disc-psychiatry',  Icon: Stethoscope },
  Nursing:    { cls: 'disc-nursing',     Icon: ClipboardList },
  OT:         { cls: 'disc-ot',          Icon: Activity },
  MDT:        { cls: 'disc-mdt',         Icon: Users },
  Psychology: { cls: 'disc-psychology',  Icon: Brain },
  Medication: { cls: 'disc-medication',  Icon: Pill },
}

const trackColor = {
  Psychiatry: '#7c3aed',
  Nursing:    '#2563eb',
  OT:         '#16a34a',
  MDT:        '#475569',
  Psychology: '#b45309',
  Medication: '#ea580c',
}

export default function ClinicalTimeline({ patientId }) {
  const [expandedIdx, setExpandedIdx] = useState(null)

  const events = CLINICAL_EVENTS
    .filter(e => e.patientId === patientId)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  return (
    <div className="card">
      <div className="card-header">
        <span className="panel-title">Clinical event timeline</span>
        <p className="text-xs text-slate-400 mt-0.5">
          MDT and clinical events across the 14-day observation period. Click an event for details.
        </p>
      </div>

      <div className="card-body">
        {/* Ruler */}
        <div className="relative mb-1">
          <div className="flex mb-1">
            {Array.from({ length: 14 }, (_, i) => i + 1).map(day => (
              <div
                key={day}
                className="flex-1 text-center text-slate-300 tabular-nums"
                style={{ fontSize: 9 }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Track */}
          <div className="relative h-6 bg-slate-50 rounded border border-slate-200">
            {/* Event dots */}
            {events.map((ev, idx) => {
              const day   = getDayNumber(ev.timestamp)
              const leftPct = ((day - 0.5) / 14) * 100
              const col   = trackColor[ev.discipline] || '#64748b'
              return (
                <button
                  key={idx}
                  onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  style={{
                    position: 'absolute',
                    left: `${leftPct}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 10, height: 10,
                    borderRadius: '50%',
                    background: col,
                    border: '2px solid white',
                    cursor: 'pointer',
                    zIndex: 2,
                    outline: expandedIdx === idx ? `2px solid ${col}` : 'none',
                  }}
                  title={ev.title}
                />
              )
            })}
          </div>

          {/* Day labels */}
          <div className="flex mt-0.5">
            {['Adm','','','','D5','D6','','','','D10','','','','D14'].map((lbl, i) => (
              <div key={i} className="flex-1 text-center text-slate-400" style={{ fontSize: 8 }}>
                {lbl}
              </div>
            ))}
          </div>
        </div>

        {/* Key events callout */}
        <div className="flex flex-wrap gap-2 mt-3 mb-4">
          {[
            { day: 5,  disc: 'Medication', label: 'D5 — Medication adjusted' },
            { day: 6,  disc: 'OT',         label: 'D6 — OT activation starts' },
            { day: 10, disc: 'MDT',        label: 'D10 — First group session' },
          ].map(item => {
            const { cls } = DISC[item.disc] || DISC.MDT
            return (
              <span key={item.day} className={`px-2 py-1 rounded text-xs border font-medium ${cls}`}>
                {item.label}
              </span>
            )
          })}
        </div>

        {/* Event list */}
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {events.map((ev, idx) => {
            const day  = getDayNumber(ev.timestamp)
            const cfg  = DISC[ev.discipline] || DISC.Nursing
            const Icon = cfg.Icon
            const isExpanded = expandedIdx === idx

            return (
              <button
                key={idx}
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                className={`w-full text-left rounded-lg px-3 py-2 border transition-colors ${
                  isExpanded
                    ? 'bg-slate-50 border-slate-300'
                    : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border font-medium shrink-0 ${cfg.cls}`}>
                    <Icon size={10} />
                    D{day}
                  </span>
                  <span className="text-sm text-slate-700 flex-1 text-left">{ev.title}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${cfg.cls}`}>{ev.discipline}</span>
                </div>
                {isExpanded && (
                  <p className="text-xs text-slate-500 mt-2 ml-10 leading-relaxed fade-in">
                    {ev.description}
                  </p>
                )}
              </button>
            )
          })}
        </div>

        {/* Discipline legend */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100">
          {Object.entries(DISC).map(([disc, { cls, Icon }]) => (
            <span key={disc} className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${cls}`}>
              <Icon size={9} /> {disc}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
