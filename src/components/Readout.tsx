import type { ConceptRun } from '../bridge/types'

function fmt(v: number | string): string {
  if (typeof v === 'string') return v
  if (Number.isInteger(v)) return String(v)
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
}

export default function Readout({ run }: { run: ConceptRun | null }) {
  if (!run) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
        Pick a phenomenon to run it on the physics engine.
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4" aria-live="polite">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
        <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-bold text-violet-300">
          #{run.number}
        </span>
        {run.name}
      </h2>
      <p className="mt-1 text-sm text-slate-300">{run.caption}</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {Object.entries(run.readouts).map(([k, v]) => (
          <li
            key={k}
            className="rounded-md border border-cyan-500/30 bg-cyan-500/5 px-2.5 py-1 text-xs"
          >
            <span className="text-slate-400">{k}</span>{' '}
            <span className="font-mono font-semibold text-cyan-200 tabular-nums">{fmt(v)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
