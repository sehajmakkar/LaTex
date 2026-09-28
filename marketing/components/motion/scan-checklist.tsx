"use client"

import { useMemo } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Check, Loader2 } from "lucide-react"
import { ScanDocument } from "@/components/motion/scan-document"
import { useLoop } from "@/components/features/use-loop"

/**
 * The scanning page beside a checklist that ticks off in step with it, the
 * way the dashboard's ATS check reads a resume. Loops while on screen.
 */
export function ScanChecklist({ items }: { items: string[] }) {
  // one phase per item being checked, then a pause with everything ticked
  const durations = useMemo(() => [...Array.from({ length: items.length }, () => 1100), 1800], [items.length])
  const { ref, phase } = useLoop<HTMLDivElement>(durations)

  return (
    <div ref={ref} className="flex items-center gap-8">
      <ScanDocument className="hidden shrink-0 sm:block" />
      <ul className="flex flex-col gap-3.5">
        {items.map((item, i) => {
          const done = i < phase
          const active = i === phase
          return (
            <li key={item} className={`flex gap-3 text-sm transition-colors duration-300 ${done || active ? "text-zinc-300" : "text-zinc-600"}`}>
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                <AnimatePresence mode="wait" initial={false}>
                  {done ? (
                    <motion.span key="done" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.5, duration: 0.4 }}>
                      <Check className="h-4 w-4 text-zinc-100" />
                    </motion.span>
                  ) : active ? (
                    <motion.span key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                    </motion.span>
                  ) : (
                    <motion.span key="todo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-3.5 w-3.5 rounded-full border border-zinc-700" />
                  )}
                </AnimatePresence>
              </span>
              {item}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
