import type { ConceptRun, EffectId } from '../../bridge/types'
import { COIL_VIOLET, Ghosts, Label, Scene, Slice } from './parts'
import { useClock } from './useClock'
import {
  DONENESS,
  DONENESS_LABELS,
  SLICE_Y,
  SLOT_X,
  clamp01,
  easeInOut,
  fringeSamples,
  gaussSamples,
  lerpHex,
  mixColor,
  mulberry32,
  normProbs,
  rabiSeries,
  sampleSeries,
} from './utils'

type Payload = ConceptRun['payload']
type FX = (props: { p: Payload }) => React.JSX.Element

const DEF_PROBS = [0.4, 0.3, 0.2, 0.1]

export function Idle() {
  return (
    <Scene
      coilLevel={0.45}
      behind={
        <g className="qt-bob">
          <Slice x={SLOT_X[0]} />
        </g>
      }
    />
  )
}

/* 1 */
const State: FX = ({ p }) => {
  const t = useClock(4)
  const probs = normProbs(p.probabilities, DEF_PROBS)
  const grow = easeInOut(t / 1.2)
  return (
    <Scene
      coilLevel={0.5}
      behind={<Slice x={SLOT_X[0]} color={mixColor(probs)} />}
      front={
        <g>
          <rect x={196} y={14} width={128} height={70} rx={8} fill="#0b1020" opacity={0.85} stroke="#67e8f9" strokeOpacity={0.5} />
          {probs.map((pr, i) => {
            const h = Math.sqrt(pr) * 46 * grow
            return (
              <g key={i}>
                <rect x={208 + i * 29} y={66 - h} width={18} height={h} rx={3} fill={DONENESS[i]} stroke="#67e8f9" strokeWidth={1} filter="url(#qt-glow)" />
                <Label x={217 + i * 29} y={78} size={8}>{`|${DONENESS_LABELS[i][0]}⟩`}</Label>
              </g>
            )
          })}
          <Label x={260} y={26} size={9} color="#67e8f9">amplitudes |ψ|</Label>
          <ellipse cx={SLOT_X[0]} cy={60} rx={44} ry={46} fill="none" stroke="#67e8f9" strokeDasharray="4 6" opacity={0.6} className="qt-dash" />
        </g>
      }
    />
  )
}

/* 2 */
const Superposition: FX = ({ p }) => {
  const probs = normProbs(p.probabilities, [0.25, 0.25, 0.25, 0.25])
  return (
    <Scene
      coilColor={COIL_VIOLET}
      coilLevel={0.7}
      behind={<Ghosts probs={probs} spread={1.6} />}
      front={<Label x={SLOT_X[0]} y={14} color="#c4b5fd">{'α|raw⟩+β|light⟩+γ|gold⟩+δ|burnt⟩'}</Label>}
    />
  )
}

/* 3 */
const Measurement: FX = ({ p }) => {
  const t = useClock(5)
  const probs = normProbs(p.probabilities, [0.25, 0.25, 0.25, 0.25])
  const outcome = Math.max(0, Math.min(3, Math.round(p.outcome ?? 2)))
  const collapsed = t > 1.2
  const flash = clamp01(1 - Math.abs(t - 1.2) / 0.35)
  const pop = collapsed ? -18 * Math.sin(clamp01((t - 1.2) / 0.6) * Math.PI) : 0
  return (
    <Scene
      coilLevel={collapsed ? 0.3 : 0.8}
      behind={
        collapsed ? (
          <Slice x={SLOT_X[0]} y={SLICE_Y + pop} color={DONENESS[outcome]} />
        ) : (
          <Ghosts probs={probs} spread={1.6 * (1 - clamp01((t - 0.8) / 0.4))} />
        )
      }
      front={
        <g>
          <rect x={0} y={0} width={400} height={320} fill="#fff" opacity={flash * 0.9} />
          {collapsed && (
            <Label x={SLOT_X[0]} y={18} color="#fde68a" size={12}>{`collapsed → ${DONENESS_LABELS[outcome]}`}</Label>
          )}
        </g>
      }
    />
  )
}

