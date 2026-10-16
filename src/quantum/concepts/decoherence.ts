/**
 * Concept 15: decoherence. The slice is described by a density matrix ρ evolving under the
 * Lindblad master equation  dρ/dt = −i[H,ρ] + Σₖ (LₖρLₖ† − ½{Lₖ†Lₖ, ρ}).
 * Kitchen air "looks at" the doneness (dephasing Lₖ = √γ|k⟩⟨k|), killing off-diagonal
 * coherences, so purity Tr(ρ²) falls from 1 toward 1/4: quantum toast becomes classical.
 */
import { cabs } from '../complex'
import type { Matrix, Vector } from '../linalg'
import { dagger, madd, matmul, msub, mscale, mscaleReal, outer, trace, zerosMatrix } from '../linalg'
import { vonNeumannEntropy } from './entanglement'
import { donenessHamiltonian } from './evolution'
import { DONENESS_DIM, uniformSuperposition } from './state'

/** Purity Tr(ρ²): 1 for a pure state, 1/d for the maximally mixed state. */
export const purity = (rho: Matrix): number => trace(matmul(rho, rho)).re

/** l1-norm of coherence Σ_{i≠j} |ρᵢⱼ|. */
export function l1Coherence(rho: Matrix): number {
  let s = 0
  for (let i = 0; i < rho.length; i++) for (let j = 0; j < rho.length; j++) if (i !== j) s += cabs(rho[i][j])
  return s
}

/** Populations (diagonal of ρ). */
export const populations = (rho: Matrix): number[] => rho.map((row, i) => row[i].re)

/** Pure-state density matrix |ψ⟩⟨ψ|. */
export const pureDensityMatrix = (psi: Vector): Matrix => outer(psi, psi)

/** Dephasing jump operators Lₖ = √γ |k⟩⟨k| (off-diagonals decay at rate γ). */
export function dephasingOperators(gamma: number, dim = DONENESS_DIM): Matrix[] {
  return Array.from({ length: dim }, (_, k) => {
    const m = zerosMatrix(dim)
    m[k][k] = { re: Math.sqrt(gamma), im: 0 }
    return m
  })
}

/** Amplitude-damping ("cooling") jump operator L = √Γ·Σ √k |k−1⟩⟨k|. */
export function dampingOperator(rate: number, dim = DONENESS_DIM): Matrix {
  const m = zerosMatrix(dim)
  for (let k = 1; k < dim; k++) m[k - 1][k] = { re: Math.sqrt(rate * k), im: 0 }
  return m
}

/** Right-hand side of the Lindblad equation. */
export function lindbladRhs(rho: Matrix, h: Matrix, jumps: Matrix[]): Matrix {
  const comm = msub(matmul(h, rho), matmul(rho, h))
  let out = mscale(comm, { re: 0, im: -1 })
  for (const L of jumps) {
    const Ld = dagger(L)
    const LdL = matmul(Ld, L)
    const term = msub(matmul(matmul(L, rho), Ld), mscaleReal(madd(matmul(LdL, rho), matmul(rho, LdL)), 0.5))
    out = madd(out, term)
  }
  return out
}

/** One RK4 step of the Lindblad equation. */
export function lindbladStep(rho: Matrix, h: Matrix, jumps: Matrix[], dt: number): Matrix {
  const k1 = lindbladRhs(rho, h, jumps)
  const k2 = lindbladRhs(madd(rho, mscaleReal(k1, dt / 2)), h, jumps)
  const k3 = lindbladRhs(madd(rho, mscaleReal(k2, dt / 2)), h, jumps)
  const k4 = lindbladRhs(madd(rho, mscaleReal(k3, dt)), h, jumps)
  const incr = madd(madd(k1, mscaleReal(k2, 2)), madd(mscaleReal(k3, 2), k4))
  return madd(rho, mscaleReal(incr, dt / 6))
}

export interface DecoherenceOptions {
  /** Initial density matrix (default: |ψ⟩⟨ψ| of the equal doneness superposition). */
  rho0?: Matrix
  /** Heating drive Ω (default 0: pure dephasing so the decay is easy to see). */
  power?: number
  /** Dephasing rate γ. */
  dephasingRate?: number
  /** Optional amplitude-damping rate Γ. */
  dampingRate?: number
  tMax?: number
  steps?: number
}

export interface DecoherencePoint {
  t: number
  purity: number
  coherence: number
  entropy: number
  trace: number
  raw: number
  light: number
  golden: number
  burnt: number
}

/** Concept 15 — Lindblad time series of purity, coherence, entropy and populations. */
export function simulateDecoherence({
  rho0 = pureDensityMatrix(uniformSuperposition()),
  power = 0,
  dephasingRate = 0.5,
  dampingRate = 0,
  tMax = 8,
  steps = 160,
}: DecoherenceOptions = {}): { series: DecoherencePoint[]; finalRho: Matrix } {
  const h = donenessHamiltonian({ power })
  const jumps = [...dephasingOperators(dephasingRate, rho0.length)]
  if (dampingRate > 0) jumps.push(dampingOperator(dampingRate, rho0.length))
  const dt = tMax / steps
  const maxRate = Math.max(dephasingRate, dampingRate * rho0.length, power * 2, 1e-9)
  const sub = Math.max(1, Math.ceil((dt * maxRate) / 0.05))
  let rho = rho0
  const series: DecoherencePoint[] = []
  for (let k = 0; k <= steps; k++) {
    if (k > 0) for (let s = 0; s < sub; s++) rho = lindbladStep(rho, h, jumps, dt / sub)
    const p = populations(rho)
    series.push({
      t: k * dt,
      purity: purity(rho),
      coherence: l1Coherence(rho),
      entropy: vonNeumannEntropy(rho),
      trace: trace(rho).re,
      raw: p[0],
      light: p[1],
      golden: p[2],
      burnt: p[3] ?? 0,
    })
  }
  return { series, finalRho: rho }
}

/** Analytic pure-dephasing (H = 0) coherence decay: C(t) = C(0)·e^{−γt}. */
export const dephasedCoherence = (c0: number, gamma: number, t: number): number => c0 * Math.exp(-gamma * t)
