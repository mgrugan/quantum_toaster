/**
 * Concept 13: entanglement. A two-slice toaster runs H on slice A then CNOT(A→B), turning
 * |00⟩ into the Bell pair (|00⟩+|11⟩)/√2: each slice alone is maximally uncertain, but the
 * two always agree. Qubit value 0 = "raw", 1 = "golden".
 */
import { abs2, cmul, csub } from '../complex'
import type { Matrix, Vector } from '../linalg'
import { basisVector, eigenvaluesHermitian, kronVector, outer, partialTrace, probabilities } from '../linalg'
import { applyCnot, applyGate, basisLabel, HADAMARD, PAULI_X } from '../qubits'
import type { Rng } from '../rng'
import { sampleIndex, toRng } from '../rng'

export type BellName = 'phi+' | 'phi-' | 'psi+' | 'psi-'

/** A labelled step in a gate circuit (for a circuit / amplitude visual). */
export interface CircuitStep {
  label: string
  state: Vector
  probabilities: { basis: string; probability: number }[]
}

const step = (label: string, state: Vector, n: number): CircuitStep => ({
  label,
  state,
  probabilities: probabilities(state).map((p, i) => ({ basis: basisLabel(i, n), probability: p })),
})

/**
 * Concept 13 — build a Bell state with real gates: start from |00⟩ (Φ±) or |01⟩ (Ψ±),
 * apply Z for the "−" variants, then H on qubit 0 and CNOT(0→1). Returns every step.
 */
export function bellCircuit(which: BellName = 'phi+'): CircuitStep[] {
  const flipB = which === 'psi+' || which === 'psi-'
  const minus = which === 'phi-' || which === 'psi-'
  let s = basisVector(4, flipB ? 1 : 0)
  const steps = [step(flipB ? '|01⟩' : '|00⟩', s, 2)]
  if (minus) {
    s = applyGate(s, PAULI_X, 0, 2)
    steps.push(step('X on A', s, 2))
  }
  s = applyGate(s, HADAMARD, 0, 2)
  steps.push(step('H on A', s, 2))
  s = applyCnot(s, 0, 1, 2)
  steps.push(step('CNOT A→B', s, 2))
  return steps
}

/** Concept 13 — the final Bell state vector. */
export const bellState = (which: BellName = 'phi+'): Vector => {
  const steps = bellCircuit(which)
  return steps[steps.length - 1].state
}

/** Product state |a⟩⊗|b⟩ (unentangled, for comparison). */
export const productState = (a: Vector, b: Vector): Vector => kronVector(a, b)

/** Density matrix ρ = |ψ⟩⟨ψ|. */
export const densityMatrix = (psi: Vector): Matrix => outer(psi, psi)

/** Reduced density matrix of one slice: ρ_A = Tr_B |ψ⟩⟨ψ| (keep 0) or ρ_B (keep 1). */
export const reducedDensityMatrix = (psi: Vector, keep: 0 | 1 = 0): Matrix => partialTrace(densityMatrix(psi), 2, 2, keep)

/** Von Neumann entropy S(ρ) = −Σ λ log₂ λ (bits). */
export function vonNeumannEntropy(rho: Matrix): number {
  return eigenvaluesHermitian(rho).reduce((s, l) => (l > 1e-12 ? s - l * Math.log2(l) : s), 0)
}

/** Concept 13 — entanglement entropy of a two-qubit pure state: 0 (product) … 1 bit (Bell). */
export const entanglementEntropy = (psi: Vector): number => vonNeumannEntropy(reducedDensityMatrix(psi, 0))

/** Concurrence C = 2|αδ − βγ| for |ψ⟩ = α|00⟩+β|01⟩+γ|10⟩+δ|11⟩ (0 product … 1 Bell). */
export const concurrence = (psi: Vector): number => 2 * Math.sqrt(abs2(csub(cmul(psi[0], psi[3]), cmul(psi[1], psi[2]))))

export interface JointSampleResult {
  shots: number
  /** Counts keyed by outcome "00" | "01" | "10" | "11". */
  counts: Record<string, number>
  /** Same counts as an ordered array for bar charts. */
  outcomes: { basis: string; count: number; frequency: number; expected: number }[]
  /** Fraction of shots where both slices agree. */
  agreement: number
  /** Sampled ⟨Z_A Z_B⟩ (+1 = perfectly correlated). */
  correlation: number
  /** Marginal P(A = 0) — stays ½ for a Bell pair: no signalling. */
  marginalA0: number
  /** A sample of the first few individual runs, e.g. ["00","11",...]. */
  firstRuns: string[]
}

/** Concept 13 — measure both slices in the doneness (Z) basis `shots` times. */
export function sampleJointMeasurements(psi: Vector, shots = 1000, rng: Rng | number = 42): JointSampleResult {
  const r = toRng(rng)
  const probs = probabilities(psi)
  const counts: Record<string, number> = { '00': 0, '01': 0, '10': 0, '11': 0 }
  const firstRuns: string[] = []
  for (let s = 0; s < shots; s++) {
    const label = basisLabel(sampleIndex(probs, r), 2)
    counts[label]++
    if (firstRuns.length < 20) firstRuns.push(label)
  }
  const agree = counts['00'] + counts['11']
  return {
    shots,
    counts,
    outcomes: ['00', '01', '10', '11'].map((b, i) => ({ basis: b, count: counts[b], frequency: counts[b] / shots, expected: probs[i] })),
    agreement: agree / shots,
    correlation: (agree - counts['01'] - counts['10']) / shots,
    marginalA0: (counts['00'] + counts['01']) / shots,
    firstRuns,
  }
}

/** Analytic ⟨Z⊗Z⟩ for comparison with sampled correlation. */
export function zzCorrelation(psi: Vector): number {
  const p = probabilities(psi)
  return p[0] - p[1] - p[2] + p[3]
}

