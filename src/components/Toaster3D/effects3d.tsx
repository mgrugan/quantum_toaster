import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Clone, Line } from '@react-three/drei'
import * as THREE from 'three'
import type { ConceptRun, EffectId } from '../../bridge/types'
import Bread from './Bread'
import {
  DONENESS3,
  clamp01,
  ease,
  easeOut,
  mixProbs,
  mulberry32,
  normProbs,
  paint,
  sampleSeries,
} from './bread'

export interface Dims {
  W: number
  H: number
  D: number
  slotZ: [number, number]
  /** Bread bottom y when resting in a slot. */
  y0: number
  /** Bread scale. */
  s: number
  /** Bread height after scaling. */
  bh: number
}

type Payload = ConceptRun['payload']
interface FXProps {
  p: Payload
  d: Dims
  toaster: RefObject<THREE.Group | null>
  model: THREE.Object3D
  modelTransform: { scale: number; position: THREE.Vector3; rotationY: number }
}
type FX = (props: FXProps) => React.ReactNode

/** useFrame with a local clock starting at mount (effects are keyed by runKey). */
function useT(cb: (t: number, dt: number) => void) {
  const start = useRef<number | null>(null)
  useFrame((st, dt) => {
    if (start.current === null) start.current = st.clock.elapsedTime
    cb(st.clock.elapsedTime - start.current, dt)
  })
}

const RAW = DONENESS3[0]
const tmpC = new THREE.Color()
const useRefs = (n: number) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return Array.from({ length: n }, () => useRef<THREE.Group>(null))
}

/** Warm glow inside a slot (coil). */
function SlotGlow({ d, slot = 0, lightRef, barRef }: { d: Dims; slot?: number; lightRef: RefObject<THREE.PointLight | null>; barRef?: RefObject<THREE.Mesh | null> }) {
  return (
    <group position={[0, d.H * 0.88, d.slotZ[slot]]}>
      <pointLight ref={lightRef} color="#ff7a1a" intensity={0} distance={2.5} decay={1.5} />
      <mesh ref={barRef}>
        <boxGeometry args={[d.W * 0.5, 0.03, 0.06]} />
        <meshBasicMaterial color="#ff7a1a" transparent opacity={0} />
      </mesh>
    </group>
  )
}

/* ---------- idle ---------- */
const Idle: FX = ({ d }) => {
  const r = useRef<THREE.Group>(null)
  useT((t) => {
    if (!r.current) return
    r.current.position.y = d.y0 + 0.015 + Math.sin(t * 2) * 0.02
    paint(r.current, RAW)
  })
  return <Bread ref={r} scale={d.s} position={[0, d.y0, d.slotZ[0]]} />
}

/* 1 state */
const State: FX = ({ p, d }) => {
  const probs = normProbs(p.probabilities, [0.4, 0.3, 0.2, 0.1])
  const r = useRef<THREE.Group>(null)
  const bars = useRef<(THREE.Mesh | null)[]>([])
  useT((t) => {
    paint(r.current, mixProbs(probs, tmpC), 1)
    bars.current.forEach((b, i) => {
      if (!b) return
      const h = Math.max(0.001, Math.sqrt(probs[i]) * 0.9 * easeOut(t / 1.2 - i * 0.1))
      b.scale.y = h
      b.position.y = h / 2
    })
  })
  return (
    <>
      <Bread ref={r} scale={d.s} position={[0, d.y0 + d.bh * 0.25, d.slotZ[0]]} />
      {probs.map((_, i) => (
        <mesh key={i} ref={(m) => { bars.current[i] = m }} position={[d.W / 2 + 0.35 + i * 0.16, 0, d.D * 0.2]} castShadow>
          <boxGeometry args={[0.12, 1, 0.12]} />
          <meshStandardMaterial color={DONENESS3[i]} roughness={0.6} />
        </mesh>
      ))}
    </>
  )
}

/* 2 superposition */
const Superposition: FX = ({ p, d }) => {
  const probs = normProbs(p.probabilities, [0.25, 0.25, 0.25, 0.25])
  const refs = useRefs(4)
  useT((t) => {
    const up = easeOut(t / 0.8) * d.bh * 0.3
    refs.forEach((r, i) => {
      const g = r.current
      if (!g) return
      g.position.set((i - 1.5) * 0.12, d.y0 + up, d.slotZ[0] + (i - 1.5) * 0.02)
      g.rotation.z = (i - 1.5) * 0.08
      const flick = 0.55 + 0.45 * Math.sin(t * 9 + i * 1.7)
      paint(g, DONENESS3[i], clamp01(0.1 + 0.85 * probs[i] * 2 * flick))
    })
  })
  return <>{refs.map((r, i) => <Bread key={i} ref={r} scale={d.s} />)}</>
}

