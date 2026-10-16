/**
 * `npm run toast` — a guided terminal tour of every concept in the engine.
 * (Console output is fine here; the engine modules themselves never touch the console.)
 */
import {
  CONCEPTS,
  QuantumToaster,
  blackbodySpectrum,
  blochVector,
  boxSpectrumComparison,
  buzekHilleryCloner,
  chshValue,
  cnotCloner,
  commutatorDemo,
  donenessReadout,
  entanglementEntropy,
  evolveDoneness,
  fringeVisibility,
  harmonicEnergyNumeric,
  heisenbergSlot,
  larmorPrecession,
  measureDoneness,
  measurementOrderComparison,
  photoelectric,
  planckToRayleighJeansRatio,
  qubitFromBloch,
  runChshExperiment,
  sameStateAttempt,
  sampleCrumbHits,
  sampleJointMeasurements,
  sampleMeasurements,
  simulateDecoherence,
  simulateTunneling,
  superposition,
  teleportationOutcomes,
  transmissionCoefficient,
  twoParticleWavefunction,
  bellState,
  wavelengthToFrequency,
  zenoCurve,
  zenoMonteCarlo,
  isNormalized,
  amplitudeBars,
  slotWidthSweep,
  LIGHT_SOURCES,
} from './index'

const f = (x: number, d = 3) => x.toFixed(d)
const pct = (x: number) => `${(100 * x).toFixed(1)}%`
const header = (n: number) => {
  const c = CONCEPTS[n - 1]
  console.log(`\n[${String(n).padStart(2)}] ${c.name}`)
  console.log(`     ${c.toasterAnalogy}`)
}
const line = (s: string) => console.log(`     → ${s}`)

console.log('QUANTUM TOASTER — engine tour (ħ = 1)')
console.log('======================================')

header(1)
const psi = superposition([1, { re: 0, im: 1 }, 1, 0.5])
line(`ψ = [${amplitudeBars(psi).map((b) => `${b.level}:${f(b.magnitude, 2)}∠${f(b.phase, 2)}`).join(', ')}], normalized: ${isNormalized(psi)}`)

header(2)
line(`P = ${amplitudeBars(psi).map((b) => `${b.level} ${pct(b.probability)}`).join(' · ')}`)

header(3)
const m = measureDoneness(psi, 7)
line(`Opened the lid → ${m.level} (had P = ${pct(m.probability)}); state collapsed to |${m.level}⟩`)
const stats = sampleMeasurements(psi, 10000, 1)
line(`10 000 lids: ${stats.bars.map((b) => `${b.level} ${pct(b.observed)} (Born ${pct(b.expected)})`).join(' · ')}`)

header(4)
for (const r of boxSpectrumComparison(4)) line(`n=${r.n}: E analytic ${f(r.analytic, 4)}  finite-difference ${f(r.numeric, 4)}`)

header(5)
const ho = harmonicEnergyNumeric(0)
line(`ground state: ⟨T⟩=${f(ho.kinetic, 4)} ⟨V⟩=${f(ho.potential, 4)} ⟨H⟩=${f(ho.total, 4)} (ω/2 = 0.5)`)

header(6)
const ev = evolveDoneness({ power: 1, steps: 8 })
for (const p of ev.series) line(`t=${f(p.t, 2)}  raw ${f(p.raw)} light ${f(p.light)} golden ${f(p.golden)} burnt ${f(p.burnt)}  ‖ψ‖=${f(p.norm, 12)}`)
line(`unitarity error ‖U†U−1‖ = ${ev.unitarityError.toExponential(1)}`)

header(7)
const ro = donenessReadout(psi)
line(`⟨doneness⟩ = ${f(ro.doneness.mean)} ± ${f(ro.doneness.stdDev)}, ⟨E⟩ = ${f(ro.energy.mean)} ± ${f(ro.energy.stdDev)}`)

header(8)
for (const r of slotWidthSweep([0.25, 1, 3])) line(`σ=${r.sigma}: Δx=${f(r.deltaX)} Δp=${f(r.deltaP)} Δx·Δp=${f(r.product, 4)}`)
line(`box slot (w=1): Δx·Δp = ${f(heisenbergSlot({ sigma: 1, shape: 'box' }).product, 4)} (exact 0.5679)`)

header(9)
const cd = commutatorDemo()
line(`[σz, σx] = 2iσy? ${cd.matches}`)
const oc = measurementOrderComparison(0)
line(`butter-up: Z alone P(+1)=${f(oc.zDirect.plus)}; after X first P(Z=+1)=${f(oc.zAfterX.plus)}`)

header(10)
const lar = larmorPrecession({ steps: 4, tMax: Math.PI * 2 })
for (const p of lar.series) line(`t=${f(p.t, 2)} r=(${f(p.x)}, ${f(p.y)}, ${f(p.z)})`)
line(`|r| for a random state = ${f(Math.hypot(...Object.values(blochVector(qubitFromBloch(1.1, 2.3)))), 6)}`)

header(11)
line(`fringe visibility: detector off ${f(fringeVisibility())}, detector on ${f(fringeVisibility({ detector: 1 }))}`)
const hits = sampleCrumbHits(5, {}, 3)
line(`first crumbs land at y = ${hits.map((h) => f(h, 1)).join(', ')}`)