/* 4 */
const Quantization: FX = () => {
  const t = useClock(8)
  const n = Math.min(4, 1 + Math.floor(t / 1.1))
  const levelY = (k: number) => 230 - k * k * 12
  return (
    <Scene
      coilColor="#f97316"
      coilLevel={(n * n) / 16}
      leverDown
      behind={<Slice x={SLOT_X[0]} color={DONENESS[Math.min(3, n - 1)]} />}
      front={
        <g>
          {[1, 2, 3, 4].map((k) => (
            <g key={k}>
              <line x1={14} x2={58} y1={levelY(k)} y2={levelY(k)} stroke={k === n ? '#fb923c' : '#475569'} strokeWidth={k === n ? 3 : 1.5} filter={k === n ? 'url(#qt-glow)' : undefined} />
              <Label x={62} y={levelY(k) + 4} anchor="start" size={9} color="#94a3b8">{`n=${k}`}</Label>
            </g>
          ))}
          <circle cx={36} cy={levelY(n) - 6} r={5} fill="#fde68a" filter="url(#qt-glow)" style={{ transition: 'cy 0.15s' }} />
          <Label x={36} y={30} size={9} color="#fb923c">E ∝ n²</Label>
        </g>
      }
    />
  )
}

/* 5 */
const ZeroPoint: FX = () => {
  const t = useClock(30)
  const dx = Math.sin(t * 37) * 0.8 + Math.sin(t * 23) * 0.5
  const dy = Math.cos(t * 31) * 0.6
  const glow = 0.15 + 0.05 * Math.sin(t * 9)
  return (
    <Scene
      dx={dx}
      dy={dy}
      coilLevel={glow}
      coilColor="#22d3ee"
      behind={<Slice x={SLOT_X[0] + dx * 1.5} y={SLICE_Y + dy * 1.5} />}
      front={
        <g>
          <ellipse cx={200} cy={170} rx={150} ry={110} fill="none" stroke="#22d3ee" strokeOpacity={0.15 + glow * 0.3} strokeWidth={6} filter="url(#qt-blur-6)" />
          <Label x={200} y={300} color="#67e8f9">{'E₀ = ½ħω  (never zero)'}</Label>
        </g>
      }
    />
  )
}

/* 6 */
const Evolution: FX = ({ p }) => {
  const dur = 3.5
  const t = useClock(dur + 0.5)
  const series = p.series && p.series.length > 1 ? p.series : rabiSeries()
  const row = sampleSeries(series, t / dur)
  return (
    <Scene
      coilColor="#f59e0b"
      coilLevel={0.5 + 0.5 * Math.sin(t * 4) ** 2}
      leverDown
      behind={<Slice x={SLOT_X[0]} color={mixColor(row)} />}
      front={
        <g>
          {row.map((v, i) => (
            <rect key={i} x={214 + i * 22} y={70 - v * 50} width={16} height={v * 50} rx={2} fill={DONENESS[i]} opacity={0.9} />
          ))}
          <line x1={210} x2={302} y1={70} y2={70} stroke="#475569" />
          <Label x={256} y={14} size={9} color="#fcd34d">{'iħ ∂ψ/∂t = Hψ'}</Label>
        </g>
      }
    />
  )
}

/* 7 */
const Observables: FX = ({ p }) => {
  const t = useClock(4)
  const probs = normProbs(p.probabilities, DEF_PROBS)
  const exp = p.value ?? probs.reduce((a, v, i) => a + (v * i) / 3, 0)
  const k = easeInOut(t / 1.6)
  const wobble = Math.sin(t * 8) * Math.exp(-t * 1.5) * 10
  const ang = -80 + 160 * clamp01(exp) * k + wobble
  const rad = (ang * Math.PI) / 180
  return (
    <Scene
      dialAngle={-120 + 240 * clamp01(exp) * k}
      behind={<Slice x={SLOT_X[0]} color={mixColor(probs)} />}
      front={
        <g transform="translate(250 72)">
          <path d="M -54 0 A 54 54 0 0 1 54 0" fill="#0b1020" stroke="#475569" strokeWidth={2} />
          {DONENESS.map((c, i) => {
            const a = ((-80 + (160 * i) / 3) * Math.PI) / 180
            return <circle key={i} cx={Math.sin(a) * 44} cy={-Math.cos(a) * 44} r={4} fill={c} />
          })}
          <line x1={0} y1={0} x2={Math.sin(rad) * 46} y2={-Math.cos(rad) * 46} stroke="#f472b6" strokeWidth={3} strokeLinecap="round" filter="url(#qt-glow)" />
          <circle r={4} fill="#f472b6" />
          <Label x={0} y={16} size={10} color="#f9a8d4">{`⟨D⟩ = ${exp.toFixed(2)}`}</Label>
        </g>
      }
    />
  )
}

