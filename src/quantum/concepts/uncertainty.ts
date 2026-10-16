/**
 * Concept 8: Heisenberg uncertainty Δx·Δp ≥ ½ (ħ = 1).
 * The bread slot confines the slice to width ~σ; the pop-up momentum spread is computed
 * numerically from the FFT of ψ(x). A Gaussian saturates the bound (Δx·Δp = ½).
 */
import { fft, fftFrequencies } from '../fft'
import type { Point } from '../types'

export type SlotShape = 'gaussian' | 'box'

export interface UncertaintyOptions {
  /** Slot size: Gaussian standard deviation σ, or full width w for the 'box' slot. */
  sigma?: number
  shape?: SlotShape
  /** Mean momentum k₀ of the pop-up (doesn't change the spreads). */
  k0?: number
  /** Grid points (power of two). */
  gridSize?: number
}

export interface UncertaintyResult {
  sigma: number
  shape: SlotShape
  deltaX: number
  deltaP: number
  product: number
  /** ħ/2 = 0.5 */
  bound: number
  meanX: number
  meanP: number
  /** |ψ(x)|² near the slot. */
  position: Point[]
  /** |φ(p)|² near the mean momentum (continuous-transform normalization). */
  momentum: Point[]
}

const downsample = (pts: Point[], max = 200): Point[] => {
  if (pts.length <= max) return pts
  const step = Math.ceil(pts.length / max)
  return pts.filter((_, i) => i % step === 0)
}

/**
 * Concept 8 — build the slot wavefunction on a grid, then measure Δx from |ψ(x)|² and Δp
 * from |FFT ψ|². Everything is numerical; nothing is plugged in from the formula.
 */
export function heisenbergSlot({ sigma = 1, shape = 'gaussian', k0 = 0, gridSize = 1024 }: UncertaintyOptions = {}): UncertaintyResult {
  const N = gridSize
  const half = shape === 'gaussian' ? 12 * sigma : 4 * sigma
  const dx = (2 * half) / N
  const re = new Float64Array(N)
  const im = new Float64Array(N)
  const xs = new Float64Array(N)
  for (let j = 0; j < N; j++) {
    const x = -half + j * dx
    xs[j] = x
    let amp = 0
    if (shape === 'gaussian') amp = Math.exp((-x * x) / (4 * sigma * sigma))
    else if (Math.abs(x) < sigma / 2) amp = Math.cos((Math.PI * x) / sigma)
    re[j] = amp * Math.cos(k0 * x)
    im[j] = amp * Math.sin(k0 * x)
  }
  // Normalize ∫|ψ|² dx = 1.
  let total = 0
  for (let j = 0; j < N; j++) total += (re[j] * re[j] + im[j] * im[j]) * dx
  const s = 1 / Math.sqrt(total)
  for (let j = 0; j < N; j++) {
    re[j] *= s
    im[j] *= s
  }
  // Position moments.
  let mx = 0
  let mx2 = 0
  const position: Point[] = []
  for (let j = 0; j < N; j++) {
    const p = (re[j] * re[j] + im[j] * im[j]) * dx
    mx += xs[j] * p
    mx2 += xs[j] * xs[j] * p
  }
  const window = shape === 'gaussian' ? 5 * sigma : 0.75 * sigma
  for (let j = 0; j < N; j++)
    if (Math.abs(xs[j] - mx) <= window) position.push({ x: xs[j], y: re[j] * re[j] + im[j] * im[j] })
  // Momentum space via FFT.
  const fr = Float64Array.from(re)
  const fi = Float64Array.from(im)
  fft(fr, fi)
  const ks = fftFrequencies(N, dx)
  let pTot = 0
  for (let j = 0; j < N; j++) pTot += fr[j] * fr[j] + fi[j] * fi[j]
  let mp = 0
  let mp2 = 0
  for (let j = 0; j < N; j++) {
    const w = (fr[j] * fr[j] + fi[j] * fi[j]) / pTot
    mp += ks[j] * w
    mp2 += ks[j] * ks[j] * w
  }
  const deltaX = Math.sqrt(Math.max(0, mx2 - mx * mx))
  const deltaP = Math.sqrt(Math.max(0, mp2 - mp * mp))
  const dk = ks[1] - ks[0]
  const momentum: Point[] = []
  const order = Array.from({ length: N }, (_, j) => (j + N / 2) % N) // fftshift
  for (const j of order)
    if (Math.abs(ks[j] - mp) <= 5 * deltaP + 2 * dk) momentum.push({ x: ks[j], y: (fr[j] * fr[j] + fi[j] * fi[j]) / pTot / dk })
  return {
    sigma,
    shape,
    deltaX,
    deltaP,
    product: deltaX * deltaP,
    bound: 0.5,
    meanX: mx,
    meanP: mp,
    position: downsample(position),
    momentum: downsample(momentum),
  }
}

/** Concept 8 — sweep slot widths: narrower slot → bigger Δp, product stays ≥ ½. */
export function slotWidthSweep(
  sigmas: number[] = [0.25, 0.5, 0.75, 1, 1.5, 2, 3],
  shape: SlotShape = 'gaussian',
): { sigma: number; deltaX: number; deltaP: number; product: number }[] {
  return sigmas.map((sigma) => {
    const r = heisenbergSlot({ sigma, shape, gridSize: 512 })
    return { sigma, deltaX: r.deltaX, deltaP: r.deltaP, product: r.product }
  })
}
