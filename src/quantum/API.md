# Quantum Toaster engine: API reference

Import everything from one place:

```ts
import { QuantumToaster, CONCEPTS, evolveDoneness /* ... */ } from './quantum'
```

- Pure TypeScript with no runtime dependencies and no DOM or Node APIs. Every function is synchronous and fast: under 25 ms for most calls, and `simulateTunneling` takes about 20 ms.
- Units are natural, with ħ = 1 and m = 1. Concepts 19 and 20 are the exception and use SI units and eV, as noted in those sections.
- Every function returns **plain JSON-serializable data**: numbers, arrays and `{ re, im }` objects. Chart series are arrays of `{ x, y }` objects, or `{ x, seriesA, seriesB, ... }` for multi-line charts.
- Anything random takes `rng: Rng | number` as its last argument. Pass a number to use it as a seed (default `42`), or pass a `Rng` from `mulberry32(seed)`. The same seed always gives the same results.
- Every optional parameter has a sensible default, so calling `fn()` alone produces a good demo.

## Core types

| Type | Shape |
|---|---|
| `Complex` | `{ re: number; im: number }` |
| `Vector` | `Complex[]`, a ket \|ψ⟩ |
| `Matrix` | `Complex[][]`, row-major |
| `Point` | `{ x: number; y: number }` |
| `Rng` | `() => number` returning uniform values in [0, 1) |
| `DonenessLevel` | `'raw' \| 'light' \| 'golden' \| 'burnt'` (index 0..3) |
| `ObservableStats` | `{ mean, variance, stdDev }` |
| `CircuitStep` | `{ label: string; state: Vector; probabilities: { basis: '00' \| ...; probability }[] }` |
| `Vec3` | `{ x, y, z }` |

## Concept metadata

- `CONCEPTS: ConceptMeta[]` has 21 entries. Each entry is `{ id, number, name, summary, toasterAnalogy, module, api: string[], stretch? }`. The numbering matches `docs/QUANTUM_CONCEPTS.md`.
- `getConcept(numberOrId)` returns one `ConceptMeta`, or `undefined` if there is no match.

## The `QuantumToaster` class (main UI driver)

```ts
const t = new QuantumToaster({ heatPower: 1, detuning: 0, decoherenceRate: 0, dampingRate: 0, seed: 42 })
t.heat(0.5)                 // chainable; evolves the state
const rec = t.measure()     // Born sample + collapse
setSnap(t.snapshot())       // plain-data copy for React state
```

| Method | Returns | Notes |
|---|---|---|
| `insertSlice(initial?: DonenessLevel \| number \| Vector)` | `this` | Defaults to `'raw'`. A `Vector` is normalized for you. Clears `trace`. |
| `heat(duration, steps?)` | `this` | Unitary e^{−iHt} when both rates are 0; otherwise integrates the Lindblad equation (RK4). By default appends a trace point every 0.05 time units. |
| `measure()` | `MeasurementRecord` | Opens the lid: samples a level from the populations and collapses to it. |
| `peek()` | `MeasurementRecord` | Alias of `measure()`. A peek is still a measurement. |
| `eject()` | `MeasurementRecord` | Final measurement. Afterwards `hasSlice` is `false` and `heat` does nothing. |
| `setSettings(patch: Partial<ToasterSettings>)` | `this` | Changing `seed` re-seeds the RNG. |
| `getSettings()` | `ToasterSettings` | |
| `getProbabilities()` | `number[4]` | Diagonal of ρ. |
| `getAmplitudes()` | `Vector \| null` | `null` once decoherence makes the state mixed. |
| `getDensityMatrix()` | `Matrix` (4×4) | |
| `getExpectation()` | `{ doneness: ObservableStats; energy: ObservableStats }` | Doneness runs from 0 (raw) to 3 (burnt). Energy uses `DONENESS_ENERGIES`. |
| `getTime()` / `getHistory()` | `number` / `HistoryEntry[]` | |
| `reset()` | `this` | Zeroes the clock and history and re-seeds the RNG. Keeps the settings. |
| `snapshot()` | `ToasterSnapshot` | Deep copy that is safe to store in React state. |

