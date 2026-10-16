/**
 * Concept 12: quantum tunneling. The pop-up latch is a rectangular barrier of height V₀ and
 * width a; toast with E < V₀ still escapes with probability T(E) > 0.
 * Three independent calculations: closed-form T(E), a transfer-matrix solver for any
 * piecewise-constant potential, and a time-dependent split-step-Fourier wavepacket.
 */
import type { Complex } from '../complex'
import { abs2, cdiv, cexp, cmul, csqrt, cadd } from '../complex'
import { fft, fftFrequencies } from '../fft'
import type { Point } from '../types'
import { linspace } from '../types'

export interface BarrierOptions {
  /** Barrier height V₀ (default 1). */
  height?: number
  /** Barrier width a (default 1). */
  width?: number
  /** Particle mass (default 1). */
  mass?: number
}

/**
 * Concept 12 — closed-form transmission through a rectangular barrier.
 * E < V₀: T = [1 + V₀² sinh²(κa) / (4E(V₀−E))]⁻¹, κ = √(2m(V₀−E)).
 * E > V₀: T = [1 + V₀² sin²(k′a) / (4E(E−V₀))]⁻¹, k′ = √(2m(E−V₀)).
 */
export function transmissionCoefficient(E: number, { height = 1, width = 1, mass = 1 }: BarrierOptions = {}): number {
  if (E <= 0) return 0
  const V = height
  if (Math.abs(E - V) < 1e-12) return 1 / (1 + (mass * V * width * width) / 2)
  if (E < V) {
    const kappa = Math.sqrt(2 * mass * (V - E))
    return 1 / (1 + (V * V * Math.sinh(kappa * width) ** 2) / (4 * E * (V - E)))
  }
  const kp = Math.sqrt(2 * mass * (E - V))
  return 1 / (1 + (V * V * Math.sin(kp * width) ** 2) / (4 * E * (E - V)))
}

/** Concept 12 — T(E) and R(E) = 1 − T across energies; x = E. */
export function transmissionCurve(
  options: BarrierOptions = {},
  eMax = 3 * (options.height ?? 1),
  points = 200,
): { x: number; transmission: number; reflection: number; classical: number }[] {
  const V = options.height ?? 1
  return linspace(eMax / points, eMax, points).map((E) => {
    const T = transmissionCoefficient(E, options)
    return { x: E, transmission: T, reflection: 1 - T, classical: E >= V ? 1 : 0 }
  })
}

/** A region of constant potential for the transfer-matrix solver. */
export interface PotentialSegment {
  width: number
  potential: number
}

/**
 * Concept 12 — transfer-matrix scattering for free space | segments… | free space.
 * Matches ψ and ψ′ at every interface with plane waves A·e^{ikx} + B·e^{−ikx}
 * (k complex inside forbidden regions). Returns T and R computed independently, so
 * T + R = 1 is a genuine check of probability-current conservation.
 */
