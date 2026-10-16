/**
 * Concept 21: quantum teleportation. Alice holds the butter state |ψ⟩ (qubit 0) and half of a
 * Bell pair (qubit 1); Bob, in another kitchen, holds qubit 2. Alice does CNOT(0→1), H(0),
 * measures two bits (m₀, m₁) and phones them to Bob, who applies X^{m₁} then Z^{m₀}.
 * Bob ends with |ψ⟩ exactly (fidelity 1) — and Alice's copy is destroyed (no cloning).
 */
import { abs2 } from '../complex'
import type { Vector } from '../linalg'
import { basisVector, kronVector, matvec, normalize, probabilities } from '../linalg'
import { applyCnot, applyGate, basisLabel, fidelity, HADAMARD, PAULI_X, PAULI_Z, qubitFromBloch } from '../qubits'
import type { Rng } from '../rng'
import { sampleIndex, toRng } from '../rng'
import type { CircuitStep } from './entanglement'

export interface TeleportOutcome {
  m0: 0 | 1
  m1: 0 | 1
  probability: number
  /** Bob's qubit right after Alice's measurement (before correction). */
  bobBefore: Vector
  /** Correction Bob applies: 'I' | 'X' | 'Z' | 'ZX'. */
  correction: string
  bobAfter: Vector
  fidelityBefore: number
  fidelity: number
}

const record = (label: string, state: Vector): CircuitStep => ({
  label,
  state,
  probabilities: probabilities(state).map((p, i) => ({ basis: basisLabel(i, 3), probability: p })),
})

/** Run the unitary part of the protocol, returning each circuit step. */
export function teleportationCircuit(psi: Vector): CircuitStep[] {
  let s = kronVector(psi, basisVector(4, 0))
  const steps = [record('|ψ⟩|00⟩', s)]
  s = applyGate(s, HADAMARD, 1, 3)
  steps.push(record('H on q1', s))
  s = applyCnot(s, 1, 2, 3)
  steps.push(record('CNOT q1→q2 (Bell pair shared)', s))
  s = applyCnot(s, 0, 1, 3)
  steps.push(record('CNOT q0→q1', s))
  s = applyGate(s, HADAMARD, 0, 3)
  steps.push(record('H on q0', s))
  return steps
}

/** Bob's conditional state and correction for Alice's result (m₀, m₁). */
function outcomeFor(psi: Vector, preMeasure: Vector, m0: 0 | 1, m1: 0 | 1): TeleportOutcome {
  const base = m0 * 4 + m1 * 2
  const amps = [preMeasure[base], preMeasure[base + 1]]
  const probability = abs2(amps[0]) + abs2(amps[1])
  const bobBefore = normalize(amps)
  let bob = bobBefore
  if (m1) bob = matvec(PAULI_X, bob)
  if (m0) bob = matvec(PAULI_Z, bob)
  const correction = m0 && m1 ? 'ZX' : m0 ? 'Z' : m1 ? 'X' : 'I'
  return { m0, m1, probability, bobBefore, correction, bobAfter: bob, fidelityBefore: fidelity(psi, bobBefore), fidelity: fidelity(psi, bob) }
}

/** Concept 21 — all four measurement branches (each P = ¼) with Bob's corrected fidelity = 1. */
export function teleportationOutcomes(psi: Vector = qubitFromBloch(Math.PI / 3, Math.PI / 4)) {
  const steps = teleportationCircuit(psi)
  const pre = steps[steps.length - 1].state
  const outcomes: TeleportOutcome[] = []
  for (const m0 of [0, 1] as const) for (const m1 of [0, 1] as const) outcomes.push(outcomeFor(psi, pre, m0, m1))
  const averageFidelity = outcomes.reduce((s, o) => s + o.probability * o.fidelity, 0)
  return { input: psi, steps, outcomes, averageFidelity }
}

/** Concept 21 — one sampled run of the protocol (random measurement bits from the rng). */
export function teleport(psi: Vector, rng: Rng | number = 42): TeleportOutcome & { input: Vector; steps: CircuitStep[] } {
  const steps = teleportationCircuit(psi)
  const pre = steps[steps.length - 1].state
  const probs = [0, 1, 2, 3].map((k) => abs2(pre[k * 2]) + abs2(pre[k * 2 + 1]))
  const k = sampleIndex(probs, toRng(rng))
  const m0 = (k >> 1) as 0 | 1
  const m1 = (k & 1) as 0 | 1
  return { input: psi, steps, ...outcomeFor(psi, pre, m0, m1) }
}
