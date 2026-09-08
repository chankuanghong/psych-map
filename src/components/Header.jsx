const NAV_ITEMS = [
  { id: 'ward',    label: 'Ward Overview', shortLabel: 'Ward' },
  { id: 'map',     label: 'Patient MAP', shortLabel: 'Map' },
  { id: 'insights', label: 'Clinical Insights', shortLabel: 'Insights' },
  { id: 'method',  label: 'About' },
]

export default function Header({ activeTab, onTabChange, selectedPatient, profession, onChangeProfession, rfidLive }) {
  const liveCount = rfidLive?.activeSessions?.length || 0
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-screen-2xl px-3 sm:px-6">
        <div className="flex h-14 min-w-0 items-center gap-3 sm:gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <img src="/brand/psych-map-logo.png" alt="" className="h-8 w-8 object-contain" />
            <div className="leading-none">
              <span className="font-semibold text-brand-800 text-sm tracking-wide">Psych</span>
              <span className="font-bold text-accent-500 text-sm">-MAP</span>
            </div>
          </div>

          {/* Patient indicator */}
          {selectedPatient && ['map', 'insights'].includes(activeTab) && (
            <div className="ml-auto hidden min-w-0 items-center gap-2 text-sm lg:flex">
              <span className="text-slate-400">Viewing:</span>
              <span className="truncate font-medium text-brand-700">{selectedPatient.displayName || selectedPatient.name}</span>
              <span className="px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 text-xs font-mono">
                {selectedPatient.id}
              </span>
            </div>
          )}

          {/* Synthetic data badge */}
          <button type="button" onClick={onChangeProfession} className={`${selectedPatient && ['map', 'insights'].includes(activeTab) ? 'lg:ml-0' : 'ml-auto'} min-h-11 shrink-0 rounded border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:border-brand-300 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:min-h-0 sm:px-2`} title="Change professional lens">
            {profession?.shortName || 'MDT'} lens
          </button>
          <div className="hidden shrink-0 xl:block">
            <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
              Synthetic data — demonstration only
            </span>
          </div>
          {rfidLive && (
            <div className="hidden shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 sm:flex" title={rfidLive.stale ? 'Last RFID update is temporarily unavailable' : 'RFID records are being read from the shared Psych-MAP database'}>
              <span className={`h-1.5 w-1.5 rounded-full ${rfidLive.stale ? 'bg-amber-500' : liveCount ? 'animate-pulse bg-emerald-600' : 'bg-emerald-500'}`} aria-hidden="true" />
              {rfidLive.stale ? 'RFID reconnecting' : liveCount ? `${liveCount} RFID active` : 'RFID linked'}
            </div>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-2 border-t border-slate-100 py-1.5">
          <nav className="grid min-w-0 flex-1 grid-cols-4 gap-1" aria-label="Primary navigation">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                aria-current={activeTab === item.id ? 'page' : undefined}
                className={`min-h-10 min-w-0 rounded px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600 sm:text-sm ${
                  activeTab === item.id
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <span className="sm:hidden">{item.shortLabel || item.label}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </nav>
          {selectedPatient && ['map', 'insights'].includes(activeTab) && (
            <div className="hidden min-w-0 shrink items-center gap-1.5 rounded bg-brand-50 px-2 py-1 text-xs text-brand-700 md:flex lg:hidden">
              <span className="max-w-28 truncate font-medium">{selectedPatient.displayName || selectedPatient.name}</span>
              <span className="font-mono text-[10px] text-brand-600">{selectedPatient.id}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
