"use client";

import { AnimatePresence, motion, useReducedMotion, type Transition } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A page flipping under a scan bar, beside a checklist of what's happening:
 * used while an ATS check or an import runs. The scan animation is adapted
 * from uselayouts' scan-document, restyled for Vero's monochrome theme (ink
 * bar in light mode, silver in dark).
 */

const CYCLE_S = 4.6;
const TIMES = [0, 0.1, 0.45, 0.55, 0.9, 1];
const ROTATE_Y = [0, 0, 180, 180, 360, 360];
const BAR_Y = [0, 0, 1, 1, 0, 0].map((p) => p * 132);
const EASE = [0.645, 0.045, 0.355, 1] as const;

function ScanBar({ transition, z }: { transition: Transition; z: number }) {
  return (
    <motion.div
      animate={{ y: BAR_Y }}
      transition={transition}
      className="absolute top-0 h-[6px] w-[124px] rounded-full bg-gradient-to-b from-zinc-600 via-zinc-800 to-zinc-900 shadow-[0_0_14px_3px_rgba(24,24,27,0.18)] dark:from-white dark:via-zinc-200 dark:to-zinc-400 dark:shadow-[0_0_18px_4px_rgba(244,244,245,0.35)]"
      style={{ left: "50%", x: "-50%", z }}
    >
      <div className="absolute top-[1px] right-3 left-3 h-[1.5px] rounded-full bg-white/60 blur-[0.5px]" />
    </motion.div>
  );
}

export function ScanDocument({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion() ?? false;
  const cycle: Transition = reduceMotion ? { duration: 0 } : { duration: CYCLE_S, ease: EASE, times: TIMES, repeat: Infinity };

  return (
    <div aria-hidden className={cn("h-[150px] w-[110px] [perspective:900px]", className)}>
      <motion.div
        animate={{ rotateY: reduceMotion ? 0 : ROTATE_Y }}
        transition={cycle}
        className="relative h-full w-full will-change-transform [transform-style:preserve-3d]"
      >
        <div className="absolute top-0 left-1/2 h-full w-[7px] -translate-x-1/2 rounded-sm bg-gradient-to-r from-zinc-300 via-zinc-500 to-zinc-300" />
        <div className="absolute inset-0 overflow-hidden rounded-md bg-white shadow-[0_8px_24px_rgba(0,0,0,0.16)] ring-1 ring-black/5 [backface-visibility:hidden] dark:bg-zinc-100">
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
        <div className="absolute inset-0 rounded-md bg-zinc-300 shadow-[0_8px_24px_rgba(0,0,0,0.16)] [backface-visibility:hidden] [transform:rotateY(180deg)] dark:bg-zinc-400" />
        {!reduceMotion && (
          <>
            <ScanBar transition={cycle} z={3} />
            <ScanBar transition={cycle} z={-3} />
          </>
        )}
      </motion.div>
    </div>
  );
}

/** The scanning page beside the steps: done ones ticked, the current one spinning. */
export function ScanProgress({ title, steps, active, note }: { title: string; steps: string[]; active: number; note?: string }) {
  return (
    <div className="flex flex-col items-center gap-8 py-4 sm:flex-row sm:items-center sm:justify-center sm:gap-10" role="status" aria-live="polite">
      <ScanDocument className="shrink-0" />
      <div className="min-w-0">
        <p className="mb-4 font-medium">{title}</p>
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={step} className={cn("flex items-center gap-3 text-sm transition-colors", i > active && "text-muted-foreground")}>
              <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                <AnimatePresence mode="wait" initial={false}>
                  {i < active ? (
                    <motion.span key="done" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.5, duration: 0.4 }}>
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </motion.span>
                  ) : i === active ? (
                    <motion.span key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </motion.span>
                  ) : (
                    <motion.span key="todo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-3.5 w-3.5 rounded-full border" />
                  )}
                </AnimatePresence>
              </span>
              {step}
            </li>
          ))}
        </ol>
        {note && <p className="mt-5 text-xs text-muted-foreground">{note}</p>}
      </div>
    </div>
  );
}
