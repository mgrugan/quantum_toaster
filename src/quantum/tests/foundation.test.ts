import { describe, expect, it } from 'vitest'
import { cabs, cmul, complex, csqrt, cdiv } from '../complex'
import { dft, fft } from '../fft'
import {
  commutator,
  dagger,
  diag,
  eigenvaluesHermitian,
  expm,
  fromReal,
  identity,
  inner,
  kron,
  matmul,
  maxAbs,
  msub,
  normalize,
  norm,
  partialTrace,
  propagator,
  trace,
  unitarityError,
} from '../linalg'
import { mulberry32, sampleIndex } from '../rng'
import { PAULI_X, PAULI_Y, PAULI_Z, cnotMatrix } from '../qubits'

describe('complex', () => {
  it('multiplies, divides and takes square roots', () => {
    const a = complex(1, 2)
    const b = complex(3, -1)
    expect(cmul(a, b)).toEqual({ re: 5, im: 5 })
    const q = cdiv(cmul(a, b), b)
    expect(q.re).toBeCloseTo(1)
    expect(q.im).toBeCloseTo(2)
    const r = csqrt(complex(-4, 0))
    expect(r.re).toBeCloseTo(0)
    expect(r.im).toBeCloseTo(2)
  })
})

describe('linalg', () => {
  it('dagger, kron, inner, trace behave', () => {
    expect(maxAbs(msub(dagger(PAULI_Y), PAULI_Y))).toBe(0)
    const k = kron(PAULI_Z, identity(2))
    expect(k.length).toBe(4)
    expect(trace(k).re).toBe(0)
    const v = normalize([complex(1, 1), complex(0, 2)])
    expect(norm(v)).toBeCloseTo(1, 12)
    expect(inner(v, v).re).toBeCloseTo(1, 12)
  })

  it('expm reproduces e^{-iθX} = cosθ − i sinθ X and is unitary', () => {
    const theta = 1.3
    const u = propagator(PAULI_X, theta)
    expect(u[0][0].re).toBeCloseTo(Math.cos(theta), 12)
    expect(u[0][1].im).toBeCloseTo(-Math.sin(theta), 12)
    expect(unitarityError(u)).toBeLessThan(1e-12)
    const big = expm(diag([5, -3]))
    expect(big[0][0].re).toBeCloseTo(Math.exp(5), 8)
  })

  it('commutator of Paulis is 2iσy', () => {
    const c = commutator(PAULI_Z, PAULI_X)
    expect(c[0][1].re).toBeCloseTo(2)
    expect(c[1][0].re).toBeCloseTo(-2)
  })

  it('Hermitian eigenvalues (complex matrix)', () => {
    const ev = eigenvaluesHermitian(PAULI_Y)
    expect(ev[0]).toBeCloseTo(-1, 10)
    expect(ev[1]).toBeCloseTo(1, 10)
    const h = fromReal([
      [2, 1, 0],
      [1, 2, 1],
      [0, 1, 2],
    ])
    const e = eigenvaluesHermitian(h)
    expect(e[0]).toBeCloseTo(2 - Math.SQRT2, 10)
    expect(e[2]).toBeCloseTo(2 + Math.SQRT2, 10)
  })

  it('partial trace of a product operator', () => {
    const rho = kron(diag([0.25, 0.75]), diag([1, 0]))
    expect(partialTrace(rho, 2, 2, 0)[1][1].re).toBeCloseTo(0.75)
    expect(partialTrace(rho, 2, 2, 1)[0][0].re).toBeCloseTo(1)
    expect(maxAbs(msub(matmul(cnotMatrix(0, 1, 2), cnotMatrix(0, 1, 2)), identity(4)))).toBe(0)
  })
})

describe('fft', () => {
  it('matches the naive DFT and inverts', () => {
    const n = 16
    const re = Float64Array.from({ length: n }, (_, i) => Math.sin(i) + 0.3 * i)
    const im = Float64Array.from({ length: n }, (_, i) => Math.cos(2 * i))
    const ref = dft(re, im)
    const r2 = Float64Array.from(re)
    const i2 = Float64Array.from(im)
    fft(r2, i2)
    for (let k = 0; k < n; k++) {
      expect(cabs({ re: r2[k] - ref.re[k], im: i2[k] - ref.im[k] })).toBeLessThan(1e-9)
    }
    fft(r2, i2, true)
    for (let k = 0; k < n; k++) expect(r2[k]).toBeCloseTo(re[k], 10)
  })
})

describe('rng', () => {
  it('is reproducible and samples correctly', () => {
    const a = mulberry32(1)
    const b = mulberry32(1)
    for (let i = 0; i < 5; i++) expect(a()).toBe(b())
    const r = mulberry32(3)
    const counts = [0, 0]
    for (let i = 0; i < 10000; i++) counts[sampleIndex([0.3, 0.7], r)]++
    expect(counts[0] / 10000).toBeCloseTo(0.3, 1)
  })
})
