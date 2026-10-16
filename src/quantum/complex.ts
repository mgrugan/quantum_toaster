/**
 * Complex numbers as plain `{ re, im }` objects (JSON-serializable, React friendly).
 * Every quantum amplitude in the engine is one of these.
 */
export interface Complex {
  re: number
  im: number
}

/** Construct a complex number `re + i·im`. */
export const complex = (re: number, im = 0): Complex => ({ re, im })

export const ZERO: Complex = Object.freeze({ re: 0, im: 0 })
export const ONE: Complex = Object.freeze({ re: 1, im: 0 })
export const I: Complex = Object.freeze({ re: 0, im: 1 })

export const cadd = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im })
export const csub = (a: Complex, b: Complex): Complex => ({ re: a.re - b.re, im: a.im - b.im })
export const cmul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
})
export const cdiv = (a: Complex, b: Complex): Complex => {
  const d = b.re * b.re + b.im * b.im
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }
}
/** Multiply by a real scalar. */
export const cscale = (a: Complex, s: number): Complex => ({ re: a.re * s, im: a.im * s })
/** Complex conjugate a*. */
export const conj = (a: Complex): Complex => ({ re: a.re, im: -a.im })
/** |a|² — the Born-rule probability of an amplitude. */
export const abs2 = (a: Complex): number => a.re * a.re + a.im * a.im
/** |a| */
export const cabs = (a: Complex): number => Math.hypot(a.re, a.im)
/** arg(a) in (−π, π]. */
export const phase = (a: Complex): number => Math.atan2(a.im, a.re)
/** r·e^{iθ}. */
export const fromPolar = (r: number, theta: number): Complex => ({
  re: r * Math.cos(theta),
  im: r * Math.sin(theta),
})
/** e^{iθ}. */
export const expi = (theta: number): Complex => fromPolar(1, theta)
/** e^{z} for complex z. */
export const cexp = (z: Complex): Complex => fromPolar(Math.exp(z.re), z.im)
/** Principal square root. */
export const csqrt = (z: Complex): Complex => {
  const r = cabs(z)
  const re = Math.sqrt((r + z.re) / 2)
  const im = Math.sqrt(Math.max(0, (r - z.re) / 2))
  return { re, im: z.im < 0 ? -im : im }
}
/** True when |a − b| < tol. */
export const capprox = (a: Complex, b: Complex, tol = 1e-9): boolean => cabs(csub(a, b)) < tol
/** Pretty-print, e.g. `0.707+0.000i`. */
export const cformat = (a: Complex, digits = 3): string =>
  `${a.re.toFixed(digits)}${a.im < 0 ? '-' : '+'}${Math.abs(a.im).toFixed(digits)}i`