export function transferMatrixScattering(E: number, segments: PotentialSegment[], mass = 1): { transmission: number; reflection: number } {
  type M2 = [[Complex, Complex], [Complex, Complex]]
  const mul = (a: M2, b: M2): M2 => [
    [cadd(cmul(a[0][0], b[0][0]), cmul(a[0][1], b[1][0])), cadd(cmul(a[0][0], b[0][1]), cmul(a[0][1], b[1][1]))],
    [cadd(cmul(a[1][0], b[0][0]), cmul(a[1][1], b[1][0])), cadd(cmul(a[1][0], b[0][1]), cmul(a[1][1], b[1][1]))],
  ]
  const kOf = (V: number): Complex => {
    let d = 2 * mass * (E - V)
    if (Math.abs(d) < 1e-12) d = 1e-12
    return csqrt({ re: d, im: 0 })
  }
  const eikx = (k: Complex, x: number, sign: 1 | -1) => cexp(cmul({ re: 0, im: sign * x }, k))
  const M = (k: Complex, x: number): M2 => {
    const ep = eikx(k, x, 1)
    const em = eikx(k, x, -1)
    const ik = cmul({ re: 0, im: 1 }, k)
    return [
      [ep, em],
      [cmul(ik, ep), cmul({ re: -ik.re, im: -ik.im }, em)],
    ]
  }
  const Minv = (k: Complex, x: number): M2 => {
    const ep = eikx(k, x, 1)
    const em = eikx(k, x, -1)
    const twoIk = cmul({ re: 0, im: 2 }, k)
    return [
      [cmul({ re: 0.5, im: 0 }, em), cdiv(em, twoIk)],
      [cmul({ re: 0.5, im: 0 }, ep), cdiv({ re: -ep.re, im: -ep.im }, twoIk)],
    ]
  }
  const ks = [kOf(0), ...segments.map((s) => kOf(s.potential)), kOf(0)]
  let total: M2 = [
    [{ re: 1, im: 0 }, { re: 0, im: 0 }],
    [{ re: 0, im: 0 }, { re: 1, im: 0 }],
  ]
  let x = 0
  for (let j = 0; j < ks.length - 1; j++) {
    total = mul(mul(Minv(ks[j + 1], x), M(ks[j], x)), total)
    if (j < segments.length) x += segments[j].width
  }
  // Incoming A₀ = 1, reflected B₀ = r, outgoing B_N = 0.
  const r = cdiv({ re: -total[1][0].re, im: -total[1][0].im }, total[1][1])
  const t = cadd(total[0][0], cmul(total[0][1], r))
  return { transmission: abs2(t) * (ks[ks.length - 1].re / ks[0].re), reflection: abs2(r) }
}

export interface WavepacketOptions extends BarrierOptions {
  /** Mean energy of the toast E₀ = k₀²/2m (default 0.8·V₀: classically forbidden). */
  energy?: number
  /** Initial packet width σ in position. */
  sigma?: number
  /** Initial centre (left of the barrier at x = 0). */
  x0?: number
  gridSize?: number
  /** Domain half-length; grid spans [−L, L). */
  halfLength?: number
  dt?: number
  /** Total time; default lets the packet centre travel 2|x₀|. */
  tMax?: number
  snapshots?: number
}

export interface WavepacketResult {
  /** Potential profile V(x) for plotting. */
  potential: Point[]
  /** |ψ(x,t)|² snapshots (downsampled). */
  snapshots: { t: number; density: Point[]; transmitted: number; reflected: number }[]
  /** Final ∫_{x>a}|ψ|². */
  transmitted: number
  /** Final ∫_{x<0}|ψ|². */
  reflected: number
  /** Probability still inside the barrier region. */
  inBarrier: number
  /** Total norm at the end (unitarity check, ≈ 1). */
  norm: number
  /** Analytic T(E) averaged over the packet's momentum distribution — compare with `transmitted`. */
  expectedTransmission: number
  /** Analytic T at the mean energy. */
  transmissionAtMeanEnergy: number
}

/**
 * Concept 12 — time-dependent Schrödinger equation for a Gaussian toast packet hitting the
 * latch, via Strang split-step Fourier: e^{−iVdt/2} · FFT⁻¹ e^{−ik²dt/2m} FFT · e^{−iVdt/2}.
 */