/* 8 */
const Uncertainty: FX = ({ p }) => {
  const t = useClock(5)
  const samples = p.samples && p.samples.length ? p.samples.slice(0, 14) : gaussSamples(14, 0.22)
  const narrow = easeInOut(t / 1)
  const popT = clamp01((t - 1.1) / 1.6)
  const h = Math.sin(popT * Math.PI) * 70
  return (
    <Scene
      coilLevel={0.6}
      behind={
        <g>
          {samples.map((s, i) => (
            <Slice key={i} x={SLOT_X[0] + (s - 0.5) * 140 * popT} y={SLICE_Y - h * (0.7 + 0.6 * ((i * 37) % 10) / 10)} opacity={0.18} filter="url(#qt-blur-3)" />
          ))}
          <Slice x={SLOT_X[0]} y={SLICE_Y - h} opacity={0.7} filter="url(#qt-blur-1)" />
        </g>
      }
      front={
        <g>
          <rect x={113} y={88} width={35 * narrow} height={16} fill="#94a3b8" stroke="#e2e8f0" />
          <rect x={187 - 35 * narrow} y={88} width={35 * narrow} height={16} fill="#94a3b8" stroke="#e2e8f0" />
          <Label x={150} y={120} size={9} color="#fda4af">{'Δx ↓'}</Label>
          <Label x={150} y={14} color="#fda4af">{'Δx·Δp ≥ ħ/2  → Δp ↑'}</Label>
        </g>
      }
    />
  )
}

/* 9 */
function flipStage(t: number, first: boolean) {
  const a = easeInOut(first ? t / 1.2 : (t - 1.4) / 1.2)
  return a
}
const NonCommuting: FX = () => {
  const t = useClock(4)
  const rotL = flipStage(t, true) * 90
  const flipL = 1 - 2 * flipStage(t, false)
  const flipR = 1 - 2 * flipStage(t, true)
  const rotR = flipStage(t, false) * 90
  return (
    <Scene
      coilLevel={0.4}
      front={
        <g>
          <g transform="translate(120 46)">
            <g transform={`scale(1 ${flipL}) rotate(${rotL})`}>
              <Slice x={0} y={-36} scale={0.6} butter />
            </g>
          </g>
          <g transform="translate(280 46)">
            <g transform={`rotate(${rotR}) scale(1 ${flipR})`}>
              <Slice x={0} y={-36} scale={0.6} butter />
            </g>
          </g>
          <Label x={120} y={100} color="#fcd34d" size={10}>Rotate → Flip</Label>
          <Label x={280} y={100} color="#fcd34d" size={10}>Flip → Rotate</Label>
          {t > 2.7 && <Label x={200} y={50} color="#f472b6" size={16}>≠</Label>}
          {t > 2.7 && <Label x={200} y={310} color="#f9a8d4">{'AB − BA ≠ 0'}</Label>}
        </g>
      }
    />
  )
}

