/**
 * Concept 17: Pauli exclusion. Two identical slices in the slot (a box of width L):
 *   ψ_±(x₁,x₂) = [φₐ(x₁)φ_b(x₂) ± φ_b(x₁)φₐ(x₂)] / √2
 * Bosons (+) are symmetric and bunch; fermions (−) are antisymmetric, vanish on the
 * diagonal ψ(x,x) = 0, and putting both in the same state gives the zero vector.
 */
import { particleInBoxEnergy, particleInBoxPsi } from './quantization'
import { linspace } from '../types'

export type ExchangeSymmetry = 'boson' | 'fermion' | 'distinguishable'

export interface TwoParticleOptions {
  /** Quantum number of the first single-particle state (box level n ≥ 1). */
  n1?: number
  /** Quantum number of the second single-particle state. */
  n2?: number
  symmetry?: ExchangeSymmetry
  /** Grid points per axis. */
  gridSize?: number
  /** Box width. */
  L?: number
}

export interface TwoParticleResult {
  symmetry: ExchangeSymmetry
  n1: number
  n2: number
  /** Grid coordinates (same for x₁ and x₂). */
  xs: number[]
  /** ψ(x₁,x₂) as psi[i][j] = ψ(xs[i], xs[j]) (normalized when possible). */
  psi: number[][]
  /** |ψ|², ready for a heatmap. */
  density: number[][]
  /** ∫∫|ψ|² of the (anti)symmetrized combination *before* normalization: 0 means "forbidden". */
  rawNorm: number
  /** False when the state is the zero vector (two fermions in the same state). */
  allowed: boolean
  /** max |ψ(x,x)| on the diagonal (0 for fermions). */
  diagonalMax: number
  /** Probability the two slices are within L/10 of each other. */
  closeProbability: number
  /** Total energy E_{n1} + E_{n2}. */
  energy: number
}

/** Concept 17 — two-particle wavefunction on a 2D grid with chosen exchange symmetry. */
export function twoParticleWavefunction({
  n1 = 1,
  n2 = 2,
  symmetry = 'fermion',
  gridSize = 41,
  L = Math.PI,
}: TwoParticleOptions = {}): TwoParticleResult {
  const xs = linspace(0, L, gridSize)
  const dx = xs[1] - xs[0]
  const sign = symmetry === 'boson' ? 1 : -1
  const raw = xs.map((x1) =>
    xs.map((x2) => {
      const direct = particleInBoxPsi(n1, x1, L) * particleInBoxPsi(n2, x2, L)
      if (symmetry === 'distinguishable') return direct
      return (direct + sign * particleInBoxPsi(n2, x1, L) * particleInBoxPsi(n1, x2, L)) / Math.SQRT2
    }),
  )
  const rawNorm = raw.reduce((s, row) => s + row.reduce((t, v) => t + v * v, 0), 0) * dx * dx
  const allowed = rawNorm > 1e-10
  const scale = allowed ? 1 / Math.sqrt(rawNorm) : 0
  const psi = raw.map((row) => row.map((v) => v * scale))
  const density = psi.map((row) => row.map((v) => v * v))
  let diagonalMax = 0
  let close = 0
  for (let i = 0; i < gridSize; i++) {
    diagonalMax = Math.max(diagonalMax, Math.abs(psi[i][i]))
    for (let j = 0; j < gridSize; j++) if (Math.abs(xs[i] - xs[j]) < L / 10) close += density[i][j] * dx * dx
  }
  return {
    symmetry,
    n1,
    n2,
    xs,
    psi,
    density,
    rawNorm,
    allowed,
    diagonalMax,
    closeProbability: close,
    energy: particleInBoxEnergy(n1, L) + particleInBoxEnergy(n2, L),
  }
}

/**
 * Concept 17 — try to put both slices in the same slot state n:
 * bosons are fine, fermions give a zero-norm (impossible) state.
 */
export function sameStateAttempt(n = 1, gridSize = 41) {
  const fermion = twoParticleWavefunction({ n1: n, n2: n, symmetry: 'fermion', gridSize })
  const boson = twoParticleWavefunction({ n1: n, n2: n, symmetry: 'boson', gridSize })
  return {
    n,
    fermionNorm: fermion.rawNorm,
    fermionAllowed: fermion.allowed,
    bosonNorm: boson.rawNorm,
    bosonAllowed: boson.allowed,
  }
}

/**
 * Concept 17 — lowest two-particle energy: bosons both sit in n = 1 (2E₁), fermions are forced
 * into n = 1 and n = 2 (E₁ + E₂). This "exclusion pressure" is why matter is rigid.
 */
export function twoParticleGroundState(symmetry: ExchangeSymmetry, L = Math.PI) {
  const levels: [number, number] = symmetry === 'fermion' ? [1, 2] : [1, 1]
  return { symmetry, levels, energy: particleInBoxEnergy(levels[0], L) + particleInBoxEnergy(levels[1], L) }
}
