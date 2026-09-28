"use client"

import { motion, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react"

const SIZE = 28
// Stacked, each face hides about a third of the one before it.
const CLOSED_STEP = 19
// On hover it fans out only slightly, so it still reads as one group.
const OPEN_STEP = 25
const FAN = { visualDuration: 0.3, bounce: 0.2 }

/**
 * A small stack of illustrated faces with a "+N" chip that fans open a little
 * on hover. Decorative: no names or tooltips (the faces are illustrations, not
 * users), so it's hidden from screen readers.
 */
export function AvatarStack({ faces, more, className }: { faces: string[]; more: number; className?: string }) {
  const reduceMotion = useReducedMotion()
  const step = useSpring(CLOSED_STEP, FAN)
  const count = faces.length + (more > 0 ? 1 : 0)
  const mid = (count - 1) / 2
  const set = (open: boolean) => (reduceMotion ? step.jump : step.set).call(step, open ? OPEN_STEP : CLOSED_STEP)

  return (
    <div
      aria-hidden
      // Sized for the fanned stack, with every face placed from the centre, so fanning grows both ways and nothing moves.
      style={{ width: (count - 1) * OPEN_STEP + SIZE, height: SIZE }}
      className={`relative ${className ?? ""}`}
      onPointerEnter={(e) => e.pointerType !== "touch" && set(true)}
      onPointerLeave={(e) => e.pointerType !== "touch" && set(false)}
    >
      {faces.map((src, i) => (
        <Slot key={src} step={step} offset={i - mid}>
          {/* Line-drawn faces are black ink, so they sit on a light disc, like a printed photo. */}
          <img src={src} alt="" width={SIZE} height={SIZE} draggable={false} className="size-full rounded-full bg-zinc-200 ring-2 ring-zinc-950" />
        </Slot>
      ))}
      {more > 0 && (
        <Slot step={step} offset={count - 1 - mid}>
          <span className="flex size-full items-center justify-center rounded-full bg-zinc-800 text-[10px] font-semibold text-zinc-300 ring-2 ring-zinc-950">
            +{more}
          </span>
        </Slot>
      )}
    </div>
  )
}

function Slot({ step, offset, children }: { step: MotionValue<number>; offset: number; children: React.ReactNode }) {
  const x = useTransform(step, (s) => offset * s)
  return (
    <motion.div
      style={{ x, width: SIZE, marginLeft: -SIZE / 2 }}
      className="absolute left-1/2 top-0 h-full transition-[translate] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:z-10 motion-safe:hover:-translate-y-0.5"
    >
      {children}
    </motion.div>
  )
}
