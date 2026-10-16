# Quantum Toaster: Code Walkthrough

A guide to read from while presenting. Every reference is `file:line` (or `:start-end`), checked against the current code.
The concept numbers (1–21) match `docs/QUANTUM_CONCEPTS.md` and `src/quantum/concepts.ts:21` (`CONCEPTS`).

## 1. How to run

```
npm install && npm run dev   # Vite dev server: the clickable toaster
npm test                     # vitest: the 4 physics-invariant suites (vite.config.ts:10-12)
npm run toast                # terminal tour of every concept (src/quantum/cli.ts, ħ = 1 banner at :57)
```

## 2. Architecture in one picture

```
ConceptButtons ──click n──▶ App.select(n)           src/App.tsx:17-21
                                │  runConcept(n, seed)   (src/bridge/runConcept.ts)
                                ▼
                 src/quantum engine (pure functions, ħ = 1, seeded RNG)
                                │  returns chartable plain data
                                ▼
                 ConceptRun {effect, readouts, payload}  src/bridge/types.ts:29-60
                       ┌────────┴─────────┐
                       ▼                  ▼
        ToasterScene → EffectView     Readout (caption + numbers)
        Toaster/ToasterScene.tsx:22-23    components/Readout.tsx:25-35
```

## 3. Foundation (`src/quantum/`)

- **complex.ts**: complex numbers are plain `{re, im}` objects, so they serialize to JSON and are easy to use as React state (`:5-8`). The Born-rule probability is `abs2` (`:32`); `expi`/`cexp` are at `:43-45`.
- **linalg.ts**: small dense linear algebra for matrices up to about 8×8 (`:1-3`). Products are `matmul :46`, `matvec :67`, `dagger :80`, `kron :83`, `inner :99`.
  - `expm` `:146-159` computes the matrix exponential by scaling and squaring a Taylor series. `propagator(h, t) = expm(−iHt)` at `:162` is the Schrödinger propagator.
  - `expectation` `:126` computes ⟨ψ|A|ψ⟩. `commutator` is at `:129` and `trace` at `:134`.
  - `unitarityError` `:165` returns ‖U†U − 1‖, and `hermiticityError` `:168` does the same for A − A†. The tests use both to assert the physics.
  - `partialTrace` `:174-185` computes Tr_B or Tr_A of a bipartite ρ. Entanglement entropy is built on it. `eigenvaluesHermitian` `:202` uses the Jacobi method.
- **rng.ts**: the `mulberry32` PRNG (`:10-19`) is seeded. Every stochastic function takes an `Rng` or a seed through `toRng` (`:22`), so the same seed always produces the same toast and tests are deterministic. `sampleIndex` `:27` performs a Born-rule draw, and `gaussian` `:40` uses Box–Muller.
- **fft.ts**: radix-2 Cooley–Tukey `fft` (`:10-55`), checked against a naive O(N²) `dft` (`:58`). `fftFrequencies` `:80` gives the k-grid. It converts ψ(x) to φ(p) for concepts 8 and 12 (`concepts/uncertainty.ts:86`).
- **qubits.ts**: Pauli matrices and the Hadamard gate (`:14-40`), plus `gateOn` (`:43`), which lifts a gate onto an n-qubit register via kron. Also provides `cnotMatrix :50`, `qubitFromBloch :70`, `spinObservable :78` (cosθ·Z + sinθ·X) and `fidelity :88`. Qubit 0 is the most significant bit (`:2-4`).

## 4. The 21 concepts

Concept functions live in `src/quantum/concepts/`. Tests live in `src/quantum/tests/`, abbreviated in the table below as **A** = `concepts-1-8.test.ts`, **B** = `concepts-9-14.test.ts` and **C** = `concepts-15-21.test.ts`.

