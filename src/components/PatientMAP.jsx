import IntegratedPatientView from './IntegratedPatientView.jsx'

const getPatientDisplayName = patient => patient.displayName ?? patient.name ?? patient.id ?? 'Patient'
const getInitials = patient => getPatientDisplayName(patient)
  .split(/\s+/)
  .filter(Boolean)
  .map(part => part[0])
  .join('')
export default function PatientMAP({ patient, range, onRangeChange, selectedDays, onDayToggle }) {

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

      <IntegratedPatientView patientId={patient.id} range={range} onRangeChange={onRangeChange} selectedDays={selectedDays} onDayToggle={onDayToggle} />
    </div>
  )
}
