/**
 * Concept 18: no-cloning. A CNOT "copier" maps |0⟩|0⟩→|00⟩ and |1⟩|0⟩→|11⟩ perfectly, but by
 * linearity it turns α|0⟩+β|1⟩ into the entangled α|00⟩+β|11⟩, not (α|0⟩+β|1⟩)⊗². The best
 * universal (state-independent) copier, Bužek–Hillery, reaches single-copy fidelity 5/6.
 */
import type { Vector } from '../linalg'
import { basisVector, kronVector, normalize } from '../linalg'
import { applyCnot, fidelity, mixedFidelity, qubitFromBloch, singleQubitReducedDensity } from '../qubits'

export interface CloneResult {
  /** Bloch polar angle θ of the input toast state. */
  theta: number
  phi: number
  /** Fidelity of the copy (qubit B) with the original input ⟨ψ|ρ_B|ψ⟩. */
  copyFidelity: number
  /** Fidelity of what's left in the original slot (qubit A). */
  originalFidelity: number
  /** |⟨ψψ|out⟩|² — overlap of the 2-slice output with the ideal |ψ⟩|ψ⟩ (CNOT only). */
  jointFidelity?: number
}

/** Concept 18 — CNOT copier: input |ψ⟩⊗|blank=0⟩ → CNOT. Perfect only at θ = 0, π. */
export function cnotCloner(theta: number, phi = 0): CloneResult {
  const psi = qubitFromBloch(theta, phi)
  const out = applyCnot(kronVector(psi, basisVector(2, 0)), 0, 1, 2)
  return {
    theta,
    phi,
    copyFidelity: mixedFidelity(psi, singleQubitReducedDensity(out, 1, 2)),
    originalFidelity: mixedFidelity(psi, singleQubitReducedDensity(out, 0, 2)),
    jointFidelity: fidelity(kronVector(psi, psi), out),
  }
}

const r23 = Math.sqrt(2 / 3)
const r16 = Math.sqrt(1 / 6)
/**
 * Bužek–Hillery universal cloner as an isometry on (input, blank, ancilla):
 *   |0⟩ → √(2/3)|00⟩|0⟩ + √(1/6)(|01⟩+|10⟩)|1⟩
 *   |1⟩ → √(2/3)|11⟩|1⟩ + √(1/6)(|01⟩+|10⟩)|0⟩
 */
const BH_OUT: [Vector, Vector] = [
  normalize(
    [r23, 0, 0, r16, 0, r16, 0, 0].map((re) => ({ re, im: 0 })), // |000⟩, |011⟩, |101⟩
  ),
  normalize(
    [0, 0, r16, 0, r16, 0, 0, r23].map((re) => ({ re, im: 0 })), // |010⟩, |100⟩, |111⟩
  ),
]

/** Concept 18 — optimal universal cloner: copyFidelity = originalFidelity = 5/6 for every input. */
export function buzekHilleryCloner(theta: number, phi = 0): CloneResult {
  const psi = qubitFromBloch(theta, phi)
  const out = BH_OUT[0].map((z0, i) => {
    const z1 = BH_OUT[1][i]
    const a = psi[0]
    const b = psi[1]
    return {
      re: a.re * z0.re - a.im * z0.im + b.re * z1.re - b.im * z1.im,
      im: a.re * z0.im + a.im * z0.re + b.re * z1.im + b.im * z1.re,
    }
  })
  return {
    theta,
    phi,
    copyFidelity: mixedFidelity(psi, singleQubitReducedDensity(out, 1, 3)),
    originalFidelity: mixedFidelity(psi, singleQubitReducedDensity(out, 0, 3)),
  }
}

/** Optimal universal 1→2 qubit cloning fidelity. */
export const OPTIMAL_CLONE_FIDELITY = 5 / 6

/**
 * Concept 18 — fidelity vs Bloch angle θ ∈ [0, π]: CNOT copier (1 at poles, ½ at the equator)
 * vs Bužek–Hillery (flat 5/6). x = θ.
 */
export function cloningFidelityCurve(points = 61): { x: number; cnotCopy: number; cnotJoint: number; buzekHillery: number; optimal: number }[] {
  return Array.from({ length: points }, (_, i) => {
    const theta = (Math.PI * i) / (points - 1)
    const c = cnotCloner(theta)
    return {
      x: theta,
      cnotCopy: c.copyFidelity,
      cnotJoint: c.jointFidelity ?? 0,
      buzekHillery: buzekHilleryCloner(theta).copyFidelity,
      optimal: OPTIMAL_CLONE_FIDELITY,
    }
  })
}
