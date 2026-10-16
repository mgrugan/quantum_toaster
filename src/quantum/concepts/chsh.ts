/**
 * Concept 14: Bell / CHSH inequality. Measure each slice of the Bell pair along an angle in
 * the x–z plane. S = E(a,b) + E(a,b′) + E(a′,b) − E(a′,b′) reaches 2√2 quantum mechanically,
 * but any local-hidden-variable (LHV) toaster obeys |S| ≤ 2.
 */
import type { Vector } from '../linalg'
import { expectation, identity, kron, madd, mscaleReal } from '../linalg'
import { spinObservable } from '../qubits'
import type { Rng } from '../rng'
import { sampleIndex, toRng } from '../rng'
import { bellState } from './entanglement'

export interface ChshAngles {
  a: number
  aPrime: number
  b: number
  bPrime: number
}

/** Tsirelson-optimal angles for |Φ+⟩: a = 0, a′ = π/2, b = π/4, b′ = −π/4. */
export const OPTIMAL_CHSH_ANGLES: ChshAngles = { a: 0, aPrime: Math.PI / 2, b: Math.PI / 4, bPrime: -Math.PI / 4 }

/** Tsirelson bound 2√2. */
export const TSIRELSON_BOUND = 2 * Math.SQRT2

/** Concept 14 — quantum correlation E(a,b) = ⟨ψ|A(a)⊗B(b)|ψ⟩ (= cos(a−b) for Φ+). */
export const quantumCorrelation = (a: number, b: number, psi: Vector = bellState('phi+')): number =>
  expectation(kron(spinObservable(a), spinObservable(b)), psi)

/**
 * LHV model: hidden angle λ uniform on [0, 2π); A = sign cos(a−λ), B = sign cos(b−λ).
 * Its correlation is the "triangle" E = 1 − 2|a−b|/π (with |a−b| wrapped to [0, π]).
 */
export function lhvCorrelation(a: number, b: number): number {
  let d = Math.abs(a - b) % (2 * Math.PI)
  if (d > Math.PI) d = 2 * Math.PI - d
  return 1 - (2 * d) / Math.PI
}

const combine = (E: (x: number, y: number) => number, g: ChshAngles) => {
  const terms = { ab: E(g.a, g.b), abPrime: E(g.a, g.bPrime), aPrimeB: E(g.aPrime, g.b), aPrimeBPrime: E(g.aPrime, g.bPrime) }
  return { ...terms, S: terms.ab + terms.abPrime + terms.aPrimeB - terms.aPrimeBPrime }
}

/** Concept 14 — analytic S for quantum and LHV models at the given angles. */
export function chshValue(angles: ChshAngles = OPTIMAL_CHSH_ANGLES, psi: Vector = bellState('phi+')) {
  return {
    angles,
    quantum: combine((x, y) => quantumCorrelation(x, y, psi), angles),
    lhv: combine(lhvCorrelation, angles),
    classicalBound: 2,
    tsirelsonBound: TSIRELSON_BOUND,
  }
}

/** Concept 14 — E vs relative angle a−b: cosine (quantum) vs triangle (LHV). */
export function correlationCurve(points = 91): { x: number; quantum: number; lhv: number }[] {
  return Array.from({ length: points }, (_, i) => {
    const d = (Math.PI * i) / (points - 1)
    return { x: d, quantum: quantumCorrelation(0, d), lhv: lhvCorrelation(0, d) }
  })
}

/** Concept 14 — S(θ) for angles a=0, b=θ, a′=2θ, b′=−θ: quantum peaks at 2√2 when θ = π/4. */
export function chshAngleSweep(points = 91): { x: number; quantum: number; lhv: number }[] {
  return Array.from({ length: points }, (_, i) => {
    const t = (Math.PI * i) / (points - 1)
    const g = { a: 0, b: t, aPrime: 2 * t, bPrime: -t }
    const v = chshValue(g)
    return { x: t, quantum: v.quantum.S, lhv: v.lhv.S }
  })
}

/**
 * Born-rule joint outcome probabilities for settings (a, b):
 * P(A=α, B=β) = ⟨ψ|Π_α(a) ⊗ Π_β(b)|ψ⟩ with projectors Π_± = (1 ± n̂·σ)/2.
 * Order: [(+,+), (+,−), (−,+), (−,−)].
 */
export function jointOutcomeProbabilities(a: number, b: number, psi: Vector = bellState('phi+')): number[] {
  const proj = (theta: number, sgn: 1 | -1) => madd(identity(2), mscaleReal(spinObservable(theta), sgn)).map((row) => row.map((z) => ({ re: z.re / 2, im: z.im / 2 })))
  const out: number[] = []
  for (const sa of [1, -1] as const) for (const sb of [1, -1] as const) out.push(expectation(kron(proj(a, sa), proj(b, sb)), psi))
  return out
}

export interface ChshExperiment {
  shotsPerSetting: number
  /** Sampled correlations for (a,b), (a,b′), (a′,b), (a′,b′). */
  correlations: { ab: number; abPrime: number; aPrimeB: number; aPrimeBPrime: number }
  S: number
  /** Standard error of S. */
  stdError: number
}

/**
 * Concept 14 — simulated lab run. `model: 'quantum'` samples from Born-rule joint
 * probabilities of the Bell state; `model: 'lhv'` draws a hidden λ per pair and uses
 * deterministic local responses.
 */
export function runChshExperiment(
  shotsPerSetting = 2000,
  model: 'quantum' | 'lhv' = 'quantum',
  angles: ChshAngles = OPTIMAL_CHSH_ANGLES,
  rng: Rng | number = 42,
): ChshExperiment {
  const r = toRng(rng)
  const sign = (v: number) => (v >= 0 ? 1 : -1)
  const run = (a: number, b: number) => {
    let sum = 0
    const probs = jointOutcomeProbabilities(a, b)
    const products = [1, -1, -1, 1]
    for (let s = 0; s < shotsPerSetting; s++) {
      if (model === 'quantum') {
        sum += products[sampleIndex(probs, r)]
      } else {
        const lambda = 2 * Math.PI * r()
        sum += sign(Math.cos(a - lambda)) * sign(Math.cos(b - lambda))
      }
    }
    return sum / shotsPerSetting
  }
  const correlations = {
    ab: run(angles.a, angles.b),
    abPrime: run(angles.a, angles.bPrime),
    aPrimeB: run(angles.aPrime, angles.b),
    aPrimeBPrime: run(angles.aPrime, angles.bPrime),
  }
  const S = correlations.ab + correlations.abPrime + correlations.aPrimeB - correlations.aPrimeBPrime
  const variance = Object.values(correlations).reduce((s, e) => s + (1 - e * e) / shotsPerSetting, 0)
  return { shotsPerSetting, correlations, S, stdError: Math.sqrt(variance) }
}
