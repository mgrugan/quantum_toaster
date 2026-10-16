// Contract between the physics engine (src/quantum), the bridge that runs it
// (src/bridge/runConcept.ts) and the toaster visualization (src/components).

/** Visual oddity the toaster performs. One per quantum concept (spec numbering 1-21). */
export type EffectId =
  | 'state' // 1  Hilbert space: slice shows a 4-bar amplitude halo
  | 'superposition' // 2  slice flickers between raw/light/golden/burnt ghosts
  | 'measurement' // 3  flash, ghosts collapse into one solid slice
  | 'quantization' // 4  coil glows in discrete energy steps (n² levels)
  | 'zeroPoint' // 5  toaster idles with a faint, never-zero jitter/glow
  | 'evolution' // 6  slice colour oscillates raw→golden→raw (Rabi)
  | 'observables' // 7  gauge needle swings to ⟨doneness⟩
  | 'uncertainty' // 8  slot narrows, slice pops up with smeared, spread-out trajectory
  | 'nonCommuting' // 9  slice flips in two different orders → different end poses
  | 'spin' // 10 slice spins/precesses about vertical axis (butter side)
  | 'interference' // 11 crumbs fall from two slots and stack into fringe bars
  | 'tunneling' // 12 slice ghosts *through* the latch/side wall
  | 'entanglement' // 13 two slices linked by glowing thread, always same colour
  | 'bell' // 14 two detectors with 2√2 meter beating the classical limit
  | 'decoherence' // 15 shimmering ghosts fade into a dull, classical slice
  | 'zeno' // 16 eye watches the slice; it stays raw, refuses to toast
  | 'exclusion' // 17 two slices repel when pushed into the same slot
  | 'noCloning' // 18 copy attempt yields a blurry, low-fidelity duplicate
  | 'blackbody' // 19 coil glow colour follows Planck spectrum as temperature rises
  | 'photoelectric' // 20 light hits bread; electrons only fly when frequency > threshold
  | 'teleportation' // 21 slice dissolves here and reappears in a second toaster

/** Result of running one concept on the engine; drives the visual + readout. */
export interface ConceptRun {
  effect: EffectId
  /** Concept number 1-21, matching docs/QUANTUM_CONCEPTS.md. */
  number: number
  name: string
  /** One-line explanation shown under the toaster. */
  caption: string
  /** Key numbers from the engine, e.g. { 'S (CHSH)': 2.83 }. */
  readouts: Record<string, number | string>
  /**
   * Engine data the animation needs. Each field is optional; components fall back
   * to sensible defaults when one is missing.
   */
  payload: {
    /** Doneness probabilities [raw, light, golden, burnt]; each sums to 1. */
    probabilities?: number[]
    /** Collapsed doneness index 0-3, after a measurement. */
    outcome?: number
    /** Time series of doneness probabilities (evolution/decoherence/zeno). Each row sums to 1. */
    series?: number[][]
    /** Generic 0-1 scalar (fidelity, transmission T, purity, ...). */
    value?: number
    /** Sampled positions in [0,1] (interference crumbs, uncertainty spread). */
    samples?: number[]
    /** Bloch vector frames [x,y,z][] for spin precession. */
    bloch?: [number, number, number][]
    /** Colour override as CSS colour (blackbody glow). */
    color?: string
    /** Whether the effect "succeeded" (photoelectric above threshold, clone, tunneled...). */
    success?: boolean
  }
}
