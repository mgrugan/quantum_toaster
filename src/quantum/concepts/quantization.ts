/**
 * Concepts 4–5: energy quantization and zero-point energy.
 * The heating coil is a particle in a box (Eₙ ∝ n²); the crumb tray is a harmonic oscillator.
 */
import type { Point } from '../types'
import { linspace } from '../types'

// ---------------------------------------------------------------- 4. particle in a box

/** Concept 4 — Eₙ = n²π²/(2mL²) for a particle in an infinite well of width L (n = 1, 2, …). */
export const particleInBoxEnergy = (n: number, L = Math.PI, m = 1): number => (n * n * Math.PI * Math.PI) / (2 * m * L * L)

/**
 * Doneness level energies: levels raw/light/golden/burnt are box eigenstates n = 1..4 with
 * L = π, m = 1, so E = [0.5, 2, 4.5, 8].
 */
export const DONENESS_ENERGIES: readonly number[] = [1, 2, 3, 4].map((n) => particleInBoxEnergy(n))

/** Box eigenfunction ψₙ(x) = √(2/L)·sin(nπx/L) on [0, L]. */
export const particleInBoxPsi = (n: number, x: number, L = Math.PI): number =>
  x < 0 || x > L ? 0 : Math.sqrt(2 / L) * Math.sin((n * Math.PI * x) / L)

/** Energy-level ladder for charts: [{ n, energy }]. */
export const particleInBoxLevels = (nMax = 4, L = Math.PI, m = 1): { n: number; energy: number }[] =>
  Array.from({ length: nMax }, (_, i) => ({ n: i + 1, energy: particleInBoxEnergy(i + 1, L, m) }))

/** Sampled eigenfunction for plotting: ψₙ(x) (or |ψₙ|² when `density`). */
export function particleInBoxWavefunction(n: number, L = Math.PI, points = 101, density = false): Point[] {
  return linspace(0, L, points).map((x) => {
    const psi = particleInBoxPsi(n, x, L)
    return { x, y: density ? psi * psi : psi }
  })
}

/**
 * Lowest eigenvalues of a discretized 1D Hamiltonian H = −(1/2m)d²/dx² + V(x) with ψ = 0 at
 * both ends (finite differences → symmetric tridiagonal → Sturm-sequence bisection).
 * Shows that quantization *emerges* from the boundary conditions.
 */
export function numericSpectrum(
  potential: (x: number) => number,
  xMin: number,
  xMax: number,
  nLevels = 4,
  gridPoints = 400,
  m = 1,
): number[] {
  const N = gridPoints
  const dx = (xMax - xMin) / (N + 1)
  const t = 1 / (2 * m * dx * dx)
  const d = Array.from({ length: N }, (_, i) => 2 * t + potential(xMin + (i + 1) * dx))
  const e2 = t * t // all off-diagonals are −t
  const countBelow = (lambda: number): number => {
    let count = 0
    let q = d[0] - lambda
    if (q < 0) count++
    for (let i = 1; i < N; i++) {
      q = d[i] - lambda - e2 / (q === 0 ? 1e-300 : q)
      if (q < 0) count++
    }
    return count
  }
  let hi = Math.max(...d) + 2 * t
  const lo = Math.min(...d) - 2 * t
  hi = Math.max(hi, lo + 1)
  const out: number[] = []
  for (let k = 0; k < nLevels; k++) {
    let a = lo
    let b = hi
    for (let it = 0; it < 100 && b - a > 1e-12 * Math.max(1, Math.abs(b)); it++) {
      const mid = (a + b) / 2
      if (countBelow(mid) > k) b = mid
      else a = mid
    }
    out.push((a + b) / 2)
  }
  return out
}

/** Concept 4 — analytic vs finite-difference box energies, [{ n, analytic, numeric }]. */
export function boxSpectrumComparison(nLevels = 4, L = Math.PI, m = 1, gridPoints = 400) {
  const numeric = numericSpectrum(() => 0, 0, L, nLevels, gridPoints, m)
  return numeric.map((num, i) => ({ n: i + 1, analytic: particleInBoxEnergy(i + 1, L, m), numeric: num }))
}