header(12)
for (const E of [0.5, 0.8, 1.5]) line(`E=${E}V₀: T(E) = ${f(transmissionCoefficient(E), 4)}`)
const tun = simulateTunneling({ energy: 0.8 })
line(`wavepacket E₀=0.8V₀: transmitted ${f(tun.transmitted, 4)} (theory ${f(tun.expectedTransmission, 4)}), reflected ${f(tun.reflected, 4)}, norm ${f(tun.norm, 6)}`)

header(13)
const bell = bellState('phi+')
line(`Φ+ amplitudes [${bell.map((z) => f(z.re)).join(', ')}], entanglement entropy ${f(entanglementEntropy(bell))} bit`)
const js = sampleJointMeasurements(bell, 1000, 5)
line(`1000 runs: ${JSON.stringify(js.counts)}, agreement ${pct(js.agreement)}, first runs ${js.firstRuns.slice(0, 8).join(' ')}`)

header(14)
const ch = chshValue()
line(`quantum S = ${f(ch.quantum.S, 4)} (2√2 = ${f(2 * Math.SQRT2, 4)}), LHV S = ${f(ch.lhv.S, 4)}`)
const exQ = runChshExperiment(5000, 'quantum', undefined, 11)
const exL = runChshExperiment(5000, 'lhv', undefined, 11)
line(`simulated lab: quantum S = ${f(exQ.S)} ± ${f(exQ.stdError)}, LHV S = ${f(exL.S)} ± ${f(exL.stdError)}`)

header(15)
const dec = simulateDecoherence({ dephasingRate: 0.5, tMax: 8, steps: 4 })
for (const p of dec.series) line(`t=${f(p.t, 1)} purity ${f(p.purity)} coherence ${f(p.coherence)} entropy ${f(p.entropy)} bits`)

header(16)
for (const z of zenoCurve([1, 2, 5, 10, 50, 100])) line(`N=${String(z.N).padStart(3)} peeks: P(raw) analytic ${f(z.analytic)} simulated ${f(z.simulated)} (4-level ${f(z.simulatedQudit)})`)
const mc = zenoMonteCarlo(10, 2000, {}, 9)
line(`Monte-Carlo N=10: ${pct(mc.fraction)} of 2000 slices never toasted`)

header(17)
const fer = twoParticleWavefunction({ symmetry: 'fermion' })
const bos = twoParticleWavefunction({ symmetry: 'boson' })
line(`fermions max|ψ(x,x)| = ${fer.diagonalMax.toExponential(1)}; P(close) fermion ${f(fer.closeProbability)} vs boson ${f(bos.closeProbability)}`)
const same = sameStateAttempt(1)
line(`both in n=1: fermion norm ${f(same.fermionNorm)} (forbidden), boson norm ${f(same.bosonNorm)}`)

header(18)
for (const th of [0, Math.PI / 4, Math.PI / 2]) {
  const c = cnotCloner(th)
  line(`θ=${f(th, 2)}: CNOT copy fidelity ${f(c.copyFidelity)}, Bužek–Hillery ${f(buzekHilleryCloner(th).copyFidelity, 4)}`)
}

header(19)
const bb = blackbodySpectrum(1100)
line(`T=1100 K: Wien peak ${f(bb.wienPeakNm, 0)} nm (numeric ${f(bb.numericPeakNm, 0)} nm), glow ${bb.glow.hex}`)
line(`exitance ∫ = ${f(bb.exitanceNumeric, 0)} W/m² vs σT⁴ = ${f(bb.exitanceStefanBoltzmann, 0)} W/m²`)
line(`Planck/RJ at 1 THz: ${f(planckToRayleighJeansRatio(1e12, 1100), 4)}; at 600 THz: ${planckToRayleighJeansRatio(6e14, 1100).toExponential(2)}`)

header(20)
for (const s of LIGHT_SOURCES) {
  const pe = photoelectric({ frequency: wavelengthToFrequency(s.wavelengthNm) })
  line(`${s.name.padEnd(13)} ${s.wavelengthNm} nm: hf=${f(pe.photonEnergyEv, 2)} eV, K_max=${f(pe.maxKineticEnergyEv, 2)} eV, electrons/s ${pe.electronRate.toExponential(2)}`)
}

header(21)
const tp = teleportationOutcomes()
for (const o of tp.outcomes) line(`bits ${o.m0}${o.m1} (P=${f(o.probability, 2)}): fidelity before fix ${f(o.fidelityBefore)}, after ${o.correction} → ${f(o.fidelity, 6)}`)

console.log('\nA session with the QuantumToaster class')
console.log('---------------------------------------')
const toaster = new QuantumToaster({ seed: 2024, heatPower: 1 })
toaster.heat(1.2)
const snap = toaster.snapshot()
line(`after heat(1.2): P = ${snap.probabilities.map((p) => f(p)).join(', ')}, ⟨doneness⟩ = ${f(snap.expectation.doneness.mean)}`)
const rec = toaster.measure()
line(`lid opened → ${rec.level}; now P = ${toaster.getProbabilities().map((p) => f(p)).join(', ')}`)
toaster.setSettings({ decoherenceRate: 0.3 }).heat(2)
line(`with kitchen air (γ=0.3), heat(2): purity = ${f(toaster.snapshot().purity)}`)
line(`history: ${toaster.getHistory().map((h) => h.kind).join(' → ')}`)