/* 3 measurement */
const Measurement: FX = ({ p, d }) => {
  const probs = normProbs(p.probabilities, [0.25, 0.25, 0.25, 0.25])
  const outcome = Math.max(0, Math.min(3, Math.round(p.outcome ?? 2)))
  const refs = useRefs(4)
  const solid = useRef<THREE.Group>(null)
  const flash = useRef<THREE.PointLight>(null)
  useT((t) => {
    const k = ease(t / 1.2)
    refs.forEach((r, i) => {
      const g = r.current
      if (!g) return
      g.position.set((i - 1.5) * 0.12 * (1 - k), d.y0 + d.bh * 0.3, d.slotZ[0])
      g.rotation.z = (i - 1.5) * 0.08 * (1 - k)
      const flick = 0.55 + 0.45 * Math.sin(t * 12 + i * 1.7)
      paint(g, DONENESS3[i], t < 1.25 ? clamp01(0.1 + 1.7 * probs[i] * flick) : 0)
    })
    if (flash.current) flash.current.intensity = t > 1.2 ? 30 * Math.exp(-(t - 1.2) * 6) : 0
    if (solid.current) {
      const u = t - 1.2
      const pop = u < 0 ? 0 : Math.min(1, u / 0.35) - (u > 0.35 ? Math.sin(Math.min(1, (u - 0.35) / 0.5) * Math.PI) * 0.15 : 0)
      solid.current.position.y = d.y0 + d.bh * (0.3 + 0.35 * pop)
      paint(solid.current, DONENESS3[outcome], u < 0 ? 0 : 1, t > 1.2 ? 1.2 * Math.exp(-u * 4) : 0)
    }
  })
  return (
    <>
      {refs.map((r, i) => <Bread key={i} ref={r} scale={d.s} />)}
      <Bread ref={solid} scale={d.s} position={[0, d.y0, d.slotZ[0]]} />
      <pointLight ref={flash} position={[0, d.H + 0.6, d.D]} color="#ffffff" intensity={0} distance={6} />
    </>
  )
}

/* 4 quantization */
const Quantization: FX = ({ d }) => {
  const r = useRef<THREE.Group>(null)
  const light = useRef<THREE.PointLight>(null)
  const bar = useRef<THREE.Mesh>(null)
  useT((t) => {
    const n = Math.min(4, Math.floor(t / 0.8) + 1)
    const lvl = (n * n) / 16
    if (light.current) light.current.intensity = 8 * lvl
    if (bar.current) (bar.current.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.75 * lvl
    paint(r.current, RAW, 1, 0.5 * lvl)
  })
  return (
    <>
      <SlotGlow d={d} lightRef={light} barRef={bar} />
      <Bread ref={r} scale={d.s} position={[0, d.y0, d.slotZ[0]]} />
    </>
  )
}

/* 5 zero-point */
const ZeroPoint: FX = ({ d, toaster }) => {
  const r = useRef<THREE.Group>(null)
  const light = useRef<THREE.PointLight>(null)
  const base = useRef<THREE.Vector3 | null>(null)
  useEffect(() => {
    const tg = toaster.current
    return () => {
      if (tg && base.current) tg.position.copy(base.current)
    }
  }, [toaster])
  useT((t) => {
    const tg = toaster.current
    if (tg) {
      if (!base.current) base.current = tg.position.clone()
      tg.position.set(base.current.x + Math.sin(t * 53) * 0.006, base.current.y + Math.abs(Math.sin(t * 41)) * 0.004, base.current.z + Math.sin(t * 37) * 0.006)
    }
    if (r.current) {
      r.current.position.set(Math.sin(t * 61) * 0.012, d.y0 + Math.sin(t * 47) * 0.012, d.slotZ[0] + Math.sin(t * 29) * 0.008)
      r.current.rotation.z = Math.sin(t * 33) * 0.02
    }
    paint(r.current, RAW, 1)
    if (light.current) light.current.intensity = 0.8 + 0.4 * Math.sin(t * 7)
  })
  return (
    <>
      <SlotGlow d={d} lightRef={light} />
      <Bread ref={r} scale={d.s} />
    </>
  )
}

function rabiSeries(): number[][] {
  return Array.from({ length: 24 }, (_, i) => {
    const s = Math.sin((i / 23) * Math.PI) ** 2
    return [1 - s, 0, s, 0]
  })
}

/* 6 evolution */
const Evolution: FX = ({ p, d }) => {
  const series = p.series && p.series.length > 1 ? p.series : rabiSeries()
  const r = useRef<THREE.Group>(null)
  useT((t) => {
    paint(r.current, mixProbs(normProbs(sampleSeries(series, t / 3.5), [1, 0, 0, 0]), tmpC))
  })
  return <Bread ref={r} scale={d.s} position={[0, d.y0 + d.bh * 0.2, d.slotZ[0]]} />
}

/* 7 observables */
const Observables: FX = ({ p, d }) => {
  const probs = normProbs(p.probabilities, [0.1, 0.3, 0.4, 0.2])
  const exp = clamp01(p.value ?? probs.reduce((a, v, i) => a + (v * i) / 3, 0))
  const r = useRef<THREE.Group>(null)
  useT((t) => {
    if (r.current) r.current.position.y = d.y0 + exp * d.bh * 0.85 * easeOut(t / 1.5)
    paint(r.current, mixProbs(probs, tmpC))
  })
  return (
    <>
      <Bread ref={r} scale={d.s} position={[0, d.y0, d.slotZ[0]]} />
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-d.W * 0.3, d.H + 0.02 + (i / 3) * d.bh * 0.85 + d.bh * 0.62, d.slotZ[0]]}>
          <boxGeometry args={[0.1, 0.012, 0.012]} />
          <meshBasicMaterial color={DONENESS3[i]} />
        </mesh>
      ))}
    </>
  )
}

