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

/** Small deterministic PRNG so mock runs vary with the seed. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const r3 = (x: number) => Math.round(x * 1000) / 1000

function normalize(v: number[]): number[] {
  const s = v.reduce((a, b) => a + b, 0)
  return v.map((x) => x / s)
}

function sample(p: number[], u: number): number {
  let acc = 0
  for (let i = 0; i < p.length; i++) {
    acc += p[i]
    if (u < acc) return i
  }
  return p.length - 1
}

const DONENESS = ['raw', 'light', 'golden', 'burnt']

export function runConcept(number: number, seed: number): ConceptRun {
  const info = CONCEPT_LIST.find((c) => c.number === number) ?? CONCEPT_LIST[0]
  const rand = mulberry32(seed * 7919 + number)
  const base = { effect: info.effect, number: info.number, name: info.name }

  // TODO(engine): replace with src/quantum calls
  switch (info.number) {
    case 1: {
      const p = normalize([rand() + 0.2, rand() + 0.2, rand() + 0.2, rand() + 0.2])
      return {
        ...base,
        caption: 'The slice is a unit vector of 4 complex amplitudes; bar heights are |cᵢ|².',
        readouts: { 'Σ|c|²': 1, ...Object.fromEntries(p.map((x, i) => [`P(${DONENESS[i]})`, r3(x)])) },
        payload: { probabilities: p },
      }
    }
    case 2: {
      const p = normalize([0.25, 0.2, 0.35, 0.2].map((x) => x + rand() * 0.1))
      return {
        ...base,
        caption: 'Until you look, the toast is a weighted blend of every doneness at once.',
        readouts: { 'P(golden)': r3(p[2]), 'P(burnt)': r3(p[3]), 'basis states': 4 },
        payload: { probabilities: p },
      }
    }
    case 3: {
      const p = [0.1, 0.3, 0.45, 0.15]
      const outcome = sample(p, rand())
      return {
        ...base,
        caption: `Opening the lid sampled P(i) = |cᵢ|² and collapsed the state to "${DONENESS[outcome]}".`,
        readouts: { outcome: DONENESS[outcome], 'P(outcome)': p[outcome], 'post-collapse P': 1 },
        payload: { probabilities: p, outcome },
      }
    }
    case 4: {
      const levels = [1, 4, 9, 16]
      return {
        ...base,
        caption: 'The coil is a particle in a box: only energies Eₙ = n²E₁ are allowed.',
        readouts: { E1: 1, E2: 4, E3: 9, E4: 16 },
        payload: { samples: levels.map((e) => e / 16) },
      }
    }
    case 5:
      return {
        ...base,
        caption: 'The crumb tray is a harmonic oscillator: its ground state still holds ħω/2.',
        readouts: { 'E₀ (ħω)': 0.5, 'Δx₀': r3(Math.SQRT1_2) },
        payload: { value: 0.5 },
      }
    case 6: {
      const series: number[][] = []
      for (let k = 0; k <= 40; k++) {
        const t = (k / 40) * 2 * Math.PI
        const pg = Math.sin(t / 2) ** 2
        series.push([1 - pg, 0, pg, 0])
      }
      return {
        ...base,
        caption: 'e^(−iHt) drives coherent Rabi oscillations raw → golden → raw. Norm stays 1.',
        readouts: { 'Ω (Rabi)': 1, period: r3(2 * Math.PI), norm: 1 },
        payload: { series },
      }
    }
    case 7: {
      const p = normalize([0.1, 0.3, 0.4, 0.2].map((x) => x + rand() * 0.05))
      const mean = p.reduce((a, x, i) => a + x * i, 0)
      const v = p.reduce((a, x, i) => a + x * (i - mean) ** 2, 0)
      return {
        ...base,
        caption: 'The gauge reads ⟨ψ|D|ψ⟩, the expected doneness, with its variance.',
        readouts: { '⟨D⟩': r3(mean), 'Var(D)': r3(v), 'ΔD': r3(Math.sqrt(v)) },
        payload: { probabilities: p, value: mean / 3 },
      }
    }
    case 8: {
      const dx = 0.15 + rand() * 0.1
      const dp = 0.5 / dx
      const samples = Array.from({ length: 60 }, () => {
        const g = (rand() + rand() + rand() - 1.5) * (dp / 6)
        return Math.min(1, Math.max(0, 0.5 + g))
      })
      return {
        ...base,
        caption: 'A narrow slot pins Δx, so the pop-up momentum spreads: Δx·Δp ≥ ħ/2.',
        readouts: { 'Δx': r3(dx), 'Δp': r3(dp), 'Δx·Δp': 0.5 },
        payload: { samples, value: dx },
      }
    }
    case 9:
      return {
        ...base,
        caption: 'Measuring σz then σx gives different statistics than σx then σz: [σz, σx] = 2iσy.',
        readouts: { 'P(z→x: +,+)': 0.5, 'P(x→z: +,+)': r3(0.25 + rand() * 0.1), '‖[A,B]‖': 2 },
        payload: { probabilities: [0.5, 0.5], success: true },
      }
    case 10: {
      const bloch: [number, number, number][] = Array.from({ length: 48 }, (_, k) => {
        const phi = (k / 48) * 4 * Math.PI
        const th = Math.PI / 3
        return [r3(Math.sin(th) * Math.cos(phi)), r3(Math.sin(th) * Math.sin(phi)), r3(Math.cos(th))]
      })
      return {
        ...base,
        caption: 'The butter side is a spin-½ precessing at the Larmor frequency in the coil field.',
        readouts: { 'ω_L': 1, 'θ (deg)': 60, '⟨σz⟩': 0.5 },
        payload: { bloch },
      }
    }
    case 11: {
      const samples: number[] = []
      while (samples.length < 200) {
        const x = rand()
        const I = Math.cos((x - 0.5) * 6 * Math.PI) ** 2 * Math.exp(-(((x - 0.5) * 3) ** 2))
        if (rand() < I) samples.push(x)
      }
      return {
        ...base,
        caption: 'Crumbs land one at a time, yet build fringes: each crumb went through both slots.',
        readouts: { crumbs: samples.length, fringes: 5, visibility: 0.97 },
        payload: { samples },
      }
    }
    case 12: {
      const T = r3(0.08 + rand() * 0.15)
      const success = rand() < T * 3
      return {
        ...base,
        caption: success
          ? 'With E < V the toast still leaked through the latch: transmission T(E) > 0.'
          : 'This time the toast bounced off the latch, but T(E) is never zero.',
        readouts: { 'E/V': 0.6, 'T(E)': T, tunneled: success ? 'yes' : 'no' },
        payload: { value: T, success },
      }
    }
    case 13: {
      const outcome = rand() < 0.5 ? 0 : 2
      return {
        ...base,
        caption: `Bell pair (|raw,raw⟩+|golden,golden⟩)/√2: both slices came out "${DONENESS[outcome]}".`,
        readouts: { correlation: 1, 'entropy (bits)': 1, outcome: DONENESS[outcome] },
        payload: { probabilities: [0.5, 0, 0.5, 0], outcome },
      }
    }
    case 14: {
      const S = r3(2 * Math.SQRT2 + (rand() - 0.5) * 0.04)
      return {
        ...base,
        caption: 'CHSH on the toast pair beats every local hidden-variable theory (limit 2).',
        readouts: { 'S (CHSH)': S, 'classical max': 2, 'Tsirelson': r3(2 * Math.SQRT2) },
        payload: { value: S / (2 * Math.SQRT2), success: true },
      }
    }
    case 15: {
      const series: number[][] = []
      for (let k = 0; k <= 30; k++) {
        const c = Math.exp(-k / 8)
        series.push([0.5, 0, 0.5 * c + 0.5 * (1 - c), 0])
      }
      const purity = r3(0.5 + 0.5 * Math.exp(-30 / 4))
      return {
        ...base,
        caption: 'Lindblad dephasing from kitchen air: coherences vanish, purity Tr(ρ²) → ½.',
        readouts: { 'Tr(ρ²) start': 1, 'Tr(ρ²) end': purity, 'T₂': 8 },
        payload: { series, value: purity },
      }
    }
    case 16: {
      const N = 20
      const pRaw = r3(Math.cos(Math.PI / (2 * N)) ** (2 * N))
      const series = Array.from({ length: N + 1 }, (_, k) => {
        const p = Math.cos(Math.PI / (2 * N)) ** (2 * k)
        return [p, 0, 1 - p, 0]
      })
      return {
        ...base,
        caption: `Peeking ${N} times freezes the evolution: a watched toast never toasts.`,
        readouts: { peeks: N, 'P(still raw)': pRaw, 'P(unwatched)': 0 },
        payload: { series, value: pRaw },
      }
    }
    case 17:
      return {
        ...base,
        caption: 'Antisymmetric ψ(x₁,x₂) = −ψ(x₂,x₁) forces ψ(x,x) = 0: the slices repel.',
        readouts: { 'ψ(x,x)': 0, 'P(same slot)': 0 },
        payload: { value: 0, success: false },
      }
    case 18:
      return {
        ...base,
        caption: 'Copying an unknown state is impossible; the best universal cloner reaches 5/6.',
        readouts: { fidelity: r3(5 / 6), 'perfect copy': 'no' },
        payload: { value: 5 / 6, success: false },
      }
    case 19: {
      const T = Math.round(900 + rand() * 600)
      const color = T < 1100 ? '#ff4a1c' : T < 1300 ? '#ff7a2a' : '#ffb24a'
      const peakNm = Math.round(2.898e6 / T)
      return {
        ...base,
        caption: 'Planck’s law sets the coil glow; Rayleigh–Jeans would blow up in the UV.',
        readouts: { 'T (K)': T, 'λ_peak (nm)': peakNm, 'RJ/Planck @400nm': '∞-ish' },
        payload: { color, value: (T - 900) / 600 },
      }
    }
    case 20: {
      const f = r3(0.6 + rand() * 1.0)
      const success = f > 1
      return {
        ...base,
        caption: success
          ? 'Photon frequency beats the work function: electrons fly and browning starts.'
          : 'Below threshold: no electrons, no browning, however bright the light.',
        readouts: { 'f/f₀': f, 'KE_max (φ)': success ? r3(f - 1) : 0, ejected: success ? 'yes' : 'no' },
        payload: { value: f / 1.6, success },
      }
    }
    case 21:
    default: {
      const bits = `${rand() < 0.5 ? 0 : 1}${rand() < 0.5 ? 0 : 1}`
      return {
        ...base,
        caption: `Bell pair + 2 classical bits (${bits}) moved the butter-side state to kitchen B.`,
        readouts: { 'classical bits': bits, fidelity: 1, 'original left': 'destroyed' },
        payload: { value: 1, success: true },
      }
    }
  }
}