| # | Concept | Key function | Equation | Test checks |
|---|---|---|---|---|
| 1 | Hilbert space | `state.ts:26` donenessBasisState, `:43` isNormalized | ψ ∈ ℂ⁴, Σ\|cᵢ\|² = 1 | A:27 normalized |
| 2 | Superposition | `state.ts:33` superposition | ψ = Σcᵢ\|i⟩ / ‖·‖ | A:27 normalized |
| 3 | Born rule / collapse | `state.ts:83` measureDoneness | P(i) = \|cᵢ\|², ψ → \|i⟩ | A:35 collapse; A:45 frequencies ≈ \|c\|² |
| 4 | Quantization | `quantization.ts:11` particleInBoxEnergy | Eₙ = n²π²/2mL² | A:55 n² scaling, matches finite difference |
| 5 | Zero-point energy | `quantization.ts:92` zeroPointEnergy | E₀ = ω/2 | A:63 numeric ground state = ω/2 |
| 6 | Schrödinger evolution | `evolution.ts:22` donenessHamiltonian, `:34` evolveState | ψ(t) = e^{−iHt}ψ | A:74 H Hermitian, U unitary, P_raw = cos⁶(Ωt/2) |
| 7 | Observables | `observables.ts:20` observableStats | ⟨A⟩, Var = ⟨A²⟩ − ⟨A⟩² | A:85 mean and variance |
| 8 | Uncertainty | `uncertainty.ts:47` heisenbergSlot | Δx·Δp ≥ ½ (via FFT) | A:96 Gaussian = ½; A:104 never below ½ |
| 9 | Non-commuting | `noncommuting.ts:32` commutatorDemo | [σz, σx] = 2iσy | B:34 commutator; B:40 order changes statistics |
| 10 | Spin-½ / Bloch | `spin.ts:53` larmorPrecession (`:16` blochVector) | H = (γ/2)B·σ, ω = γB | B:53 \|r\| = 1, precesses at γB |
| 11 | Interference | `interference.ts:45` doubleSlotIntensity | I = sinc²·cos²(πd sinθ/λ) | B:67 fringes vanish with detector; B:75 build-up |
| 12 | Tunneling | `tunneling.ts:27` transmissionCoefficient | T = [1 + V₀² sinh²(κa)/4E(V₀−E)]⁻¹ | B:87 0<T<1, matches transfer matrix; B:108 T+R≈1 |
| 13 | Entanglement | `entanglement.ts:49` bellState, `:69` entanglementEntropy | S = −Tr ρ_A log ρ_A = 1 bit | B:118 H+CNOT is maximal; B:131 correlations |
| 14 | Bell / CHSH | `chsh.ts:46` chshValue (`:27` quantumCorrelation) | S = E(a,b)+E(a,b′)+E(a′,b)−E(a′,b′) | B:142 S = 2√2 vs LHV ≤ 2; B:154 sampled |
| 15 | Decoherence | `decoherence.ts:53` lindbladGenerator, `:112` simulateDecoherence | ρ̇ = −i[H,ρ] + Σ(LρL† − ½{L†L,ρ}) | C:33 purity↓, Tr = 1, C ∝ e^{−γt}; C:51 damping |
| 16 | Zeno | `zeno.ts:35` zenoSimulated (`:27` analytic) | P = [cos²(ΩT/2N)]ᴺ → 1 | C:58 P → 1, simulation = analytic |
| 17 | Pauli exclusion | `exclusion.ts:47` twoParticleWavefunction | ψ(x₁,x₂) = −ψ(x₂,x₁) | C:71 zero on diagonal; C:80 same state = 0 |
| 18 | No-cloning | `cloning.ts:52` buzekHilleryCloner (`:23` cnotCloner) | optimal F = 5/6 | C:90 CNOT fails on superposition; C:97 5/6 |
| 19 | Blackbody | `blackbody.ts:14` planckRadiance | B = 2hc²/λ⁵ · 1/(e^{hc/λkT} − 1) | C:113 → Rayleigh–Jeans; C:118 Wien, Stefan–Boltzmann |
| 20 | Photoelectric | `photoelectric.ts:62` photoelectric | K = hf − φ (zero below f₀) | C:127 no emission below threshold; C:134 K, rate ∝ I |
| 21 | Teleportation | `teleportation.ts:73` teleport (`:63` outcomes) | Bell measurement + X^{m₁}Z^{m₀} correction | C:149 each branch P = ¼, F = 1 |

Concepts 19–20 use SI units from `src/quantum/constants.ts:1-8`. Every other concept uses ħ = 1.

## 5. The stateful toaster: `src/quantum/toaster.ts`

