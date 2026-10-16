/**
 * Concept 16: quantum Zeno effect — "a watched toast never toasts". The coil drives
 * raw → done; peeking N times during total time T projects back onto |raw⟩ each time, so
 * P(still raw) = [cos²(ΩT/2N)]ᴺ → 1 as N → ∞ (two-level model).
 */
import { abs2 } from '../complex'
import type { Matrix } from '../linalg'
import { basisVector, matvec, mscaleReal, probabilities, propagator } from '../linalg'
import { PAULI_X } from '../qubits'
import type { Rng } from '../rng'
import { sampleIndex, toRng } from '../rng'
import { donenessHamiltonian } from './evolution'

export interface ZenoOptions {
  /** Rabi frequency Ω of the heating drive. */
  omega?: number
  /** Total toasting time T (default π/Ω: a full raw→done flip if unwatched). */
  totalTime?: number
  /** 2 = raw/done qubit with H = (Ω/2)σx; 4 = full doneness qudit with H = Ω·Jₓ. */
  levels?: 2 | 4
}

const hamiltonianFor = (levels: 2 | 4, omega: number): Matrix =>
  levels === 2 ? mscaleReal(PAULI_X, omega / 2) : donenessHamiltonian({ power: omega })

/** Concept 16 — analytic survival [cos²(ΩT/2N)]ᴺ for the two-level model. */
export function zenoAnalytic(N: number, omega = 1, totalTime = Math.PI / omega): number {
  return Math.cos((omega * totalTime) / (2 * N)) ** (2 * N)
}

/**
 * Concept 16 — exact simulation: propagate with U = e^{−iHT/N}, project onto |raw⟩ after
 * each interval. P(all N peeks show raw) = |⟨raw|U|raw⟩|^{2N}.
 */
export function zenoSimulated(N: number, { omega = 1, totalTime, levels = 2 }: ZenoOptions = {}): number {
  const T = totalTime ?? Math.PI / omega
  const u = propagator(hamiltonianFor(levels, omega), T / N)
  const amp = matvec(u, basisVector(levels, 0))[0]
  return abs2(amp) ** N
}

/** Concept 16 — the Zeno curve: [{ N, analytic, simulated, simulatedQudit }]. */
export function zenoCurve(
  Ns: number[] = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 50, 100],
  options: Omit<ZenoOptions, 'levels'> = {},
): { N: number; analytic: number; simulated: number; simulatedQudit: number }[] {
  const omega = options.omega ?? 1
  const T = options.totalTime ?? Math.PI / omega
  return Ns.map((N) => ({
    N,
    analytic: zenoAnalytic(N, omega, T),
    simulated: zenoSimulated(N, { omega, totalTime: T, levels: 2 }),
    simulatedQudit: zenoSimulated(N, { omega, totalTime: T, levels: 4 }),
  }))
}

/**
 * Concept 16 — Monte-Carlo: for each trial evolve, then at each of N peeks sample a Born
 * outcome and collapse. Reports the fraction of trials where every peek saw raw.
 */
export function zenoMonteCarlo(
  N: number,
  trials = 2000,
  options: ZenoOptions = {},
  rng: Rng | number = 42,
): { N: number; trials: number; survived: number; fraction: number; finalRawFraction: number } {
  const { omega = 1, levels = 2 } = options
  const T = options.totalTime ?? Math.PI / omega
  const u = propagator(hamiltonianFor(levels, omega), T / N)
  const r = toRng(rng)
  let survived = 0
  let finalRaw = 0
  for (let t = 0; t < trials; t++) {
    let psi = basisVector(levels, 0)
    let alwaysRaw = true
    let outcome = 0
    for (let k = 0; k < N; k++) {
      psi = matvec(u, psi)
      outcome = sampleIndex(probabilities(psi), r)
      if (outcome !== 0) alwaysRaw = false
      psi = basisVector(levels, outcome)
    }
    if (alwaysRaw) survived++
    if (outcome === 0) finalRaw++
  }
  return { N, trials, survived, fraction: survived / trials, finalRawFraction: finalRaw / trials }
}
