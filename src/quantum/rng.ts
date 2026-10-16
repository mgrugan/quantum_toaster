/**
 * Seeded pseudo-random numbers. Every stochastic function in the engine takes an
 * `Rng` (or a seed) so that "opening the lid" is reproducible in tests and demos.
 */

/** A function returning uniform floats in [0, 1). */
export type Rng = () => number

/** mulberry32: tiny, fast 32-bit PRNG. Same seed → same toast. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Accept either an existing Rng or a numeric seed (default seed 42). */
export function toRng(rngOrSeed: Rng | number = 42): Rng {
  return typeof rngOrSeed === 'number' ? mulberry32(rngOrSeed) : rngOrSeed
}

/** Sample an index i with probability probs[i] (probs need not be exactly normalized). */
export function sampleIndex(probs: readonly number[], rng: Rng): number {
  const total = probs.reduce((s, p) => s + p, 0)
  let r = rng() * total
  for (let i = 0; i < probs.length; i++) {
    r -= probs[i]
    if (r < 0) return i
  }
  // Floating-point fallthrough: return the last index with nonzero weight.
  for (let i = probs.length - 1; i >= 0; i--) if (probs[i] > 0) return i
  return probs.length - 1
}

/** Standard normal deviate via Box–Muller. */
export function gaussian(rng: Rng): number {
  const u = Math.max(rng(), 1e-300)
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