/* 8 uncertainty */
const Uncertainty: FX = ({ p, d }) => {
  const samples = useMemo(() => {
    if (p.samples && p.samples.length) return p.samples.slice(0, 8)
    const rnd = mulberry32(7)
    return Array.from({ length: 8 }, () => rnd())
  }, [p.samples])
  const refs = useRefs(8)
  const main = useRef<THREE.Group>(null)
  useT((t) => {
    const pop = easeOut(t / 1.0)
    refs.forEach((r, i) => {
      const g = r.current
      if (!g) return
      const s = samples[i % samples.length] ?? 0.5
      const s2 = samples[(i * 3 + 1) % samples.length] ?? 0.5
      g.position.set((s - 0.5) * 1.0 * pop, d.y0 + d.bh * (0.6 + 0.6 * ((i * 37) % 10) / 10) * pop, d.slotZ[0] + (s2 - 0.5) * 0.6 * pop)
      g.rotation.z = (s - 0.5) * 0.6 * pop
      paint(g, DONENESS3[1], 0.18)
    })
    if (main.current) main.current.position.y = d.y0 + d.bh * 0.8 * pop
    paint(main.current, DONENESS3[1], 0.75)
  })
  return (
    <>
      {refs.map((r, i) => <Bread key={i} ref={r} scale={d.s} />)}
      <Bread ref={main} scale={d.s} position={[0, d.y0, d.slotZ[0]]} />
    </>
  )
}

/* 9 non-commuting */
const NonCommuting: FX = ({ d }) => {
  const a = useRef<THREE.Group>(null)
  const b = useRef<THREE.Group>(null)
  const qx = useMemo(() => new THREE.Quaternion(), [])
  const qz = useMemo(() => new THREE.Quaternion(), [])
  const X = useMemo(() => new THREE.Vector3(1, 0, 0), [])
  const Z = useMemo(() => new THREE.Vector3(0, 0, 1), [])
  useT((t) => {
    const k1 = ease(t / 1.3) * Math.PI / 2
    const k2 = ease((t - 1.5) / 1.3) * Math.PI / 2
    if (a.current) {
      // rotateX first, then rotateZ (world frame)
      qx.setFromAxisAngle(X, k1)
      qz.setFromAxisAngle(Z, k2)
      a.current.quaternion.copy(qz).multiply(qx)
    }
    if (b.current) {
      qz.setFromAxisAngle(Z, k1)
      qx.setFromAxisAngle(X, k2)
      b.current.quaternion.copy(qx).multiply(qz)
    }
    paint(a.current, DONENESS3[2])
    paint(b.current, DONENESS3[2])
  })
  const y = d.H + 0.75
  return (
    <>
      <group position={[-0.6, y, 0]}>
        <group ref={a} scale={d.s * 0.7}>
          <group position={[0, -0.55, 0]}>
            <Bread butter />
          </group>
        </group>
      </group>
      <group position={[0.6, y, 0]}>
        <group ref={b} scale={d.s * 0.7}>
          <group position={[0, -0.55, 0]}>
            <Bread butter />
          </group>
        </group>
      </group>
    </>
  )
}