- `ToasterSettings` `:22-33` holds the knobs: heat power Ω, detuning δ, dephasing γ, damping Γ and seed. Defaults are at `:35-41`.
- The class is declared at `:116`. The **constructor** at `:129-136` seeds the RNG with `mulberry32(seed)` and starts in |raw⟩ with ρ = |ψ⟩⟨ψ|.
- **heat** `:154-181` has two branches:
  - **Unitary branch** `:159-166`, taken when γ = Γ = 0: compute U = `propagator(h, dt)` once, then apply ψ ← Uψ each step.
  - **Lindblad branch** `:167-178`: build the dephasing and damping jump operators, then RK4-integrate ρ (`:173`). After that the pure ket no longer exists, so `psi = null` (`:177`).
- **measure** `:184-195` takes the Born probabilities from diag ρ (`:185`), draws with `sampleIndex` (`:186`), then collapses to the outcome |i⟩ (`:187-188`). `peek` at `:198` is an alias for measure because quantum mechanics has no free look. `eject` at `:203` measures and then empties the toaster.
- **snapshot** `:262-291` returns fresh plain data (cloned ρ, purity, coherence, `isPure`, expectations, history, trace), so React can store it safely (`:6-7`).

## 6. Frontend

- **src/App.tsx** keeps three pieces of state: `run: ConceptRun | null` (`:12`), `runKey` (`:13`) and `playing` (`:14`). `select` (`:17-21`) calls `runConcept(n, seed)` with an incrementing seed (`:15`, `:18`) and bumps `runKey` so that clicking the same concept replays the effect. **Play all**: `startPlay` (`:31-34`) and an effect (`:36-44`) step through `CONCEPT_LIST` every `PLAY_MS = 4000` ms (`:9`). The button is at `:58-68`. The layout is buttons, scene with readout, and the 3D panel (`:72-87`).
- **src/components/ConceptButtons.tsx** renders `CONCEPT_LIST` (`:13`). Each button sets `aria-pressed` (`:20`) and calls `onSelect(c.number)` (`:19`).
- **src/components/Readout.tsx** shows the caption (`:25`) and one pill per entry in `run.readouts` (`:27-35`), formatted by `fmt` (`:3-7`). It also has an empty state (`:10-16`).
- **src/components/ModelViewer.tsx** shows the toaster GLB generated with Higgs 3D (`:22`, `public/assets/toaster.glb`). It sends a HEAD check first (`:29-40`), which rejects SPA HTML fallbacks (`:34`). Only if that check passes does it lazy-load `<model-viewer>` from jsDelivr (`:20`, `:42-48`). Otherwise it falls back to the PNG render (`:23`, `:73-74`).
- **src/components/Toaster/ToasterScene.tsx** renders the SVG scene (`:15-25`). The group is keyed `${effect}-${runKey}` (`:22`), so every click remounts it and restarts the animation clocks. It renders `<EffectView effect p={payload}>`, or `<Idle/>` when there is no run (`:23`).
- **src/components/Toaster/effects.tsx** selects effects through the `EFFECTS: Record<EffectId, FX>` lookup table (`:731-753`). `EffectView` (`:755-758`) uses it and falls back to `Idle`. Because the table is typed as a `Record`, TypeScript forces exactly one component per `EffectId`. Each effect reads the engine payload and falls back to defaults when a field is missing (`normProbs` and others, `utils.ts:47`). Representative effects:
  - **Superposition** `:69-79`: `p.probabilities` sets the opacity of the four ghost slices (`:70`, `:75`).
  - **Measurement** `:82-109`: the ghosts shrink, a white flash plays at t = 1.2 (`:86-87`, `:101`), and a solid slice appears in `DONENESS[p.outcome]` (`:85`, `:94`).
  - **Tunneling** `:367-400`: `p.value` is the transmission T (`:369`). The reflected slice has opacity 1 − T and the transmitted ghost has opacity T (`:391-392`).
  - **Entanglement** `:403-436`: one seeded draw from `p.probabilities` (`:405-415`) colours **both** slices with the same colour, linked by a glowing thread (`:424-425`, `:430`).
  - **Zeno** `:515-543`: a blinking eye keeps a count of looks, and the slice stays `DONENESS[0]` (raw) even though the coil is at 0.95 (`:524-526`, `:537-538`).
- **parts.tsx** holds the reusable SVG pieces: `Defs` (gradients and glow filter, `:7`), `Slice` (`:84`), `Ghosts` (`:117`), `Coil` (`:150`), `ToasterBody` (`:182`), `Scene` (`:261`) and `Label` (`:273`).
- **useClock.ts** `:16-35` returns a requestAnimationFrame scene clock that stops after `stopAfter` seconds and runs 3× faster under `prefers-reduced-motion` (`:19`). Every effect computes its frame from `t` alone, so effects hold no imperative animation state.