- `ToasterSettings` is `{ heatPower, detuning, decoherenceRate, dampingRate, seed }`. Its defaults are in `DEFAULT_TOASTER_SETTINGS`.
- `MeasurementRecord` is `{ outcome: number; level; probability; probabilitiesBefore: number[]; time }`.
- `HistoryEntry` is `{ id, time, kind: 'insert'|'heat'|'measure'|'eject'|'settings'|'reset', message, outcome?, probabilities? }`. At most 200 entries are kept.
- `TracePoint` is `{ t, raw, light, golden, burnt, purity, doneness }`. At most 1000 points are kept. Use it for the live "doneness vs time" chart.
- `ToasterSnapshot` has these fields:

```ts
{
  time, hasSlice, settings,
  amplitudes: Complex[] | null, probabilities: number[],
  levels: { level, probability, amplitude: Complex | null, phase: number | null, energy }[],
  densityMatrix: Complex[][], purity, coherence /* l1 */, isPure,
  expectation: { doneness: ObservableStats; energy: ObservableStats },
  mostLikely: DonenessLevel, measurementCount, lastMeasurement: MeasurementRecord | null,
  history: HistoryEntry[], trace: TracePoint[]
}
```

With `heatPower = Ω` and `detuning = 0`, a full raw → burnt → raw cycle takes 2π/Ω, and the slice is fully burnt at t = π/Ω.

---

## 1–3. State, superposition, Born rule (`concepts/state`)

- `DONENESS_LEVELS` is `['raw','light','golden','burnt']`, and `DONENESS_DIM` is `4`.
- `levelIndex(level | index): number`
- `donenessBasisState(level = 'raw'): Vector`
- `superposition(weights: (number | Complex)[4]): Vector` returns the normalized state.
- `uniformSuperposition(phases = [0,0,0,0]): Vector`
- `isNormalized(psi, tol?): boolean`
- `amplitudeBars(psi): AmplitudeBar[]`, where `AmplitudeBar` is `{ index, level, amplitude, magnitude, phase, probability }`. Use it for an amplitude or phase bar chart.
- `measureDoneness(psi, rng?): MeasurementResult`, where `MeasurementResult` is `{ outcome, level, probability, probabilities, postState }`.
- `sampleMeasurements(psi, shots, rng?): MeasurementStatistics`, where `MeasurementStatistics` is `{ shots, counts, frequencies, expected, bars: { level, observed, expected }[] }`.

## 4–5. Quantization and zero-point energy (`concepts/quantization`)

- `particleInBoxEnergy(n, L = π, m = 1)` computes Eₙ = n²π²/(2mL²).
- `DONENESS_ENERGIES` is `[0.5, 2, 4.5, 8]`: the box energies for n = 1..4.
- `particleInBoxPsi(n, x, L?)` returns a number.
- `particleInBoxLevels(nMax = 4, L?, m?)` returns `{ n, energy }[]`.
- `particleInBoxWavefunction(n, L?, points = 101, density = false)` returns `Point[]`.
- `numericSpectrum(V: (x) => number, xMin, xMax, nLevels = 4, gridPoints = 400, m?)` returns `number[]`. It diagonalizes the finite-difference Hamiltonian.
- `boxSpectrumComparison(nLevels?)` returns `{ n, analytic, numeric }[]`.
- `harmonicEnergy(n, ω = 1)` computes ω(n + ½).
- `zeroPointEnergy(ω)` computes ω/2.
- `harmonicLevels(nMax = 5, ω?)` returns `{ n, energy }[]`.
- `harmonicPsi(n, x, ω?, m?)` returns a number.
- `harmonicWavefunction(n = 0, ω?, m?, points = 121, xRange = 5, density = false)` returns `Point[]`.
- `harmonicPotential(ω?, m?, points?, xRange?)` returns `Point[]`.
- `harmonicEnergyNumeric(n = 0, ...)` returns `{ n, kinetic, potential, total, analytic }`. For n = 0, total ≈ 0.5.
- `harmonicSpectrumComparison(nLevels?)` returns `{ n, analytic, numeric }[]`.

## 6. Schrödinger evolution (`concepts/evolution`)

