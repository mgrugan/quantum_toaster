/**
 * The stateful QuantumToaster used by the dashboard. It owns one slice's doneness state as a
 * density matrix ρ (and the pure ket |ψ⟩ while the evolution is still coherent), heats it with
 * the Schrödinger/Lindblad dynamics, and measures it with Born-rule collapse.
 *
 * React usage: keep the instance in a ref, call methods, then `setState(toaster.snapshot())`.
 * `snapshot()` returns fresh plain data (no shared references), so it is safe to store.
 */
import type { Complex } from './complex'
import { phase } from './complex'
import type { Matrix, Vector } from './linalg'
import { cloneMatrix, cloneVector, matvec, normalize, outer, propagator } from './linalg'
import type { Rng } from './rng'
import { mulberry32, sampleIndex } from './rng'
import { dampingOperator, dephasingOperators, l1Coherence, lindbladGenerator, populations, purity, rk4Step, rk4Substeps } from './concepts/decoherence'
import { donenessHamiltonian } from './concepts/evolution'
import type { ObservableStats } from './concepts/observables'
import { DONENESS_ENERGIES } from './concepts/quantization'
import type { DonenessLevel } from './concepts/state'
import { DONENESS_DIM, DONENESS_LEVELS, donenessBasisState, levelIndex } from './concepts/state'

export interface ToasterSettings {
  /** Drive strength Ω of the heating coil (rad per time unit). */
  heatPower: number
  /** Coil detuning δ (0 = resonant, perfect raw→burnt transfer). */
  detuning: number
  /** Kitchen-air dephasing rate γ (0 = perfectly coherent toast). */
  decoherenceRate: number
  /** Amplitude-damping ("cooling") rate Γ toward raw. */
  dampingRate: number
  /** RNG seed; changing it re-seeds the measurement RNG. */
  seed: number
}

export const DEFAULT_TOASTER_SETTINGS: ToasterSettings = {
  heatPower: 1,
  detuning: 0,
  decoherenceRate: 0,
  dampingRate: 0,
  seed: 42,
}

export type HistoryKind = 'insert' | 'heat' | 'measure' | 'eject' | 'settings' | 'reset'

export interface HistoryEntry {
  id: number
  /** Toaster clock when it happened. */
  time: number
  kind: HistoryKind
  message: string
  outcome?: DonenessLevel
  /** Probabilities just before the event. */
  probabilities?: number[]
}

/** One sample of the live timeline (for the "doneness over time" chart). */
export interface TracePoint {
  t: number
  raw: number
  light: number
  golden: number
  burnt: number
  purity: number
  doneness: number
}

export interface MeasurementRecord {
  outcome: number
  level: DonenessLevel
  /** Born probability of this outcome before collapse. */
  probability: number
  probabilitiesBefore: number[]
  time: number
}

export interface LevelReadout {
  level: DonenessLevel
  probability: number
  /** null when the state is mixed (no well-defined amplitude). */
  amplitude: Complex | null
  phase: number | null
  energy: number
}

export interface ToasterSnapshot {
  time: number
  hasSlice: boolean
  settings: ToasterSettings
  /** Pure-state amplitudes, or null once decoherence has made the state mixed. */
  amplitudes: Complex[] | null
  probabilities: number[]
  levels: LevelReadout[]
  densityMatrix: Complex[][]
  purity: number
  coherence: number
  isPure: boolean
  expectation: { doneness: ObservableStats; energy: ObservableStats }
  /** Most likely doneness right now (not a measurement!). */
  mostLikely: DonenessLevel
  measurementCount: number
  lastMeasurement: MeasurementRecord | null
  history: HistoryEntry[]
  trace: TracePoint[]
}

const MAX_TRACE = 1000
const MAX_HISTORY = 200

const statsFromPopulations = (p: number[], values: readonly number[]): ObservableStats => {
  const mean = p.reduce((s, x, i) => s + x * values[i], 0)
  const variance = Math.max(0, p.reduce((s, x, i) => s + x * values[i] * values[i], 0) - mean * mean)
  return { mean, variance, stdDev: Math.sqrt(variance) }
}

