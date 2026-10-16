import { CONCEPT_LIST } from '../bridge/runConcept'

export default function ConceptButtons({
  active,
  onSelect,
}: {
  active: number | null
  onSelect: (n: number) => void
}) {
  return (
    <nav aria-label="Quantum phenomena">
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
        {CONCEPT_LIST.map((c) => {
          const on = c.number === active
          return (
            <li key={c.number}>
              <button
                type="button"
                onClick={() => onSelect(c.number)}
                aria-pressed={on}
                className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  on
                    ? 'border-cyan-400/70 bg-cyan-400/10 shadow-[0_0_16px_-4px_rgba(34,211,238,0.6)]'
                    : 'border-slate-800 bg-slate-900/60 hover:border-violet-500/60 hover:bg-slate-800/70'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                    on ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-violet-300'
                  }`}
                >
                  {c.number}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-semibold ${on ? 'text-cyan-200' : 'text-slate-100'}`}>
                    {c.name}
                  </span>
                  <span className="block text-xs leading-snug text-slate-400">{c.short}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
