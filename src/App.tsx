import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import ConceptButtons from './components/ConceptButtons'
import Readout from './components/Readout'
import ToasterScene from './components/Toaster/ToasterScene'

// three.js is heavy, so the 3D stage loads in its own chunk.
const Toaster3D = lazy(() => import('./components/Toaster3D/Toaster3D'))
import { CONCEPT_LIST, runConcept } from './bridge/runConcept'
import type { ConceptRun } from './bridge/types'

const PLAY_MS = 4000

export default function App() {
  const [run, setRun] = useState<ConceptRun | null>(null)
  const [runKey, setRunKey] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [view, setView] = useState<'3d' | '2d'>('3d')
  const seedRef = useRef(1)

  const select = useCallback((n: number) => {
    const seed = seedRef.current++
    setRun(runConcept(n, seed))
    setRunKey((k) => k + 1)
  }, [])

  const onButton = useCallback(
    (n: number) => {
      setPlaying(false)
      select(n)
    },
    [select],
  )

  const startPlay = () => {
    setPlaying(true)
    select(CONCEPT_LIST[0].number)
  }

  useEffect(() => {
    if (!playing || !run) return
    const idx = CONCEPT_LIST.findIndex((c) => c.number === run.number)
    const t = window.setTimeout(() => {
      if (idx >= CONCEPT_LIST.length - 1) setPlaying(false)
      else select(CONCEPT_LIST[idx + 1].number)
    }, PLAY_MS)
    return () => window.clearTimeout(t)
  }, [playing, run, runKey, select])

  return (
    <div className="relative z-10 flex min-h-screen flex-col font-extralight text-zinc-900 lg:h-screen lg:overflow-hidden">
      <div className="mx-auto grid w-full max-w-[90rem] flex-1 gap-6 px-4 py-6 sm:px-6 lg:min-h-0 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <aside className="order-2 lg:order-1 lg:min-h-0 lg:overflow-y-auto lg:p-1.5">
          <ConceptButtons active={run?.number ?? null} onSelect={onButton} />
        </aside>

        <main className="order-1 flex min-w-0 flex-col gap-4 lg:order-2 lg:min-h-0">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl tracking-tight">Quantum Toaster</h1>
              <p className="text-sm text-zinc-500">A toaster that obeys quantum mechanics. Pick a phenomenon.</p>
            </div>
            <div className="flex gap-2">
              <div className="flex rounded-full bg-zinc-50 p-1 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.05)]" role="group" aria-label="View">
                {(['3d', '2d'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                    className={`rounded-full px-3 py-1 text-sm font-light transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${view === v ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)]' : 'text-zinc-500'}`}
                  >
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => (playing ? setPlaying(false) : startPlay())}
                className="rounded-full px-4 py-1.5 text-sm font-light transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 bg-zinc-50 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.08),0_8px_20px_rgba(0,0,0,0.08)]"
              >
                {playing ? 'Stop' : 'Play all'}
              </button>
            </div>
          </header>

          {/* Stacked paper layers behind the toaster */}
          <div className="relative mr-4 mb-4 aspect-[4/3] lg:aspect-auto lg:min-h-0 lg:flex-1">
            <div aria-hidden className="absolute inset-0 translate-x-4 translate-y-4 rounded-3xl bg-zinc-50 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" />
            <div aria-hidden className="absolute inset-0 translate-x-2 translate-y-2 rounded-3xl bg-zinc-100/60 shadow-[0_1px_3px_rgba(0,0,0,0.05)]" />
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05),0_12px_32px_rgba(0,0,0,0.06)]">
              {view === '3d' ? (
                <Suspense fallback={<p className="text-sm text-zinc-400">Loading 3D toaster…</p>}>
                  <Toaster3D run={run} runKey={runKey} />
                </Suspense>
              ) : (
                <ToasterScene run={run} runKey={runKey} />
              )}
            </div>
          </div>

          <div className="min-h-[6.5rem]">
            <Readout run={run} />
          </div>
        </main>
      </div>
    </div>
  )
}
