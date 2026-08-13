import { ArrowRight, BriefcaseMedical } from 'lucide-react'
import { PROFESSIONS } from '../data/professions.js'

export default function ProfessionEntry({ selectedId, onSelect, onContinue }) {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <img src="/brand/psych-map-logo.png" alt="Psych-MAP" className="mx-auto mb-4 h-20 w-20 object-contain" />
          <h1 className="text-2xl font-semibold text-slate-900">Enter Psych-MAP</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-500">Choose your profession to tailor the AI's emphasis and suggested questions. The underlying evidence remains identical for every MDT member.</p>
        </div>

        <div className="card p-5 sm:p-7">
          <div className="mb-4 flex items-center gap-2"><BriefcaseMedical size={17} className="text-brand-600" /><h2 className="font-semibold text-slate-800">Select professional lens</h2></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {PROFESSIONS.map(profession => {
              const selected = profession.id === selectedId
              return (
                <button key={profession.id} type="button" onClick={() => onSelect(profession.id)} className={`rounded-xl border p-4 text-left transition ${selected ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-slate-200 bg-white hover:border-brand-300'}`}>
                  <div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-800">{profession.name}</span><span className={`h-4 w-4 rounded-full border-2 ${selected ? 'border-brand-600 bg-brand-600 shadow-[inset_0_0_0_3px_white]' : 'border-slate-300'}`} /></div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">{profession.description}</p>
                </button>
              )
            })}
          </div>
          <button type="button" onClick={onContinue} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-800">Continue to ward overview <ArrowRight size={16} /></button>
          <p className="mt-3 text-center text-[10px] text-slate-400">Prototype role selection only — this is not authentication or an access-control mechanism.</p>
        </div>
      </div>
    </div>
  )
}
