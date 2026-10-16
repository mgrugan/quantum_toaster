import { useEffect, useState } from 'react'

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * Elapsed animation time in "scene seconds" since mount, driven by rAF.
 * Stops ticking after `stopAfter` scene seconds (holds the final frame).
 * Under prefers-reduced-motion, time runs 3x faster so animations are short.
 */
export function useClock(stopAfter = 12): number {
  const [t, setT] = useState(0)
  useEffect(() => {
    const speed = prefersReducedMotion() ? 3 : 1
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const s = ((now - start) / 1000) * speed
      if (s >= stopAfter) {
        setT(stopAfter)
        return
      }
      setT(s)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [stopAfter])
  return t
}