/* 10 */
const Spin: FX = ({ p }) => {
  const t = useClock(14)
  const frames = p.bloch && p.bloch.length > 1 ? p.bloch : null
  let x: number
  let y: number
  let z: number
  if (frames) {
    const idx = Math.floor((t / 6) * frames.length) % frames.length
    ;[x, y, z] = frames[idx]
  } else {
    const ph = t * Math.PI * 1.4
    x = Math.cos(ph) * 0.8
    y = Math.sin(ph) * 0.8
    z = 0.6
  }
  const phi = Math.atan2(y, x)
  const sx = Math.cos(phi)
  return (
    <Scene
      coilColor={COIL_VIOLET}
      coilLevel={0.6}
      behind={<Slice x={SLOT_X[0]} y={SLICE_Y - 22} scaleX={Math.abs(sx) < 0.06 ? 0.06 : sx} color={sx < 0 ? DONENESS[2] : DONENESS[0]} butter={sx > 0} />}
      front={
        <g transform="translate(250 50)">
          <circle r={36} fill="#0b1020" opacity={0.8} stroke="#a78bfa" />
          <ellipse rx={36} ry={10} fill="none" stroke="#a78bfa" strokeOpacity={0.5} strokeDasharray="3 3" />
          <line x1={0} y1={0} x2={x * 34} y2={-z * 30 + y * 9} stroke="#f0abfc" strokeWidth={3} strokeLinecap="round" filter="url(#qt-glow)" />
          <circle cx={x * 34} cy={-z * 30 + y * 9} r={3.5} fill="#f0abfc" />
          <Label x={0} y={52} size={9} color="#c4b5fd">Bloch vector</Label>
        </g>
      }
    />
  )
}

/* 11 */
const Interference: FX = ({ p }) => {
  const t = useClock(6)
  const samples = (p.samples && p.samples.length ? p.samples : fringeSamples()).slice(0, 320)
  const N = samples.length
  const bins = 28
  const counts = new Array(bins).fill(0)
  const crumbs: React.JSX.Element[] = []
  const emitDur = 3.6
  const fall = 0.6
  samples.forEach((s, i) => {
    const t0 = (i / N) * emitDur
    const k = (t - t0) / fall
    if (k < 0) return
    const b = Math.min(bins - 1, Math.floor(clamp01(s) * bins))
    if (k >= 1) {
      counts[b]++
      return
    }
    const sx = SLOT_X[i % 2]
    const tx = 60 + clamp01(s) * 280
    const e = k * k
    crumbs.push(<circle key={i} cx={sx + (tx - sx) * k} cy={70 + (296 - 70) * e} r={1.8} fill="#fcd34d" opacity={0.9} />)
  })
  const max = Math.max(4, ...counts)
  return (
    <Scene
      coilColor="#22d3ee"
      coilLevel={0.8}
      behind={
        <g>
          <Slice x={SLOT_X[0]} y={SLICE_Y + 10} />
          <Slice x={SLOT_X[1]} y={SLICE_Y + 10} />
        </g>
      }
      front={
        <g>
          <rect x={56} y={298} width={288} height={3} fill="#475569" />
          {counts.map((c, i) => (
            <rect key={i} x={60 + (i * 280) / bins + 1} y={298 - (c / max) * 40} width={280 / bins - 2} height={(c / max) * 40} fill="#fbbf24" opacity={0.85} rx={1} />
          ))}
          {crumbs}
          <Label x={200} y={316} size={9} color="#fcd34d">crumb fringes on the counter</Label>
        </g>
      }
    />
  )
}

/* 12 */
const Tunneling: FX = ({ p }) => {
  const t = useClock(5)
  const T = clamp01(p.value ?? 0.35)
  const ok = p.success ?? T > 0.05
  const rise = easeInOut(t / 0.6)
  const slide = clamp01((t - 0.6) / 1.2)
  const after = clamp01((t - 1.8) / 1.4)
  const wallX = 40
  const y = SLICE_Y - 50 * rise
  const sx = SLOT_X[0] - (SLOT_X[0] - wallX - 32) * slide
  return (
    <Scene
      coilLevel={0.5}
      front={
        <g>
          <rect x={wallX - 6} y={-10} width={12} height={110} fill="#64748b" stroke="#cbd5e1" />
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1={wallX - 6} x2={wallX + 6} y1={i * 14} y2={i * 14 + 10} stroke="#cbd5e1" opacity={0.6} />
          ))}
          <Label x={wallX} y={114} size={9} color="#94a3b8">barrier</Label>
          {t < 1.8 ? (
            <Slice x={sx} y={y} scale={0.7} />
          ) : (
            <g>
              <Slice x={wallX + 32 + after * 70} y={y} scale={0.7} opacity={1 - T} />
              {ok && <Slice x={wallX - 32 - after * 4} y={y} scale={0.7} opacity={T * after + 0.05} className="qt-shimmer" />}
            </g>
          )}
          {t > 2 && <Label x={70} y={140} anchor="start" color="#86efac">{`T = ${T.toFixed(2)}`}</Label>}
        </g>
      }
    />
  )
}

