const formatDateTime = value => new Intl.DateTimeFormat('en-SG', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  hour12: false, timeZone: 'Asia/Singapore',
}).format(new Date(value))

const getSections = document => document.sections || [
  { label: 'S · Subjective', text: document.subjective },
  { label: 'O · Objective', text: document.objective },
  { label: 'A · Assessment', text: document.assessment },
  { label: 'P · Plan', text: document.plan },
]

export default function ClinicalDocumentCard({ document, defaultOpen = false }) {
  const isDav = document.noteType.includes('DAV')
  return (
    <details open={defaultOpen || undefined} className={`group rounded-lg border ${isDav ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'}`}>
      <summary className="cursor-pointer list-none p-3 marker:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={`text-xs font-semibold ${isDav ? 'text-rose-800' : 'text-amber-800'}`}>Seen {formatDateTime(document.seenAt)}</p>
          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{document.noteType}</span>
        </div>
        <p className="mt-1 text-sm font-semibold text-slate-800">{document.title}</p>
        <p className="mt-1 text-xs text-slate-500">{document.discipline} · {document.authorRole} · Day {document.day}</p>
        <p className="mt-2 text-xs font-medium text-brand-700 group-open:hidden">View {document.noteFormat || 'document'} details</p>
      </summary>
      <div className="border-t border-slate-200 px-3 pb-3 pt-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{document.noteFormat || document.noteType}</p>
        <dl className="space-y-3 text-xs leading-relaxed">
          {getSections(document).filter(section => section.text).map(section => <div key={section.label}><dt className="font-semibold text-slate-700">{section.label}</dt><dd className="mt-0.5 text-slate-600">{section.text}</dd></div>)}
        </dl>
        <p className="mt-3 border-t border-slate-200 pt-2 text-xs text-slate-400">Signed {formatDateTime(document.signedAt)} · {document.source}</p>
      </div>
    </details>
  )
}
