/**
 * Small dense complex linear algebra: state vectors (kets) and operators (matrices).
 * Sizes in this engine are tiny (≤ 8×8), so clarity beats cleverness.
 */
import type { Complex } from './complex'
import { abs2, cadd, cmul, conj, cscale, csub, ZERO, ONE } from './complex'

/** A ket |ψ⟩ as an array of complex amplitudes. */
export type Vector = Complex[]
/** An operator as a row-major array of rows. */
export type Matrix = Complex[][]

/** Zero vector of length n. */
export const zerosVector = (n: number): Vector => Array.from({ length: n }, () => ({ ...ZERO }))
/** Computational basis vector |k⟩ in dimension n. */
export const basisVector = (n: number, k: number): Vector =>
  Array.from({ length: n }, (_, i) => (i === k ? { ...ONE } : { ...ZERO }))
/** Zero matrix r×c (c defaults to r). */
export const zerosMatrix = (r: number, c = r): Matrix =>
  Array.from({ length: r }, () => Array.from({ length: c }, () => ({ ...ZERO })))
/** n×n identity. */
export const identity = (n: number): Matrix =>
  Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? { ...ONE } : { ...ZERO })))
/** Lift a real matrix to a complex one. */
export const fromReal = (m: number[][]): Matrix => m.map((row) => row.map((re) => ({ re, im: 0 })))
/** Lift a real vector to a complex one. */
export const vectorFromReal = (v: number[]): Vector => v.map((re) => ({ re, im: 0 }))
/** Diagonal matrix from real entries. */
export const diag = (d: number[]): Matrix =>
  d.map((x, i) => d.map((_, j) => (i === j ? { re: x, im: 0 } : { ...ZERO })))
/** Deep copy. */
export const cloneVector = (v: Vector): Vector => v.map((z) => ({ ...z }))
export const cloneMatrix = (m: Matrix): Matrix => m.map((row) => row.map((z) => ({ ...z })))

export const vadd = (a: Vector, b: Vector): Vector => a.map((z, i) => cadd(z, b[i]))
export const vscale = (a: Vector, s: Complex): Vector => a.map((z) => cmul(z, s))

export const madd = (a: Matrix, b: Matrix): Matrix => a.map((row, i) => row.map((z, j) => cadd(z, b[i][j])))
export const msub = (a: Matrix, b: Matrix): Matrix => a.map((row, i) => row.map((z, j) => csub(z, b[i][j])))
/** Multiply a matrix by a complex scalar. */
export const mscale = (a: Matrix, s: Complex): Matrix => a.map((row) => row.map((z) => cmul(z, s)))
/** Multiply a matrix by a real scalar. */
export const mscaleReal = (a: Matrix, s: number): Matrix => a.map((row) => row.map((z) => cscale(z, s)))

/** Matrix product AB. */
export function matmul(a: Matrix, b: Matrix): Matrix {
  const m = b[0].length
  const k = b.length
  return a.map((row) => {
    const out: Complex[] = new Array(m)
    for (let j = 0; j < m; j++) {
      let re = 0
      let im = 0
      for (let l = 0; l < k; l++) {
        const x = row[l]
        const y = b[l][j]
        re += x.re * y.re - x.im * y.im
        im += x.re * y.im + x.im * y.re
      }
      out[j] = { re, im }
    }
    return out
  })
}

/** Matrix–vector product A|ψ⟩. */
export function matvec(a: Matrix, v: Vector): Vector {
  return a.map((row) => {
    let re = 0
    let im = 0
    for (let j = 0; j < row.length; j++) {
      re += row[j].re * v[j].re - row[j].im * v[j].im
      im += row[j].re * v[j].im + row[j].im * v[j].re
    }
    return { re, im }
  })
}

/** Conjugate transpose A†. */
export const dagger = (a: Matrix): Matrix => a[0].map((_, j) => a.map((row) => conj(row[j])))

/** Kronecker (tensor) product A ⊗ B. */
export function kron(a: Matrix, b: Matrix): Matrix {
  const ra = a.length
  const ca = a[0].length
  const rb = b.length
  const cb = b[0].length
  const out = zerosMatrix(ra * rb, ca * cb)
  for (let i = 0; i < ra; i++)
    for (let j = 0; j < ca; j++)
      for (let k = 0; k < rb; k++) for (let l = 0; l < cb; l++) out[i * rb + k][j * cb + l] = cmul(a[i][j], b[k][l])
  return out
}

/** Tensor product of kets |a⟩ ⊗ |b⟩. */
export const kronVector = (a: Vector, b: Vector): Vector => a.flatMap((x) => b.map((y) => cmul(x, y)))

/** Inner product ⟨a|b⟩ (conjugate-linear in the first argument). */
export function inner(a: Vector, b: Vector): Complex {
  let re = 0
  let im = 0
  for (let i = 0; i < a.length; i++) {
    re += a[i].re * b[i].re + a[i].im * b[i].im
    im += a[i].re * b[i].im - a[i].im * b[i].re
  }
  return { re, im }
}

/** Outer product |a⟩⟨b|. */
export const outer = (a: Vector, b: Vector): Matrix => a.map((x) => b.map((y) => cmul(x, conj(y))))

/** Euclidean norm ‖ψ‖ = √⟨ψ|ψ⟩. */
export const norm = (v: Vector): number => Math.sqrt(v.reduce((s, z) => s + abs2(z), 0))

/** Return ψ/‖ψ‖. Throws on the zero vector (no physical state). */
export function normalize(v: Vector): Vector {
  const n = norm(v)
  if (n < 1e-14) throw new Error('Cannot normalize the zero vector')
  return v.map((z) => cscale(z, 1 / n))
}

