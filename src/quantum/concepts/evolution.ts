/**
 * Concept 6: unitary Schrödinger evolution |ψ(t)⟩ = e^{−iHt}|ψ(0)⟩ (ħ = 1).
 * The heating element couples neighbouring doneness levels, driving coherent Rabi-like
 * oscillations raw → light → golden → burnt → … → raw. Norm is conserved.
 */
import type { Matrix, Vector } from '../linalg'
import { matvec, norm, probabilities, propagator, unitarityError, zerosMatrix } from '../linalg'
import { DONENESS_DIM, donenessBasisState } from './state'

export interface HeatingOptions {
  /** Drive strength Ω ("heat power"). Full raw→burnt→raw cycle takes t = 2π/Ω. */
  power?: number
  /** Detuning δ: level k gets energy k·δ in the rotating frame; spoils perfect transfer. */
  detuning?: number
}

/**
 * Concept 6 — doneness Hamiltonian in the coil's rotating frame:
 * H = δ·diag(0,1,2,3) + Ω·Jₓ, where Jₓ is the spin-3/2 ladder (tridiagonal couplings
 * √3/2, 1, √3/2). With δ = 0, P(raw, t) = cos⁶(Ωt/2) exactly.
 */
export function donenessHamiltonian({ power = 1, detuning = 0 }: HeatingOptions = {}): Matrix {
  const h = zerosMatrix(DONENESS_DIM)
  const couplings = [Math.sqrt(3) / 2, 1, Math.sqrt(3) / 2]
  for (let k = 0; k < DONENESS_DIM; k++) h[k][k] = { re: k * detuning, im: 0 }
  for (let k = 0; k < DONENESS_DIM - 1; k++) {
    h[k][k + 1] = { re: power * couplings[k], im: 0 }
    h[k + 1][k] = { re: power * couplings[k], im: 0 }
  }
  return h
}

/** Concept 6 — evolve ψ for time t under H: e^{−iHt}ψ. */
export const evolveState = (h: Matrix, psi: Vector, t: number): Vector => matvec(propagator(h, t), psi)

/** One row of an evolution time series (chart-ready: one line per level). */
export interface EvolutionPoint {
  t: number
  raw: number
  light: number
  golden: number
  burnt: number
  norm: number
}

export interface EvolutionResult {
  times: number[]
  /** probabilities[k][level] at times[k]. */
  probabilities: number[][]
  series: EvolutionPoint[]
  /** Final state ψ(tMax). */
  finalState: Vector
  /** max_t |‖ψ(t)‖ − 1| — should be ~1e-15. */
  maxNormError: number
  /** ‖U†U − 1‖ for the step propagator. */
  unitarityError: number
}

/**
 * Concept 6 — time series of level probabilities from t = 0 to tMax (steps+1 samples) using
 * one exact step propagator U(dt) = e^{−iH·dt} applied repeatedly.
 */
export function evolveDoneness(
  options: HeatingOptions & { psi0?: Vector; tMax?: number; steps?: number; hamiltonian?: Matrix } = {},
): EvolutionResult {
  const { psi0 = donenessBasisState('raw'), steps = 200 } = options
  const h = options.hamiltonian ?? donenessHamiltonian(options)
  const tMax = options.tMax ?? (2 * Math.PI) / (options.power ?? 1)
  const dt = tMax / steps
  const u = propagator(h, dt)
  let psi = psi0
  const times: number[] = []
  const probs: number[][] = []
  const series: EvolutionPoint[] = []
  let maxNormError = 0
  for (let k = 0; k <= steps; k++) {
    if (k > 0) psi = matvec(u, psi)
    const p = probabilities(psi)
    const n = norm(psi)
    maxNormError = Math.max(maxNormError, Math.abs(n - 1))
    times.push(k * dt)
    probs.push(p)
    series.push({ t: k * dt, raw: p[0], light: p[1], golden: p[2], burnt: p[3], norm: n })
  }
  return { times, probabilities: probs, series, finalState: psi, maxNormError, unitarityError: unitarityError(u) }
}

/** Analytic check for δ = 0: P(raw, t) = cos⁶(Ωt/2). */
export const rawSurvivalAnalytic = (t: number, power = 1): number => Math.cos((power * t) / 2) ** 6

