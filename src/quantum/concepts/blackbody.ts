/**
 * Concept 19: blackbody radiation (SI units). The glowing coil emits Planck's spectrum
 *   B_λ(λ,T) = (2hc²/λ⁵) / (e^{hc/λkT} − 1)
 * Classical Rayleigh–Jeans B_λ = 2ckT/λ⁴ agrees at long wavelength but diverges at short λ
 * (the ultraviolet catastrophe). Quantized emission (E = hν) fixes it.
 */
import { BOLTZMANN_K, PLANCK_H, SPEED_OF_LIGHT, STEFAN_BOLTZMANN, WIEN_B } from '../constants'
import { linspace } from '../types'

/** Typical toaster coil temperature (K): a dull orange-red glow. */
export const COIL_TEMPERATURE = 1100

/** Planck spectral radiance per wavelength, W·sr⁻¹·m⁻³ (λ in metres). */
export function planckRadiance(lambda: number, T: number): number {
  const x = (PLANCK_H * SPEED_OF_LIGHT) / (lambda * BOLTZMANN_K * T)
  return (2 * PLANCK_H * SPEED_OF_LIGHT ** 2) / lambda ** 5 / Math.expm1(x)
}

/** Rayleigh–Jeans spectral radiance per wavelength, W·sr⁻¹·m⁻³. */
export const rayleighJeansRadiance = (lambda: number, T: number): number => (2 * SPEED_OF_LIGHT * BOLTZMANN_K * T) / lambda ** 4

/** Planck spectral radiance per frequency, W·sr⁻¹·m⁻²·Hz⁻¹. */
export function planckRadianceFrequency(nu: number, T: number): number {
  return (2 * PLANCK_H * nu ** 3) / SPEED_OF_LIGHT ** 2 / Math.expm1((PLANCK_H * nu) / (BOLTZMANN_K * T))
}

/** Rayleigh–Jeans per frequency 2ν²kT/c². */
export const rayleighJeansRadianceFrequency = (nu: number, T: number): number => (2 * nu * nu * BOLTZMANN_K * T) / SPEED_OF_LIGHT ** 2

/** Wien's displacement law λ_max = b/T (metres). */
export const wienPeakWavelength = (T: number): number => WIEN_B / T

export interface BlackbodySpectrum {
  temperature: number
  /** x = wavelength in nm; radiances in W·sr⁻¹·m⁻²·nm⁻¹. RJ is huge at short λ: clip in the chart. */
  points: { x: number; planck: number; rayleighJeans: number }[]
  /** Wien's law peak (nm). */
  wienPeakNm: number
  /** Peak found numerically on the grid (nm). */
  numericPeakNm: number
  /** Planck radiance at the peak (same units as points), handy for chart y-domain. */
  peakRadiance: number
  /** Radiant exitance π∫B_λ dλ from numerical integration (W/m²). */
  exitanceNumeric: number
  /** Stefan–Boltzmann σT⁴ (W/m²). */
  exitanceStefanBoltzmann: number
  /** Approximate perceived glow colour. */
  glow: { r: number; g: number; b: number; hex: string }
}

/** Concept 19 — Planck vs Rayleigh–Jeans across wavelengths for a coil at temperature T. */
export function blackbodySpectrum(T = COIL_TEMPERATURE, lambdaMinNm = 100, lambdaMaxNm = 8000, points = 240): BlackbodySpectrum {
  const pts = linspace(lambdaMinNm, lambdaMaxNm, points).map((nm) => ({
    x: nm,
    planck: planckRadiance(nm * 1e-9, T) * 1e-9,
    rayleighJeans: rayleighJeansRadiance(nm * 1e-9, T) * 1e-9,
  }))
  const peak = pts.reduce((best, p) => (p.planck > best.planck ? p : best), pts[0])
  // Exitance: integrate on a log grid from 10 nm to 1 mm for accuracy.
  let integral = 0
  const n = 4000
  const a = Math.log(1e-8)
  const b = Math.log(1e-3)
  for (let i = 0; i < n; i++) {
    const l = Math.exp(a + ((i + 0.5) * (b - a)) / n)
    integral += planckRadiance(l, T) * l * ((b - a) / n)
  }
  return {
    temperature: T,
    points: pts,
    wienPeakNm: wienPeakWavelength(T) * 1e9,
    numericPeakNm: peak.x,
    peakRadiance: peak.planck,
    exitanceNumeric: Math.PI * integral,
    exitanceStefanBoltzmann: STEFAN_BOLTZMANN * T ** 4,
    glow: glowColor(T),
  }
}

/** Ratio Planck / Rayleigh–Jeans at frequency ν: → 1 when hν ≪ kT, → 0 when hν ≫ kT. */
export const planckToRayleighJeansRatio = (nu: number, T: number): number =>
  planckRadianceFrequency(nu, T) / rayleighJeansRadianceFrequency(nu, T)

/**
 * Approximate sRGB glow colour of a blackbody (Tanner Helland fit, 1000–40000 K; colder is
 * clamped red and dimmed). Cosmetic, for the coil's on-screen glow.
 */
export function glowColor(T: number): { r: number; g: number; b: number; hex: string } {
  const t = Math.max(1000, Math.min(40000, T)) / 100
  const clamp = (v: number) => Math.round(Math.max(0, Math.min(255, v)))
  let r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592
  let g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492
  let b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307
  const dim = T < 1000 ? Math.max(0, (T - 500) / 500) : 1
  r = clamp(r * dim)
  g = clamp(g * dim)
  b = clamp(b * dim)
  const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
  return { r, g, b, hex }
}