/** A quantum toaster holding one slice's doneness qudit. */
export class QuantumToaster {
  private settings: ToasterSettings
  private rng: Rng
  private psi: Vector | null
  private rho: Matrix
  private time = 0
  private hasSlice = true
  private measurementCount = 0
  private lastMeasurement: MeasurementRecord | null = null
  private history: HistoryEntry[] = []
  private trace: TracePoint[] = []
  private nextId = 1

  constructor(settings: Partial<ToasterSettings> = {}) {
    this.settings = { ...DEFAULT_TOASTER_SETTINGS, ...settings }
    this.rng = mulberry32(this.settings.seed)
    this.psi = donenessBasisState('raw')
    this.rho = outer(this.psi, this.psi)
    this.log('insert', 'Inserted a raw slice')
    this.pushTrace()
  }

  /** Insert a fresh slice (default |raw⟩, or any level / custom amplitude vector). Clears the trace. */
  insertSlice(initial: DonenessLevel | number | Vector = 'raw'): this {
    this.psi = Array.isArray(initial) ? normalize(cloneVector(initial)) : donenessBasisState(initial)
    this.rho = outer(this.psi, this.psi)
    this.hasSlice = true
    this.lastMeasurement = null
    this.trace = []
    this.pushTrace()
    this.log('insert', Array.isArray(initial) ? 'Inserted a slice in a custom superposition' : `Inserted a ${DONENESS_LEVELS[levelIndex(initial)]} slice`)
    return this
  }

  /**
   * Heat for `duration` time units. Coherent (unitary e^{−iHt}) when decoherence and damping
   * are 0; otherwise integrates the Lindblad equation. Samples the trace every step.
   */
  heat(duration: number, steps = Math.max(1, Math.ceil(duration / 0.05))): this {
    if (!this.hasSlice || duration <= 0) return this
    const { heatPower, detuning, decoherenceRate, dampingRate } = this.settings
    const h = donenessHamiltonian({ power: heatPower, detuning })
    const dt = duration / steps
    if (decoherenceRate === 0 && dampingRate === 0 && this.psi) {
      const u = propagator(h, dt)
      for (let k = 0; k < steps; k++) {
        this.psi = matvec(u, this.psi)
        this.time += dt
        this.rho = outer(this.psi, this.psi)
        this.pushTrace()
      }
    } else {
      const jumps = dephasingOperators(decoherenceRate)
      if (dampingRate > 0) jumps.push(dampingOperator(dampingRate))
      const gen = lindbladGenerator(h, jumps)
      const sub = rk4Substeps(dt, Math.max(decoherenceRate, dampingRate * DONENESS_DIM, 2 * Math.abs(heatPower) + Math.abs(detuning) * DONENESS_DIM))
      for (let k = 0; k < steps; k++) {
        for (let s = 0; s < sub; s++) this.rho = rk4Step(this.rho, gen, dt / sub)
        this.time += dt
        this.pushTrace()
      }
      this.psi = null
    }
    this.log('heat', `Heated for ${duration.toFixed(2)} (Ω=${heatPower}, γ=${decoherenceRate})`)
    return this
  }

  /** Open the lid: Born-rule measurement in the doneness basis, collapsing the state. */
  measure(): MeasurementRecord {
    const before = this.getProbabilities()
    const outcome = sampleIndex(before, this.rng)
    this.psi = donenessBasisState(outcome)
    this.rho = outer(this.psi, this.psi)
    this.measurementCount++
    const rec: MeasurementRecord = { outcome, level: DONENESS_LEVELS[outcome], probability: before[outcome], probabilitiesBefore: before, time: this.time }
    this.lastMeasurement = rec
    this.pushTrace()
    this.log('measure', `Opened the lid: ${rec.level} (P=${rec.probability.toFixed(3)})`, rec.level, before)
    return rec
  }

  /** Alias of measure(): there is no such thing as a free peek in quantum mechanics. */
  peek(): MeasurementRecord {
    return this.measure()
  }

  /** Pop the toast: a final measurement, after which the toaster is empty. */
  eject(): MeasurementRecord {
    const rec = this.measure()
    this.hasSlice = false
    this.log('eject', `Popped up a ${rec.level} slice`, rec.level)
    return rec
  }

