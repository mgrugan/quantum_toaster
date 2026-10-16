import type { CSSProperties, ReactNode } from 'react'
import { DONENESS, SLICE_Y, SLOT_X } from './utils'

export const COIL_IDLE = '#38bdf8'
export const COIL_VIOLET = '#a78bfa'

export function Defs() {
  return (
    <defs>
      <linearGradient id="qt-chrome" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f8fafc" />
        <stop offset="0.25" stopColor="#94a3b8" />
        <stop offset="0.5" stopColor="#e2e8f0" />
        <stop offset="0.75" stopColor="#64748b" />
        <stop offset="1" stopColor="#cbd5e1" />
      </linearGradient>
      <linearGradient id="qt-chrome-v" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f1f5f9" />
        <stop offset="1" stopColor="#64748b" />
      </linearGradient>
      <radialGradient id="qt-glass" cx="0.5" cy="0.45" r="0.7">
        <stop offset="0" stopColor="#4c1d95" stopOpacity="0.85" />
        <stop offset="0.6" stopColor="#1e1b4b" stopOpacity="0.9" />
        <stop offset="1" stopColor="#020617" stopOpacity="0.95" />
      </radialGradient>
      <radialGradient id="qt-floor" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#38bdf8" stopOpacity="0.25" />
        <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
      </radialGradient>
      <filter id="qt-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="qt-glow-big" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="7" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="qt-blur-1" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="1.2" />
      </filter>
      <filter id="qt-blur-3" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
      <filter id="qt-blur-6" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <filter id="qt-dull">
        <feColorMatrix type="saturate" values="0.25" />
      </filter>
      <clipPath id="qt-above-slot">
        <rect x="-400" y="-400" width="1200" height="497" />
      </clipPath>
    </defs>
  )
}

const SLICE_PATH =
  'M -27 20 C -36 4 -22 -6 -11 -1 C -5 -8 5 -8 11 -1 C 22 -6 36 4 27 20 L 27 72 L -27 72 Z'
const CRUMB_PATH =
  'M -21 21 C -28 9 -18 2 -9 5 C -4 0 4 0 9 5 C 18 2 28 9 21 21 L 21 72 L -21 72 Z'

export interface SliceProps {
  x?: number
  y?: number
  color?: string
  opacity?: number
  scaleX?: number
  scale?: number
  rotate?: number
  filter?: string
  className?: string
  style?: CSSProperties
  butter?: boolean
  transform?: string
}

/** One bread slice. (x, y) = top-centre of the slice; it is 72 tall. */
export function Slice({
  x = SLOT_X[0],
  y = SLICE_Y,
  color = DONENESS[0],
  opacity = 1,
  scaleX = 1,
  scale = 1,
  rotate = 0,
  filter,
  className,
  style,
  butter,
  transform,
}: SliceProps) {
  return (
    <g transform={`translate(${x} ${y + 36}) rotate(${rotate}) scale(${scaleX * scale} ${scale})`} opacity={opacity}>
      <g transform={transform}>
        <g className={className} style={style} filter={filter}>
          <g transform="translate(0 -36)">
            <path d={SLICE_PATH} fill={color} stroke="#6b3e17" strokeOpacity={0.55} strokeWidth={3} strokeLinejoin="round" />
            <path d={CRUMB_PATH} fill="#ffffff" opacity={0.1} />
            <circle cx={-8} cy={30} r={1.4} fill="#000" opacity={0.15} />
            <circle cx={9} cy={44} r={1.2} fill="#000" opacity={0.15} />
            <circle cx={-3} cy={56} r={1.3} fill="#000" opacity={0.15} />
            {butter && <rect x={4} y={12} width={16} height={11} rx={3} fill="#fde047" stroke="#ca8a04" strokeWidth={1} />}
          </g>
        </g>
      </g>
    </g>
  )
}

/** Four doneness ghosts with opacity proportional to probability. */
export function Ghosts({
  probs,
  x = SLOT_X[0],
  spread = 1,
  blur,
  flicker = true,
  y = SLICE_Y,
}: {
  probs: number[]
  x?: number
  spread?: number
  blur?: string
  flicker?: boolean
  y?: number
}) {
  return (
    <g>
      {DONENESS.map((c, i) => (
        <Slice
          key={i}
          x={x + (i - 1.5) * 9 * spread}
          y={y - (i - 1.5) * 3 * spread}
          color={c}
          opacity={0.12 + 0.75 * probs[i]}
          filter={blur}
          className={flicker ? 'qt-flicker' : undefined}
          style={flicker ? { animationDelay: `${i * 0.13}s`, animationDuration: `${0.5 + i * 0.17}s` } : undefined}
        />
      ))}
    </g>
  )
}

function Coil({ x, color, level }: { x: number; color: string; level: number }) {
  return (
    <g>
      <rect x={x - 37} y={90} width={74} height={13} rx={5} fill="#05070d" stroke="#334155" strokeWidth={1} />
      <rect x={x - 33} y={93} width={66} height={7} rx={3} fill={color} opacity={0.25 + 0.75 * level} filter="url(#qt-glow)" />
      <path
        d={Array.from({ length: 11 }, (_, i) => `${i === 0 ? 'M' : 'L'} ${x - 32 + i * 6.4} ${i % 2 ? 94 : 100}`).join(' ')}
        stroke="#fff"
        strokeOpacity={0.35 + 0.6 * level}
        strokeWidth={1.2}
        fill="none"
      />
    </g>
  )
}

export interface SceneProps {
  coilColor?: string
  coilLevel?: number
  /** Content shown rising out of the slots (clipped at the slot line). */
  behind?: ReactNode
  /** Content drawn over the toaster body. */
  front?: ReactNode
  /** Content drawn under everything (floor). */
  under?: ReactNode
  dx?: number
  dy?: number
  leverDown?: boolean
  dialAngle?: number
  atomSpeed?: number
}

