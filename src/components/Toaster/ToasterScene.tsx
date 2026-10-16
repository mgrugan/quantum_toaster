import type { JSX } from 'react'
import type { ConceptRun } from '../../bridge/types'
import { EffectView, Idle } from './effects'
import { Defs } from './parts'
import './toaster.css'

export interface ToasterSceneProps {
  run: ConceptRun | null
  /** Increments on every click so the same effect replays. */
  runKey: number
}

export default function ToasterScene({ run, runKey }: ToasterSceneProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 400 320"
      className="block h-full max-h-full w-full max-w-[640px] select-none overflow-visible"
      role="img"
      aria-label={run ? `Quantum toaster: ${run.name}` : 'Quantum toaster, idle'}
    >
      <Defs />
      <g key={`${run?.effect ?? 'idle'}-${runKey}`} className="qt-scene-in">
        {run ? <EffectView effect={run.effect} p={run.payload ?? {}} /> : <Idle />}
      </g>
    </svg>
  )
}
