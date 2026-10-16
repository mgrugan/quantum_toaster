/**
 * Concept 10: spin-½ and the Bloch sphere. The butter side is a spin; in the coil's magnetic
 * field B it precesses (Larmor precession) at ω_L = γ|B| under H = (ω_L/2)·n̂·σ.
 */
import type { Matrix, Vector } from '../linalg'
import { expectation, madd, matvec, mscaleReal, propagator } from '../linalg'
import { PAULI_X, PAULI_Y, PAULI_Z, qubitFromBloch } from '../qubits'

export interface Vec3 {
  x: number
  y: number
  z: number
}

/** Concept 10 — Bloch vector (⟨σx⟩, ⟨σy⟩, ⟨σz⟩) of a qubit state; |r| = 1 for pure states. */
export const blochVector = (psi: Vector): Vec3 => ({
  x: expectation(PAULI_X, psi),
  y: expectation(PAULI_Y, psi),
  z: expectation(PAULI_Z, psi),
})

/** Bloch angles (θ, φ) of a pure qubit state. */
export function blochAngles(psi: Vector): { theta: number; phi: number } {
  const r = blochVector(psi)
  return { theta: Math.acos(Math.max(-1, Math.min(1, r.z))), phi: Math.atan2(r.y, r.x) }
}

/** Spin Hamiltonian H = (γ/2)·B·σ. */
export function spinHamiltonian(field: Vec3, gamma = 1): Matrix {
  return mscaleReal(madd(madd(mscaleReal(PAULI_X, field.x), mscaleReal(PAULI_Y, field.y)), mscaleReal(PAULI_Z, field.z)), gamma / 2)
}

export interface LarmorOptions {
  /** Initial Bloch polar angle (default π/2: butter edge-on). */
  theta?: number
  /** Initial azimuth. */
  phi?: number
  /** Magnetic field vector (default ẑ). */
  field?: Vec3
  gamma?: number
  /** Default: two Larmor periods. */
  tMax?: number
  steps?: number
}

export interface LarmorResult {
  larmorFrequency: number
  period: number
  series: ({ t: number } & Vec3)[]
}

/** Concept 10 — time series of the Bloch vector precessing about B. */
export function larmorPrecession({
  theta = Math.PI / 2,
  phi = 0,
  field = { x: 0, y: 0, z: 1 },
  gamma = 1,
  tMax,
  steps = 120,
}: LarmorOptions = {}): LarmorResult {
  const omega = gamma * Math.hypot(field.x, field.y, field.z)
  const period = omega > 0 ? (2 * Math.PI) / omega : Infinity
  const T = tMax ?? (omega > 0 ? 2 * period : 10)
  const dt = T / steps
  const u = propagator(spinHamiltonian(field, gamma), dt)
  let psi = qubitFromBloch(theta, phi)
  const series: ({ t: number } & Vec3)[] = []
  for (let k = 0; k <= steps; k++) {
    if (k > 0) psi = matvec(u, psi)
    series.push({ t: k * dt, ...blochVector(psi) })
  }
  return { larmorFrequency: omega, period, series }
}
