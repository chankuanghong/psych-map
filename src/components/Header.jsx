const NAV_ITEMS = [
  { id: 'ward',    label: 'Ward Overview' },
  { id: 'map',     label: 'Patient MAP' },
  { id: 'method',  label: 'About' },
]

export default function Header({ activeTab, onTabChange, selectedPatient, profession, onChangeProfession }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-screen-2xl mx-auto px-6">
        <div className="flex items-center gap-6 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <img src="/brand/psych-map-logo.png" alt="" className="h-8 w-8 object-contain" />
            <div className="leading-none">
              <span className="font-semibold text-brand-800 text-sm tracking-wide">Psych</span>
              <span className="font-bold text-accent-500 text-sm">-MAP</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Patient indicator */}
          {selectedPatient && activeTab === 'map' && (
            <div className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-slate-400">Viewing:</span>
              <span className="font-medium text-brand-700">{selectedPatient.name}</span>
              <span className="px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 text-xs font-mono">
                {selectedPatient.id}
              </span>
            </div>
          )}

          {/* Synthetic data badge */}
          <button type="button" onClick={onChangeProfession} className="shrink-0 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:border-brand-300 hover:bg-brand-50" title="Change professional lens">
            {profession?.shortName || 'MDT'} lens
          </button>
          <div className={`${selectedPatient && activeTab === 'map' ? '' : 'ml-auto'} shrink-0`}>
            <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
              Synthetic data — demonstration only
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