/* 13 */
const Entanglement: FX = ({ p }) => {
  const t = useClock(14)
  const probs = normProbs(p.probabilities, [0.5, 0, 0, 0.5])
  const rnd = mulberry32(42)
  const seq = Array.from({ length: 30 }, () => {
    const r = rnd()
    let acc = 0
    for (let i = 0; i < 4; i++) {
      acc += probs[i]
      if (r < acc) return i
    }
    return 3
  })
  const idx = seq[Math.floor(t / 0.8) % seq.length]
  const c = DONENESS[idx]
  return (
    <Scene
      coilColor="#f472b6"
      coilLevel={0.6}
      behind={
        <g>
          <Slice x={SLOT_X[0]} color={c} />
          <Slice x={SLOT_X[1]} color={c} />
        </g>
      }
      front={
        <g>
          <path d={`M ${SLOT_X[0] + 18} 60 Q 200 ${20 + Math.sin(t * 3) * 10} ${SLOT_X[1] - 18} 60`} stroke="#f472b6" strokeWidth={3} fill="none" strokeDasharray="6 5" className="qt-dash" filter="url(#qt-glow)" />
          <Label x={200} y={16} color="#f9a8d4">{'|raw raw⟩ + |burnt burnt⟩'}</Label>
        </g>
      }
    />
  )
}

/* 14 */
const Bell: FX = ({ p }) => {
  const t = useClock(6)
  const S = p.value !== undefined && p.value > 1 ? p.value : 2 * Math.SQRT2
  const fill = easeInOut(t / 3) * S
  const maxS = 4
  const W = 220
  const shot = (t * 2.5) % 1
  const blinkL = shot > 0.85
  return (
    <Scene
      coilLevel={0.5}
      under={
        <g>
          <rect x={8} y={150} width={40} height={50} rx={6} fill="#0f172a" stroke="#22d3ee" />
          <circle cx={28} cy={175} r={8} fill={blinkL ? '#22d3ee' : '#164e63'} filter="url(#qt-glow)" />
          <rect x={352} y={150} width={40} height={50} rx={6} fill="#0f172a" stroke="#f472b6" />
          <circle cx={372} cy={175} r={8} fill={blinkL ? '#f472b6' : '#831843'} filter="url(#qt-glow)" />
        </g>
      }
      behind={<Slice x={SLOT_X[0]} />}
      front={
        <g>
          <circle cx={200 - shot * 160} cy={175} r={3} fill="#22d3ee" filter="url(#qt-glow)" />
          <circle cx={200 + shot * 160} cy={175} r={3} fill="#f472b6" filter="url(#qt-glow)" />
          <g transform="translate(90 292)">
            <rect width={W} height={12} rx={6} fill="#1e293b" />
            <rect width={(fill / maxS) * W} height={12} rx={6} fill={fill > 2 ? '#a3e635' : '#38bdf8'} filter="url(#qt-glow)" />
            <line x1={(2 / maxS) * W} x2={(2 / maxS) * W} y1={-6} y2={18} stroke="#f87171" strokeWidth={2} />
            <Label x={(2 / maxS) * W} y={-9} size={8} color="#fca5a5">classical 2</Label>
            <line x1={((2 * Math.SQRT2) / maxS) * W} x2={((2 * Math.SQRT2) / maxS) * W} y1={-3} y2={15} stroke="#a3e635" strokeDasharray="2 2" />
            <Label x={W + 6} y={10} anchor="start" size={10} color="#d9f99d">{`S=${fill.toFixed(2)}`}</Label>
          </g>
        </g>
      }
    />
  )
}