/* 10 spin */
const Spin: FX = ({ p, d }) => {
  const frames = useMemo<[number, number, number][]>(() => {
    if (p.bloch && p.bloch.length > 1) return p.bloch
    return Array.from({ length: 60 }, (_, i) => {
      const a = (i / 59) * Math.PI * 4
      return [Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0.4]
    })
  }, [p.bloch])
  const r = useRef<THREE.Group>(null)
  const spinG = useRef<THREE.Group>(null)
  useT((t) => {
    const x = clamp01(t / 3.5) * (frames.length - 1)
    const [bx, by, bz] = frames[Math.floor(x)]
    if (spinG.current) {
      spinG.current.rotation.y = Math.atan2(by, bx)
      spinG.current.rotation.x = -bz * 0.5
      spinG.current.position.y = d.y0 + d.bh * 0.65 * easeOut(t / 0.6)
    }
    paint(r.current, DONENESS3[1])
  })
  return (
    <group ref={spinG} position={[0, d.y0, d.slotZ[0]]}>
      <Bread ref={r} butter scale={d.s} />
    </group>
  )
}

/* 11 interference */
const Interference: FX = ({ p, d }) => {
  const samples = useMemo(() => {
    if (p.samples && p.samples.length) return p.samples.slice(0, 160)
    const rnd = mulberry32(11)
    const out: number[] = []
    while (out.length < 140) {
      const x = rnd()
      if (rnd() < Math.cos((x - 0.5) * Math.PI * 6) ** 2 * Math.cos((x - 0.5) * Math.PI) ** 2) out.push(x)
    }
    return out
  }, [p.samples])
  const inst = useRef<THREE.InstancedMesh>(null)
  const bars = useRef<(THREE.Mesh | null)[]>([])
  const bread = useRef<THREE.Group>(null)
  const bread2 = useRef<THREE.Group>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const bins = 24
  const span = d.W * 1.1
  const frontZ = d.D / 2 + 0.35
  useT((t) => {
    const im = inst.current
    if (!im) return
    const counts = new Array(bins).fill(0)
    const N = samples.length
    samples.forEach((s, i) => {
      const k = (t - (i / N) * 2.6) / 0.6
      const b = Math.min(bins - 1, Math.floor(clamp01(s) * bins))
      if (k >= 1) counts[b]++
      if (k < 0 || k >= 1) {
        dummy.scale.setScalar(0.0001)
      } else {
        const sx = ((i * 0.37) % 1 - 0.5) * d.W * 0.4
        const sz = d.slotZ[i % 2]
        const tx = (clamp01(s) - 0.5) * span
        const e = k
        dummy.position.set(sx + (tx - sx) * e, d.H + 0.05 + 0.4 * Math.sin(k * Math.PI) - (d.H + 0.05) * k * k, sz + (frontZ - sz) * e)
        dummy.scale.setScalar(1)
      }
      dummy.updateMatrix()
      im.setMatrixAt(i, dummy.matrix)
    })
    im.instanceMatrix.needsUpdate = true
    const max = Math.max(4, ...counts)
    bars.current.forEach((m, i) => {
      if (!m) return
      const h = Math.max(0.0001, (counts[i] / max) * 0.35)
      m.scale.y = h
      m.position.y = h / 2
    })
    paint(bread.current, DONENESS3[1])
    paint(bread2.current, DONENESS3[1])
  })
  return (
    <>
      <Bread ref={bread} scale={d.s} position={[0, d.y0, d.slotZ[0]]} />
      <Bread ref={bread2} scale={d.s} position={[0, d.y0, d.slotZ[1]]} />
      <instancedMesh ref={inst} args={[undefined, undefined, samples.length]}>
        <sphereGeometry args={[0.018, 8, 6]} />
        <meshStandardMaterial color="#b9772f" />
      </instancedMesh>
      {Array.from({ length: bins }, (_, i) => (
        <mesh key={i} ref={(m) => { bars.current[i] = m }} position={[((i + 0.5) / bins - 0.5) * span, 0, frontZ]}>
          <boxGeometry args={[span / bins - 0.01, 1, 0.06]} />
          <meshStandardMaterial color="#e0b072" roughness={0.8} />
        </mesh>
      ))}
    </>
  )
}