- `donenessHamiltonian({ power = 1, detuning = 0 }): Matrix` builds H = δ·diag(0,1,2,3) + Ω·Jₓ as a 4×4 tridiagonal matrix.
- `evolveState(H, psi, t): Vector`
- `evolveDoneness({ power?, detuning?, psi0?, tMax = 2π/Ω, steps = 200, hamiltonian? }): EvolutionResult`, where `EvolutionResult` is:

```ts
{ times: number[]; probabilities: number[][]; series: { t, raw, light, golden, burnt, norm }[];
  finalState: Vector; maxNormError: number; unitarityError: number }
```

- `rawSurvivalAnalytic(t, power)` computes cos⁶(Ωt/2), the analytic overlay for δ = 0.

## 7. Observables (`concepts/observables`)

- `DONENESS_OPERATOR` is diag(0,1,2,3), and `ENERGY_OPERATOR` is diag(Eₙ).
- `observableStats(A, psi): ObservableStats`
- `donenessReadout(psi)` returns `{ doneness: ObservableStats; energy: ObservableStats }`.

## 8. Heisenberg uncertainty (`concepts/uncertainty`)

- `heisenbergSlot({ sigma = 1, shape: 'gaussian' | 'box' = 'gaussian', k0 = 0, gridSize = 1024 }): UncertaintyResult`, where `UncertaintyResult` is:

```ts
{ sigma, shape, deltaX, deltaP, product, bound: 0.5, meanX, meanP,
  position: Point[] /* |ψ(x)|² */, momentum: Point[] /* |φ(p)|², x = p */ }
```

  For `shape: 'box'`, `sigma` is the full slot width. In that case Δx·Δp ≈ 0.568.
- `slotWidthSweep(sigmas?, shape?)` returns `{ sigma, deltaX, deltaP, product }[]`. Plot Δp against σ, and plot the product against the 0.5 line.

## 9. Non-commuting observables (`concepts/noncommuting`)

- `PauliAxis` is `'x' | 'y' | 'z'`. `PAULI_EIGENBASIS[axis]` gives the eigenvectors `[+1, −1]`.
- `commutatorDemo()` returns `{ commutator: Matrix; expected: Matrix /* 2iσy */; matches: boolean; commutes: boolean }`.
- `sequentialMeasurement(psi, first, second): SequentialResult`, where `SequentialResult` is `{ order: 'z→x', outcomes: { first: ±1, second: ±1, probability }[4], firstMarginal: { plus, minus }, secondMarginal: { plus, minus } }`.
- `measurementOrderComparison(theta = 0, phi = 0)` returns `{ theta, phi, zThenX, xThenZ, zDirect: { plus, minus }, zAfterX: { plus, minus } }`.
- `sampleSequential(psi, first, second, shots = 1000, rng?)` returns `{ order, shots, counts: { first, second, count, frequency }[] }`.

## 10. Spin-½ and the Bloch sphere (`concepts/spin`, `qubits`)

- `qubitFromBloch(theta, phi = 0): Vector`
- `blochVector(psi): Vec3`
- `blochAngles(psi)` returns `{ theta, phi }`.
- `spinHamiltonian(field: Vec3, gamma = 1): Matrix`
- `larmorPrecession({ theta = π/2, phi = 0, field = {0,0,1}, gamma = 1, tMax = 2 periods, steps = 120 })` returns `{ larmorFrequency, period, series: { t, x, y, z }[] }`.

## 11. Interference (`concepts/interference`)

All functions here take `DoubleSlotOptions = { slitSeparation = 5, slitWidth = 1, wavelength = 0.5, screenDistance = 100, screenHalfWidth = 30, detector = 0 }`. `detector` is the which-slot strength η from 0 to 1, and fringe visibility = 1 − η.

- `doubleSlotIntensity(y, opts?)` returns a number.
- `doubleSlotPattern(opts?, points = 401)` returns `Point[]`, normalized so the peak is 1.
- `fringeSpacing(opts?)` computes λD/d.
- `fringeVisibility(opts?)` returns a value from 0 to 1.
- `sampleCrumbHits(n, opts?, rng?)` returns `number[]`, one screen position per crumb.
- `crumbHistogram(hits, bins = 60, halfWidth = 30)` returns `Point[]`, where x is the bin centre and y is the count.
- `fringeBuildUp(counts = [10,100,1000,10000], opts?, rng?, bins?)` returns `{ crumbs, histogram: Point[] }[]`. Each frame uses the first N crumbs of one random sequence.

