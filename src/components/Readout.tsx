import type { ConceptRun } from '../bridge/types'

function fmt(v: number | string): string {
  if (typeof v === 'string') return v
  if (Number.isInteger(v)) return String(v)
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
}

export default function Readout({ run }: { run: ConceptRun | null }) {
  if (!run) {
    return (
      <div className="px-2 text-sm text-zinc-500">
        Pick a phenomenon to run it on the physics engine.
      </div>
    )
  }
  return (
    <div className="px-2" aria-live="polite">
      <h2 className="flex items-center gap-2 text-xl font-light text-zinc-900">
        <span className="text-sm text-zinc-400 tabular-nums">
          #{run.number}
        </span>
        {run.name}
      </h2>
      <p className="mt-2 text-sm text-zinc-600">{run.caption}</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {Object.entries(run.readouts).map(([k, v]) => (
          <li
            key={k}
            className="rounded-lg bg-zinc-50 px-3 py-1.5 text-xs shadow-[0_1px_2px_rgba(0,0,0,0.05),0_3px_8px_rgba(0,0,0,0.04)]"
          >
            <span className="text-zinc-500">{k}</span>{' '}
            <span className="font-normal text-zinc-900 tabular-nums">{fmt(v)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