export function ToasterBody({
  coilColor = COIL_IDLE,
  coilLevel = 0.5,
  leverDown = false,
  dialAngle = -40,
  behind,
  atomSpeed = 1,
}: Omit<SceneProps, 'front' | 'under' | 'dx' | 'dy'>) {
  return (
    <g>
      <ellipse cx={200} cy={276} rx={160} ry={12} fill="#000" opacity={0.45} />
      <ellipse cx={200} cy={276} rx={150} ry={20} fill="url(#qt-floor)" />
      <ellipse cx={104} cy={266} rx={14} ry={7} fill="#0b0f19" />
      <ellipse cx={296} cy={266} rx={14} ry={7} fill="#0b0f19" />
      {/* body */}
      <rect x={70} y={84} width={260} height={180} rx={34} fill="url(#qt-chrome)" stroke="#e2e8f0" strokeOpacity={0.6} />
      <rect x={82} y={88} width={236} height={22} rx={11} fill="url(#qt-chrome-v)" opacity={0.9} />
      <rect x={90} y={112} width={6} height={130} rx={3} fill="#fff" opacity={0.25} />
      {/* slots + coils */}
      <Coil x={150} color={coilColor} level={coilLevel} />
      <Coil x={250} color={coilColor} level={coilLevel} />
      <g clipPath="url(#qt-above-slot)">{behind}</g>
      <rect x={110} y={100} width={180} height={3} rx={1.5} fill="#e2e8f0" opacity={0.7} />
      {/* atom panel */}
      <rect x={88} y={122} width={150} height={122} rx={16} fill="url(#qt-glass)" stroke="#67e8f9" strokeOpacity={0.55} strokeWidth={2} />
      <line x1={98} y1={138} x2={98} y2={228} stroke={coilColor} strokeWidth={3} strokeLinecap="round" opacity={0.4 + 0.6 * coilLevel} filter="url(#qt-glow)" />
      <line x1={228} y1={138} x2={228} y2={228} stroke={coilColor} strokeWidth={3} strokeLinecap="round" opacity={0.4 + 0.6 * coilLevel} filter="url(#qt-glow)" />
      {[
        [96, 130],
        [230, 130],
        [96, 236],
        [230, 236],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3} fill="#cbd5e1" stroke="#475569" />
      ))}
      <g className="qt-atom" style={{ animationDuration: `${12 / Math.max(0.1, atomSpeed)}s` }}>
        {[0, 60, 120].map((r) => (
          <g key={r} transform={`rotate(${r} 163 183)`}>
            <ellipse cx={163} cy={183} rx={52} ry={17} fill="none" stroke={r === 60 ? COIL_VIOLET : '#67e8f9'} strokeWidth={1.6} opacity={0.85} filter="url(#qt-glow)" />
            <circle cx={215} cy={183} r={3.4} fill="#e0f2fe" filter="url(#qt-glow)" />
          </g>
        ))}
      </g>
      <circle cx={163} cy={183} r={9 + 3 * coilLevel} fill={coilColor} opacity={0.9} filter="url(#qt-glow-big)" />
      <circle cx={163} cy={183} r={4} fill="#fff" />
      {/* lever */}
      <rect x={266} y={122} width={14} height={78} rx={7} fill="#0f172a" stroke="#475569" />
      <rect x={271} y={130} width={4} height={62} rx={2} fill={coilColor} opacity={0.5 + 0.5 * coilLevel} filter="url(#qt-glow)" />
      <g style={{ transform: `translateY(${leverDown ? 52 : 0}px)`, transition: 'transform 0.35s ease' }}>
        <rect x={248} y={126} width={50} height={15} rx={6} fill="url(#qt-chrome-v)" stroke="#94a3b8" />
      </g>
      {/* psi dial */}
      {Array.from({ length: 13 }, (_, i) => {
        const a = ((-120 + i * 20) * Math.PI) / 180
        return (
          <line
            key={i}
            x1={284 + Math.sin(a) * 25}
            y1={228 - Math.cos(a) * 25}
            x2={284 + Math.sin(a) * 29}
            y2={228 - Math.cos(a) * 29}
            stroke={i % 3 ? '#a78bfa' : '#67e8f9'}
            strokeWidth={1.5}
            opacity={0.8}
          />
        )
      })}
      <circle cx={284} cy={228} r={21} fill="url(#qt-chrome)" stroke="#94a3b8" />
      <circle cx={284} cy={228} r={14} fill="#0b1020" stroke={COIL_VIOLET} strokeWidth={2} filter="url(#qt-glow)" />
      <text x={284} y={234} textAnchor="middle" fontSize={16} fill="#c4b5fd" fontFamily="serif">
        Ψ
      </text>
      <g style={{ transform: `rotate(${dialAngle}deg)`, transformOrigin: '284px 228px', transition: 'transform 0.6s cubic-bezier(.3,1.6,.5,1)' }}>
        <circle cx={284} cy={210} r={2.5} fill="#67e8f9" filter="url(#qt-glow)" />
      </g>
    </g>
  )
}

export function Scene({ under, front, dx = 0, dy = 0, ...body }: SceneProps) {
  return (
    <g>
      {under}
      <g transform={`translate(${dx} ${dy})`}>
        <ToasterBody {...body} />
      </g>
      {front}
    </g>
  )
}

export function Label({ x, y, children, color = '#e2e8f0', size = 11, anchor = 'middle' }: { x: number; y: number; children: ReactNode; color?: string; size?: number; anchor?: 'start' | 'middle' | 'end' }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fill={color} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" style={{ paintOrder: 'stroke' }} stroke="#020617" strokeWidth={3}>
      {children}
    </text>
  )
}
