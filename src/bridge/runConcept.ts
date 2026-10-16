import {
  BREAD_WORK_FUNCTION_EV,
  LIGHT_SOURCES,
  OPTIMAL_CLONE_FIDELITY,
  QuantumToaster,
  TSIRELSON_BOUND,
  amplitudeBars,
  bellState,
  blackbodySpectrum,
  boxSpectrumComparison,
  buzekHilleryCloner,
  chshValue,
  cnotCloner,
  commutatorDemo,
  complex,
  concurrence,
  donenessReadout,
  entanglementEntropy,
  evolveDoneness,
  fringeSpacing,
  fringeVisibility,
  harmonicEnergyNumeric,
  heisenbergSlot,
  isNormalized,
  larmorPrecession,
  measureDoneness,
  measurementOrderComparison,
  mulberry32,
  photoelectric,
  planckToRayleighJeansRatio,
  probabilities as probsOf,
  qubitFromBloch,
  runChshExperiment,
  sameStateAttempt,
  sampleCrumbHits,
  sampleJointMeasurements,
  sampleMeasurements,
  simulateDecoherence,
  simulateTunneling,
  superposition,
  teleport,
  twoParticleWavefunction,
  wavelengthToFrequency,
  zenoAnalytic,
  zenoMonteCarlo,
  zenoSimulated,
  type Rng,
  type Vector,
} from '../quantum'
import type { ConceptRun, EffectId } from './types'

export interface ConceptInfo {
  number: number
  effect: EffectId
  name: string
  short: string
}

export const CONCEPT_LIST: ConceptInfo[] = [
  { number: 1, effect: 'state', name: 'Quantum state', short: '4 complex amplitudes, Σ|c|² = 1' },
  { number: 2, effect: 'superposition', name: 'Superposition', short: 'Raw and golden and burnt at once' },
  { number: 3, effect: 'measurement', name: 'Measurement', short: 'Born rule: open the lid, collapse' },
  { number: 4, effect: 'quantization', name: 'Quantization', short: 'Coil levels Eₙ ∝ n²' },
  { number: 5, effect: 'zeroPoint', name: 'Zero-point energy', short: 'Never fully cold: ħω/2' },
  { number: 6, effect: 'evolution', name: 'Schrödinger evolution', short: 'Rabi: raw → golden → raw' },
  { number: 7, effect: 'observables', name: 'Observables', short: '⟨doneness⟩ and variance' },
  { number: 8, effect: 'uncertainty', name: 'Uncertainty', short: 'Narrow slot, wild pop-up' },
  { number: 9, effect: 'nonCommuting', name: 'Non-commuting', short: 'Order of measurement matters' },
  { number: 10, effect: 'spin', name: 'Spin-½', short: 'Butter side precesses' },
  { number: 11, effect: 'interference', name: 'Interference', short: 'Two-slot crumbs form fringes' },
  { number: 12, effect: 'tunneling', name: 'Tunneling', short: 'Toast escapes through the latch' },
  { number: 13, effect: 'entanglement', name: 'Entanglement', short: 'Two slices, one fate' },
  { number: 14, effect: 'bell', name: 'Bell / CHSH', short: 'S = 2√2 > 2' },
  { number: 15, effect: 'decoherence', name: 'Decoherence', short: 'Kitchen air kills coherence' },
  { number: 16, effect: 'zeno', name: 'Quantum Zeno', short: 'A watched toast never toasts' },
  { number: 17, effect: 'exclusion', name: 'Pauli exclusion', short: 'Two fermion slices, one slot: no' },
  { number: 18, effect: 'noCloning', name: 'No-cloning', short: 'Copy toast fails (F ≤ 5/6)' },
  { number: 19, effect: 'blackbody', name: 'Blackbody', short: 'Planck glow, no UV catastrophe' },
  { number: 20, effect: 'photoelectric', name: 'Photoelectric', short: 'Frequency, not intensity' },
  { number: 21, effect: 'teleportation', name: 'Teleportation', short: 'Slice moves via 2 classical bits' },
]

const r2 = (x: number) => Math.round(x * 100) / 100
const r3 = (x: number) => Math.round(x * 1000) / 1000
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const DONENESS = ['raw', 'light', 'golden', 'burnt']

/** Pick ~`n` evenly spaced items (always keeps the last one). */
function subsample<T>(xs: T[], n: number): T[] {
  if (xs.length <= n) return xs
  const out: T[] = []
  for (let k = 0; k < n; k++) out.push(xs[Math.round((k * (xs.length - 1)) / (n - 1))])
  return out
}