## 12. Tunneling (`concepts/tunneling`)

`BarrierOptions` is `{ height = 1, width = 1, mass = 1 }`.

- `transmissionCoefficient(E, opts?)` returns a number. This is the closed-form result for both E < V₀ and E > V₀.
- `transmissionCurve(opts?, eMax = 3V₀, points = 200)` returns `{ x: E, transmission, reflection, classical }[]`.
- `transferMatrixScattering(E, segments: { width, potential }[], mass?)` returns `{ transmission, reflection }`. It works for any piecewise-constant potential, such as a double barrier.
- `simulateTunneling({ energy = 0.8V₀, sigma = 4, x0 = −20, gridSize = 1024, halfLength = 64, dt = 0.1, tMax?, snapshots = 30, ...BarrierOptions })` uses the split-step Fourier method and returns `WavepacketResult`:

```ts
{ potential: Point[]; snapshots: { t, density: Point[] /* 256 pts */, transmitted, reflected }[];
  transmitted, reflected, inBarrier, norm, expectedTransmission, transmissionAtMeanEnergy }
```

## 13. Entanglement (`concepts/entanglement`, `qubits`)

- `BellName` is `'phi+' | 'phi-' | 'psi+' | 'psi-'`.
- `bellCircuit(which = 'phi+')` returns `CircuitStep[]`, with steps `|00⟩ → H on A → CNOT A→B`.
- `bellState(which?)` returns `Vector` (length 4, basis order 00, 01, 10, 11).
- `productState(a, b)`
- `densityMatrix(psi)`
- `reducedDensityMatrix(psi, keep: 0 | 1 = 0)` returns a 2×2 `Matrix`.
- `vonNeumannEntropy(rho)` returns entropy in bits. `entanglementEntropy(psi)` returns a value from 0 to 1 bit. `concurrence(psi)` returns a value from 0 to 1.
- `sampleJointMeasurements(psi, shots = 1000, rng?)` returns `{ shots, counts: Record<'00'|'01'|'10'|'11', number>, outcomes: { basis, count, frequency, expected }[], agreement, correlation, marginalA0, firstRuns: string[] }`.
- `zzCorrelation(psi)` returns ⟨Z⊗Z⟩.
- Gate helpers from `qubits`:
  - Constants: `PAULI_X`, `PAULI_Y`, `PAULI_Z`, `HADAMARD`, `I2`.
  - Lifting gates onto a register: `gateOn(gate, target, n)`, `cnotMatrix(c, t, n)`, `applyGate(state, gate, target, n)`, `applyCnot(state, c, t, n)`.
  - Measurement and comparison: `spinObservable(theta)`, `fidelity(a, b)`, `mixedFidelity(psi, rho)`, `singleQubitReducedDensity(state, q, n)`, `basisLabel(i, n)`.
  - Qubit 0 is the leftmost (most significant) bit.

## 14. CHSH (`concepts/chsh`)

- `ChshAngles` is `{ a, aPrime, b, bPrime }`. `OPTIMAL_CHSH_ANGLES` is `{ 0, π/2, π/4, −π/4 }`. `TSIRELSON_BOUND` is 2√2.
- `quantumCorrelation(a, b, psi = Φ+)` computes cos(a − b) for Φ+. `lhvCorrelation(a, b)` computes the triangle function 1 − 2|a − b|/π.
- `jointOutcomeProbabilities(a, b, psi?)` returns `number[4]` in the order `[++, +−, −+, −−]`.
- `chshValue(angles?, psi?)` returns `{ angles, quantum: { ab, abPrime, aPrimeB, aPrimeBPrime, S }, lhv: {...same}, classicalBound: 2, tsirelsonBound }`.
- `correlationCurve(points = 91)` returns `{ x: a−b, quantum, lhv }[]`.
- `chshAngleSweep(points = 91)` returns `{ x: θ, quantum, lhv }[]`. The quantum curve peaks at 2√2 at θ = π/4.
- `runChshExperiment(shotsPerSetting = 2000, model: 'quantum' | 'lhv' = 'quantum', angles?, rng?)` returns `{ shotsPerSetting, correlations, S, stdError }`.