## Bridge: src/bridge/runConcept.ts

_(filled in after bridge wiring)_

### The contract: `src/bridge/types.ts`

- `EffectId` (`:5-26`) is a union of 21 string literals, one per concept. The comments give the spec number and a description of the visual.
- `ConceptRun` (`:29-60`) has `effect`, `number` (1–21, `:32`), `name`, `caption` (`:35`) and `readouts: Record<string, number | string>` (`:37`).
- `payload` (`:42-59`): every field is optional, and the visuals fall back to defaults (`:38-41`). The fields are `probabilities` (`:44`), `outcome` (`:46`), `series` (`:48`), `value` (`:50`), `samples` (`:52`), `bloch` (`:54`), `color` (`:56`) and `success` (`:58`).

## 8. Tests (`src/quantum/tests/`, vitest)

- **foundation.test.ts** covers the toolkit:
  - complex arithmetic and √ (`:28`)
  - dagger, kron, inner and trace (`:42`)
  - `expm` reproduces e^{−iθX} and returns a unitary matrix (`:52`)
  - the Pauli commutator (`:62`), Hermitian eigenvalues (`:68`) and partial trace (`:82`)
  - FFT equals the DFT and inverts (`:91`); the RNG is reproducible (`:108`)
- **concepts-1-8.test.ts** covers normalization and collapse, Born frequencies, the n² spectrum, ω/2, unitarity plus the cos⁶ law, and Δx·Δp ≥ ½ (`:26-104`).
- **concepts-9-14.test.ts** covers the commutator, Bloch vector length, fringe visibility, T + R = 1, Bell-pair entropy and S = 2√2 (`:33-154`).
- **concepts-15-21.test.ts**:
  - Concepts 15–21 (`:32-149`).
  - `QuantumToaster` (`:161-195`): coherent heating with collapse and plain snapshots (`:162`), the same seed giving the same sequence (`:182`), and decoherence leaving the slice mixed (`:195`).
  - `CONCEPTS` metadata (`:209-215`): all 21 concepts are numbered, and every `api` name is really exported.

## 9. Deploy: `.github/workflows/deploy.yml`

- Triggers on pushes to `main`, on pull requests and on manual dispatch (`:3-7`).
- `build` (`:17-45`) runs Node 22 (`:26`), `npm ci`, **lint** (`:33`), **test** (`:36`) and `npm run build:pages` (`:39`). That script sets `GITHUB_PAGES=1`, which switches the Vite base to `/quantum_toaster/` (`vite.config.ts:8`). The `dist` folder is uploaded except on PRs (`:41-45`).
- `deploy` (`:47-60`) runs only on pushes to main or on dispatch (`:49`). It uses `pages: write` and `id-token: write` (`:51-53`) and calls `actions/deploy-pages@v4` (`:60`).
- **Repo setting:** Settings → Pages → Source must be **"GitHub Actions"**, not "Deploy from a branch". `public/.nojekyll` is also included.

## 10. Talking points

- **Contract first, so agents could work in parallel.** `src/bridge/types.ts` was fixed before anything else. The engine, the bridge and the visuals were then built independently against it. Every payload field is optional, so each side degrades gracefully.
- **ħ = 1 natural units.** Equations stay in their textbook form (`propagator = e^{−iHt}`, `linalg.ts:161-162`). SI units appear only where real numbers matter (blackbody and photoelectric, `constants.ts:1`).
- **Seeded RNG everywhere.** Measurement is random, but `mulberry32` makes it reproducible. Tests can therefore assert Born-rule frequencies, demos are repeatable, and the same seed gives the same toast (`concepts-15-21.test.ts:182`).
- **Physics invariants as tests.** The tests check laws, not snapshots: unitarity, Hermiticity, trace preservation, T + R = 1, Δx·Δp ≥ ½, S ≤ 2 vs 2√2, F = 5/6. Agreement between analytic and numeric results (e.g. Zeno, tunneling transfer matrix) cross-checks the solver.
- **Pure functions that return chartable data.** The engine has no React, no DOM and no console output (`cli.ts:3`). Functions return JSON arrays like `{x, y}` or `{t, raw, …}`, so the same code drives the tests, the CLI tour and the UI.
