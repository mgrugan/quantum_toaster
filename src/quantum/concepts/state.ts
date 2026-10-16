/**
 * Concepts 1–3: Hilbert space, superposition, and Born-rule measurement with collapse.
 * The slice's doneness is a 4-level qudit |raw⟩, |light⟩, |golden⟩, |burnt⟩.
 */
import type { Complex } from '../complex'
import { abs2, phase } from '../complex'
import type { Vector } from '../linalg'
import { basisVector, norm, normalize, probabilities } from '../linalg'
import type { Rng } from '../rng'
import { sampleIndex, toRng } from '../rng'

/** The four doneness basis states, in order. */
export const DONENESS_LEVELS = ['raw', 'light', 'golden', 'burnt'] as const
export type DonenessLevel = (typeof DONENESS_LEVELS)[number]
/** Hilbert-space dimension of the doneness qudit. */
export const DONENESS_DIM: number = DONENESS_LEVELS.length

/** Resolve a level name or index to an index 0..3. */
export function levelIndex(level: DonenessLevel | number): number {
  const i = typeof level === 'number' ? level : DONENESS_LEVELS.indexOf(level)
  if (i < 0 || i >= DONENESS_DIM) throw new Error(`Unknown doneness level: ${String(level)}`)
  return i
}

/** Concept 1 — a definite doneness basis state, e.g. a fresh |raw⟩ slice. */
export const donenessBasisState = (level: DonenessLevel | number = 'raw'): Vector =>
  basisVector(DONENESS_DIM, levelIndex(level))

/**
 * Concept 2 — superposition. Builds Σ cᵢ|i⟩ from real or complex weights and normalizes,
 * so the toast is raw *and* golden *and* burnt at once.
 */
export function superposition(weights: ReadonlyArray<number | Complex>): Vector {
  if (weights.length !== DONENESS_DIM) throw new Error(`Need ${DONENESS_DIM} weights`)
  return normalize(weights.map((w) => (typeof w === 'number' ? { re: w, im: 0 } : { ...w })))
}

/** Equal superposition of all four doneness levels (optionally with relative phases φᵢ). */
export const uniformSuperposition = (phases: number[] = [0, 0, 0, 0]): Vector =>
  phases.map((p) => ({ re: Math.cos(p) / 2, im: Math.sin(p) / 2 }))

/** Concept 1 — check Σ|cᵢ|² = 1. */
export const isNormalized = (psi: Vector, tol = 1e-9): boolean => Math.abs(norm(psi) - 1) < tol

/** One bar per level: amplitude, its magnitude/phase, and Born probability. Chart-ready. */
export interface AmplitudeBar {
  index: number
  level: DonenessLevel
  amplitude: Complex
  magnitude: number
  phase: number
  probability: number
}

/** Concept 2 — describe a doneness state for an amplitude/probability bar chart. */
export function amplitudeBars(psi: Vector): AmplitudeBar[] {
  return psi.map((a, i) => ({
    index: i,
    level: DONENESS_LEVELS[i],
    amplitude: { ...a },
    magnitude: Math.sqrt(abs2(a)),
    phase: phase(a),
    probability: abs2(a),
  }))
}

/** Result of a projective measurement. */
export interface MeasurementResult {
  outcome: number
  level: DonenessLevel
  /** Born probability of the outcome *before* collapse. */
  probability: number
  /** Probabilities of all outcomes before collapse. */
  probabilities: number[]
  /** The collapsed state |outcome⟩. */
  postState: Vector
}

/**
 * Concept 3 — Born-rule measurement in the doneness basis: sample i with P(i) = |cᵢ|²,
 * then collapse to |i⟩. This is "opening the lid".
 */
export function measureDoneness(psi: Vector, rng: Rng | number = 42): MeasurementResult {
  const probs = probabilities(psi)
  const outcome = sampleIndex(probs, toRng(rng))
  return {
    outcome,
    level: DONENESS_LEVELS[outcome],
    probability: probs[outcome],
    probabilities: probs,
    postState: basisVector(psi.length, outcome),
  }
}

/** Histogram of many independent measurements on fresh copies of ψ. */
export interface MeasurementStatistics {
  shots: number
  counts: number[]
  frequencies: number[]
  expected: number[]
  /** Chart-ready: one entry per level with observed vs Born frequency. */
  bars: { level: DonenessLevel; observed: number; expected: number }[]
}

/** Concept 3 — repeat "prepare ψ, open lid" `shots` times; frequencies → |cᵢ|². */
export function sampleMeasurements(psi: Vector, shots: number, rng: Rng | number = 42): MeasurementStatistics {
  const r = toRng(rng)
  const expected = probabilities(psi)
  const counts = new Array<number>(psi.length).fill(0)
  for (let s = 0; s < shots; s++) counts[sampleIndex(expected, r)]++
  const frequencies = counts.map((c) => c / shots)
  return {
    shots,
    counts,
    frequencies,
    expected,
    bars: expected.map((e, i) => ({ level: DONENESS_LEVELS[i], observed: frequencies[i], expected: e })),
  }
}