## 15. Decoherence (`concepts/decoherence`)

- `simulateDecoherence({ rho0 = |uniform⟩⟨uniform|, power = 0, dephasingRate = 0.5, dampingRate = 0, tMax = 8, steps = 100 })` returns `{ series: DecoherencePoint[]; finalRho: Matrix }`, where `DecoherencePoint` is `{ t, purity, coherence, entropy, trace, raw, light, golden, burnt }`.
- `purity(rho)`, `l1Coherence(rho)` and `populations(rho)` each compute one property of ρ. `pureDensityMatrix(psi)` builds ρ from a ket.
- `dephasedCoherence(c0, γ, t)` computes the analytic overlay c0·e^{−γt}.
- Low-level helpers: `dephasingOperators(γ, dim?)`, `dampingOperator(Γ, dim?)`, `lindbladGenerator(H, jumps)`, `lindbladRhs`, `lindbladStep(rho, H, jumps, dt)`, `rk4Step(rho, gen, dt)` and `rk4Substeps(dt, maxRate)`.

## 16. Quantum Zeno (`concepts/zeno`)

`ZenoOptions` is `{ omega = 1, totalTime = π/Ω, levels: 2 | 4 = 2 }`. Unwatched, the toast fully flips in time T.

- `zenoAnalytic(N, omega?, totalTime?)` computes [cos²(ΩT/2N)]ᴺ.
- `zenoSimulated(N, opts?)` uses exact propagators and projections.
- `zenoCurve(Ns?, opts?)` returns `{ N, analytic, simulated, simulatedQudit }[]`.
- `zenoMonteCarlo(N, trials = 2000, opts?, rng?)` returns `{ N, trials, survived, fraction, finalRawFraction }`.

## 17. Pauli exclusion (`concepts/exclusion`)

- `ExchangeSymmetry` is `'boson' | 'fermion' | 'distinguishable'`.
- `twoParticleWavefunction({ n1 = 1, n2 = 2, symmetry = 'fermion', gridSize = 41, L = π })` returns `TwoParticleResult`:

```ts
{ symmetry, n1, n2, xs: number[], psi: number[][], density: number[][] /* heatmap, [i][j] = (x1=xs[i], x2=xs[j]) */,
  rawNorm, allowed, diagonalMax, closeProbability, energy }
```

- `sameStateAttempt(n = 1)` returns `{ n, fermionNorm /* 0 */, fermionAllowed /* false */, bosonNorm, bosonAllowed }`.
- `twoParticleGroundState(symmetry)` returns `{ symmetry, levels: [n1, n2], energy }`.

## 18. No-cloning (`concepts/cloning`)

- `cnotCloner(theta, phi = 0)` and `buzekHilleryCloner(theta, phi = 0)` both return `CloneResult`, which is `{ theta, phi, copyFidelity, originalFidelity, jointFidelity? }`. Only the CNOT cloner sets `jointFidelity`.
- `OPTIMAL_CLONE_FIDELITY` is 5/6.
- `cloningFidelityCurve(points = 61)` returns `{ x: θ, cnotCopy, cnotJoint, buzekHillery, optimal }[]`.

## 19. Blackbody radiation (`concepts/blackbody`, SI units)

- `COIL_TEMPERATURE` is 1100 K.
- `planckRadiance(λ_m, T)` and `rayleighJeansRadiance(λ_m, T)` return W·sr⁻¹·m⁻³.
- `planckRadianceFrequency(ν, T)` and `rayleighJeansRadianceFrequency(ν, T)` are the frequency-space versions.
- `planckToRayleighJeansRatio(ν, T)`
- `wienPeakWavelength(T)` returns metres.
- `glowColor(T)` returns `{ r, g, b, hex }`.
- `blackbodySpectrum(T = 1100, lambdaMinNm = 100, lambdaMaxNm = 8000, points = 240)` returns:

```ts
{ temperature, points: { x: nm, planck, rayleighJeans }[] /* W·sr⁻¹·m⁻²·nm⁻¹ */, wienPeakNm, numericPeakNm,
  peakRadiance, exitanceNumeric, exitanceStefanBoltzmann, glow }
```

  Rayleigh–Jeans is enormous at short λ (the ultraviolet catastrophe). Clip the y-axis to about `2 * peakRadiance`.

