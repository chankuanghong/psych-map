import { useEffect, useMemo, useState } from 'react'
import InsightAgent from './InsightAgent.jsx'
import IntegratedPatientView from './IntegratedPatientView.jsx'

const getPatientDisplayName = patient => patient.displayName ?? patient.name ?? patient.id ?? 'Patient'
const getInitials = patient => getPatientDisplayName(patient)
  .split(/\s+/)
  .filter(Boolean)
  .map(part => part[0])
  .join('')
const formatRfidTime = value => value ? new Date(value).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Singapore' }) : 'Not recorded'

export default function PatientMAP({ patient, profession, rfidLive }) {
  const [showAgent, setShowAgent] = useState(true)
  const [range, setRange] = useState([1, patient.lengthOfStay])
  const [excludedDays, setExcludedDays] = useState([])
  const [agentAction, setAgentAction] = useState(null)
  const selectedDays = useMemo(() => Array.from({ length: range[1] - range[0] + 1 }, (_, index) => range[0] + index).filter(day => !excludedDays.includes(day)), [range, excludedDays])
  const latestRfidSession = rfidLive?.recentSessions?.find(session => session.patientId === patient.id) || null

  useEffect(() => {
    setRange([1, patient.lengthOfStay])
    setExcludedDays([])
  }, [patient.id, patient.lengthOfStay])

  const changeRange = updater => {
    setRange(current => typeof updater === 'function' ? updater(current) : updater)
    setExcludedDays([])
  }

  const toggleDay = day => {
    if (day < range[0] || day > range[1]) {
      setRange(([start, end]) => [Math.min(start, day), Math.max(end, day)])
      setExcludedDays(current => current.filter(item => item !== day))
      return
    }
    if (excludedDays.includes(day)) setExcludedDays(current => current.filter(item => item !== day))
    else if (selectedDays.length > 1) setExcludedDays(current => [...current, day])
  }

  const applyAgentActions = actions => {
    for (const action of actions) {
      if (action.type === 'set_day_range') changeRange([action.fromDay, action.toDay])
      if (action.type === 'select_days') {
        const fromDay = Math.min(...action.days); const toDay = Math.max(...action.days)
        setRange([fromDay, toDay])
        setExcludedDays(Array.from({ length: toDay - fromDay + 1 }, (_, index) => fromDay + index).filter(day => !action.days.includes(day)))
      }
      if (action.type === 'toggle_metric' || action.type === 'focus_zone') setAgentAction({ ...action, nonce: Date.now() + Math.random() })
    }
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-4">

      {/* Patient summary bar */}
      <div className="card card-body py-4">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
            {getInitials(patient)}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Patient profile</p>
            <p className="mt-0.5 font-semibold text-slate-800">{getPatientDisplayName(patient)}</p>
            <p className="mt-1 text-xs text-slate-500">{patient.id} · {patient.age} years · {patient.sex} · {patient.primaryDiagnosis}</p>
            <p className="mt-0.5 text-xs text-slate-400">{patient.ward} · {patient.assignedCubicle.replace('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())} · Admitted {patient.admissionDate}</p>
          </div>
        </div>
      </div>

      {rfidLive && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Live RFID feed · shared SQLite</p>
              {latestRfidSession ? (
                <p className="mt-1 text-sm text-slate-700">
                  <strong>{latestRfidSession.active ? 'Currently detected' : 'Last detected'}</strong> in {latestRfidSession.venueLabel} · {formatRfidTime(latestRfidSession.lastSeenAt)}
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-600">No mapped RFID read has been recorded for this patient yet.</p>
              )}
            </div>
            <span className="rounded-md border border-emerald-200 bg-white px-2 py-1 font-mono text-[10px] font-semibold text-emerald-800">
              {latestRfidSession?.active ? `${latestRfidSession.readCount} live reads` : rfidLive.stale ? 'Feed reconnecting' : 'Polling every 2 s'}
            </span>
          </div>
        </div>
      )}

      <IntegratedPatientView patientId={patient.id} range={range} onRangeChange={changeRange} selectedDays={selectedDays} onDayToggle={toggleDay} agentAction={agentAction} />

      <div className="card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAgent(value => !value)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span>
            <span className="panel-title block">Psych-MAP insight analysis</span>
            <span className="mt-1 block text-xs text-slate-400">Ask questions grounded in {selectedDays.length} selected day{selectedDays.length === 1 ? '' : 's'} and the related clinical events.</span>
          </span>
          <span className="text-sm font-medium text-brand-700">{showAgent ? 'Hide analysis' : 'Open analysis'}</span>
        </button>
        {showAgent && <div className="border-t border-slate-100"><InsightAgent patientId={patient.id} folderId={patient.folderId} range={range} selectedDays={selectedDays} profession={profession} onApplyActions={applyAgentActions} /></div>}
      </div>
    </div>
  )
}
