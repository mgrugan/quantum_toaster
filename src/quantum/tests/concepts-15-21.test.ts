import { describe, expect, it } from 'vitest'
import * as engine from '../index'
import {
  OPTIMAL_CLONE_FIDELITY,
  QuantumToaster,
  blackbodySpectrum,
  buzekHilleryCloner,
  cloningFidelityCurve,
  cnotCloner,
  dephasedCoherence,
  emissionVsIntensity,
  kineticEnergyCurve,
  photoelectric,
  planckToRayleighJeansRatio,
  qubitFromBloch,
  sameStateAttempt,
  simulateDecoherence,
  teleport,
  teleportationOutcomes,
  twoParticleGroundState,
  twoParticleWavefunction,
  wavelengthToFrequency,
  wienPeakWavelength,
  zenoAnalytic,
  zenoCurve,
  zenoMonteCarlo,
  zenoSimulated,
  CONCEPTS,
  superposition,
} from '../index'

describe('15: decoherence', () => {
  it('purity falls under dephasing, trace stays 1, coherence decays as e^{−γt}', () => {
    const { series } = simulateDecoherence({ dephasingRate: 0.5, tMax: 6, steps: 60 })
    for (let i = 1; i < series.length; i++) expect(series[i].purity).toBeLessThanOrEqual(series[i - 1].purity + 1e-12)
    expect(series[0].purity).toBeCloseTo(1, 12)
    expect(series[series.length - 1].purity).toBeLessThan(0.27)
    for (const p of series) {
      expect(p.trace).toBeCloseTo(1, 10)
      expect(p.coherence).toBeCloseTo(dephasedCoherence(3, 0.5, p.t), 6)
      // Populations untouched by pure dephasing.
      expect(p.raw).toBeCloseTo(0.25, 10)
    }
  })

  it('without the environment the evolution stays pure', () => {
    const { series } = simulateDecoherence({ dephasingRate: 0, power: 1, tMax: 3, steps: 30 })
    for (const p of series) expect(p.purity).toBeCloseTo(1, 6)
  })

  it('amplitude damping cools toward raw', () => {
    const { series } = simulateDecoherence({ dephasingRate: 0, dampingRate: 1, tMax: 10, steps: 50 })
    expect(series[series.length - 1].raw).toBeGreaterThan(0.99)
  })
})

describe('16: Zeno', () => {
  it('P(raw) → 1 as N grows; simulation matches cos²ᴺ', () => {
    const curve = zenoCurve([1, 2, 5, 10, 50, 200])
    for (let i = 1; i < curve.length; i++) expect(curve[i].analytic).toBeGreaterThan(curve[i - 1].analytic)
    for (const c of curve) expect(c.simulated).toBeCloseTo(c.analytic, 10)
    expect(zenoAnalytic(1)).toBeCloseTo(0, 12)
    expect(zenoAnalytic(1000)).toBeGreaterThan(0.99)
    expect(zenoSimulated(1000, { levels: 4 })).toBeGreaterThan(0.99)
    const mc = zenoMonteCarlo(10, 4000, {}, 5)
    expect(Math.abs(mc.fraction - zenoAnalytic(10))).toBeLessThan(0.03)
  })
})

describe('17: Pauli exclusion', () => {
  it('fermion wavefunction vanishes on the diagonal and is antisymmetric', () => {
    const f = twoParticleWavefunction({ n1: 1, n2: 2, symmetry: 'fermion' })
    expect(f.diagonalMax).toBeLessThan(1e-12)
    expect(f.psi[3][7]).toBeCloseTo(-f.psi[7][3], 12)
    const b = twoParticleWavefunction({ n1: 1, n2: 2, symmetry: 'boson' })
    expect(b.psi[3][7]).toBeCloseTo(b.psi[7][3], 12)
    expect(b.closeProbability).toBeGreaterThan(f.closeProbability)
  })

  it('two fermions in the same state is the zero vector', () => {
    const s = sameStateAttempt(2)
    expect(s.fermionNorm).toBeLessThan(1e-12)
    expect(s.fermionAllowed).toBe(false)
    expect(s.bosonAllowed).toBe(true)
    expect(twoParticleGroundState('fermion').energy).toBeGreaterThan(twoParticleGroundState('boson').energy)
  })
})

describe('18: no-cloning', () => {
  it('CNOT copier works for basis states, fails for superpositions', () => {
    expect(cnotCloner(0).copyFidelity).toBeCloseTo(1, 12)
    expect(cnotCloner(Math.PI).copyFidelity).toBeCloseTo(1, 12)
    expect(cnotCloner(Math.PI / 2).copyFidelity).toBeCloseTo(0.5, 12)
    expect(cnotCloner(Math.PI / 2).jointFidelity).toBeCloseTo(0.5, 12)
  })

  it('Bužek–Hillery gives 5/6 for every input', () => {
    for (const [t, p] of [
      [0, 0],
      [1, 2],
      [Math.PI / 2, 0.3],
      [2.5, -1],
    ]) {
      const r = buzekHilleryCloner(t, p)
      expect(r.copyFidelity).toBeCloseTo(OPTIMAL_CLONE_FIDELITY, 10)
      expect(r.originalFidelity).toBeCloseTo(OPTIMAL_CLONE_FIDELITY, 10)
    }
    expect(cloningFidelityCurve(11).every((p) => p.cnotCopy >= 0.5 - 1e-12)).toBe(true)
  })
})