/** Born probabilities |ψᵢ|². */
export const probabilities = (v: Vector): number[] => v.map(abs2)

/** Expectation ⟨ψ|A|ψ⟩ (real part; exact for Hermitian A). */
export const expectation = (a: Matrix, v: Vector): number => inner(v, matvec(a, v)).re

/** Commutator [A, B] = AB − BA. */
export const commutator = (a: Matrix, b: Matrix): Matrix => msub(matmul(a, b), matmul(b, a))
/** Anticommutator {A, B} = AB + BA. */
export const anticommutator = (a: Matrix, b: Matrix): Matrix => madd(matmul(a, b), matmul(b, a))

/** Trace Tr(A). */
export const trace = (a: Matrix): Complex => a.reduce((s, row, i) => cadd(s, row[i]), { ...ZERO })

/** Max absolute entry — handy for "is this matrix ≈ 0" checks. */
export const maxAbs = (a: Matrix): number => Math.max(...a.flatMap((row) => row.map((z) => Math.hypot(z.re, z.im))))

/** Max-row-sum (∞) norm. */
const normInf = (a: Matrix): number => Math.max(...a.map((row) => row.reduce((s, z) => s + Math.hypot(z.re, z.im), 0)))

/**
 * Matrix exponential e^A by scaling-and-squaring with a Taylor series.
 * Used for propagators U = e^{−iHt}.
 */
export function expm(a: Matrix, terms = 18): Matrix {
  const n = a.length
  const nrm = normInf(a)
  const s = nrm > 0.5 ? Math.ceil(Math.log2(nrm / 0.5)) : 0
  const scaled = mscaleReal(a, 1 / 2 ** s)
  let result = identity(n)
  let term = identity(n)
  for (let k = 1; k <= terms; k++) {
    term = mscaleReal(matmul(term, scaled), 1 / k)
    result = madd(result, term)
  }
  for (let i = 0; i < s; i++) result = matmul(result, result)
  return result
}

/** e^{−iHt}: the Schrödinger propagator for Hamiltonian H (ħ = 1). */
export const propagator = (h: Matrix, t: number): Matrix => expm(mscale(h, { re: 0, im: -t }))

/** ‖U†U − 1‖_max: zero for a unitary matrix. */
export const unitarityError = (u: Matrix): number => maxAbs(msub(matmul(dagger(u), u), identity(u.length)))

/** ‖A − A†‖_max: zero for a Hermitian (observable) matrix. */
export const hermiticityError = (a: Matrix): number => maxAbs(msub(a, dagger(a)))

/**
 * Partial trace of a bipartite operator on C^dA ⊗ C^dB.
 * `keep = 0` returns ρ_A = Tr_B ρ, `keep = 1` returns ρ_B = Tr_A ρ.
 */
export function partialTrace(rho: Matrix, dA: number, dB: number, keep: 0 | 1): Matrix {
  if (keep === 0) {
    const out = zerosMatrix(dA)
    for (let i = 0; i < dA; i++)
      for (let j = 0; j < dA; j++) for (let k = 0; k < dB; k++) out[i][j] = cadd(out[i][j], rho[i * dB + k][j * dB + k])
    return out
  }
  const out = zerosMatrix(dB)
  for (let i = 0; i < dB; i++)
    for (let j = 0; j < dB; j++) for (let k = 0; k < dA; k++) out[i][j] = cadd(out[i][j], rho[k * dB + i][k * dB + j])
  return out
}

/** Eigenvalues of a 2×2 Hermitian matrix (ascending). */
export function eigenvaluesHermitian2(m: Matrix): [number, number] {
  const a = m[0][0].re
  const d = m[1][1].re
  const b2 = abs2(m[0][1])
  const mean = (a + d) / 2
  const r = Math.sqrt(((a - d) / 2) ** 2 + b2)
  return [mean - r, mean + r]
}

/**
 * Eigenvalues of a Hermitian matrix (ascending).
 * Embeds H = A + iB as the real symmetric [[A, −B], [B, A]] (each eigenvalue appears twice)
 * and runs the classic cyclic Jacobi rotation method. Fine for the ≤ 8×8 matrices used here.
 */
export function eigenvaluesHermitian(m: Matrix, sweeps = 60): number[] {
  const n = m.length
  const N = 2 * n
  const a: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(0))
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      a[i][j] = m[i][j].re
      a[i + n][j + n] = m[i][j].re
      a[i][j + n] = -m[i][j].im
      a[i + n][j] = m[i][j].im
    }
  for (let sweep = 0; sweep < sweeps; sweep++) {
    let off = 0
    for (let p = 0; p < N; p++) for (let q = p + 1; q < N; q++) off += a[p][q] * a[p][q]
    if (off < 1e-22) break
    for (let p = 0; p < N; p++)
      for (let q = p + 1; q < N; q++) {
        if (Math.abs(a[p][q]) < 1e-300) continue
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q])
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
        const c = 1 / Math.sqrt(t * t + 1)
        const s = t * c
        for (let k = 0; k < N; k++) {
          const akp = a[k][p]
          const akq = a[k][q]
          a[k][p] = c * akp - s * akq
          a[k][q] = s * akp + c * akq
        }
        for (let k = 0; k < N; k++) {
          const apk = a[p][k]
          const aqk = a[q][k]
          a[p][k] = c * apk - s * aqk
          a[q][k] = s * apk + c * aqk
        }
      }
  }
  const all = a.map((row, i) => row[i]).sort((x, y) => x - y)
  return all.filter((_, i) => i % 2 === 0)
}
