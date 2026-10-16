/**
 * Concept 7: observables and expectation values ⟨A⟩ = ⟨ψ|A|ψ⟩, with variance ⟨A²⟩ − ⟨A⟩².
 */
import type { Matrix, Vector } from '../linalg'
import { diag, expectation, matmul } from '../linalg'
import { DONENESS_ENERGIES } from './quantization'

/** Doneness operator D = diag(0, 1, 2, 3): raw = 0 … burnt = 3. */
export const DONENESS_OPERATOR: Matrix = diag([0, 1, 2, 3])
/** Energy operator H₀ = diag(Eₙ) using the box energies of each level. */
export const ENERGY_OPERATOR: Matrix = diag([...DONENESS_ENERGIES])

export interface ObservableStats {
  mean: number
  variance: number
  stdDev: number
}

/** Concept 7 — ⟨A⟩, Var(A) and ΔA for Hermitian A in state ψ. */
export function observableStats(a: Matrix, psi: Vector): ObservableStats {
  const mean = expectation(a, psi)
  const variance = Math.max(0, expectation(matmul(a, a), psi) - mean * mean)
  return { mean, variance, stdDev: Math.sqrt(variance) }
}

/** Concept 7 — live readouts: ⟨doneness⟩ (0..3) and ⟨energy⟩ with spreads. */
export function donenessReadout(psi: Vector): { doneness: ObservableStats; energy: ObservableStats } {
  return { doneness: observableStats(DONENESS_OPERATOR, psi), energy: observableStats(ENERGY_OPERATOR, psi) }
}
