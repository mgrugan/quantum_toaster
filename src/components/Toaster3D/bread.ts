import * as THREE from 'three'

/** Doneness colours, same as the 2D toaster: raw, light, golden, burnt. */
export const DONENESS3 = ['#f3dfb5', '#e0b072', '#b9772f', '#3b2414'].map((c) => new THREE.Color(c))

/** Bread-slice outline (1 wide, ~1.1 tall, origin bottom-centre): rectangle with a rounded muffin top. */
function breadShape(): THREE.Shape {
  const s = new THREE.Shape()
  const w = 0.42
  const r = 0.06
  s.moveTo(-w + r, 0)
  s.lineTo(w - r, 0)
  s.quadraticCurveTo(w, 0, w, r)
  s.lineTo(w, 0.72)
  // right shoulder of the muffin top
  s.bezierCurveTo(w + 0.12, 0.76, w + 0.1, 1.02, 0.22, 1.06)
  s.bezierCurveTo(0.1, 1.1, -0.1, 1.1, -0.22, 1.06)
  s.bezierCurveTo(-w - 0.1, 1.02, -w - 0.12, 0.76, -w, 0.72)
  s.lineTo(-w, r)
  s.quadraticCurveTo(-w, 0, -w + r, 0)
  return s
}

export const BREAD_GEOMETRY = (() => {
  const g = new THREE.ExtrudeGeometry(breadShape(), {
    depth: 0.09,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 3,
    curveSegments: 16,
  })
  g.translate(0, 0, -0.045)
  g.computeVertexNormals()
  return g
})()

const tmp = new THREE.Color()

/** Set colour + opacity on every bread mesh under `obj` (face material + darker crust). */
export function paint(obj: THREE.Object3D | null, color: THREE.Color | string, opacity = 1, emissive = 0) {
  if (!obj) return
  tmp.set(color)
  obj.visible = opacity > 0.005
  obj.traverse((o) => {
    const m = (o as THREE.Mesh).material
    if (!m || !(o as THREE.Mesh).userData.bread) return
    const [face, crust] = m as THREE.MeshStandardMaterial[]
    face.color.copy(tmp)
    crust.color.copy(tmp).multiplyScalar(0.7)
    for (const mat of [face, crust]) {
      mat.opacity = opacity
      mat.depthWrite = opacity > 0.95
      mat.emissive.setRGB(1, 0.85, 0.6)
      mat.emissiveIntensity = emissive
    }
  })
}

export function mixProbs(p: number[], out = new THREE.Color()): THREE.Color {
  out.setRGB(0, 0, 0)
  p.forEach((w, i) => {
    const c = DONENESS3[i]
    if (!c) return
    out.r += c.r * w
    out.g += c.g * w
    out.b += c.b * w
  })
  return out
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const ease = (x: number) => {
  const k = clamp01(x)
  return k * k * (3 - 2 * k)
}
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3)

export function normProbs(p: number[] | undefined, def: number[]): number[] {
  const src = p && p.length >= 4 ? p.slice(0, 4) : def
  const s = src.reduce((a, b) => a + Math.max(0, b), 0) || 1
  return src.map((v) => Math.max(0, v) / s)
}

export function sampleSeries(series: number[][], f: number): number[] {
  if (series.length === 0) return [1, 0, 0, 0]
  const x = clamp01(f) * (series.length - 1)
  const i = Math.floor(x)
  const j = Math.min(series.length - 1, i + 1)
  const k = x - i
  return series[i].map((v, n) => v + ((series[j][n] ?? 0) - v) * k)
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
