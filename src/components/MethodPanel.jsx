import { AlertCircle, Database, Cpu, Eye, ArrowRight } from 'lucide-react'

export default function MethodPanel() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">
      <div className="mb-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">About</p>
        <h1 className="text-xl font-bold text-slate-800">About Psych-MAP</h1>
        <p className="text-sm text-slate-500 mt-0.5">Architecture, behavioural measures, and limitations.</p>
      </div>

      {/* Disclaimer */}
      <div className="card p-4 border-l-4 border-amber-400">
        <div className="flex items-start gap-2">
          <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-700 text-sm mb-1">De-identified demonstration data</div>
            <p className="text-slate-600 text-sm leading-relaxed">
              Clinical patterns and question wording are rehashed to remove direct identifiers and reduce sensitivity.
              Historical patient trajectories are synthetic. A connected local RFID reader can add mapped presence sessions to the same SQLite database for a live integration demonstration. This remains a proof-of-concept prototype.
            </p>
          </div>
        </div>
      </div>

      {/* What is Psych-MAP */}
      <div className="card p-5">
        <p className="panel-title mb-3">What is Psych-MAP?</p>
        <p className="text-sm text-slate-600 leading-relaxed mb-3">
          Psych-MAP is an AI-assisted behavioural intelligence system designed for acute psychiatric wards.
          It transforms passive behavioural signals — ward location, activity participation, and documented
          clinical events — into a longitudinal picture of a patient's recovery-relevant
          behaviour.
        </p>
        <p className="text-sm text-slate-600 leading-relaxed">
          The name MAP has three meanings:{' '}
          <strong className="text-slate-800">Motivation and Pleasure</strong> (the clinical domain it supports),{' '}
          <strong className="text-slate-800">Ward Map</strong> (the zone heat-map interface), and{' '}
          <strong className="text-slate-800">Mapping Change Over Time</strong> (longitudinal behavioural tracking).
        </p>
      </div>

      {/* Architecture */}
      <div className="card p-5">
        <p className="panel-title mb-4">System architecture</p>
        <div className="flex items-start gap-2 flex-wrap">
          {[
            { icon: Database, label: 'Bounded data sources', desc: 'Synthetic clinical history plus optional live RFID presence' },
            null,
            { icon: Database, label: 'Event store', desc: 'Location, activity, and clinical documentation events' },
            null,
            { icon: Cpu,      label: 'Metrics + detector', desc: 'Objective measures and reproducible signal thresholds' },
            null,
            { icon: Eye,      label: 'Evidence packet', desc: 'Selected dates, detected signals, metrics and clinical events' },
            null,
            { icon: Cpu,      label: 'Bounded selector', desc: 'Optional CodeBuddy chooses fact IDs and validated UI actions only' },
            null,
            { icon: Eye,      label: 'MDT interface', desc: 'Heat map, night view, questions and MDT brief' },
          ].map((item, i) =>
            item === null ? (
              <div key={i} className="flex items-center self-center">
                <ArrowRight size={14} className="text-slate-300 mx-1" />
              </div>
            ) : (
              <div key={i} className="flex-1 min-w-32 bg-slate-50 rounded-lg border border-slate-200 p-3">
                <item.icon size={13} className="text-brand-600 mb-1" />
                <div className="text-slate-700 text-xs font-semibold">{item.label}</div>
                <div className="text-slate-400 text-xs mt-0.5 leading-tight">{item.desc}</div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Behavioural measures */}
      <div className="card p-5">
        <p className="panel-title mb-2">Behavioural measures</p>
        <p className="text-xs text-slate-400 mb-4">
          These are objective, observable measures derived from location and activity signals.
          They are NOT validated psychiatric rating scales. All values are averages per day.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { name: 'Time beyond assigned cubicle',      signals: 'Direct: total waking time minus Cubicle #1 time' },
            { name: 'Activity room time (min/day)',      signals: 'Direct: minutes recorded in activity room zone' },
            { name: 'Dining Area and Balcony',           signals: 'Direct: minutes recorded in each named shared space' },
            { name: 'Other cubicle presence',            signals: 'Location signal only; possible social exposure, purpose not inferred' },
            { name: 'Staff observations',                signals: 'Displayed from clinical documentation, not inferred from proximity' },
            { name: 'Structured sessions (/day)',        signals: 'Count: OT, group, or scheduled activity sessions' },
            { name: 'Zone transitions (/day)',           signals: 'Count: meaningful changes between ward zones' },
            { name: 'Shower-area presence',              signals: 'Direct duration signal only; washing or ritual content is not inferred' },
          ].map(ind => (
            <div key={ind.name} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
              <div className="text-slate-700 text-sm font-semibold mb-1">{ind.name}</div>
              <div className="text-slate-400 text-xs leading-relaxed">{ind.signals}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI role */}
      <div className="card p-5">
        <p className="panel-title mb-1">Hybrid AI structure</p>
        <p className="mb-4 text-xs leading-relaxed text-slate-500">Deterministic code detects patterns, rebuilds a patient-scoped snapshot, verifies fact IDs and renders the final language. Optional CodeBuddy can select only supplied fact IDs and allowlisted view actions. If it is disabled or unavailable, the same server-side deterministic selector remains available after the question is persisted.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-2">The agent does</div>
            <ul className="space-y-1.5 text-sm text-slate-600">
              {[
                'Select from bounded evidence fact IDs',
                'Suggest allowlisted view changes',
                'Return strict versioned JSON',
                'Leave values and prose to deterministic code',
                'Fall back safely when unavailable',
                'Preserve the evidence-use ledger',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5 shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-2">The agent does not</div>
            <ul className="space-y-1.5 text-sm text-slate-600">
              {[
                'Diagnose psychiatric illness',
                'Replace clinical judgement',
                'Imply causality from temporal association',
                'Assign validated symptom scores',
                'Label patients as compliant / non-compliant',
                'Infer private activity within enclosed spaces',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5 shrink-0">✗</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Future */}
      <div className="card p-5">
        <p className="panel-title mb-3">Future architecture</p>
        <p className="text-sm text-slate-500 mb-3">
          In a production deployment, the local demonstration sources would be replaced with governed integrations:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-600">
          {['RFID / proximity tags','BLE ward tracking','EHR / NGEMR integration',
            'Medication administration records','Activity scheduling systems','Clinical documentation APIs'].map(s => (
            <div key={s} className="bg-slate-50 rounded border border-slate-200 px-3 py-2">{s}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
