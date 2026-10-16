# Quantum Toaster: High-Level Code Map

```
Click button ──► runConcept(n) ──► src/quantum engine (real math) ──► ConceptRun ──► ToasterScene animates effect
 (ConceptButtons)   (src/bridge)        (complex, linalg, concepts/*)     (types.ts)     (src/components/Toaster)
```

## Layers (who builds what)

| Layer | Path | Built by | Job |
|---|---|---|---|
| Spec | `docs/QUANTUM_CONCEPTS.md` | orchestrator | The 21 concepts and their numbering. Every layer uses it. |
| Contract | `src/bridge/types.ts` | orchestrator | `EffectId` (21 visual effects) + `ConceptRun` (caption, readouts, payload). The agents build against this, so they can work in parallel. |
| Engine | `src/quantum/` | Agent A | Pure TS, no dependencies, ħ=1. |
| Toaster visual | `src/components/Toaster/ToasterScene.tsx` + `toaster.css` | Agent C | Inline SVG chrome toaster. `switch(run.effect)` picks 1 of 21 animations driven by `run.payload`. |
| App shell | `src/App.tsx`, `components/ConceptButtons.tsx`, `Readout.tsx`, `ModelViewer.tsx` | Agent D | 21 buttons, "Play all", caption and number chips, and a small 3D-render card (`<model-viewer>` loading the Higgs GLB). |
| Bridge | `src/bridge/runConcept.ts` | Agent D (stub) → Agent E (real) | One `switch` case per concept: calls the engine function and packs the result into a `ConceptRun`. |
| Deploy | `.github/workflows/deploy.yml` | Agent B | lint → test → `build:pages` → GitHub Pages. |
| Walkthrough | `docs/WALKTHROUGH.md` | Agent F | Code tour with file:line references. |

## Engine modules (`src/quantum/`)
- `complex.ts`: complex number arithmetic.
- `linalg.ts`: complex vectors and matrices: matmul, dagger, kron, ⟨ψ|A|ψ⟩, commutator, `expm`, which gives U = e^(−iHt).
- `fft.ts`: Fourier transform, used for momentum space (Heisenberg Δp).
- `rng.ts`: seeded PRNG, so the "random" collapses are reproducible.
- `qubits.ts`: gates (H, CNOT, Pauli) and multi-qubit state vectors.
- `concepts/*.ts`: one module per concept. Each returns plain data that is easy to animate:
  - `state` / `superposition` / measurement: 4-level doneness state, Born-rule sampling, collapse.
  - `quantization`: particle-in-a-box Eₙ and the oscillator ground state ħω/2.
  - `evolution`: Hamiltonian with a heating drive; probabilities over time (Rabi).
  - `observables`: ⟨doneness⟩, ⟨E⟩, variance.
  - `uncertainty`: Gaussian packet; Δx from the grid, Δp from the FFT, Δx·Δp ≥ ½.
  - `noncommuting` / `spin`: Pauli matrices, measurement order, Bloch precession.
  - interference, tunneling (analytic T(E) + wavepacket), entanglement (Bell), CHSH (S = 2√2), decoherence (Lindblad ρ, purity), Zeno, Pauli exclusion, no-cloning (F = 5/6), Planck, photoelectric, teleportation.
- `toaster.ts`: stateful `QuantumToaster` (insert, heat, measure, snapshot).
- `index.ts`: public exports plus `CONCEPTS` metadata.
- `cli.ts`: `npm run toast` prints a terminal tour of all concepts.
- `*.test.ts`: Vitest physics invariants (normalization, unitarity, CHSH, Zeno, ...).

## One click, end to end
1. `ConceptButtons` → `App` calls `runConcept(12, seed)` (tunneling).
2. `runConcept` calls the engine, e.g. `transmission(E, V0, a)` plus a wavepacket simulation, and returns `{effect:'tunneling', caption, readouts:{T:0.18}, payload:{value:0.18}}`.
3. `App` stores the result and bumps `runKey`, which replays the animation on a repeat click.
4. `ToasterScene` renders the `tunneling` effect: the slice slides into the wall and a ghost emerges on the other side at opacity T.
5. `Readout` shows the caption and number chips.