describe('19: blackbody', () => {
  it('Planck → Rayleigh–Jeans at low frequency, suppressed at high', () => {
    expect(planckToRayleighJeansRatio(1e9, 1100)).toBeCloseTo(1, 3)
    expect(planckToRayleighJeansRatio(1e15, 1100)).toBeLessThan(1e-10)
  })

  it('Wien peak and Stefan–Boltzmann match numerics', () => {
    const bb = blackbodySpectrum(1100, 500, 6000, 1101)
    expect(Math.abs(bb.numericPeakNm - bb.wienPeakNm)).toBeLessThan(10)
    expect(bb.exitanceNumeric / bb.exitanceStefanBoltzmann).toBeCloseTo(1, 3)
    expect(wienPeakWavelength(5800) * 1e9).toBeCloseTo(499.6, 0)
  })
})

describe('20: photoelectric', () => {
  it('no emission below threshold no matter the intensity', () => {
    const red = wavelengthToFrequency(650)
    expect(photoelectric({ frequency: red, intensity: 1e6 }).electronRate).toBe(0)
    expect(photoelectric({ frequency: red }).maxKineticEnergyEv).toBe(0)
    expect(emissionVsIntensity(red).every((p) => p.y === 0)).toBe(true)
  })

  it('above threshold K = hf − φ and rate ∝ intensity', () => {
    const uv = wavelengthToFrequency(365)
    const a = photoelectric({ frequency: uv, intensity: 100 })
    const b = photoelectric({ frequency: uv, intensity: 200 })
    expect(a.maxKineticEnergyEv).toBeCloseTo(a.photonEnergyEv - 2.3, 12)
    expect(b.maxKineticEnergyEv).toBe(a.maxKineticEnergyEv)
    expect(b.electronRate / a.electronRate).toBeCloseTo(2, 12)
    expect(a.browningRate).toBeGreaterThan(0)
    const curve = kineticEnergyCurve()
    const slope = (curve[100].y - curve[90].y) / ((curve[100].x - curve[90].x) * 1e12)
    expect(slope).toBeCloseTo(6.62607015e-34 / 1.602176634e-19, 18)
  })
})

describe('21: teleportation', () => {
  it('all four branches have P = ¼ and fidelity 1 after correction', () => {
    const r = teleportationOutcomes(qubitFromBloch(2.1, -0.7))
    expect(r.outcomes).toHaveLength(4)
    for (const o of r.outcomes) {
      expect(o.probability).toBeCloseTo(0.25, 12)
      expect(o.fidelity).toBeCloseTo(1, 12)
    }
    expect(r.averageFidelity).toBeCloseTo(1, 12)
    expect(teleport(qubitFromBloch(0.4, 1), 9).fidelity).toBeCloseTo(1, 12)
  })
})

describe('QuantumToaster', () => {
  it('heats coherently, measures with collapse, and snapshots plain data', () => {
    const t = new QuantumToaster({ seed: 1 })
    t.heat(Math.PI) // half a Rabi cycle → burnt
    expect(t.getProbabilities()[3]).toBeCloseTo(1, 6)
    t.heat(Math.PI)
    expect(t.getProbabilities()[0]).toBeCloseTo(1, 6)
    t.heat(1)
    const before = t.snapshot()
    expect(before.isPure).toBe(true)
    expect(before.probabilities.reduce((s, p) => s + p, 0)).toBeCloseTo(1, 10)
    const rec = t.measure()
    const after = t.snapshot()
    expect(after.probabilities[rec.outcome]).toBe(1)
    expect(after.measurementCount).toBe(1)
    expect(JSON.parse(JSON.stringify(after))).toEqual(after)
    // Snapshots are independent copies.
    before.probabilities[0] = 99
    expect(t.snapshot().probabilities[0]).not.toBe(99)
  })

  it('same seed → same measurement sequence', () => {
    const run = () => {
      const t = new QuantumToaster({ seed: 77 })
      const out: string[] = []
      for (let i = 0; i < 10; i++) {
        t.heat(0.7)
        out.push(t.measure().level)
      }
      return out
    }
    expect(run()).toEqual(run())
  })

  it('decoherence makes the slice mixed', () => {
    const t = new QuantumToaster({ decoherenceRate: 0.5 })
    t.insertSlice(superposition([1, 1, 1, 1]))
    t.heat(4)
    const s = t.snapshot()
    expect(s.amplitudes).toBeNull()
    expect(s.purity).toBeLessThan(0.5)
    expect(s.probabilities.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8)
    t.eject()
    expect(t.snapshot().hasSlice).toBe(false)
    expect(t.getHistory().map((h) => h.kind)).toContain('eject')
  })
})

describe('CONCEPTS metadata', () => {
  it('has all 21 concepts numbered in order', () => {
    expect(CONCEPTS.map((c) => c.number)).toEqual(Array.from({ length: 21 }, (_, i) => i + 1))
    expect(new Set(CONCEPTS.map((c) => c.id)).size).toBe(21)
  })

  it('every listed api name is actually exported', () => {
    const exported = engine as unknown as Record<string, unknown>
    for (const c of CONCEPTS) for (const name of c.api) expect(exported[name.split('.')[0]], name).toBeDefined()
  })
})