/* 15 */
const Decoherence: FX = ({ p }) => {
  const dur = 4
  const t = useClock(dur + 0.5)
  const k = clamp01(t / dur)
  const series = p.series && p.series.length > 1 ? p.series : null
  const start = normProbs(series?.[0] ?? p.probabilities, [0.25, 0.25, 0.25, 0.25])
  const end = series ? sampleSeries(series, 1) : start
  const probs = series ? sampleSeries(series, k) : start
  const blurId = k < 0.3 ? undefined : k < 0.65 ? 'url(#qt-blur-1)' : 'url(#qt-blur-3)'
  return (
    <Scene
      coilLevel={0.6 - 0.4 * k}
      behind={
        <g>
          <g opacity={1 - k}>
            <Ghosts probs={probs} spread={1.6 * (1 - k * 0.6)} blur={blurId} flicker={k < 0.8} />
          </g>
          <g opacity={k} filter="url(#qt-dull)">
            <Slice x={SLOT_X[0]} color={mixColor(end)} />
          </g>
        </g>
      }
      front={
        <g>
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2 + t
            const r = 70 - 30 * k
            return <circle key={i} cx={SLOT_X[0] + Math.cos(a) * r} cy={60 + Math.sin(a) * r * 0.6} r={2} fill="#94a3b8" opacity={0.3 + 0.5 * k} />
          })}
          <Label x={290} y={40} color="#cbd5e1">{k > 0.9 ? 'classical' : 'environment leaks…'}</Label>
        </g>
      }
    />
  )
}

/* 16 */
const Zeno: FX = () => {
  const t = useClock(14)
  const period = 0.7
  const ph = (t % period) / period
  const blink = ph < 0.18 ? 1 - Math.sin((ph / 0.18) * Math.PI) : 1
  const count = Math.floor(t / period)
  return (
    <Scene
      coilColor="#fb923c"
      coilLevel={0.95}
      leverDown
      behind={<Slice x={SLOT_X[0]} color={DONENESS[0]} />}
      front={
        <g>
          <g transform={`translate(${SLOT_X[0]} 14)`}>
            <g transform={`scale(1 ${Math.max(0.05, blink)})`}>
              <path d="M -26 0 Q 0 -18 26 0 Q 0 18 -26 0 Z" fill="#f8fafc" stroke="#0f172a" strokeWidth={2} />
              <circle r={7} fill="#2563eb" />
              <circle r={3} fill="#020617" />
            </g>
          </g>
          {ph < 0.2 && <path d={`M ${SLOT_X[0]} 28 L ${SLOT_X[0] - 20} 70 L ${SLOT_X[0] + 20} 70 Z`} fill="#bfdbfe" opacity={0.35} />}
          <Label x={250} y={40} color="#fdba74">{`looks: ${count}`}</Label>
          <Label x={250} y={58} color="#fdba74" size={9}>still raw!</Label>
        </g>
      }
    />
  )
}

/* 17 */
const Exclusion: FX = () => {
  const t = useClock(5)
  const fall = easeInOut(t / 1.3)
  const push = easeInOut((t - 1.3) / 0.9)
  const yA = -80 + (SLICE_Y + 80) * fall
  const xA = 135 + 15 * fall
  const xB = 165 - 15 * fall + (SLOT_X[1] - 150) * push
  const yB = yA - Math.sin(push * Math.PI) * 50
  const spark = t > 1.15 && t < 1.7
  return (
    <Scene
      coilLevel={0.5}
      behind={
        <g>
          <Slice x={xA} y={yA} />
          <Slice x={xB} y={yB} color={DONENESS[1]} />
        </g>
      }
      front={
        <g>
          <Label x={xA} y={yA + 40} size={14} color="#0f172a">↑</Label>
          <Label x={xB} y={yB + 40} size={14} color="#0f172a">↑</Label>
          {spark && (
            <g transform={`translate(150 ${SLICE_Y + 20})`} filter="url(#qt-glow)">
              {Array.from({ length: 8 }, (_, i) => {
                const a = (i / 8) * Math.PI * 2
                return <line key={i} x1={Math.cos(a) * 6} y1={Math.sin(a) * 6} x2={Math.cos(a) * 22} y2={Math.sin(a) * 22} stroke="#facc15" strokeWidth={2.5} />
              })}
            </g>
          )}
          {t > 2.2 && <Label x={200} y={14} color="#fde047">one fermion per state</Label>}
        </g>
      }
    />
  )
}

