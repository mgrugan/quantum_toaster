/** Shared plain-data shapes returned by the engine (all JSON-serializable). */

/** A chart point. */
export interface Point {
  x: number
  y: number
}

/** Evenly spaced samples from a to b inclusive. */
export function linspace(a: number, b: number, n: number): number[] {
  if (n === 1) return [a]
  return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1))
}

/** Trapezoid-free Riemann sum Σ yᵢ·dx (grids here are fine enough). */
export const integrate = (ys: ArrayLike<number>, dx: number): number => {
  let s = 0
  for (let i = 0; i < ys.length; i++) s += ys[i]
  return s * dx
}
