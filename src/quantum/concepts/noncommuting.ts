/**
 * Concept 9: non-commuting observables. [σz, σx] = 2iσy ≠ 0, so the order of measurements
 * changes the statistics. Toaster: "butter side" = σz, "crust orientation" = σx.
 */
import { abs2 } from '../complex'
import type { Matrix, Vector } from '../linalg'
import { commutator, inner, maxAbs, mscale, msub } from '../linalg'
import { PAULI_X, PAULI_Y, PAULI_Z, qubitFromBloch } from '../qubits'
import type { Rng } from '../rng'
import { sampleIndex, toRng } from '../rng'

export type PauliAxis = 'x' | 'y' | 'z'

const S = Math.SQRT1_2
/** Eigenvectors for eigenvalues [+1, −1] of each Pauli observable. */
export const PAULI_EIGENBASIS: Record<PauliAxis, [Vector, Vector]> = {
  z: [
    [{ re: 1, im: 0 }, { re: 0, im: 0 }],
    [{ re: 0, im: 0 }, { re: 1, im: 0 }],
  ],
  x: [
    [{ re: S, im: 0 }, { re: S, im: 0 }],
    [{ re: S, im: 0 }, { re: -S, im: 0 }],
  ],
  y: [
    [{ re: S, im: 0 }, { re: 0, im: S }],
    [{ re: S, im: 0 }, { re: 0, im: -S }],
  ],
}

/** Concept 9 — [σz, σx], compared with the textbook 2iσy. */
export function commutatorDemo(): { commutator: Matrix; expected: Matrix; matches: boolean; commutes: boolean } {
  const c = commutator(PAULI_Z, PAULI_X)
  const expected = mscale(PAULI_Y, { re: 0, im: 2 })
  return { commutator: c, expected, matches: maxAbs(msub(c, expected)) < 1e-12, commutes: maxAbs(c) < 1e-12 }
}

/** One joint outcome of two sequential measurements (eigenvalues ±1). */
export interface SequentialOutcome {
  first: 1 | -1
  second: 1 | -1
  probability: number
}

export interface SequentialResult {
  /** e.g. "z→x" */
  order: string
  outcomes: SequentialOutcome[]
  /** P(first = +1), P(first = −1) */
  firstMarginal: { plus: number; minus: number }
  /** P(second = +1), P(second = −1) */
  secondMarginal: { plus: number; minus: number }
}

/**
 * Concept 9 — analytic statistics of measuring axis A then axis B on a qubit:
 * P(a, b) = |⟨b|a⟩|²·|⟨a|ψ⟩|² (Born rule + collapse between the two).
 */
export function sequentialMeasurement(psi: Vector, first: PauliAxis, second: PauliAxis): SequentialResult {
  const outcomes: SequentialOutcome[] = []
  const eig = [1, -1] as const
  PAULI_EIGENBASIS[first].forEach((a, i) => {
    const pa = abs2(inner(a, psi))
    PAULI_EIGENBASIS[second].forEach((b, j) => {
      outcomes.push({ first: eig[i], second: eig[j], probability: pa * abs2(inner(b, a)) })
    })
  })
  const sum = (f: (o: SequentialOutcome) => boolean) => outcomes.filter(f).reduce((s, o) => s + o.probability, 0)
  return {
    order: `${first}→${second}`,
    outcomes,
    firstMarginal: { plus: sum((o) => o.first === 1), minus: sum((o) => o.first === -1) },
    secondMarginal: { plus: sum((o) => o.second === 1), minus: sum((o) => o.second === -1) },
  }
}

/**
 * Concept 9 — compare orders for a butter state at Bloch angles (θ, φ).
 * Default θ = 0 (butter-up |0⟩): Z alone gives +1 always, but X-then-Z gives 50/50.
 */
export function measurementOrderComparison(theta = 0, phi = 0) {
  const psi = qubitFromBloch(theta, phi)
  const zThenX = sequentialMeasurement(psi, 'z', 'x')
  const xThenZ = sequentialMeasurement(psi, 'x', 'z')
  const zDirect = {
    plus: abs2(inner(PAULI_EIGENBASIS.z[0], psi)),
    minus: abs2(inner(PAULI_EIGENBASIS.z[1], psi)),
  }
  return { theta, phi, zThenX, xThenZ, zDirect, zAfterX: xThenZ.secondMarginal }
}

/** Concept 9 — Monte-Carlo version: counts of the four joint outcomes over `shots` runs. */
export function sampleSequential(
  psi: Vector,
  first: PauliAxis,
  second: PauliAxis,
  shots = 1000,
  rng: Rng | number = 42,
): { order: string; shots: number; counts: { first: 1 | -1; second: 1 | -1; count: number; frequency: number }[] } {
  const r = toRng(rng)
  const analytic = sequentialMeasurement(psi, first, second)
  const probs = analytic.outcomes.map((o) => o.probability)
  const counts = new Array<number>(4).fill(0)
  for (let s = 0; s < shots; s++) counts[sampleIndex(probs, r)]++
  return {
    order: analytic.order,
    shots,
    counts: analytic.outcomes.map((o, i) => ({ first: o.first, second: o.second, count: counts[i], frequency: counts[i] / shots })),
  }
}