export function simulateTunneling(options: WavepacketOptions = {}): WavepacketResult {
  const {
    height = 1,
    width = 1,
    mass = 1,
    sigma = 4,
    x0 = -20,
    gridSize = 1024,
    halfLength = 64,
    dt = 0.05,
    snapshots = 30,
  } = options
  const energy = options.energy ?? 0.8 * height
  const k0 = Math.sqrt(2 * mass * energy)
  const tMax = options.tMax ?? (2 * Math.abs(x0) * mass) / k0
  const N = gridSize
  const dx = (2 * halfLength) / N
  const xs = Float64Array.from({ length: N }, (_, j) => -halfLength + j * dx)
  const V = xs.map((x) => (x >= -1e-12 && x < width - 1e-9 ? height : 0))
  const re = new Float64Array(N)
  const im = new Float64Array(N)
  for (let j = 0; j < N; j++) {
    const g = Math.exp(-((xs[j] - x0) ** 2) / (4 * sigma * sigma))
    re[j] = g * Math.cos(k0 * xs[j])
    im[j] = g * Math.sin(k0 * xs[j])
  }
  let tot = 0
  for (let j = 0; j < N; j++) tot += (re[j] ** 2 + im[j] ** 2) * dx
  const sc = 1 / Math.sqrt(tot)
  for (let j = 0; j < N; j++) {
    re[j] *= sc
    im[j] *= sc
  }
  const ks = fftFrequencies(N, dx)
  const steps = Math.max(1, Math.round(tMax / dt))
  const h = tMax / steps
  // Precompute phase factors.
  const vr = new Float64Array(N)
  const vi = new Float64Array(N)
  const kr = new Float64Array(N)
  const ki = new Float64Array(N)
  for (let j = 0; j < N; j++) {
    vr[j] = Math.cos((-V[j] * h) / 2)
    vi[j] = Math.sin((-V[j] * h) / 2)
    const ph = (-ks[j] * ks[j] * h) / (2 * mass)
    kr[j] = Math.cos(ph)
    ki[j] = Math.sin(ph)
  }
  const mulPhase = (pr: Float64Array, pi: Float64Array) => {
    for (let j = 0; j < N; j++) {
      const a = re[j]
      const b = im[j]
      re[j] = a * pr[j] - b * pi[j]
      im[j] = a * pi[j] + b * pr[j]
    }
  }
  const regions = () => {
    let left = 0
    let right = 0
    let total = 0
    for (let j = 0; j < N; j++) {
      const p = (re[j] ** 2 + im[j] ** 2) * dx
      total += p
      if (xs[j] < 0) left += p
      else if (xs[j] >= width - 1e-9) right += p
    }
    return { left, right, total }
  }
  const stride = Math.max(1, Math.floor(N / 256))
  const densityPoints = (): Point[] => {
    const pts: Point[] = []
    for (let j = 0; j < N; j += stride) pts.push({ x: xs[j], y: re[j] ** 2 + im[j] ** 2 })
    return pts
  }
  const snapEvery = Math.max(1, Math.floor(steps / snapshots))
  const snaps: WavepacketResult['snapshots'] = []
  const record = (t: number) => {
    const r = regions()
    snaps.push({ t, density: densityPoints(), transmitted: r.right, reflected: r.left })
  }
  record(0)
  for (let s = 1; s <= steps; s++) {
    mulPhase(vr, vi)
    fft(re, im)
    mulPhase(kr, ki)
    fft(re, im, true)
    mulPhase(vr, vi)
    if (s % snapEvery === 0 || s === steps) record(s * h)
  }
  const fin = regions()
  // Analytic expectation: average T(k²/2m) over the Gaussian momentum distribution (σ_k = 1/2σ).
  const sk = 1 / (2 * sigma)
  let num = 0
  let den = 0
  for (const k of linspace(k0 - 6 * sk, k0 + 6 * sk, 601)) {
    const w = Math.exp(-((k - k0) ** 2) / (2 * sk * sk))
    den += w
    if (k > 0) num += w * transmissionCoefficient((k * k) / (2 * mass), { height, width, mass })
  }
  const potential: Point[] = []
  for (let j = 0; j < N; j += stride) potential.push({ x: xs[j], y: V[j] })
  return {
    potential,
    snapshots: snaps,
    transmitted: fin.right,
    reflected: fin.left,
    inBarrier: fin.total - fin.left - fin.right,
    norm: fin.total,
    expectedTransmission: num / den,
    transmissionAtMeanEnergy: transmissionCoefficient(energy, { height, width, mass }),
  }
}