/* 12 tunneling */
const Tunneling: FX = ({ p, d }) => {
  const T = clamp01(p.value ?? 0.35)
  const ok = p.success ?? T > 0.05
  const orig = useRef<THREE.Group>(null)
  const ghost = useRef<THREE.Group>(null)
  const wallL = -d.W / 2 - 0.08
  const startX = -d.W / 2 - 0.6
  const endX = d.W / 2 + 0.6
  useT((t) => {
    const a = ease(t / 1.2)
    const b = ease((t - 1.2) / 1.0)
    if (orig.current) orig.current.position.x = startX + (wallL - startX) * a - (wallL - startX) * b
    paint(orig.current, DONENESS3[1], t < 1.2 ? 1 : 1 - T * ease((t - 1.2) / 0.3))
    if (ghost.current) ghost.current.position.x = d.W / 2 + 0.08 + (endX - d.W / 2 - 0.08) * b
    const g = t < 1.2 ? 0 : ok ? T + (1 - T) * ease((t - 2.4) / 0.8) : T
    paint(ghost.current, DONENESS3[1], g * ease((t - 1.2) / 0.3))
  })
  const s = d.s * 0.8
  return (
    <>
      <group rotation={[0, 0, 0]}>
        <group ref={orig} position={[startX, 0, 0]}>
          <group rotation={[0, Math.PI / 2, 0]}><Bread scale={s} /></group>
        </group>
        <group ref={ghost} position={[endX, 0, 0]}>
          <group rotation={[0, Math.PI / 2, 0]}><Bread scale={s} /></group>
        </group>
      </group>
    </>
  )
}

/* 13 entanglement */
const Entanglement: FX = ({ p, d }) => {
  const probs = normProbs(p.probabilities, [0.5, 0, 0, 0.5])
  const a = useRef<THREE.Group>(null)
  const b = useRef<THREE.Group>(null)
  const rnd = useMemo(() => mulberry32(13), [])
  const state = useRef({ idx: 0, next: 0 })
  const top = d.y0 + d.bh * 1.3
  useT((t) => {
    if (t >= state.current.next) {
      const u = rnd()
      let acc = 0
      let idx = 3
      for (let i = 0; i < 4; i++) {
        acc += probs[i]
        if (u < acc) { idx = i; break }
      }
      state.current = { idx, next: t + 0.7 }
    }
    const up = easeOut(t / 0.6) * d.bh * 0.3
    if (a.current) a.current.position.y = d.y0 + up
    if (b.current) b.current.position.y = d.y0 + up
    paint(a.current, DONENESS3[state.current.idx])
    paint(b.current, DONENESS3[state.current.idx])
  })
  return (
    <>
      <Bread ref={a} scale={d.s} position={[-0.3, d.y0, d.slotZ[0]]} />
      <Bread ref={b} scale={d.s} position={[0.3, d.y0, d.slotZ[1]]} />
      <Line
        points={[[-0.3, top, d.slotZ[0]], [0, top + 0.45, 0], [0.3, top, d.slotZ[1]]]}
        color="#a855f7"
        lineWidth={3}
        dashed
        dashSize={0.05}
        gapSize={0.03}
      />
    </>
  )
}

/* 14 bell */
const Bell: FX = ({ p, d }) => {
  const S = p.value !== undefined && p.value > 1 ? p.value : 2 * Math.SQRT2
  const det = useRef<(THREE.Mesh | null)[]>([])
  const fill = useRef<THREE.Mesh>(null)
  const bread = useRef<THREE.Group>(null)
  const bread2 = useRef<THREE.Group>(null)
  const L = 2
  useT((t) => {
    const on = (t * 2.5) % 1 > 0.8
    const col = Math.floor(t * 2.5) % 2 ? '#a855f7' : '#22d3ee'
    det.current.forEach((m) => {
      if (!m) return
      const mat = m.material as THREE.MeshStandardMaterial
      mat.emissive.set(col)
      mat.emissiveIntensity = on ? 2 : 0.05
    })
    if (fill.current) {
      const f = Math.max(0.001, ease(t / 3) * clamp01(S / 4))
      fill.current.scale.x = f
      fill.current.position.x = -L / 2 + (f * L) / 2
    }
    paint(bread.current, DONENESS3[1])
    paint(bread2.current, DONENESS3[1])
  })
  const z = d.D / 2 + 0.45
  return (
    <>
      <Bread ref={bread} scale={d.s} position={[0, d.y0, d.slotZ[0]]} />
      <Bread ref={bread2} scale={d.s} position={[0, d.y0, d.slotZ[1]]} />
      {[-1, 1].map((sgn, i) => (
        <mesh key={i} ref={(m) => { det.current[i] = m }} position={[sgn * (d.W / 2 + 0.45), 0.18, 0]} castShadow>
          <sphereGeometry args={[0.16, 24, 16]} />
          <meshStandardMaterial color="#f4f4f5" roughness={0.3} />
        </mesh>
      ))}
      <group position={[0, 0.03, z]}>
        <mesh>
          <boxGeometry args={[L, 0.05, 0.08]} />
          <meshStandardMaterial color="#e4e4e7" transparent opacity={0.6} />
        </mesh>
        <mesh ref={fill} position={[0, 0.005, 0]}>
          <boxGeometry args={[1, 0.06, 0.09]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.4} />
        </mesh>
        {/* classical limit S = 2 */}
        <mesh position={[-L / 2 + (2 / 4) * L, 0.04, 0]}>
          <boxGeometry args={[0.02, 0.16, 0.12]} />
          <meshStandardMaterial color="#18181b" />
        </mesh>
      </group>
    </>
  )
}

