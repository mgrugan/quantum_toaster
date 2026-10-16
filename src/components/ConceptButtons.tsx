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
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
        {CONCEPT_LIST.map((c) => {
          const on = c.number === active
          return (
            <li key={c.number}>
              <button
                type="button"
                onClick={() => onSelect(c.number)}
                aria-pressed={on}
                className={`flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                  on
                    ? 'bg-white shadow-[0_2px_4px_rgba(0,0,0,0.08),0_10px_24px_rgba(0,0,0,0.10)]'
                    : 'bg-zinc-50 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.05)] hover:bg-white hover:shadow-[0_2px_4px_rgba(0,0,0,0.07),0_8px_20px_rgba(0,0,0,0.08)]'
                }`}
              >
                <span
                  className={`mt-0.5 w-5 shrink-0 text-xs tabular-nums ${on ? 'text-zinc-900' : 'text-zinc-400'}`}
                >
                  {c.number}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm ${on ? 'font-normal text-zinc-900' : 'font-light text-zinc-800'}`}>
                    {c.name}
                  </span>
                  <span className="block text-xs font-extralight leading-snug text-zinc-500">{c.short}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
