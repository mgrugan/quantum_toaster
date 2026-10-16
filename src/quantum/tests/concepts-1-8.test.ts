import { describe, expect, it } from 'vitest'
import {
  DONENESS_ENERGIES,
  amplitudeBars,
  boxSpectrumComparison,
  donenessHamiltonian,
  donenessReadout,
  evolveDoneness,
  harmonicEnergyNumeric,
  harmonicSpectrumComparison,
  heisenbergSlot,
  isNormalized,
  measureDoneness,
  particleInBoxEnergy,
  particleInBoxWavefunction,
  rawSurvivalAnalytic,
  sampleMeasurements,
  slotWidthSweep,
  superposition,
  uniformSuperposition,
  zeroPointEnergy,
  hermiticityError,
  integrate,
} from '../index'

describe('1–3: state, superposition, Born rule', () => {
  it('normalizes superpositions', () => {
    const psi = superposition([1, { re: 0, im: 2 }, 3, 0])
    expect(isNormalized(psi)).toBe(true)
    const total = amplitudeBars(psi).reduce((s, b) => s + b.probability, 0)
    expect(total).toBeCloseTo(1, 12)
    expect(isNormalized(uniformSuperposition([0, 1, 2, 3]))).toBe(true)
  })

  it('measurement collapses to the outcome', () => {
    const psi = uniformSuperposition()
    const m = measureDoneness(psi, 123)
    expect(m.probability).toBeCloseTo(0.25)
    expect(m.postState[m.outcome].re).toBe(1)
    expect(isNormalized(m.postState)).toBe(true)
    // Repeat measurement on the collapsed state always gives the same result.
    for (let s = 0; s < 5; s++) expect(measureDoneness(m.postState, s).outcome).toBe(m.outcome)
  })

  it('Born-rule frequencies match |c|² for a fixed seed', () => {
    const psi = superposition([1, 2, 3, 1])
    const stats = sampleMeasurements(psi, 20000, 2024)
    stats.frequencies.forEach((f, i) => expect(Math.abs(f - stats.expected[i])).toBeLessThan(0.015))
    // Deterministic for a fixed seed.
    expect(sampleMeasurements(psi, 100, 5).counts).toEqual(sampleMeasurements(psi, 100, 5).counts)
  })
})

describe('4–5: quantization and zero-point energy', () => {
  it('box energies scale as n² and match finite differences', () => {
    expect(DONENESS_ENERGIES).toEqual([0.5, 2, 4.5, 8])
    expect(particleInBoxEnergy(3, 2, 1) / particleInBoxEnergy(1, 2, 1)).toBeCloseTo(9)
    for (const r of boxSpectrumComparison(4)) expect(Math.abs(r.numeric - r.analytic) / r.analytic).toBeLessThan(1e-3)
    const pts = particleInBoxWavefunction(2, Math.PI, 2001, true)
    expect(integrate(pts.map((p) => p.y), pts[1].x - pts[0].x)).toBeCloseTo(1, 3)
  })

  it('oscillator ground state carries ω/2', () => {
    expect(zeroPointEnergy(2)).toBe(1)
    const g = harmonicEnergyNumeric(0)
    expect(g.total).toBeCloseTo(0.5, 4)
    expect(g.kinetic).toBeCloseTo(g.potential, 4)
    expect(harmonicEnergyNumeric(3).total).toBeCloseTo(3.5, 3)
    for (const r of harmonicSpectrumComparison(4)) expect(r.numeric).toBeCloseTo(r.analytic, 2)
  })
})

describe('6–7: Schrödinger evolution and observables', () => {
  it('Hamiltonian is Hermitian; evolution is unitary and matches cos⁶(Ωt/2)', () => {
    expect(hermiticityError(donenessHamiltonian({ power: 1.3, detuning: 0.2 }))).toBe(0)
    const ev = evolveDoneness({ power: 1, steps: 100 })
    expect(ev.maxNormError).toBeLessThan(1e-12)
    expect(ev.unitarityError).toBeLessThan(1e-12)
    for (const p of ev.series) expect(p.raw).toBeCloseTo(rawSurvivalAnalytic(p.t, 1), 9)
    // Half period → fully burnt; full period → back to raw (reversible).
    expect(ev.series[50].burnt).toBeCloseTo(1, 9)
    expect(ev.series[100].raw).toBeCloseTo(1, 9)
  })

  it('expectation values and variance', () => {
    const r = donenessReadout(uniformSuperposition())
    expect(r.doneness.mean).toBeCloseTo(1.5)
    expect(r.doneness.variance).toBeCloseTo(1.25)
    expect(r.energy.mean).toBeCloseTo((0.5 + 2 + 4.5 + 8) / 4)
    const raw = donenessReadout(superposition([1, 0, 0, 0]))
    expect(raw.doneness.variance).toBe(0)
  })
})

describe('8: Heisenberg uncertainty', () => {
  it('Gaussian saturates Δx·Δp = ½', () => {
    const r = heisenbergSlot({ sigma: 0.7, k0: 2 })
    expect(r.deltaX).toBeCloseTo(0.7, 4)
    expect(r.deltaP).toBeCloseTo(1 / 1.4, 4)
    expect(r.product).toBeCloseTo(0.5, 4)
    expect(r.meanP).toBeCloseTo(2, 4)
  })

  it('narrower slot → wider momentum; product never below ½', () => {
    const sweep = slotWidthSweep([0.25, 0.5, 1, 2])
    for (let i = 1; i < sweep.length; i++) expect(sweep[i].deltaP).toBeLessThan(sweep[i - 1].deltaP)
    for (const s of sweep) expect(s.product).toBeGreaterThanOrEqual(0.5 - 1e-6)
    const box = heisenbergSlot({ sigma: 1, shape: 'box' })
    expect(box.product).toBeGreaterThan(0.5)
    expect(box.product).toBeCloseTo(Math.sqrt(Math.PI ** 2 / 12 - 0.5), 1)
  })
})