/* 15 decoherence */
const Decoherence: FX = ({ p, d }) => {
  const series = useMemo(() => {
    if (p.series && p.series.length > 1) return p.series
    return Array.from({ length: 20 }, (_, i) => {
      const k = i / 19
      return [0.25 + 0.15 * k, 0.25 + 0.05 * k, 0.25 - 0.05 * k, 0.25 - 0.15 * k]
    })
  }, [p.series])
  const refs = useRefs(4)
  const dull = useRef<THREE.Group>(null)
  const last = normProbs(series[series.length - 1], [0.25, 0.25, 0.25, 0.25])
  const dullColor = useMemo(() => {
    const c = mixProbs(last)
    const g = (c.r + c.g + c.b) / 3
    return c.lerp(new THREE.Color(g, g, g), 0.55)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series])
  useT((t) => {
    const k = ease(t / 3.2)
    const row = normProbs(sampleSeries(series, t / 3.2), [0.25, 0.25, 0.25, 0.25])
    refs.forEach((r, i) => {
      const g = r.current
      if (!g) return
      g.position.set((i - 1.5) * 0.14 * (1 - k) + Math.sin(t * 7 + i) * 0.01 * (1 - k), d.y0 + d.bh * 0.3, d.slotZ[0])
      g.rotation.z = (i - 1.5) * 0.08 * (1 - k)
      paint(g, DONENESS3[i], clamp01((0.15 + row[i] * 1.6) * (0.7 + 0.3 * Math.sin(t * 10 + i * 2))) * (1 - k))
    })
    if (dull.current) dull.current.position.y = d.y0 + d.bh * 0.3
    paint(dull.current, dullColor, k)
  })
  return (
    <>
      {refs.map((r, i) => <Bread key={i} ref={r} scale={d.s} />)}
      <Bread ref={dull} scale={d.s} position={[0, d.y0, d.slotZ[0]]} />
    </>
  )
}

