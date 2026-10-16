import { useCallback, useEffect, useRef, useState } from 'react'
import ConceptButtons from './components/ConceptButtons'
import Readout from './components/Readout'
import ToasterScene from './components/Toaster/ToasterScene'
import { CONCEPT_LIST, runConcept } from './bridge/runConcept'
import type { ConceptRun } from './bridge/types'

const PLAY_MS = 4000

export default function App() {
  const [run, setRun] = useState<ConceptRun | null>(null)
  const [runKey, setRunKey] = useState(0)
  const [playing, setPlaying] = useState(false)
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
    <div className="min-h-screen bg-white font-extralight text-zinc-900">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="order-2 lg:order-1 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:p-2">
          <ConceptButtons active={run?.number ?? null} onSelect={onButton} />
        </aside>

        <main className="order-1 flex min-w-0 flex-col gap-8 lg:order-2">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl tracking-tight sm:text-4xl">Quantum Toaster</h1>
              <p className="mt-1 text-sm text-zinc-500">
                A toaster that obeys quantum mechanics. Pick a phenomenon.
              </p>
            </div>
            <button
              type="button"
              onClick={() => (playing ? setPlaying(false) : startPlay())}
              className="rounded-full bg-zinc-50 px-5 py-2 text-sm font-light shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)] transition hover:shadow-[0_2px_4px_rgba(0,0,0,0.08),0_8px_20px_rgba(0,0,0,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            >
              {playing ? 'Stop' : 'Play all'}
            </button>
          </header>

          {/* Stacked paper layers behind the toaster */}
          <div className="relative mx-2 sm:mx-6">
            <div aria-hidden className="absolute inset-0 translate-x-4 translate-y-4 rounded-3xl bg-zinc-50 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" />
            <div aria-hidden className="absolute inset-0 translate-x-2 translate-y-2 rounded-3xl bg-zinc-100/60 shadow-[0_1px_3px_rgba(0,0,0,0.05)]" />
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05),0_12px_32px_rgba(0,0,0,0.06)]">
              <ToasterScene run={run} runKey={runKey} />
            </div>
          </div>

          <Readout run={run} />
        </main>
      </div>
    </div>
  )
}
