import type { CSSProperties, ReactNode } from 'react'
import { DONENESS, SLICE_Y, SLOT_X, clamp01, lerpHex } from './utils'

/** Flat minimalist palette. */
export const INK = '#18181b'
export const TEXT = '#3f3f46'
export const MUTED = '#a1a1aa'
export const ACCENT = '#2563eb'
export const BODY = '#f4f4f5'
export const PANEL = '#e4e4e7'
export const STROKE = '#d4d4d8'
export const SLOT = '#3f3f46'
export const COIL_IDLE = MUTED
export const COIL_HOT = '#f97316'
export const COIL_ACCENT = ACCENT

export function Defs() {
  return (
    <defs>
      {/* Semantic blurs only (decoherence, no-cloning copy, uncertainty trail). */}
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
            <path d={SLICE_PATH} fill={color} stroke="#b9772f" strokeOpacity={0.6} strokeWidth={1.5} strokeLinejoin="round" />
            <path d={CRUMB_PATH} fill="none" stroke="#b9772f" strokeOpacity={0.25} strokeWidth={1} />
            <circle cx={-8} cy={30} r={1.1} fill={INK} opacity={0.18} />
            <circle cx={9} cy={44} r={1} fill={INK} opacity={0.18} />
            <circle cx={-3} cy={56} r={1.1} fill={INK} opacity={0.18} />
            {butter && <rect x={4} y={12} width={16} height={11} rx={3} fill="#fde68a" stroke="#d4a017" strokeWidth={1} />}
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

/** Flat coil stroke colour: grey when cold, moving to `color` as it heats. */
function coilStroke(color: string, level: number): string {
  return lerpHex(COIL_IDLE, color, clamp01((level - 0.2) / 0.7))
}

function Coil({ x, color, level }: { x: number; color: string; level: number }) {
  return (
    <g>
      <rect x={x - 37} y={90} width={74} height={13} rx={5} fill={SLOT} />
      <path
        d={Array.from({ length: 11 }, (_, i) => `${i === 0 ? 'M' : 'L'} ${x - 32 + i * 6.4} ${i % 2 ? 94 : 100}`).join(' ')}
        stroke={coilStroke(color, level)}
        strokeWidth={1.4}
        strokeLinejoin="round"
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
  coilColor = COIL_HOT,
  coilLevel = 0.5,
  leverDown = false,
  dialAngle = -40,
  behind,
  atomSpeed = 1,
}: Omit<SceneProps, 'front' | 'under' | 'dx' | 'dy'>) {
  const heat = coilStroke(coilColor, coilLevel)
  return (
    <g>
      {/* soft flat shadow */}
      <ellipse cx={200} cy={274} rx={150} ry={9} fill={PANEL} opacity={0.8} />
      <rect x={96} y={262} width={20} height={8} rx={3} fill={STROKE} />
      <rect x={284} y={262} width={20} height={8} rx={3} fill={STROKE} />
      {/* body */}
      <rect x={70} y={84} width={260} height={180} rx={34} fill={BODY} stroke={STROKE} strokeWidth={1.5} />
      <line x1={104} y1={110} x2={296} y2={110} stroke={STROKE} strokeWidth={1} />
      {/* slots + coils */}
      <Coil x={150} color={coilColor} level={coilLevel} />
      <Coil x={250} color={coilColor} level={coilLevel} />
      <g clipPath="url(#qt-above-slot)">{behind}</g>
      {/* atom panel */}
      <rect x={88} y={122} width={150} height={122} rx={16} fill={PANEL} stroke={STROKE} strokeWidth={1.5} />
      <line x1={98} y1={138} x2={98} y2={228} stroke={heat} strokeWidth={1.5} strokeLinecap="round" />
      <line x1={228} y1={138} x2={228} y2={228} stroke={heat} strokeWidth={1.5} strokeLinecap="round" />
      {[
        [96, 130],
        [230, 130],
        [96, 236],
        [230, 236],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.8} fill="none" stroke={MUTED} strokeWidth={1} />
      ))}
      <g className="qt-atom" style={{ animationDuration: `${12 / Math.max(0.1, atomSpeed)}s` }}>
        {[0, 60, 120].map((r) => (
          <g key={r} transform={`rotate(${r} 163 183)`}>
            <ellipse cx={163} cy={183} rx={52} ry={17} fill="none" stroke={MUTED} strokeWidth={1} />
            <circle cx={215} cy={183} r={2.6} fill={INK} />
          </g>
        ))}
      </g>
      <circle cx={163} cy={183} r={6 + 3 * coilLevel} fill="none" stroke={heat} strokeWidth={1.5} />
      <circle cx={163} cy={183} r={3} fill={INK} />
      {/* lever */}
      <rect x={266} y={122} width={14} height={78} rx={7} fill={PANEL} stroke={STROKE} strokeWidth={1.5} />
      <line x1={273} y1={132} x2={273} y2={190} stroke={heat} strokeWidth={1.5} strokeLinecap="round" />
      <g style={{ transform: `translateY(${leverDown ? 52 : 0}px)`, transition: 'transform 0.35s ease' }}>
        <rect x={248} y={126} width={50} height={15} rx={6} fill="#ffffff" stroke={STROKE} strokeWidth={1.5} />
        <line x1={258} y1={133.5} x2={288} y2={133.5} stroke={INK} strokeWidth={0.75} opacity={0.5} />
      </g>
      {/* psi dial */}
      {Array.from({ length: 13 }, (_, i) => {
        const a = ((-120 + i * 20) * Math.PI) / 180
        return (
          <line
            key={i}
            x1={284 + Math.sin(a) * 25}
            y1={228 - Math.cos(a) * 25}
            x2={284 + Math.sin(a) * (i % 3 ? 28 : 30)}
            y2={228 - Math.cos(a) * (i % 3 ? 28 : 30)}
            stroke={i % 3 ? MUTED : INK}
            strokeWidth={1}
          />
        )
      })}
      <circle cx={284} cy={228} r={20} fill="#ffffff" stroke={STROKE} strokeWidth={1.5} />
      <text x={284} y={233.5} textAnchor="middle" fontSize={15} fontWeight={300} fill={TEXT} fontFamily="inherit">
        Ψ
      </text>
      <g style={{ transform: `rotate(${dialAngle}deg)`, transformOrigin: '284px 228px', transition: 'transform 0.6s cubic-bezier(.3,1.6,.5,1)' }}>
        <line x1={284} y1={214} x2={284} y2={209} stroke={ACCENT} strokeWidth={1.5} strokeLinecap="round" />
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

export function Label({ x, y, children, color = TEXT, size = 11, anchor = 'middle' }: { x: number; y: number; children: ReactNode; color?: string; size?: number; anchor?: 'start' | 'middle' | 'end' }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fill={color} fontFamily="inherit" fontWeight={300} letterSpacing="0.02em">
      {children}
    </text>
  )
}
