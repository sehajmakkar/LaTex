"use client"

import { motion, useReducedMotion, type Transition } from "motion/react"

/**
 * A page that flips over while a silver scan bar sweeps it: the "reading your
 * resume" loop. Adapted from uselayouts' scan-document, restyled for Vero's
 * grey/silver theme and made to loop for as long as it's mounted.
 */

export const SCAN_CYCLE_S = 4.6
const TIMES = [0, 0.1, 0.45, 0.55, 0.9, 1]
const ROTATE_Y = [0, 0, 180, 180, 360, 360]
const TRAVEL = 132
const BAR_Y = [0, 0, 1, 1, 0, 0].map((p) => p * TRAVEL)
const EASE = [0.645, 0.045, 0.355, 1] as const

function ScanBar({ transition, z }: { transition: Transition; z: number }) {
  return (
    <motion.div
      animate={{ y: BAR_Y }}
      transition={transition}
      className="absolute top-0 h-[6px] w-[124px] rounded-full bg-gradient-to-b from-white via-zinc-200 to-zinc-400 shadow-[0_0_18px_4px_rgba(244,244,245,0.35),0_4px_10px_-1px_rgba(244,244,245,0.25)]"
      style={{ left: "50%", x: "-50%", z }}
    >
      <div className="absolute left-3 right-3 top-[1px] h-[1.5px] rounded-full bg-white/80 blur-[0.5px]" />
    </motion.div>
  )
}

/** The document itself: 110×150, looping. `scale` resizes it without re-timing. */
export function ScanDocument({ scale = 1, className }: { scale?: number; className?: string }) {
  const reduceMotion = useReducedMotion() ?? false
  const cycle: Transition = reduceMotion
    ? { duration: 0 }
    : { duration: SCAN_CYCLE_S, ease: EASE, times: TIMES, repeat: Infinity }

  return (
    <div aria-hidden className={className} style={{ width: 110 * scale, height: 150 * scale }}>
      <div className="h-[150px] w-[110px] origin-top-left [perspective:900px]" style={{ transform: `scale(${scale})` }}>
        <motion.div
          animate={{ rotateY: reduceMotion ? 0 : ROTATE_Y }}
          transition={cycle}
          className="relative h-full w-full will-change-transform [transform-style:preserve-3d]"
        >
          {/* spine, visible edge-on mid-flip */}
          <div className="absolute left-1/2 top-0 h-full w-[7px] -translate-x-1/2 rounded-sm bg-gradient-to-r from-zinc-300 via-zinc-500 to-zinc-300" />

          {/* front: a resume, drawn as lines */}
          <div className="absolute inset-0 overflow-hidden rounded-md bg-zinc-100 shadow-[0_8px_24px_rgba(0,0,0,0.35)] [backface-visibility:hidden]">
            <div className="mx-auto mt-3.5 h-[4px] w-12 rounded bg-zinc-500" />
            <div className="mx-auto mt-1.5 h-[2px] w-16 rounded bg-zinc-300" />
            {[0, 1, 2].map((s) => (
              <div key={s} className="mx-3.5 mt-3">
                <div className="h-[3px] w-10 rounded bg-zinc-400" />
                <div className="mt-1 h-px w-full bg-zinc-300" />
                <div className="mt-1.5 h-[2px] w-[85%] rounded bg-zinc-300" />
                <div className="mt-1 h-[2px] w-[70%] rounded bg-zinc-300" />
              </div>
            ))}
          </div>

          {/* back */}
          <div className="absolute inset-0 rounded-md bg-zinc-400 shadow-[0_8px_24px_rgba(0,0,0,0.35)] [backface-visibility:hidden] [transform:rotateY(180deg)]" />

          {!reduceMotion && (
            <>
              <ScanBar transition={cycle} z={3} />
              <ScanBar transition={cycle} z={-3} />
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