/* 16 zeno */
const Zeno: FX = ({ d }) => {
  const r = useRef<THREE.Group>(null)
  const eye = useRef<THREE.Group>(null)
  const light = useRef<THREE.PointLight>(null)
  const bar = useRef<THREE.Mesh>(null)
  useT((t) => {
    paint(r.current, RAW)
    if (eye.current) {
      const ph = (t * 1.6) % 1
      eye.current.scale.y = ph > 0.9 ? 0.1 : 1
      eye.current.position.y = d.H + d.bh * 0.75 + Math.sin(t * 2) * 0.04
    }
    if (light.current) light.current.intensity = 6 + Math.sin(t * 6)
    if (bar.current) (bar.current.material as THREE.MeshBasicMaterial).opacity = 0.9
  })
  return (
    <>
      <SlotGlow d={d} lightRef={light} barRef={bar} />
      <Bread ref={r} scale={d.s} position={[0, d.y0, d.slotZ[0]]} />
      <group ref={eye} position={[0, d.H + 0.8, d.slotZ[0]]}>
        <mesh>
          <sphereGeometry args={[0.16, 32, 16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
        <mesh position={[0.05, -0.02, 0.12]}>
          <sphereGeometry args={[0.065, 24, 12]} />
          <meshStandardMaterial color="#18181b" roughness={0.2} />
        </mesh>
      </group>
    </>
  )
}

/* 17 exclusion */
const Exclusion: FX = ({ d }) => {
  const a = useRef<THREE.Group>(null)
  const b = useRef<THREE.Group>(null)
  const hi = d.H + 1.2
  useT((t) => {
    if (a.current) a.current.position.y = hi + (d.y0 - hi) * ease(t / 0.8)
    if (b.current) {
      const blockY = d.y0 + d.bh * 0.75
      let y = hi + 0.3 + (blockY - hi - 0.3) * ease((t - 0.3) / 0.8)
      let z = d.slotZ[0]
      let x = 0
      if (t > 1.1 && t < 1.5) x = Math.sin(t * 60) * 0.03
      z = d.slotZ[0] + (d.slotZ[1] - d.slotZ[0]) * ease((t - 1.5) / 0.5)
      if (t > 1.5) y = blockY + 0.15 * Math.sin(ease((t - 1.5) / 0.5) * Math.PI) + (d.y0 - blockY) * ease((t - 2.1) / 0.5)
      b.current.position.set(x, y, z)
    }
    paint(a.current, DONENESS3[1])
    paint(b.current, DONENESS3[2])
  })
  return (
    <>
      <Bread ref={a} scale={d.s} position={[0, hi, d.slotZ[0]]} />
      <Bread ref={b} scale={d.s} position={[0, hi, d.slotZ[0]]} />
    </>
  )
}

/* 18 no-cloning */
const NoCloning: FX = ({ p, d }) => {
  const F = clamp01(p.value ?? 0.5)
  const a = useRef<THREE.Group>(null)
  const b = useRef<THREE.Group>(null)
  useT((t) => {
    if (a.current) a.current.position.y = d.y0 + d.bh * 0.3
    paint(a.current, DONENESS3[2])
    const j = (1 - F) * 0.05
    if (b.current) b.current.position.set(Math.sin(t * 43) * j, d.y0 + d.bh * 0.3 * easeOut(t / 1.2) + Math.sin(t * 37) * j, d.slotZ[1] + Math.sin(t * 29) * j * 0.5)
    paint(b.current, DONENESS3[2], F * ease(t / 1.2))
  })
  return (
    <>
      <Bread ref={a} scale={d.s} position={[0, d.y0, d.slotZ[0]]} />
      <Bread ref={b} scale={d.s} position={[0, d.y0, d.slotZ[1]]} />
    </>
  )
}

/* 19 blackbody */
const Blackbody: FX = ({ p, d }) => {
  const stops = useMemo(() => ['#7f1d1d', '#dc2626', '#f97316', '#ffffff', p.color ?? '#ffd27a'].map((c) => new THREE.Color(c)), [p.color])
  const r = useRef<THREE.Group>(null)
  const light = useRef<THREE.PointLight>(null)
  const bar = useRef<THREE.Mesh>(null)
  const c = useMemo(() => new THREE.Color(), [])
  const bc = useMemo(() => new THREE.Color(), [])
  useT((t) => {
    const f = clamp01(t / 3.5) * (stops.length - 1)
    const i = Math.min(stops.length - 2, Math.floor(f))
    c.copy(stops[i]).lerp(stops[i + 1], f - i)
    if (light.current) {
      light.current.color.copy(c)
      light.current.intensity = 2 + 8 * clamp01(t / 3.5)
    }
    if (bar.current) {
      const m = bar.current.material as THREE.MeshBasicMaterial
      m.color.copy(c)
      m.opacity = 0.4 + 0.6 * clamp01(t / 3.5)
    }
    const k = clamp01(t / 3.5) * 2
    bc.copy(DONENESS3[Math.min(1, Math.floor(k))]).lerp(DONENESS3[Math.min(2, Math.floor(k) + 1)], k % 1)
    paint(r.current, bc, 1, 0.15 * clamp01(t / 3.5))
  })
  return (
    <>
      <SlotGlow d={d} lightRef={light} barRef={bar} />
      <Bread ref={r} scale={d.s} position={[0, d.y0, d.slotZ[0]]} />
    </>
  )
}

/* 20 photoelectric */
const Photoelectric: FX = ({ p, d }) => {
  const ok = p.success ?? true
  const r = useRef<THREE.Group>(null)
  const beam = useRef<THREE.Mesh>(null)
  const el = useRef<(THREE.Mesh | null)[]>([])
  const hit = useMemo(() => new THREE.Vector3(0, d.y0 + d.bh * 0.95, d.slotZ[0]), [d])
  const src = useMemo(() => new THREE.Vector3(-1.8, d.H + 1.5, 0.6), [d])
  const { mid, len, quat } = useMemo(() => {
    const dir = hit.clone().sub(src)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    return { mid: src.clone().add(hit).multiplyScalar(0.5), len: dir.length(), quat: q }
  }, [hit, src])
  const dirs = useMemo(() => {
    const rnd = mulberry32(20)
    return Array.from({ length: 12 }, () => new THREE.Vector3(rnd() * 2 - 0.5, rnd() * 1.2 + 0.3, rnd() * 2 - 1).normalize())
  }, [])
  useT((t) => {
    if (r.current) r.current.position.y = d.y0 + d.bh * 0.35
    paint(r.current, DONENESS3[1])
    if (beam.current) {
      const m = beam.current.material as THREE.MeshBasicMaterial
      m.opacity = ease(t / 0.5) * (0.45 + 0.15 * Math.sin(t * 20))
    }
    el.current.forEach((m, i) => {
      if (!m) return
      const k = (t * 0.9 + i / 12) % 1
      m.visible = ok && t > 0.6
      m.position.copy(hit).addScaledVector(dirs[i], k * 1.4)
      m.scale.setScalar(1 - k * 0.6)
    })
  })
  return (
    <>
      <Bread ref={r} scale={d.s} position={[0, d.y0, d.slotZ[0]]} />
      <mesh ref={beam} position={mid} quaternion={quat}>
        <cylinderGeometry args={[0.025, 0.025, len, 12]} />
        <meshBasicMaterial color={ok ? '#8b5cf6' : '#ef4444'} transparent opacity={0} />
      </mesh>
      {dirs.map((_, i) => (
        <mesh key={i} ref={(m) => { el.current[i] = m }} visible={false}>
          <sphereGeometry args={[0.03, 12, 8]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1.5} />
        </mesh>
      ))}
    </>
  )
}

/* 21 teleportation */
const Teleportation: FX = ({ p, d, model, modelTransform }) => {
  const F = clamp01(p.value ?? 1)
  const a = useRef<THREE.Group>(null)
  const b = useRef<THREE.Group>(null)
  const k = 0.4
  const ox = d.W / 2 + 0.9
  useT((t) => {
    const dis = ease((t - 0.3) / 1.2)
    const mat = ease((t - 1.6) / 1.0)
    if (a.current) {
      a.current.position.y = d.y0 + d.bh * 0.3
      a.current.scale.set(d.s * (1 - dis * 0.6), d.s * (1 - dis * 0.2), d.s)
      a.current.position.x = Math.sin(t * 50) * 0.01 * dis
    }
    paint(a.current, DONENESS3[2], 1 - dis, dis)
    if (b.current) b.current.position.y = d.y0 * k + d.bh * k * (0.3 * mat)
    paint(b.current, DONENESS3[2], mat * F, (1 - mat) * 1.5)
  })
  return (
    <>
      <Bread ref={a} scale={d.s} position={[0, d.y0, d.slotZ[0]]} />
      <group position={[ox, 0, 0.2]}>
        <group scale={k}>
          <group scale={modelTransform.scale} position={modelTransform.position} rotation={[0, modelTransform.rotationY, 0]}>
            <Clone object={model} />
          </group>
        </group>
        <Bread ref={b} scale={d.s * k} position={[0, d.y0 * k, d.slotZ[0] * k]} />
      </group>
    </>
  )
}

const EFFECTS: Record<EffectId, FX> = {
  state: State,
  superposition: Superposition,
  measurement: Measurement,
  quantization: Quantization,
  zeroPoint: ZeroPoint,
  evolution: Evolution,
  observables: Observables,
  uncertainty: Uncertainty,
  nonCommuting: NonCommuting,
  spin: Spin,
  interference: Interference,
  tunneling: Tunneling,
  entanglement: Entanglement,
  bell: Bell,
  decoherence: Decoherence,
  zeno: Zeno,
  exclusion: Exclusion,
  noCloning: NoCloning,
  blackbody: Blackbody,
  photoelectric: Photoelectric,
  teleportation: Teleportation,
}

export function Effect3D({ run, runKey, ...rest }: Omit<FXProps, 'p'> & { run: ConceptRun | null; runKey: number }) {
  const E = run ? (EFFECTS[run.effect] ?? Idle) : Idle
  return <E key={`${run?.effect ?? 'idle'}-${runKey}`} p={run?.payload ?? {}} {...rest} />
}
