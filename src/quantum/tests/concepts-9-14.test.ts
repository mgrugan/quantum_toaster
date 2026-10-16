import { describe, expect, it } from 'vitest'
import {
  TSIRELSON_BOUND,
  bellCircuit,
  bellState,
  chshAngleSweep,
  chshValue,
  commutatorDemo,
  concurrence,
  doubleSlotPattern,
  entanglementEntropy,
  fringeBuildUp,
  fringeVisibility,
  larmorPrecession,
  lhvCorrelation,
  measurementOrderComparison,
  norm,
  productState,
  qubitFromBloch,
  quantumCorrelation,
  reducedDensityMatrix,
  runChshExperiment,
  sampleCrumbHits,
  sampleJointMeasurements,
  sampleSequential,
  simulateTunneling,
  transferMatrixScattering,
  transmissionCoefficient,
  transmissionCurve,
  blochVector,
} from '../index'

describe('9: non-commuting observables', () => {
  it('[σz, σx] = 2iσy ≠ 0', () => {
    const d = commutatorDemo()
    expect(d.matches).toBe(true)
    expect(d.commutes).toBe(false)
  })

  it('measurement order changes statistics', () => {
    const c = measurementOrderComparison(0)
    expect(c.zDirect.plus).toBeCloseTo(1)
    expect(c.zAfterX.plus).toBeCloseTo(0.5)
    expect(c.zThenX.firstMarginal.plus).toBeCloseTo(1)
    expect(c.xThenZ.firstMarginal.plus).toBeCloseTo(0.5)
    for (const r of [c.zThenX, c.xThenZ]) expect(r.outcomes.reduce((s, o) => s + o.probability, 0)).toBeCloseTo(1, 12)
    const sampled = sampleSequential(qubitFromBloch(0), 'x', 'z', 4000, 1)
    for (const k of sampled.counts) expect(k.frequency).toBeCloseTo(0.25, 1)
  })
})

describe('10: spin-½ and Larmor precession', () => {
  it('Bloch vector has unit length and precesses about z at ω = γB', () => {
    const r = blochVector(qubitFromBloch(1.2, 0.4))
    expect(Math.hypot(r.x, r.y, r.z)).toBeCloseTo(1, 12)
    const lar = larmorPrecession({ field: { x: 0, y: 0, z: 2 }, steps: 40 })
    expect(lar.larmorFrequency).toBe(2)
    for (const p of lar.series) {
      expect(p.z).toBeCloseTo(0, 10)
      expect(p.x).toBeCloseTo(Math.cos(2 * p.t), 9)
      expect(p.y).toBeCloseTo(Math.sin(2 * p.t), 9)
    }
  })
})

describe('11: interference', () => {
  it('fringes present without detector, gone with it', () => {
    expect(fringeVisibility()).toBeGreaterThan(0.99)
    expect(fringeVisibility({ detector: 1 })).toBeLessThan(0.05)
    expect(fringeVisibility({ detector: 0.5 })).toBeCloseTo(0.5, 1)
    const pat = doubleSlotPattern()
    expect(Math.max(...pat.map((p) => p.y))).toBeCloseTo(1)
  })

  it('individual crumbs build up the pattern', () => {
    const hits = sampleCrumbHits(20000, {}, 7)
    // Central bright fringe (|y| < 1) much more populated than the first dark fringe (|y−5| < 1).
    const bright = hits.filter((h) => Math.abs(h) < 1).length
    const dark = hits.filter((h) => Math.abs(h - 5) < 1).length
    expect(bright).toBeGreaterThan(8 * dark)
    const frames = fringeBuildUp([10, 1000])
    expect(frames[1].histogram.reduce((s, b) => s + b.y, 0)).toBe(1000)
  })
})

