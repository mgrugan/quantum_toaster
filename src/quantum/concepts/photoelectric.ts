/**
 * Concept 20: photoelectric effect (SI / eV). Light is photons of energy hf. An electron is
 * ejected from the bread only if hf > φ (work function); then K_max = hf − φ.
 * Intensity changes *how many* electrons, never *whether* they come out.
 * Toaster: browning only starts when the light is blue enough.
 */
import { ELECTRON_VOLT, ELEMENTARY_CHARGE, PLANCK_H, SPEED_OF_LIGHT } from '../constants'
import { linspace } from '../types'

/** Bread's (made-up but plausible) work function, eV. Threshold ≈ 539 nm (green). */
export const BREAD_WORK_FUNCTION_EV = 2.3

/** Handy light sources for the UI, wavelength in nm. */
export const LIGHT_SOURCES: readonly { name: string; wavelengthNm: number }[] = [
  { name: 'Coil infrared', wavelengthNm: 1000 },
  { name: 'Red', wavelengthNm: 650 },
  { name: 'Green', wavelengthNm: 530 },
  { name: 'Blue', wavelengthNm: 450 },
  { name: 'UV', wavelengthNm: 365 },
]

export const wavelengthToFrequency = (nm: number): number => SPEED_OF_LIGHT / (nm * 1e-9)
export const frequencyToWavelength = (hz: number): number => (SPEED_OF_LIGHT / hz) * 1e9
/** Photon energy hf in eV. */
export const photonEnergyEv = (hz: number): number => (PLANCK_H * hz) / ELECTRON_VOLT

export interface PhotoelectricOptions {
  /** Light frequency (Hz). */
  frequency: number
  /** Light intensity (W/m²). */
  intensity?: number
  workFunctionEv?: number
  /** Electrons ejected per absorbed photon above threshold. */
  quantumEfficiency?: number
  /** Illuminated area (m²). */
  area?: number
}

export interface PhotoelectricResult {
  frequency: number
  wavelengthNm: number
  photonEnergyEv: number
  workFunctionEv: number
  thresholdFrequency: number
  thresholdWavelengthNm: number
  aboveThreshold: boolean
  /** K_max = hf − φ (eV), 0 below threshold. */
  maxKineticEnergyEv: number
  /** Stopping voltage V_s = K_max/e (V). */
  stoppingVoltage: number
  /** Photons per second hitting the slice. */
  photonRate: number
  /** Electrons per second ejected (0 below threshold, ∝ intensity above). */
  electronRate: number
  /** Photocurrent (A). */
  current: number
  /** "Browning rate": kinetic power carried by ejected electrons, W (0 below threshold). */
  browningRate: number
}

/** Concept 20 — Einstein's photoelectric equation applied to a slice of bread. */
export function photoelectric({
  frequency,
  intensity = 1000,
  workFunctionEv = BREAD_WORK_FUNCTION_EV,
  quantumEfficiency = 0.1,
  area = 1e-2,
}: PhotoelectricOptions): PhotoelectricResult {
  const Eph = photonEnergyEv(frequency)
  const above = Eph > workFunctionEv
  const K = above ? Eph - workFunctionEv : 0
  const photonRate = (intensity * area) / (PLANCK_H * frequency)
  const electronRate = above ? quantumEfficiency * photonRate : 0
  const thresholdFrequency = (workFunctionEv * ELECTRON_VOLT) / PLANCK_H
  return {
    frequency,
    wavelengthNm: frequencyToWavelength(frequency),
    photonEnergyEv: Eph,
    workFunctionEv,
    thresholdFrequency,
    thresholdWavelengthNm: frequencyToWavelength(thresholdFrequency),
    aboveThreshold: above,
    maxKineticEnergyEv: K,
    stoppingVoltage: K,
    photonRate,
    electronRate,
    current: electronRate * ELEMENTARY_CHARGE,
    browningRate: electronRate * K * ELECTRON_VOLT,
  }
}

/** Concept 20 — K_max vs frequency (x in THz, y in eV): a line of slope h, zero below f₀. */
export function kineticEnergyCurve(workFunctionEv = BREAD_WORK_FUNCTION_EV, fMinTHz = 200, fMaxTHz = 1200, points = 101) {
  return linspace(fMinTHz, fMaxTHz, points).map((thz) => ({
    x: thz,
    y: photoelectric({ frequency: thz * 1e12, workFunctionEv }).maxKineticEnergyEv,
  }))
}

/** Concept 20 — electron rate vs intensity (x in W/m²) at fixed frequency: flat 0 below threshold. */
export function emissionVsIntensity(frequency: number, workFunctionEv = BREAD_WORK_FUNCTION_EV, maxIntensity = 2000, points = 21) {
  return linspace(0, maxIntensity, points).map((I) => ({
    x: I,
    y: photoelectric({ frequency, intensity: I, workFunctionEv }).electronRate,
  }))
}
