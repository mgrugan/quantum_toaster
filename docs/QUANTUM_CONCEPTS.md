# Quantum Toaster: Concepts (Hard Mode)

Each concept below is real math in the engine (`src/quantum/`), not just a label.
Units are natural (ħ = 1) unless noted. The toaster's **doneness** is a 4-level quantum system (a *qudit*):
`|raw⟩, |light⟩, |golden⟩, |burnt⟩`.

| # | Concept | What it means | What the toaster does with it |
|---|---------|---------------|-------------------------------|
| 1 | **Quantum state / Hilbert space** | A system is a normalized complex vector. | The slice's doneness is a vector of 4 complex amplitudes with Σ\|cᵢ\|² = 1. |
| 2 | **Superposition** | A state can be a weighted mix of basis states. | Toast is raw *and* golden *and* burnt at once until you look. |
| 3 | **Born rule & measurement collapse** | P(i) = \|cᵢ\|², and measuring projects the state onto the result. | Pressing "Open lid" samples one doneness level and collapses the state. |
| 4 | **Energy quantization (eigenstates)** | Bound systems have discrete energy levels. | The heating coil is a particle-in-a-box with Eₙ ∝ n². Doneness levels are the energy eigenstates. |
| 5 | **Zero-point energy** | A ground state still has energy (ħω/2). | The crumb tray is a harmonic oscillator, so it is never at zero energy. |
| 6 | **Schrödinger evolution (unitary)** | \|ψ(t)⟩ = e^(−iHt)\|ψ(0)⟩; the norm is conserved. | The heating element drives Rabi oscillations raw→golden→raw. Toasting is coherent and reversible. |
| 7 | **Observables & expectation values** | ⟨A⟩ = ⟨ψ\|A\|ψ⟩. | Live ⟨doneness⟩ and ⟨energy⟩ readouts, with variance. |
| 8 | **Heisenberg uncertainty** | Δx·Δp ≥ ħ/2. | A narrower bread slot (smaller Δx) gives a wider spread in pop-up momentum. |
| 9 | **Non-commuting observables** | [A,B] ≠ 0, so measurement order matters. | Measuring "butter side" (σz) then "crust orientation" (σx) gives different statistics from the reverse order. |
| 10 | **Spin-½ / Bloch sphere** | Two-level system, Pauli matrices, Larmor precession. | The butter side is a spin that precesses in the coil's magnetic field. |
| 11 | **Wave–particle duality & interference** | Single particles build up wave interference patterns. | Crumbs from a *two-slot* toaster land one at a time and form fringes. |
| 12 | **Quantum tunneling** | Particles pass through classically forbidden barriers. | The toast sometimes escapes past the pop-up latch with too little energy (transmission T(E)). |
| 13 | **Entanglement** | Joint states that cannot be factored. | A two-slice toaster makes a Bell pair, so the doneness of both slices is perfectly correlated. |
| 14 | **Bell / CHSH violation** | Quantum correlations reach S = 2√2 > 2, which no local hidden-variable theory allows. | The CHSH test on the toast pair gives S ≈ 2.83. |
| 15 | **Decoherence** | Contact with the environment kills coherence (Lindblad dephasing); purity Tr(ρ²) drops. | Kitchen air turns quantum toast into a classical mixture over time. |
| 16 | **Quantum Zeno effect** | Frequent measurement freezes evolution. | "A watched toast never toasts": peek N times and P(still raw) → 1. |
| 17 | **Pauli exclusion** | Identical fermions have antisymmetric states and cannot share a state. | Two fermionic slices cannot occupy the same slot state; ψ(x,x) = 0. |
| 18 | **No-cloning theorem** | Unknown quantum states cannot be copied; the best universal cloner reaches fidelity 5/6. | The "Copy toast" button fails, with a fidelity readout. |
| 19 | **Blackbody radiation (Planck)** | Quantized emission avoids the ultraviolet catastrophe. | The coil's glow spectrum comes from Planck's law, compared against Rayleigh–Jeans. |
| 20 | **Photoelectric effect** | Ejection needs photon frequency above a threshold; intensity does not help. | Browning only starts when the light's frequency exceeds the bread's "work function". |
| 21 | **Quantum teleportation** *(stretch)* | A state moves using entanglement plus 2 classical bits. | Teleports a slice's butter-side state to a toaster in another kitchen. |
