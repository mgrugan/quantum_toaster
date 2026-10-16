import { useCallback, useEffect, useRef, useState } from 'react'
import ConceptButtons from './components/ConceptButtons'
import Readout from './components/Readout'
import ModelViewer from './components/ModelViewer'
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
              Quantum Toaster
            </h1>
            <p className="text-sm text-slate-400">
              A toaster that obeys quantum mechanics — click a phenomenon
            </p>
          </div>
          <button
            type="button"
            onClick={() => (playing ? setPlaying(false) : startPlay())}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              playing
                ? 'bg-violet-500 text-white hover:bg-violet-400'
                : 'border border-cyan-400/60 text-cyan-200 hover:bg-cyan-400/10'
            }`}
          >
            {playing ? '■ Stop' : '▶ Play all'}
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[18rem_minmax(0,1fr)_16rem]">
        <aside className="order-2 lg:order-1 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
          <ConceptButtons active={run?.number ?? null} onSelect={onButton} />
        </aside>

        <main className="order-1 flex min-w-0 flex-col gap-4 lg:order-2">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
            <ToasterScene run={run} runKey={runKey} />
          </div>
          <Readout run={run} />
        </main>

        <div className="order-3 w-full max-w-xs lg:max-w-none">
          <ModelViewer />
        </div>
      </div>
    </div>
  )
}