/* 18 */
const NoCloning: FX = ({ p }) => {
  const t = useClock(5)
  const F = clamp01(p.value ?? 0.5)
  const scan = clamp01(t / 1.6)
  const appear = clamp01((t - 1.2) / 1)
  const blur = F > 0.85 ? 'url(#qt-blur-1)' : F > 0.55 ? 'url(#qt-blur-3)' : 'url(#qt-blur-6)'
  const jit = Math.sin(t * 40) * (1 - F) * 2.5
  return (
    <Scene
      coilLevel={0.5}
      behind={
        <g>
          <Slice x={SLOT_X[0]} color={DONENESS[1]} butter />
          <Slice x={SLOT_X[1] + jit} color={DONENESS[1]} opacity={F * appear} filter={blur} butter />
        </g>
      }
      front={
        <g>
          {scan < 1 && <rect x={SLOT_X[0] - 30 + scan * 200} y={20} width={4} height={76} fill="#22d3ee" opacity={0.8} filter="url(#qt-glow)" />}
          <Label x={200} y={14} color="#67e8f9">{`copy fidelity F = ${F.toFixed(2)}`}</Label>
          {appear > 0.9 && <Label x={SLOT_X[1]} y={120} color="#fca5a5" size={9}>blurry copy</Label>}
        </g>
      }
    />
  )
}

/* 19 */
function heatColor(k: number): string {
  const stops = ['#2a0a05', '#b91c1c', '#f97316', '#fde047', '#ffffff']
  const x = clamp01(k) * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(x))
  return lerpHex(stops[i], stops[i + 1], x - i)
}
const Blackbody: FX = ({ p }) => {
  const dur = 4
  const t = useClock(dur + 0.5)
  const k = clamp01(t / dur)
  const color = p.color && k >= 1 ? p.color : heatColor(p.color ? k * 0.85 : k)
  return (
    <Scene
      coilColor={color}
      coilLevel={0.3 + 0.7 * k}
      leverDown
      behind={<Slice x={SLOT_X[0]} color={lerpHex(DONENESS[0], DONENESS[2], k)} />}
      front={
        <g>
          <rect x={60} y={60} width={280} height={60} fill={color} opacity={0.12 * k} filter="url(#qt-blur-6)" />
          <rect x={300} y={20} width={16} height={60} rx={8} fill="#1e293b" stroke="#475569" />
          <rect x={304} y={76 - 52 * k} width={8} height={52 * k} rx={4} fill={color} />
          <Label x={308} y={96} size={9} color="#fde68a">{`T ${Math.round(800 + 5200 * k)}K`}</Label>
        </g>
      }
    />
  )
}

/* 20 */
const Photoelectric: FX = ({ p }) => {
  const t = useClock(8)
  const ok = p.success ?? true
  const beam = clamp01(t / 0.6)
  const color = ok ? '#a78bfa' : '#ef4444'
  const waves = ok ? 12 : 5
  const x0 = 10
  const y0 = 10
  const x1 = SLOT_X[0] - 20
  const y1 = 50
  const L = Math.hypot(x1 - x0, y1 - y0)
  const pts = Array.from({ length: 80 }, (_, i) => {
    const s = (i / 79) * beam
    const off = Math.sin(s * waves * Math.PI * 2 - t * 10) * 5
    const nx = -(y1 - y0) / L
    const ny = (x1 - x0) / L
    return `${i ? 'L' : 'M'} ${x0 + (x1 - x0) * s + nx * off} ${y0 + (y1 - y0) * s + ny * off}`
  }).join(' ')
  return (
    <Scene
      coilLevel={0.4}
      behind={<Slice x={SLOT_X[0]} />}
      front={
        <g>
          <path d={pts} stroke={color} strokeWidth={2.5} fill="none" filter="url(#qt-glow)" />
          {ok &&
            t > 0.6 &&
            Array.from({ length: 10 }, (_, i) => {
              const k = ((t - 0.6) * 0.9 + i / 10) % 1
              const a = -0.6 - (i % 5) * 0.25
              return <circle key={i} cx={SLOT_X[0] + Math.cos(a) * k * 170} cy={50 + Math.sin(a) * k * 120} r={3} fill="#67e8f9" opacity={1 - k} filter="url(#qt-glow)" />
            })}
          <Label x={260} y={30} color={ok ? '#67e8f9' : '#fca5a5'}>{ok ? 'f > f₀ : e⁻ ejected!' : 'f < f₀ : nothing'}</Label>
        </g>
      }
    />
  )
}

