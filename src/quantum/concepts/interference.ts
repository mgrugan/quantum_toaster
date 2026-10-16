/**
 * Concept 11: wave–particle duality. Crumbs from a two-slot toaster hit a far screen one at
 * a time, each at a random spot drawn from |ψ|², yet together they build interference
 * fringes. Turning on a which-slot detector destroys the fringes (only the envelope remains).
 */
import type { Rng } from '../rng'
import { toRng } from '../rng'
import type { Point } from '../types'
import { linspace } from '../types'

export interface DoubleSlotOptions {
  /** Centre-to-centre slot separation d. */
  slitSeparation?: number
  /** Width a of each slot (sets the single-slot sinc² envelope). */
  slitWidth?: number
  /** de Broglie wavelength λ of the crumbs. */
  wavelength?: number
  /** Distance to the screen D (Fraunhofer / far-field). */
  screenDistance?: number
  /** Screen half-width shown. */
  screenHalfWidth?: number
  /**
   * Which-slot detector strength η ∈ [0, 1]. 0 = no detector (full fringes),
   * 1 = path fully known (fringes gone). Fringe visibility = 1 − η.
   */
  detector?: number
}

const defaults = {
  slitSeparation: 5,
  slitWidth: 1,
  wavelength: 0.5,
  screenDistance: 100,
  screenHalfWidth: 30,
  detector: 0,
}

const sinc = (u: number) => (Math.abs(u) < 1e-12 ? 1 : Math.sin(u) / u)

/**
 * Concept 11 — far-field intensity at screen position y:
 * I(y) = sinc²(πa·sinθ/λ) · [(1−η)·cos²(πd·sinθ/λ) + η/2], sinθ = y/√(y²+D²).
 * η = 0 is the coherent two-slit pattern; η = 1 is the incoherent sum of single slits.
 */
export function doubleSlotIntensity(y: number, options: DoubleSlotOptions = {}): number {
  const o = { ...defaults, ...options }
  const s = y / Math.hypot(y, o.screenDistance)
  const env = sinc((Math.PI * o.slitWidth * s) / o.wavelength) ** 2
  const fringe = Math.cos((Math.PI * o.slitSeparation * s) / o.wavelength) ** 2
  return env * ((1 - o.detector) * fringe + o.detector / 2)
}

/** Concept 11 — the intensity curve across the screen, normalized to peak 1. */
export function doubleSlotPattern(options: DoubleSlotOptions = {}, points = 401): Point[] {
  const o = { ...defaults, ...options }
  const pts = linspace(-o.screenHalfWidth, o.screenHalfWidth, points).map((x) => ({ x, y: doubleSlotIntensity(x, o) }))
  const max = Math.max(...pts.map((p) => p.y)) || 1
  return pts.map((p) => ({ x: p.x, y: p.y / max }))
}

/** Fringe spacing Δy ≈ λD/d (small-angle). */
export const fringeSpacing = (options: DoubleSlotOptions = {}): number => {
  const o = { ...defaults, ...options }
  return (o.wavelength * o.screenDistance) / o.slitSeparation
}

/** Visibility (I_max − I_min)/(I_max + I_min) over the central fringe (|y| ≤ Δy/2). */
export function fringeVisibility(options: DoubleSlotOptions = {}): number {
  const half = fringeSpacing(options) / 2
  const vals = linspace(-half, half, 201).map((y) => doubleSlotIntensity(y, options))
  const max = Math.max(...vals)
  const min = Math.min(...vals)
  return (max - min) / (max + min)
}

/**
 * Concept 11 — sample individual crumb landing positions from the intensity distribution
 * (inverse-CDF on a fine grid). Each crumb is a particle; the pattern is a wave.
 */
export function sampleCrumbHits(n: number, options: DoubleSlotOptions = {}, rng: Rng | number = 42): number[] {
  const o = { ...defaults, ...options }
  const r = toRng(rng)
  const G = 4000
  const xs = linspace(-o.screenHalfWidth, o.screenHalfWidth, G + 1)
  const cdf = new Float64Array(G + 1)
  for (let i = 1; i <= G; i++) {
    const mid = (xs[i - 1] + xs[i]) / 2
    cdf[i] = cdf[i - 1] + doubleSlotIntensity(mid, o)
  }
  const total = cdf[G]
  const hits: number[] = []
  for (let k = 0; k < n; k++) {
    const u = r() * total
    let lo = 0
    let hi = G
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (cdf[mid] < u) lo = mid
      else hi = mid
    }
    const frac = (u - cdf[lo]) / (cdf[hi] - cdf[lo] || 1)
    hits.push(xs[lo] + frac * (xs[hi] - xs[lo]))
  }
  return hits
}

/** Histogram of hit positions: [{ x: bin centre, y: count }]. */
export function crumbHistogram(hits: number[], bins = 60, halfWidth = defaults.screenHalfWidth): Point[] {
  const counts = new Array<number>(bins).fill(0)
  const w = (2 * halfWidth) / bins
  for (const h of hits) {
    const b = Math.floor((h + halfWidth) / w)
    if (b >= 0 && b < bins) counts[b]++
  }
  return counts.map((c, i) => ({ x: -halfWidth + (i + 0.5) * w, y: c }))
}

/**
 * Concept 11 — watch fringes emerge: histograms after the first n₁ < n₂ < … crumbs
 * (same random sequence, so later frames extend earlier ones).
 */
export function fringeBuildUp(
  counts: number[] = [10, 100, 1000, 10000],
  options: DoubleSlotOptions = {},
  rng: Rng | number = 42,
  bins = 60,
): { crumbs: number; histogram: Point[] }[] {
  const o = { ...defaults, ...options }
  const all = sampleCrumbHits(Math.max(...counts), o, rng)
  return counts.map((n) => ({ crumbs: n, histogram: crumbHistogram(all.slice(0, n), bins, o.screenHalfWidth) }))
}
