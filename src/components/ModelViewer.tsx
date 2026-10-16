import { useEffect, useState } from 'react'

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string
        alt?: string
        poster?: string
        'auto-rotate'?: boolean | string
        'camera-controls'?: boolean | string
        'shadow-intensity'?: string
        exposure?: string
      }
    }
  }
}

const SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js'
const BASE = import.meta.env.BASE_URL
const GLB = `${BASE}assets/toaster.glb`
const PNG = `${BASE}assets/toaster-render.png`

export default function ModelViewer() {
  const [open, setOpen] = useState(true)
  const [hasGlb, setHasGlb] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(GLB, { method: 'HEAD' })
      .then((r) => {
        const type = r.headers.get('content-type') ?? ''
        if (!cancelled && r.ok && !type.includes('text/html')) setHasGlb(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hasGlb || document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return
    const s = document.createElement('script')
    s.type = 'module'
    s.src = SCRIPT_SRC
    document.head.appendChild(s)
  }, [hasGlb])

  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-semibold text-slate-200 hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        <span>3D render</span>
        <span className="text-slate-500">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="aspect-square w-full bg-slate-950">
          {hasGlb ? (
            <model-viewer
              src={GLB}
              poster={PNG}
              alt="3D model of the Quantum Toaster"
              auto-rotate=""
              camera-controls=""
              shadow-intensity="1"
              style={{ width: '100%', height: '100%', background: 'transparent' }}
            />
          ) : (
            <img src={PNG} alt="Render of the Quantum Toaster" className="h-full w-full object-contain" />
          )}
        </div>
      )}
    </section>
  )
}
