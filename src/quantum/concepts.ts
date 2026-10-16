/** Metadata for the 21 concepts in docs/QUANTUM_CONCEPTS.md (same numbering). */

export interface ConceptMeta {
  /** Stable slug, e.g. "tunneling". */
  id: string
  /** 1..21, matching the spec table. */
  number: number
  name: string
  /** What the physics means, in one line. */
  summary: string
  /** What the toaster does with it. */
  toasterAnalogy: string
  /** Engine source module. */
  module: string
  /** Main exported functions for this concept (see API.md). */
  api: string[]
  /** True for the stretch goal. */
  stretch?: boolean
}

export const CONCEPTS: readonly ConceptMeta[] = [
  {
    id: 'hilbert-space',
    number: 1,
    name: 'Quantum state / Hilbert space',
    summary: 'A system is a normalized complex vector.',
    toasterAnalogy: "The slice's doneness is a vector of 4 complex amplitudes with Σ|cᵢ|² = 1.",
    module: 'concepts/state',
    api: ['donenessBasisState', 'isNormalized', 'DONENESS_LEVELS'],
  },
  {
    id: 'superposition',
    number: 2,
    name: 'Superposition',
    summary: 'A state can be a weighted mix of basis states.',
    toasterAnalogy: 'Toast is raw and golden and burnt at once until you look.',
    module: 'concepts/state',
    api: ['superposition', 'uniformSuperposition', 'amplitudeBars'],
  },
  {
    id: 'born-rule',
    number: 3,
    name: 'Born rule & measurement collapse',
    summary: 'P(i) = |cᵢ|², and measuring projects the state onto the result.',
    toasterAnalogy: 'Pressing "Open lid" samples one doneness level and collapses the state.',
    module: 'concepts/state',
    api: ['measureDoneness', 'sampleMeasurements', 'QuantumToaster.measure'],
  },
  {
    id: 'energy-quantization',
    number: 4,
    name: 'Energy quantization (eigenstates)',
    summary: 'Bound systems have discrete energy levels.',
    toasterAnalogy: 'The heating coil is a particle-in-a-box with Eₙ ∝ n². Doneness levels are the energy eigenstates.',
    module: 'concepts/quantization',
    api: ['particleInBoxEnergy', 'particleInBoxLevels', 'particleInBoxWavefunction', 'boxSpectrumComparison', 'DONENESS_ENERGIES'],
  },
  {
    id: 'zero-point-energy',
    number: 5,
    name: 'Zero-point energy',
    summary: 'A ground state still has energy (ħω/2).',
    toasterAnalogy: 'The crumb tray is a harmonic oscillator, so it is never at zero energy.',
    module: 'concepts/quantization',
    api: ['zeroPointEnergy', 'harmonicLevels', 'harmonicWavefunction', 'harmonicEnergyNumeric', 'harmonicSpectrumComparison'],
  },
  {
    id: 'schrodinger-evolution',
    number: 6,
    name: 'Schrödinger evolution (unitary)',
    summary: '|ψ(t)⟩ = e^(−iHt)|ψ(0)⟩; the norm is conserved.',
    toasterAnalogy: 'The heating element drives Rabi oscillations raw→golden→raw. Toasting is coherent and reversible.',
    module: 'concepts/evolution',
    api: ['donenessHamiltonian', 'evolveDoneness', 'evolveState', 'rawSurvivalAnalytic'],
  },
  {
    id: 'observables',
    number: 7,
    name: 'Observables & expectation values',
    summary: '⟨A⟩ = ⟨ψ|A|ψ⟩.',
    toasterAnalogy: 'Live ⟨doneness⟩ and ⟨energy⟩ readouts, with variance.',
    module: 'concepts/observables',
    api: ['donenessReadout', 'observableStats', 'DONENESS_OPERATOR', 'ENERGY_OPERATOR'],
  },
  {
    id: 'heisenberg',
    number: 8,
    name: 'Heisenberg uncertainty',
    summary: 'Δx·Δp ≥ ħ/2.',
    toasterAnalogy: 'A narrower bread slot (smaller Δx) gives a wider spread in pop-up momentum.',
    module: 'concepts/uncertainty',
    api: ['heisenbergSlot', 'slotWidthSweep'],
  },
  {
    id: 'non-commuting',
    number: 9,
    name: 'Non-commuting observables',
    summary: '[A,B] ≠ 0, so measurement order matters.',
    toasterAnalogy: 'Measuring "butter side" (σz) then "crust orientation" (σx) gives different statistics from the reverse order.',
    module: 'concepts/noncommuting',
    api: ['commutatorDemo', 'sequentialMeasurement', 'measurementOrderComparison', 'sampleSequential'],
  },
  {
    id: 'spin-half',
    number: 10,
    name: 'Spin-½ / Bloch sphere',
    summary: 'Two-level system, Pauli matrices, Larmor precession.',
    toasterAnalogy: "The butter side is a spin that precesses in the coil's magnetic field.",
    module: 'concepts/spin',
    api: ['blochVector', 'blochAngles', 'larmorPrecession', 'qubitFromBloch'],
  },
  {
    id: 'interference',
    number: 11,
    name: 'Wave–particle duality & interference',
    summary: 'Single particles build up wave interference patterns.',
    toasterAnalogy: 'Crumbs from a two-slot toaster land one at a time and form fringes.',
    module: 'concepts/interference',
    api: ['doubleSlotPattern', 'sampleCrumbHits', 'crumbHistogram', 'fringeBuildUp', 'fringeVisibility'],
  },
  {
    id: 'tunneling',
    number: 12,
    name: 'Quantum tunneling',
    summary: 'Particles pass through classically forbidden barriers.',
    toasterAnalogy: 'The toast sometimes escapes past the pop-up latch with too little energy (transmission T(E)).',
    module: 'concepts/tunneling',
    api: ['transmissionCoefficient', 'transmissionCurve', 'transferMatrixScattering', 'simulateTunneling'],
  },
  {
    id: 'entanglement',
    number: 13,
    name: 'Entanglement',
    summary: 'Joint states that cannot be factored.',
    toasterAnalogy: 'A two-slice toaster makes a Bell pair, so the doneness of both slices is perfectly correlated.',
    module: 'concepts/entanglement',
    api: ['bellCircuit', 'bellState', 'reducedDensityMatrix', 'entanglementEntropy', 'concurrence', 'sampleJointMeasurements'],
  },
  {
    id: 'chsh',
    number: 14,
    name: 'Bell / CHSH violation',
    summary: 'Quantum correlations reach S = 2√2 > 2, which no local hidden-variable theory allows.',
    toasterAnalogy: 'The CHSH test on the toast pair gives S ≈ 2.83.',
    module: 'concepts/chsh',
    api: ['chshValue', 'correlationCurve', 'chshAngleSweep', 'runChshExperiment', 'quantumCorrelation', 'lhvCorrelation'],
  },
  {
    id: 'decoherence',
    number: 15,
    name: 'Decoherence',
    summary: 'Contact with the environment kills coherence (Lindblad dephasing); purity Tr(ρ²) drops.',
    toasterAnalogy: 'Kitchen air turns quantum toast into a classical mixture over time.',
    module: 'concepts/decoherence',
    api: ['simulateDecoherence', 'purity', 'l1Coherence', 'lindbladStep'],
  },
  {
    id: 'zeno',
    number: 16,
    name: 'Quantum Zeno effect',
    summary: 'Frequent measurement freezes evolution.',
    toasterAnalogy: '"A watched toast never toasts": peek N times and P(still raw) → 1.',
    module: 'concepts/zeno',
    api: ['zenoAnalytic', 'zenoSimulated', 'zenoCurve', 'zenoMonteCarlo'],
  },
  {
    id: 'pauli-exclusion',
    number: 17,
    name: 'Pauli exclusion',
    summary: 'Identical fermions have antisymmetric states and cannot share a state.',
    toasterAnalogy: 'Two fermionic slices cannot occupy the same slot state; ψ(x,x) = 0.',
    module: 'concepts/exclusion',
    api: ['twoParticleWavefunction', 'sameStateAttempt', 'twoParticleGroundState'],
  },
  {
    id: 'no-cloning',
    number: 18,
    name: 'No-cloning theorem',
    summary: 'Unknown quantum states cannot be copied; the best universal cloner reaches fidelity 5/6.',
    toasterAnalogy: 'The "Copy toast" button fails, with a fidelity readout.',
    module: 'concepts/cloning',
    api: ['cnotCloner', 'buzekHilleryCloner', 'cloningFidelityCurve', 'OPTIMAL_CLONE_FIDELITY'],
  },
  {
    id: 'blackbody',
    number: 19,
    name: 'Blackbody radiation (Planck)',
    summary: 'Quantized emission avoids the ultraviolet catastrophe.',
    toasterAnalogy: "The coil's glow spectrum comes from Planck's law, compared against Rayleigh–Jeans.",
    module: 'concepts/blackbody',
    api: ['blackbodySpectrum', 'planckRadiance', 'rayleighJeansRadiance', 'wienPeakWavelength', 'glowColor'],
  },
  {
    id: 'photoelectric',
    number: 20,
    name: 'Photoelectric effect',
    summary: 'Ejection needs photon frequency above a threshold; intensity does not help.',
    toasterAnalogy: 'Browning only starts when the light\'s frequency exceeds the bread\'s "work function".',
    module: 'concepts/photoelectric',
    api: ['photoelectric', 'kineticEnergyCurve', 'emissionVsIntensity', 'LIGHT_SOURCES', 'wavelengthToFrequency'],
  },
  {
    id: 'teleportation',
    number: 21,
    name: 'Quantum teleportation',
    summary: 'A state moves using entanglement plus 2 classical bits.',
    toasterAnalogy: "Teleports a slice's butter-side state to a toaster in another kitchen.",
    module: 'concepts/teleportation',
    api: ['teleportationOutcomes', 'teleport', 'teleportationCircuit'],
    stretch: true,
  },
]

/** Look up a concept by number or id. */
export const getConcept = (key: number | string): ConceptMeta | undefined =>
  CONCEPTS.find((c) => c.number === key || c.id === key)