## 20. Photoelectric effect (`concepts/photoelectric`, SI and eV)

- `BREAD_WORK_FUNCTION_EV` is 2.3, which puts the threshold near 539 nm.
- `LIGHT_SOURCES` lists `{ name, wavelengthNm }` entries for IR, red, green, blue and UV.
- Conversion helpers: `wavelengthToFrequency(nm)`, `frequencyToWavelength(hz)` and `photonEnergyEv(hz)`.
- `photoelectric({ frequency, intensity = 1000, workFunctionEv = 2.3, quantumEfficiency = 0.1, area = 1e-2 })` returns:

```ts
{ frequency, wavelengthNm, photonEnergyEv, workFunctionEv, thresholdFrequency, thresholdWavelengthNm,
  aboveThreshold, maxKineticEnergyEv, stoppingVoltage, photonRate, electronRate, current, browningRate /* W */ }
```

- `kineticEnergyCurve(φ?, fMinTHz = 200, fMaxTHz = 1200, points = 101)` returns `Point[]` with x in THz and y as K_max in eV.
- `emissionVsIntensity(frequency, φ?, maxIntensity = 2000, points = 21)` returns `Point[]` with x as intensity and y as electrons per second.

## 21. Teleportation (`concepts/teleportation`)

- `teleportationCircuit(psi)` returns `CircuitStep[]`, five 3-qubit steps.
- `teleportationOutcomes(psi = qubitFromBloch(π/3, π/4))` returns `{ input, steps, outcomes: TeleportOutcome[4], averageFidelity }`.
- `TeleportOutcome` is `{ m0, m1, probability, bobBefore: Vector, correction: 'I'|'X'|'Z'|'ZX', bobAfter: Vector, fidelityBefore, fidelity }`.
- `teleport(psi, rng?)` returns `TeleportOutcome & { input, steps }` for one sampled run.

---

## Foundation modules (also exported)

- **`complex`**:
  - Constructors and constants: `complex(re, im)`, `ZERO`, `ONE`, `I`.
  - Arithmetic: `cadd`, `csub`, `cmul`, `cdiv`, `cscale`, `conj`.
  - Magnitude and phase: `abs2`, `cabs`, `phase`.
  - Exponentials and roots: `fromPolar`, `expi`, `cexp`, `csqrt`.
  - Comparison and display: `capprox`, `cformat`.
- **`linalg`**:
  - Construction: `zerosVector`, `basisVector`, `zerosMatrix`, `identity`, `fromReal`, `vectorFromReal`, `diag`, `clone*`.
  - Elementwise arithmetic: `vadd`, `vscale`, `madd`, `msub`, `mscale`, `mscaleReal`.
  - Products: `matmul`, `matvec`, `dagger`, `kron`, `kronVector`, `inner`, `outer`.
  - Norms and measurement: `norm`, `normalize`, `probabilities`, `expectation`.
  - Operator algebra: `commutator`, `anticommutator`, `trace`, `maxAbs`, `partialTrace`.
  - Exponentials: `expm` (scaling-and-squaring Taylor series) and `propagator(H, t)`, which computes e^{−iHt}.
  - Checks: `unitarityError`, `hermiticityError`.
  - Eigenvalues: `eigenvaluesHermitian` (Jacobi method) and `eigenvaluesHermitian2`.
- **`rng`**: `mulberry32(seed)`, `toRng(rngOrSeed)`, `sampleIndex(probs, rng)` and `gaussian(rng)`.
- **`fft`**: `fft(re, im, inverse?)` is an in-place radix-2 transform on `Float64Array`s. Also `dft` (naive reference implementation) and `fftFrequencies(n, dx)`.
- **`types`**: `Point`, `linspace(a, b, n)` and `integrate(ys, dx)`.
- **`constants`**: `PLANCK_H`, `SPEED_OF_LIGHT`, `BOLTZMANN_K`, `ELECTRON_VOLT`, `ELEMENTARY_CHARGE`, `WIEN_B` and `STEFAN_BOLTZMANN`.