  /** Update settings (partial). A new seed re-seeds the RNG. */
  setSettings(patch: Partial<ToasterSettings>): this {
    this.settings = { ...this.settings, ...patch }
    if (patch.seed !== undefined) this.rng = mulberry32(patch.seed)
    this.log('settings', `Settings: ${Object.entries(patch).map(([k, v]) => `${k}=${String(v)}`).join(', ')}`)
    return this
  }

  getSettings(): ToasterSettings {
    return { ...this.settings }
  }

  /** Born probabilities of raw/light/golden/burnt (the diagonal of ρ). */
  getProbabilities(): number[] {
    return populations(this.rho).map((p) => Math.max(0, p))
  }

  /** Pure-state amplitudes (copy), or null if the state is mixed. */
  getAmplitudes(): Vector | null {
    return this.psi ? cloneVector(this.psi) : null
  }

  getDensityMatrix(): Matrix {
    return cloneMatrix(this.rho)
  }

  /** ⟨doneness⟩ (0 = raw … 3 = burnt) and ⟨energy⟩ with variances: Tr(ρA). */
  getExpectation(): { doneness: ObservableStats; energy: ObservableStats } {
    const p = this.getProbabilities()
    return { doneness: statsFromPopulations(p, [0, 1, 2, 3]), energy: statsFromPopulations(p, DONENESS_ENERGIES) }
  }

  getTime(): number {
    return this.time
  }

  getHistory(): HistoryEntry[] {
    return this.history.map((h) => ({ ...h, probabilities: h.probabilities?.slice() }))
  }

  /** Back to a fresh toaster (keeps settings, re-seeds the RNG). */
  reset(): this {
    this.rng = mulberry32(this.settings.seed)
    this.time = 0
    this.measurementCount = 0
    this.history = []
    this.insertSlice('raw')
    this.log('reset', 'Toaster reset')
    return this
  }

  /** Plain, serializable copy of everything the UI needs. */
  snapshot(): ToasterSnapshot {
    const probs = this.getProbabilities()
    const amps = this.getAmplitudes()
    const pur = purity(this.rho)
    const mostLikely = DONENESS_LEVELS[probs.indexOf(Math.max(...probs))]
    return {
      time: this.time,
      hasSlice: this.hasSlice,
      settings: this.getSettings(),
      amplitudes: amps,
      probabilities: probs,
      levels: DONENESS_LEVELS.map((level, i) => ({
        level,
        probability: probs[i],
        amplitude: amps ? { ...amps[i] } : null,
        phase: amps ? phase(amps[i]) : null,
        energy: DONENESS_ENERGIES[i],
      })),
      densityMatrix: cloneMatrix(this.rho),
      purity: pur,
      coherence: l1Coherence(this.rho),
      isPure: this.psi !== null || pur > 1 - 1e-9,
      expectation: this.getExpectation(),
      mostLikely,
      measurementCount: this.measurementCount,
      lastMeasurement: this.lastMeasurement ? { ...this.lastMeasurement, probabilitiesBefore: this.lastMeasurement.probabilitiesBefore.slice() } : null,
      history: this.getHistory(),
      trace: this.trace.map((t) => ({ ...t })),
    }
  }

  private pushTrace(): void {
    const p = this.getProbabilities()
    this.trace.push({
      t: this.time,
      raw: p[0],
      light: p[1],
      golden: p[2],
      burnt: p[3],
      purity: purity(this.rho),
      doneness: p[1] + 2 * p[2] + 3 * p[3],
    })
    if (this.trace.length > MAX_TRACE) this.trace.splice(0, this.trace.length - MAX_TRACE)
  }

  private log(kind: HistoryKind, message: string, outcome?: DonenessLevel, probabilities?: number[]): void {
    this.history.push({ id: this.nextId++, time: this.time, kind, message, outcome, probabilities: probabilities?.slice() })
    if (this.history.length > MAX_HISTORY) this.history.splice(0, this.history.length - MAX_HISTORY)
  }
}