// ---------------------------------------------------------------- 5. harmonic oscillator

/** Concept 5 — Eₙ = ω(n + ½) for the harmonic oscillator (n = 0, 1, …). */
export const harmonicEnergy = (n: number, omega = 1): number => omega * (n + 0.5)

/** Concept 5 — zero-point energy E₀ = ω/2: the crumb tray is never at rest. */
export const zeroPointEnergy = (omega = 1): number => omega / 2

/** Oscillator ladder [{ n, energy }]. */
export const harmonicLevels = (nMax = 5, omega = 1): { n: number; energy: number }[] =>
  Array.from({ length: nMax }, (_, n) => ({ n, energy: harmonicEnergy(n, omega) }))

/**
 * Normalized oscillator eigenfunction ψₙ(x) via the stable recursion
 * ψₙ₊₁ = √(2/(n+1))·ξψₙ − √(n/(n+1))·ψₙ₋₁, ξ = √(mω)·x.
 */
export function harmonicPsi(n: number, x: number, omega = 1, m = 1): number {
  const xi = Math.sqrt(m * omega) * x
  let prev = 0
  let cur = Math.pow((m * omega) / Math.PI, 0.25) * Math.exp((-xi * xi) / 2)
  for (let k = 0; k < n; k++) {
    const next = Math.sqrt(2 / (k + 1)) * xi * cur - Math.sqrt(k / (k + 1)) * prev
    prev = cur
    cur = next
  }
  return cur
}

/** Sampled oscillator eigenfunction for plotting (or |ψ|² with `density`). */
export function harmonicWavefunction(n = 0, omega = 1, m = 1, points = 121, xRange = 5, density = false): Point[] {
  return linspace(-xRange, xRange, points).map((x) => {
    const psi = harmonicPsi(n, x, omega, m)
    return { x, y: density ? psi * psi : psi }
  })
}

/**
 * Concept 5 — numerically evaluate ⟨T⟩, ⟨V⟩ and ⟨H⟩ for oscillator eigenstate n on a grid.
 * For n = 0 this returns ⟨H⟩ ≈ ω/2 with ⟨T⟩ = ⟨V⟩ = ω/4 (virial theorem).
 */
export function harmonicEnergyNumeric(n = 0, omega = 1, m = 1, points = 2001, xRange = 10) {
  const xs = linspace(-xRange, xRange, points)
  const dx = xs[1] - xs[0]
  const psi = xs.map((x) => harmonicPsi(n, x, omega, m))
  let kinetic = 0
  let potential = 0
  for (let i = 1; i < points - 1; i++) {
    const d2 = (psi[i + 1] - 2 * psi[i] + psi[i - 1]) / (dx * dx)
    kinetic += psi[i] * (-d2 / (2 * m)) * dx
    potential += psi[i] * psi[i] * 0.5 * m * omega * omega * xs[i] * xs[i] * dx
  }
  return { n, kinetic, potential, total: kinetic + potential, analytic: harmonicEnergy(n, omega) }
}

/** Potential curve V(x) = ½mω²x² for plotting under the wavefunctions. */
export const harmonicPotential = (omega = 1, m = 1, points = 121, xRange = 5): Point[] =>
  linspace(-xRange, xRange, points).map((x) => ({ x, y: 0.5 * m * omega * omega * x * x }))

/** Concept 5 — analytic vs finite-difference oscillator spectrum [{ n, analytic, numeric }]. */
export function harmonicSpectrumComparison(nLevels = 4, omega = 1, m = 1) {
  const numeric = numericSpectrum((x) => 0.5 * m * omega * omega * x * x, -10, 10, nLevels, 800, m)
  return numeric.map((num, n) => ({ n, analytic: harmonicEnergy(n, omega), numeric: num }))
}
