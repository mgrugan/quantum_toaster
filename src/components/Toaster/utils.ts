export const DONENESS = ['#f3dfb5', '#e0b072', '#b9772f', '#3b2414'] as const
export const DONENESS_LABELS = ['raw', 'light', 'golden', 'burnt'] as const
export const SLOT_X = [150, 250] as const
export const SLICE_Y = 38

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export function mixColor(probs: number[] | undefined, fallback = DONENESS[0]): string {
  if (!probs || probs.length === 0) return fallback
  const total = probs.reduce((a, b) => a + Math.max(0, b), 0) || 1
  const rgb = [0, 0, 0]
  DONENESS.forEach((c, i) => {
    const w = Math.max(0, probs[i] ?? 0) / total
    const [r, g, b] = hexToRgb(c)
    rgb[0] += r * w
    rgb[1] += g * w
    rgb[2] += b * w
  })
  return `rgb(${rgb.map((v) => Math.round(v)).join(',')})`
}

export function lerpHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  const k = Math.min(1, Math.max(0, t))
  return `rgb(${ca.map((v, i) => Math.round(v + (cb[i] - v) * k)).join(',')})`
}

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x))
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function normProbs(p: number[] | undefined, def: number[]): number[] {
  const src = p && p.length >= 4 ? p.slice(0, 4) : def
  const s = src.reduce((a, b) => a + Math.max(0, b), 0) || 1
  return src.map((v) => Math.max(0, v) / s)
}

/** Sample a row of a series at fractional position f in [0,1], linearly interpolated. */
export function sampleSeries(series: number[][], f: number): number[] {
  if (series.length === 0) return [1, 0, 0, 0]
  const x = clamp01(f) * (series.length - 1)
  const i = Math.floor(x)
  const j = Math.min(series.length - 1, i + 1)
  const k = x - i
  return series[i].map((v, n) => v + ((series[j][n] ?? 0) - v) * k)
}

export function rabiSeries(n = 60): number[][] {
  return Array.from({ length: n }, (_, i) => {
    const s = Math.sin((Math.PI * 2 * i) / (n - 1) / 2) ** 2
    return [1 - s, 0, s, 0]
  })
}

export function fringeSamples(n = 260, seed = 7): number[] {
  const rnd = mulberry32(seed)
  const out: number[] = []
  while (out.length < n) {
    const x = rnd()
    const env = Math.exp(-(((x - 0.5) / 0.32) ** 2))
    const p = env * Math.cos((x - 0.5) * Math.PI * 7) ** 2
    if (rnd() < p) out.push(x)
  }
  return out
}

export function gaussSamples(n: number, sigma: number, seed = 3): number[] {
  const rnd = mulberry32(seed)
  return Array.from({ length: n }, () => {
    const u = Math.max(1e-6, rnd())
    const v = rnd()
    return clamp01(0.5 + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v))
  })
}

export function easeInOut(t: number): number {
  const k = clamp01(t)
  return k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
}