describe('12: tunneling', () => {
  it('T(E) is between 0 and 1, nonzero below the barrier, and agrees with the transfer matrix', () => {
    expect(transmissionCoefficient(0.5)).toBeGreaterThan(0)
    expect(transmissionCoefficient(0.5)).toBeLessThan(1)
    for (const E of [0.2, 0.7, 1.0001, 1.6, 3]) {
      const tm = transferMatrixScattering(E, [{ width: 1, potential: 1 }])
      expect(tm.transmission + tm.reflection).toBeCloseTo(1, 9)
      expect(tm.transmission).toBeCloseTo(transmissionCoefficient(E), 6)
    }
    // Double barrier conserves current too.
    const db = transferMatrixScattering(0.6, [
      { width: 0.5, potential: 1 },
      { width: 2, potential: 0 },
      { width: 0.5, potential: 1 },
    ])
    expect(db.transmission + db.reflection).toBeCloseTo(1, 9)
    // Resonance above the barrier: sin(k′a) = 0 → T = 1.
    const Eres = 1 + (Math.PI ** 2) / 2
    expect(transmissionCoefficient(Eres)).toBeCloseTo(1, 9)
    expect(transmissionCurve().every((p) => Math.abs(p.transmission + p.reflection - 1) < 1e-12)).toBe(true)
  })

  it('wavepacket simulation: norm conserved, T + R ≈ 1, T matches theory', () => {
    const sim = simulateTunneling({ energy: 0.8 })
    expect(sim.norm).toBeCloseTo(1, 8)
    expect(sim.transmitted + sim.reflected).toBeGreaterThan(0.995)
    expect(Math.abs(sim.transmitted - sim.expectedTransmission)).toBeLessThan(0.02)
    expect(sim.snapshots.length).toBeGreaterThan(5)
  })
})

describe('13: entanglement', () => {
  it('H + CNOT makes a maximally entangled Bell pair', () => {
    const steps = bellCircuit('phi+')
    expect(steps.map((s) => s.label)).toEqual(['|00⟩', 'H on A', 'CNOT A→B'])
    const bell = bellState('phi+')
    expect(norm(bell)).toBeCloseTo(1, 12)
    expect(entanglementEntropy(bell)).toBeCloseTo(1, 10)
    expect(concurrence(bell)).toBeCloseTo(1, 10)
    expect(reducedDensityMatrix(bell)[0][0].re).toBeCloseTo(0.5)
    const prod = productState(qubitFromBloch(1), qubitFromBloch(2))
    expect(entanglementEntropy(prod)).toBeCloseTo(0, 6)
    expect(entanglementEntropy(bellState('psi-'))).toBeCloseTo(1, 10)
  })

  it('joint measurements are perfectly correlated with fair marginals', () => {
    const r = sampleJointMeasurements(bellState('phi+'), 5000, 3)
    expect(r.agreement).toBe(1)
    expect(r.correlation).toBe(1)
    expect(r.marginalA0).toBeCloseTo(0.5, 1)
    const anti = sampleJointMeasurements(bellState('psi+'), 1000, 3)
    expect(anti.correlation).toBe(-1)
  })
})

describe('14: CHSH', () => {
  it('quantum S = 2√2, LHV S ≤ 2', () => {
    const v = chshValue()
    expect(v.quantum.S).toBeCloseTo(TSIRELSON_BOUND, 10)
    expect(Math.abs(v.lhv.S)).toBeLessThanOrEqual(2 + 1e-12)
    expect(quantumCorrelation(0.3, 1.1)).toBeCloseTo(Math.cos(0.8), 10)
    expect(lhvCorrelation(0, Math.PI / 2)).toBeCloseTo(0)
    for (const p of chshAngleSweep(37)) {
      expect(Math.abs(p.lhv)).toBeLessThanOrEqual(2 + 1e-9)
      expect(Math.abs(p.quantum)).toBeLessThanOrEqual(TSIRELSON_BOUND + 1e-9)
    }
  })

  it('simulated experiments: quantum violates, LHV does not', () => {
    const q = runChshExperiment(10000, 'quantum', undefined, 1)
    const l = runChshExperiment(10000, 'lhv', undefined, 1)
    expect(Math.abs(q.S - TSIRELSON_BOUND)).toBeLessThan(5 * q.stdError)
    expect(q.S).toBeGreaterThan(2.5)
    expect(l.S).toBeLessThan(2 + 5 * l.stdError)
  })
})