/** Random doneness state with random amplitudes and phases, every level populated. */
function randomState(rng: Rng): Vector {
  return superposition(
    [0, 1, 2, 3].map(() => {
      const mag = 0.3 + rng()
      const ph = rng() * 2 * Math.PI
      return complex(mag * Math.cos(ph), mag * Math.sin(ph))
    }),
  )
}

/** Inverse-CDF sample of x from a sampled density curve. */
function sampleCurve(pts: { x: number; y: number }[], rng: Rng): number {
  const total = pts.reduce((a, p) => a + p.y, 0)
  let r = rng() * total
  for (const p of pts) {
    r -= p.y
    if (r <= 0) return p.x
  }
  return pts[pts.length - 1].x
}

export function runConcept(number: number, seed: number): ConceptRun {
  const info = CONCEPT_LIST.find((c) => c.number === number) ?? CONCEPT_LIST[0]
  const rng = mulberry32(seed * 7919 + info.number)
  const base = { effect: info.effect, number: info.number, name: info.name }

  switch (info.number) {
    case 1: {
      const psi = randomState(rng)
      const bars = amplitudeBars(psi)
      const p = bars.map((b) => b.probability)
      const norm = p.reduce((a, b) => a + b, 0)
      const top = bars.reduce((a, b) => (b.probability > a.probability ? b : a))
      return {
        ...base,
        caption: `|ψ⟩ is 4 complex amplitudes with Σ|c|² = ${r3(norm)}; the biggest bar is ${top.level} (|c|² = ${r2(top.probability)}, phase ${r2(top.phase)} rad).`,
        readouts: { 'Σ|c|²': r3(norm), normalized: isNormalized(psi) ? 'yes' : 'no', ...Object.fromEntries(p.map((x, i) => [`P(${DONENESS[i]})`, r3(x)])) },
        payload: { probabilities: p },
      }
    }
    case 2: {
      const psi = randomState(rng)
      const stats = sampleMeasurements(psi, 1000, rng)
      return {
        ...base,
        caption: `One state, all four donenesses at once: 1000 peeks found golden ${r2(stats.frequencies[2])} vs Born ${r2(stats.expected[2])}, burnt ${r2(stats.frequencies[3])} vs ${r2(stats.expected[3])}.`,
        readouts: { 'P(golden)': r3(stats.expected[2]), 'observed golden': r3(stats.frequencies[2]), 'P(burnt)': r3(stats.expected[3]), shots: stats.shots },
        payload: { probabilities: stats.expected },
      }
    }
    case 3: {
      const psi = randomState(rng)
      const m = measureDoneness(psi, rng)
      const after = probsOf(m.postState)
      return {
        ...base,
        caption: `Opening the lid sampled the Born rule: "${m.level}" came up with P = ${r2(m.probability)}, and the state collapsed to it (P = ${r2(after[m.outcome])}).`,
        readouts: { outcome: m.level, 'P(outcome)': r3(m.probability), 'post-collapse P': r3(after[m.outcome]) },
        payload: { probabilities: m.probabilities, outcome: m.outcome },
      }
    }
    case 4: {
      const cmp = boxSpectrumComparison(4, Math.PI, 1, 80)
      const e = cmp.map((c) => c.analytic)
      return {
        ...base,
        caption: `The coil is a particle in a box: only Eₙ = n²E₁ exist (${e.map(r2).join(', ')}); the numerical solver finds E₄ = ${r2(cmp[3].numeric)}.`,
        readouts: { E1: r2(e[0]), E2: r2(e[1]), E3: r2(e[2]), E4: r2(e[3]), 'E4 numeric': r2(cmp[3].numeric) },
        payload: { samples: e.map((x) => x / e[3]) },
      }
    }
    case 5: {
      const omega = r2(0.5 + rng() * 1.5)
      const g = harmonicEnergyNumeric(0, omega, 1, 801, 10 / Math.sqrt(omega))
      return {
        ...base,
        caption: `The crumb tray is a harmonic oscillator (ω = ${omega}): even its ground state holds E₀ = ${r3(g.total)} = ħω/2, split into KE ${r3(g.kinetic)} + PE ${r3(g.potential)}.`,
        readouts: { ω: omega, 'E₀ numeric': r3(g.total), 'ħω/2': r3(g.analytic), '⟨KE⟩': r3(g.kinetic) },
        payload: { value: clamp01(g.total / (g.analytic * 2)) },
      }
    }
    case 6: {
      const power = r2(0.7 + rng() * 0.8)
      const ev = evolveDoneness({ power, steps: 240 })
      const series = subsample(ev.probabilities, 60)
      const peakBurnt = Math.max(...ev.probabilities.map((r) => r[3]))
      return {
        ...base,
        caption: `e^(−iHt) with Ω = ${power} cycles raw → burnt → raw in T = ${r2((2 * Math.PI) / power)}; peak P(burnt) = ${r2(peakBurnt)}, norm drift ${ev.maxNormError.toExponential(1)}.`,
        readouts: { 'Ω (Rabi)': power, period: r2((2 * Math.PI) / power), 'max P(burnt)': r3(peakBurnt), 'norm error': ev.maxNormError.toExponential(1) },
        payload: { series },
      }
    }
    case 7: {
      const dur = r2(0.3 + rng() * 2.5)
      const t = new QuantumToaster({ seed }).insertSlice('raw').heat(dur)
      const psi = t.getAmplitudes()!
      const { doneness } = donenessReadout(psi)
      return {
        ...base,
        caption: `After heating ${dur} time units the gauge reads ⟨D⟩ = ${r2(doneness.mean)} ± ${r2(doneness.stdDev)} (0 = raw, 3 = burnt).`,
        readouts: { 'heat time': dur, '⟨D⟩': r3(doneness.mean), 'Var(D)': r3(doneness.variance), ΔD: r3(doneness.stdDev) },
        payload: { probabilities: t.getProbabilities(), value: doneness.mean / 3 },
      }
    }
    case 8: {
      const sigma = r2(0.25 + rng() * 0.75)
      const u = heisenbergSlot({ sigma, gridSize: 512 })
      // Momentum spread mapped into [0,1]: p ∈ [-3, 3] → [0, 1].
      const samples = Array.from({ length: 60 }, () => clamp01(0.5 + sampleCurve(u.momentum, rng) / 6))
      return {
        ...base,
        caption: `Slot width σ = ${sigma} pins Δx = ${r3(u.deltaX)}, so the pop-up momentum spreads to Δp = ${r3(u.deltaP)}: Δx·Δp = ${r3(u.product)} ≥ ½.`,
        readouts: { Δx: r3(u.deltaX), Δp: r3(u.deltaP), 'Δx·Δp': r3(u.product), bound: u.bound },
        payload: { samples, value: clamp01(u.deltaX) },
      }
    }
    case 9: {
      const theta = r2(0.3 + rng() * 2.5)
      const c = measurementOrderComparison(theta, 0)
      const comm = commutatorDemo()
      return {
        ...base,
        caption: `Starting at θ = ${theta}: P(z=+) is ${r2(c.zDirect.plus)} if measured directly but ${r2(c.zAfterX.plus)} after an x measurement, because [σz, σx] = 2iσy ≠ 0.`,
        readouts: { 'P(z+) direct': r3(c.zDirect.plus), 'P(z+) after x': r3(c.zAfterX.plus), commutes: comm.commutes ? 'yes' : 'no' },
        payload: { success: !comm.commutes },
      }
    }
    case 10: {
      const theta = 0.4 + rng() * 2.3
      const B = r2(0.6 + rng() * 1.2)
      const l = larmorPrecession({ theta, field: { x: 0, y: 0, z: B }, steps: 60 })
      const bloch = l.series.map((s) => [r3(s.x), r3(s.y), r3(s.z)] as [number, number, number])
      return {
        ...base,
        caption: `The butter-side spin precesses about the coil field B = ${B} at ω_L = ${r2(l.larmorFrequency)} (period ${r2(l.period)}), keeping ⟨σz⟩ = ${r2(bloch[0][2])} fixed.`,
        readouts: { ω_L: r3(l.larmorFrequency), period: r2(l.period), 'θ (deg)': Math.round((theta * 180) / Math.PI), '⟨σz⟩': r3(bloch[0][2]) },
        payload: { bloch },
      }
    }
    case 11: {
      const detector = rng() < 0.25 ? r2(0.6 + rng() * 0.4) : 0
      const opts = { detector }
      const hits = sampleCrumbHits(300, opts, rng)
      const half = 30
      const samples = hits.map((y) => clamp01((y + half) / (2 * half)))
      const vis = fringeVisibility(opts)
      return {
        ...base,
        caption:
          detector > 0
            ? `A which-slot detector (η = ${detector}) washed the fringes out to visibility ${r2(vis)}: watching kills interference.`
            : `${hits.length} crumbs landed one at a time yet built fringes ${r2(fringeSpacing(opts))} apart (visibility ${r2(vis)}): each went through both slots.`,
        readouts: { crumbs: hits.length, 'fringe spacing': r2(fringeSpacing(opts)), visibility: r3(vis), detector },
        payload: { samples },
      }
    }
    case 12: {
      const eOverV = r2(0.3 + rng() * 0.9)
      const w = simulateTunneling({ energy: eOverV, height: 1, width: 1, snapshots: 8, gridSize: 512 })
      const T = clamp01(w.transmitted)
      const success = rng() < T
      return {
        ...base,
        caption: success
          ? `At E/V = ${eOverV} the wavepacket leaked ${Math.round(T * 100)}% through the latch, and this slice was in that part: it tunneled.`
          : `At E/V = ${eOverV} only ${Math.round(T * 100)}% of the wavepacket gets through; this slice bounced off the latch.`,
        readouts: { 'E/V': eOverV, 'T (wavepacket)': r3(T), 'T(E) exact': r3(w.transmissionAtMeanEnergy), tunneled: success ? 'yes' : 'no' },
        payload: { value: T, success },
      }
    }
    case 13: {
      // Φ+ = (|00⟩ + |11⟩)/√2. Map qubit 0 → raw and 1 → burnt, so |00⟩ = |raw,raw⟩, |11⟩ = |burnt,burnt⟩.
      const psi = bellState('phi+')
      const joint = probsOf(psi)
      const stats = sampleJointMeasurements(psi, 1000, rng)
      const first = stats.firstRuns[0] ?? '00'
      const outcome = first === '11' ? 3 : 0
      return {
        ...base,
        caption: `Bell pair (|raw,raw⟩ + |burnt,burnt⟩)/√2: both slices came out "${DONENESS[outcome]}"; over ${stats.shots} runs they agreed ${Math.round(stats.agreement * 100)}% of the time.`,
        readouts: { outcome: DONENESS[outcome], agreement: r3(stats.agreement), 'entropy (bits)': r3(entanglementEntropy(psi)), concurrence: r3(concurrence(psi)) },
        payload: { probabilities: [joint[0], 0, 0, joint[3]], outcome },
      }
    }
    case 14: {
      const exp = runChshExperiment(1500, 'quantum', undefined, rng)
      const exact = chshValue()
      const S = r3(exp.S)
      return {
        ...base,
        caption: `Measured S = ${S} ± ${r2(exp.stdError)} on the toast pair (theory ${r3(exact.quantum.S)}), beating the local hidden-variable limit of 2.`,
        readouts: { 'S (CHSH)': S, '± σ': r3(exp.stdError), 'classical max': 2, Tsirelson: r3(TSIRELSON_BOUND) },
        payload: { value: S, success: S > 2 },
      }
    }
    case 15: {
      const rate = r2(0.2 + rng() * 0.6)
      const d = simulateDecoherence({ dephasingRate: rate, power: 0.6, tMax: 8, steps: 80 })
      const series = subsample(d.series, 50).map((s) => [s.raw, s.light, s.golden, s.burnt])
      const first = d.series[0]
      const last = d.series[d.series.length - 1]
      return {
        ...base,
        caption: `Kitchen-air dephasing (γ = ${rate}) drains l1 coherence ${r2(first.coherence)} → ${r2(last.coherence)}; purity Tr(ρ²) falls ${r2(first.purity)} → ${r2(last.purity)}.`,
        readouts: { γ: rate, 'Tr(ρ²) start': r3(first.purity), 'Tr(ρ²) end': r3(last.purity), 'entropy end': r3(last.entropy) },
        payload: { series, value: clamp01(last.purity) },
      }
    }
    case 16: {
      const N = 5 + Math.floor(rng() * 26)
      const T = Math.PI
      const series = Array.from({ length: N + 1 }, (_, k) => {
        const pRaw = k === 0 ? 1 : zenoAnalytic(k, 1, (k * T) / N)
        return [pRaw, 0, 0, 1 - pRaw]
      })
      const pRaw = zenoSimulated(N)
      const mc = zenoMonteCarlo(N, 1000, {}, rng)
      return {
        ...base,
        caption: `Unwatched, the toast fully flips in T; peeking ${N} times keeps it raw with P = ${r2(pRaw)} (${mc.survived}/${mc.trials} Monte-Carlo toasts survived).`,
        readouts: { peeks: N, 'P(still raw)': r3(pRaw), 'MC fraction': r3(mc.fraction), 'P(unwatched)': r3(zenoSimulated(1)) },
        payload: { series, value: pRaw },
      }
    }
    case 17: {
      const n2 = 2 + Math.floor(rng() * 2)
      const f = twoParticleWavefunction({ n1: 1, n2, symmetry: 'fermion' })
      const b = twoParticleWavefunction({ n1: 1, n2, symmetry: 'boson' })
      const same = sameStateAttempt(1)
      return {
        ...base,
        caption: `Fermion slices in levels 1 and ${n2} have ψ(x,x) = ${r3(f.diagonalMax)}: P(close together) = ${r3(f.closeProbability)} vs ${r3(b.closeProbability)} for bosons; both in level 1 has norm ${r3(same.fermionNorm)}, so it is forbidden.`,
        readouts: { 'max |ψ(x,x)|': r3(f.diagonalMax), 'P(close) fermion': r3(f.closeProbability), 'P(close) boson': r3(b.closeProbability), 'same level allowed': same.fermionAllowed ? 'yes' : 'no' },
        payload: { value: clamp01(f.closeProbability), success: same.fermionAllowed },
      }
    }
    case 18: {
      const theta = 0.3 + rng() * 2.5
      const c = cnotCloner(theta)
      const bh = buzekHilleryCloner(theta)
      return {
        ...base,
        caption: `Copying an unknown state (θ = ${r2(theta)}) with a CNOT gives copy fidelity ${r2(c.copyFidelity)}; the best universal cloner reaches only ${r3(bh.copyFidelity)} = 5/6.`,
        readouts: { 'CNOT copy F': r3(c.copyFidelity), 'Bužek–Hillery F': r3(bh.copyFidelity), 'optimal bound': r3(OPTIMAL_CLONE_FIDELITY), 'θ (deg)': Math.round((theta * 180) / Math.PI) },
        payload: { value: c.copyFidelity, success: c.copyFidelity > 0.999 },
      }
    }
    case 19: {
      const T = Math.round(800 + rng() * 1400)
      const bb = blackbodySpectrum(T, 100, 8000, 120)
      const ratio = planckToRayleighJeansRatio(wavelengthToFrequency(400), T)
      return {
        ...base,
        caption: `At ${T} K Planck’s law peaks at ${Math.round(bb.wienPeakNm)} nm and the coil glows ${bb.glow.hex}; at 400 nm Rayleigh–Jeans overshoots by ×${(1 / ratio).toExponential(1)} (the UV catastrophe).`,
        readouts: { 'T (K)': T, 'λ_peak (nm)': Math.round(bb.wienPeakNm), 'RJ/Planck @400nm': (1 / ratio).toExponential(1), glow: bb.glow.hex },
        payload: { color: bb.glow.hex, value: clamp01((T - 800) / 1400) },
      }
    }
    case 20: {
      const src = LIGHT_SOURCES[Math.floor(rng() * LIGHT_SOURCES.length)]
      const intensity = Math.round(200 + rng() * 1800)
      const pe = photoelectric({ frequency: wavelengthToFrequency(src.wavelengthNm), intensity })
      return {
        ...base,
        caption: pe.aboveThreshold
          ? `${src.name} light (${src.wavelengthNm} nm, ${r2(pe.photonEnergyEv)} eV) beats the ${BREAD_WORK_FUNCTION_EV} eV work function: electrons fly with up to ${r2(pe.maxKineticEnergyEv)} eV.`
          : `${src.name} light (${src.wavelengthNm} nm, ${r2(pe.photonEnergyEv)} eV) is below the ${BREAD_WORK_FUNCTION_EV} eV work function: no electrons, even at ${intensity} W/m².`,
        readouts: { 'λ (nm)': src.wavelengthNm, 'photon (eV)': r2(pe.photonEnergyEv), 'KE_max (eV)': r2(pe.maxKineticEnergyEv), 'e⁻/s': pe.electronRate.toExponential(1) },
        payload: { value: clamp01(pe.photonEnergyEv / (2 * BREAD_WORK_FUNCTION_EV)), success: pe.aboveThreshold },
      }
    }
    case 21:
    default: {
      const psi = qubitFromBloch(rng() * Math.PI, rng() * 2 * Math.PI)
      const run = teleport(psi, rng)
      const bits = `${run.m0}${run.m1}`
      return {
        ...base,
        caption: `Alice's Bell measurement gave bits ${bits} (P = ${r2(run.probability)}); Bob applied ${run.correction} and his slice matches the original with fidelity ${r3(run.fidelity)} (was ${r2(run.fidelityBefore)} before correcting).`,
        readouts: { 'classical bits': bits, correction: run.correction, fidelity: r3(run.fidelity), 'F before fix': r3(run.fidelityBefore) },
        payload: { value: run.fidelity, success: run.fidelity > 0.99 },
      }
    }
  }
}
