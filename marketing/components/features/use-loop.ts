"use client"

import { useEffect, useRef, useState } from "react"
import { useInView, useReducedMotion } from "motion/react"

/**
 * Steps through a demo's phases (each lasting `durations[i]` ms) and loops,
 * but only while the element is on screen. With reduced motion it holds the
 * last phase, the finished state.
 */
export function useLoop<T extends HTMLElement>(durations: number[]) {
  const ref = useRef<T>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const reduceMotion = useReducedMotion()
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (reduceMotion) {
      setPhase(durations.length - 1)
      return
    }
    if (!inView) return
    const t = setTimeout(() => setPhase((p) => (p + 1) % durations.length), durations[phase])
    return () => clearTimeout(t)
  }, [phase, inView, reduceMotion, durations])

  return { ref, phase }
}

/** Types `text` out over `ms` while `on`, else shows it whole (or empty before). */
export function useTypewriter(text: string, on: boolean, ms = 1200) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!on) {
      setN(0)
      return
    }
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / ms)
      setN(Math.round(k * text.length))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [on, text, ms])
  return text.slice(0, n)
}