/* 21 */
const Teleportation: FX = ({ p }) => {
  const t = useClock(5)
  const F = clamp01(p.value ?? 1)
  const dis = clamp01((t - 0.4) / 1.2)
  const travel = clamp01((t - 1.0) / 1.8)
  const mat = clamp01((t - 2.4) / 1)
  const rnd = mulberry32(9)
  const parts = Array.from({ length: 40 }, () => [rnd() * 54 - 27, rnd() * 60, rnd()])
  const tx = 352
  const ty = 210
  return (
    <Scene
      coilColor="#22d3ee"
      coilLevel={0.6}
      behind={<Slice x={SLOT_X[0]} opacity={1 - dis} filter={dis > 0.2 ? 'url(#qt-blur-1)' : undefined} color={DONENESS[2]} />}
      front={
        <g>
          <g transform={`translate(${tx - 50 * 0.3} ${ty}) scale(0.3)`} opacity={0.5 + 0.5 * clamp01(t / 1)}>
            <rect x={0} y={84} width={100} height={110} rx={20} fill="url(#qt-chrome)" stroke="#e2e8f0" />
            <rect x={16} y={88} width={68} height={12} rx={5} fill="#05070d" />
            <rect x={20} y={91} width={60} height={6} rx={3} fill="#22d3ee" filter="url(#qt-glow)" />
            <rect x={12} y={120} width={76} height={60} rx={10} fill="url(#qt-glass)" stroke="#67e8f9" />
          </g>
          <g clipPath="url(#qt-tele-clip)">
            <Slice x={tx} y={ty + 84 * 0.3 - 22} scale={0.3} opacity={mat * F} color={DONENESS[2]} filter={F < 0.8 ? 'url(#qt-blur-1)' : undefined} />
          </g>
          <clipPath id="qt-tele-clip">
            <rect x={tx - 40} y={0} width={80} height={ty + 92 * 0.3} />
          </clipPath>
          {parts.map(([px, py, d], i) => {
            const k = clamp01((travel - d * 0.3) / 0.7)
            if (dis <= 0 || (k >= 1 && mat > 0.5)) return null
            const sx = SLOT_X[0] + px
            const sy = SLICE_Y + py
            const ex = tx + px * 0.3
            const ey = ty + 10 + py * 0.3
            const cx = sx + (ex - sx) * easeInOut(k)
            const cy = sy + (ey - sy) * easeInOut(k) - Math.sin(k * Math.PI) * 60
            return <circle key={i} cx={cx} cy={cy} r={1.8} fill={i % 3 ? '#e0b072' : '#67e8f9'} opacity={dis} filter="url(#qt-glow)" />
          })}
          <path d={`M 200 296 L ${tx} 296`} stroke="#334155" strokeDasharray="3 4" />
          {t > 1 && t < 3 && <Label x={200 + (tx - 200) * clamp01((t - 1) / 2)} y={292} size={9} color="#fde68a">01</Label>}
          {mat > 0.5 && <Label x={tx} y={198} size={9} color="#67e8f9">arrived!</Label>}
        </g>
      }
    />
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

export function EffectView({ effect, p }: { effect: EffectId; p: Payload }) {
  const Effect = EFFECTS[effect] ?? Idle
  return <Effect p={p} />
}
