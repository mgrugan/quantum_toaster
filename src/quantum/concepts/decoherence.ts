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

/** A Lindblad generator ρ ↦ dρ/dt with L†L and H_eff precomputed. */
export type LindbladGenerator = (rho: Matrix) => Matrix

/**
 * Build the Lindblad generator for H and jump operators Lₖ, written in the equivalent form
 *   dρ/dt = −i(H_eff ρ − ρ H_eff†) + Σₖ LₖρLₖ†,   H_eff = H − (i/2) Σₖ Lₖ†Lₖ.
 */
export function lindbladGenerator(h: Matrix, jumps: Matrix[]): LindbladGenerator {
  let sumLdL = zerosMatrix(h.length)
  for (const L of jumps) sumLdL = madd(sumLdL, matmul(dagger(L), L))
  const hEff = msub(h, mscale(sumLdL, { re: 0, im: 0.5 }))
  const hEffDagger = dagger(hEff)
  const pairs = jumps.map((L) => [L, dagger(L)] as const)
  const minusI = { re: 0, im: -1 }
  return (rho) => {
    let out = mscale(msub(matmul(hEff, rho), matmul(rho, hEffDagger)), minusI)
    for (const [L, Ld] of pairs) out = madd(out, matmul(matmul(L, rho), Ld))
    return out
  }
}

/** Right-hand side of the Lindblad equation dρ/dt (convenience wrapper). */
export const lindbladRhs = (rho: Matrix, h: Matrix, jumps: Matrix[]): Matrix => lindbladGenerator(h, jumps)(rho)

/** One classic RK4 step of dρ/dt = gen(ρ). */
export function rk4Step(rho: Matrix, gen: LindbladGenerator, dt: number): Matrix {
  const k1 = gen(rho)
  const k2 = gen(madd(rho, mscaleReal(k1, dt / 2)))
  const k3 = gen(madd(rho, mscaleReal(k2, dt / 2)))
  const k4 = gen(madd(rho, mscaleReal(k3, dt)))
  const incr = madd(madd(k1, mscaleReal(k2, 2)), madd(mscaleReal(k3, 2), k4))
  return madd(rho, mscaleReal(incr, dt / 6))
}

/** One RK4 step of the Lindblad equation for H and jump operators (convenience wrapper). */
export const lindbladStep = (rho: Matrix, h: Matrix, jumps: Matrix[], dt: number): Matrix => rk4Step(rho, lindbladGenerator(h, jumps), dt)

/** Number of RK4 sub-steps that keeps dt·(fastest rate) ≤ 0.1 (well inside RK4 stability). */
export const rk4Substeps = (dt: number, maxRate: number): number => Math.max(1, Math.ceil((dt * maxRate) / 0.1))

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
  steps = 100,
}: DecoherenceOptions = {}): { series: DecoherencePoint[]; finalRho: Matrix } {
  const h = donenessHamiltonian({ power })
  const jumps = [...dephasingOperators(dephasingRate, rho0.length)]
  if (dampingRate > 0) jumps.push(dampingOperator(dampingRate, rho0.length))
  const dt = tMax / steps
  const gen = lindbladGenerator(h, jumps)
  const sub = rk4Substeps(dt, Math.max(dephasingRate, dampingRate * rho0.length, power * 2))
  let rho = rho0
  const series: DecoherencePoint[] = []
  for (let k = 0; k <= steps; k++) {
    if (k > 0) for (let s = 0; s < sub; s++) rho = rk4Step(rho, gen, dt / sub)
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
