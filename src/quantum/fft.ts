/**
 * Discrete Fourier transforms on split real/imag Float64Arrays.
 * Used to go from position space ψ(x) to momentum space φ(p) (Heisenberg, tunneling).
 */

/**
 * In-place radix-2 Cooley–Tukey FFT. `inverse` uses e^{+i...} and divides by N.
 * Length must be a power of two.
 */
export function fft(re: Float64Array, im: Float64Array, inverse = false): void {
  const n = re.length
  if ((n & (n - 1)) !== 0) throw new Error('fft length must be a power of two')
  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      const tr = re[i]
      re[i] = re[j]
      re[j] = tr
      const ti = im[i]
      im[i] = im[j]
      im[j] = ti
    }
  }
  const sign = inverse ? 1 : -1
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (sign * 2 * Math.PI) / len
    const wr = Math.cos(ang)
    const wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1
      let ci = 0
      for (let k = 0; k < len / 2; k++) {
        const a = i + k
        const b = a + len / 2
        const tr = re[b] * cr - im[b] * ci
        const ti = re[b] * ci + im[b] * cr
        re[b] = re[a] - tr
        im[b] = im[a] - ti
        re[a] += tr
        im[a] += ti
        const ncr = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = ncr
      }
    }
  }
  if (inverse)
    for (let i = 0; i < n; i++) {
      re[i] /= n
      im[i] /= n
    }
}

/** Naive O(N²) DFT (any length), returned as new arrays. Reference implementation for tests. */
export function dft(re: ArrayLike<number>, im: ArrayLike<number>, inverse = false): { re: Float64Array; im: Float64Array } {
  const n = re.length
  const outRe = new Float64Array(n)
  const outIm = new Float64Array(n)
  const sign = inverse ? 1 : -1
  for (let k = 0; k < n; k++) {
    let sr = 0
    let si = 0
    for (let j = 0; j < n; j++) {
      const ang = (sign * 2 * Math.PI * k * j) / n
      const c = Math.cos(ang)
      const s = Math.sin(ang)
      sr += re[j] * c - im[j] * s
      si += re[j] * s + im[j] * c
    }
    outRe[k] = inverse ? sr / n : sr
    outIm[k] = inverse ? si / n : si
  }
  return { re: outRe, im: outIm }
}

/** Angular wavenumbers k_j matching FFT bin order for a grid of n points spaced dx. */
export function fftFrequencies(n: number, dx: number): Float64Array {
  const k = new Float64Array(n)
  const dk = (2 * Math.PI) / (n * dx)
  for (let j = 0; j < n; j++) k[j] = (j < n / 2 ? j : j - n) * dk
  return k
}
