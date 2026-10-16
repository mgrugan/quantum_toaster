/**
 * Qubit toolkit: Pauli matrices, common gates, and helpers to lift gates onto
 * n-qubit registers. Qubit 0 is the most-significant (leftmost) bit, so the
 * basis index of |q0 q1 q2⟩ is q0·4 + q1·2 + q2.
 */
import type { Complex } from './complex'
import { abs2, cmul, conj } from './complex'
import type { Matrix, Vector } from './linalg'
import { fromReal, identity, kron, matvec, zerosMatrix } from './linalg'

const S = Math.SQRT1_2

/** Pauli X (bit flip / "flip the slice"). */
export const PAULI_X: Matrix = fromReal([
  [0, 1],
  [1, 0],
])
/** Pauli Y. */
export const PAULI_Y: Matrix = [
  [
    { re: 0, im: 0 },
    { re: 0, im: -1 },
  ],
  [
    { re: 0, im: 1 },
    { re: 0, im: 0 },
  ],
]
/** Pauli Z (phase flip; eigenbasis = "butter up / butter down"). */
export const PAULI_Z: Matrix = fromReal([
  [1, 0],
  [0, -1],
])
/** 2×2 identity. */
export const I2: Matrix = identity(2)
/** Hadamard gate: |0⟩ → (|0⟩+|1⟩)/√2. */
export const HADAMARD: Matrix = fromReal([
  [S, S],
  [S, -S],
])

/** Lift a single-qubit gate to act on `target` in an n-qubit register. */
export function gateOn(gate: Matrix, target: number, nQubits: number): Matrix {
  let m: Matrix = [[{ re: 1, im: 0 }]]
  for (let q = 0; q < nQubits; q++) m = kron(m, q === target ? gate : I2)
  return m
}

/** CNOT matrix (flip `target` iff `control` is 1) on an n-qubit register. */
export function cnotMatrix(control: number, target: number, nQubits: number): Matrix {
  const dim = 1 << nQubits
  const m = zerosMatrix(dim)
  for (let i = 0; i < dim; i++) {
    const cBit = (i >> (nQubits - 1 - control)) & 1
    const j = cBit ? i ^ (1 << (nQubits - 1 - target)) : i
    m[j][i] = { re: 1, im: 0 }
  }
  return m
}

/** Apply a single-qubit gate to a register state. */
export const applyGate = (state: Vector, gate: Matrix, target: number, nQubits: number): Vector =>
  matvec(gateOn(gate, target, nQubits), state)

/** Apply CNOT to a register state. */
export const applyCnot = (state: Vector, control: number, target: number, nQubits: number): Vector =>
  matvec(cnotMatrix(control, target, nQubits), state)

/** Single-qubit state from Bloch angles: cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩. */
export function qubitFromBloch(theta: number, phi = 0): Vector {
  return [
    { re: Math.cos(theta / 2), im: 0 },
    { re: Math.sin(theta / 2) * Math.cos(phi), im: Math.sin(theta / 2) * Math.sin(phi) },
  ]
}

/** Observable n̂·σ for a measurement axis at angle θ in the x–z plane: cosθ·Z + sinθ·X. */
export function spinObservable(theta: number): Matrix {
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  return fromReal([
    [c, s],
    [s, -c],
  ])
}

/** Fidelity |⟨a|b⟩|² between two pure states. */
export function fidelity(a: Vector, b: Vector): number {
  let re = 0
  let im = 0
  for (let i = 0; i < a.length; i++) {
    const p: Complex = cmul(conj(a[i]), b[i])
    re += p.re
    im += p.im
  }
  return abs2({ re, im })
}

/** Ket label for basis index i of an n-qubit register, e.g. "01". */
export const basisLabel = (i: number, nQubits: number): string => i.toString(2).padStart(nQubits, '0')

/** Reduced density matrix of qubit `q` from an n-qubit pure state (trace out the rest). */
export function singleQubitReducedDensity(state: Vector, q: number, nQubits: number): Matrix {
  const rho = zerosMatrix(2)
  const shift = nQubits - 1 - q
  for (let i = 0; i < state.length; i++)
    for (let j = 0; j < state.length; j++) {
      // Other qubits must match for the partial trace.
      if ((i & ~(1 << shift)) !== (j & ~(1 << shift))) continue
      const a = (i >> shift) & 1
      const b = (j >> shift) & 1
      const p = cmul(state[i], conj(state[j]))
      rho[a][b] = { re: rho[a][b].re + p.re, im: rho[a][b].im + p.im }
    }
  return rho
}

/** Fidelity ⟨ψ|ρ|ψ⟩ of a mixed state ρ with a pure target ψ. */
export function mixedFidelity(psi: Vector, rho: Matrix): number {
  const rp = matvec(rho, psi)
  let re = 0
  for (let i = 0; i < psi.length; i++) re += psi[i].re * rp[i].re + psi[i].im * rp[i].im
  return re
}
