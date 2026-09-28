"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useInView, useReducedMotion } from "motion/react"

/**
 * Two physical keycaps (⌘/Ctrl + K) for the ⌘K feature card. Each cap sits on
 * a hard "skirt" shadow and drops onto it when pressed. The chord plays by
 * itself while the card is on screen, the caps follow the visitor's real
 * keyboard, and clicking plays it too. After each press, "Rewrite this line"
 * swaps to a small confirmation without changing the row's width.
 *
 * Adapted from a keycap-hint reference, at the card's larger size and in
 * Vero's zinc theme.
 */

const subscribeNever = () => () => {}
function usePlatformIsMac() {
  // null during SSR and hydration, so the modifier label is chosen on the client
  return useSyncExternalStore<boolean | null>(
    subscribeNever,
    () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent),
    () => null,
  )
}

const BEAT = 120 // ms between the two keys going down
const HOLD = 220 // ms the chord is held before release
const LOOP = 3200 // ms between automatic presses

export function KeycapChord() {
  const isMac = usePlatformIsMac()
  const reduceMotion = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const inView = useInView(rootRef, { amount: 0.5 })
  const [pressed, setPressed] = useState<[boolean, boolean]>([false, false])
  const [confirmed, setConfirmed] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const confirmTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const setKey = (i: 0 | 1, down: boolean) => setPressed((p) => (p[i] === down ? p : i === 0 ? [down, p[1]] : [p[0], down]))

  const confirm = () => {
    setConfirmed(true)
    clearTimeout(confirmTimer.current)
    confirmTimer.current = setTimeout(() => setConfirmed(false), 1400)
  }

  // Like a hand: the modifier goes down, a beat later K, then both come up.
  const play = () => {
    timers.current.forEach(clearTimeout)
    timers.current = [
      setTimeout(() => setKey(0, true), 0),
      setTimeout(() => setKey(1, true), BEAT),
      setTimeout(() => {
        setPressed([false, false])
        confirm()
      }, 2 * BEAT + HOLD),
    ]
  }
  const playRef = useRef(play)
  useEffect(() => {
    playRef.current = play
  })

  // Plays on its own while visible.
  useEffect(() => {
    if (!inView || reduceMotion) return
    const first = setTimeout(() => playRef.current(), 400)
    const loop = setInterval(() => playRef.current(), LOOP)
    return () => {
      clearTimeout(first)
      clearInterval(loop)
    }
  }, [inView, reduceMotion])

  // Follows the real keyboard. The chord is only claimed while the card is on
  // screen, so Ctrl+K keeps working as the browser's shortcut elsewhere.
  useEffect(() => {
    if (isMac === null) return
    const isMod = (e: KeyboardEvent) => e.key === (isMac ? "Meta" : "Control")
    const isK = (e: KeyboardEvent) => e.code === "KeyK" || e.key.toLowerCase() === "k"
    const down = (e: KeyboardEvent) => {
      if (isMod(e)) setKey(0, true)
      if (isK(e)) setKey(1, true)
      if (inView && !e.repeat && isK(e) && (isMac ? e.metaKey : e.ctrlKey)) {
        e.preventDefault()
        confirm()
      }
    }
    const up = (e: KeyboardEvent) => {
      // macOS sends no keyup for other keys while ⌘ is held, so releasing ⌘ releases both.
      if (isMod(e)) setPressed([false, false])
      else if (isK(e)) setKey(1, false)
    }
    const reset = () => setPressed([false, false])
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    window.addEventListener("blur", reset)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
      window.removeEventListener("blur", reset)
    }
  }, [isMac, inView])

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      clearTimeout(confirmTimer.current)
    },
    [],
  )

  const mod = isMac === null ? "" : isMac ? "⌘" : "Ctrl"

  return (
    <div ref={rootRef} className="flex flex-col items-center gap-5">
      <button
        type="button"
        aria-label={`${isMac === false ? "Control" : "Command"} K: rewrite the selected line`}
        // keyboard activation plays the chord; a mouse click already pressed the cap under the pointer
        onClick={(e) => (e.detail === 0 ? play() : confirm())}
        className="flex touch-manipulation select-none items-center gap-3 rounded-2xl px-1 pb-2 pt-0.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
      >
        <Keycap label={mod} pressed={pressed[0]} reduceMotion={reduceMotion} onPress={(d) => setKey(0, d)} />
        <Keycap label="K" pressed={pressed[1]} reduceMotion={reduceMotion} onPress={(d) => setKey(1, d)} />
      </button>

      {/* the caption swaps to a confirmation in place, so the card never changes size */}
      <span className="relative text-sm text-zinc-500">
        <span
          className={`inline-block transition-[opacity,filter,translate] ease-[cubic-bezier(0.23,1,0.32,1)] ${
            confirmed ? "-translate-y-1 opacity-0 blur-[3px] duration-150" : "translate-y-0 opacity-100 blur-0 duration-200"
          }`}
        >
          to rewrite the line
        </span>
        <span
          aria-hidden
          className={`absolute inset-y-0 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap text-zinc-200 transition-[opacity,filter,translate] ease-[cubic-bezier(0.23,1,0.32,1)] ${
            confirmed ? "translate-y-0 opacity-100 blur-0 duration-200" : "translate-y-1 opacity-0 blur-[3px] duration-150"
          }`}
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <path d="m3.5 8.5 3 3 6-7" />
          </svg>
          Line rewritten
        </span>
      </span>
    </div>
  )
}

function Keycap({
  label,
  pressed,
  reduceMotion,
  onPress,
}: {
  label: string
  pressed: boolean
  reduceMotion: boolean | null
  onPress: (down: boolean) => void
}) {
  return (
    <span
      onPointerDown={(e) => e.button === 0 && onPress(true)}
      onPointerUp={() => onPress(false)}
      onPointerLeave={() => onPress(false)}
      className={[
        // min-w keeps K square while "Ctrl" grows sideways
        "relative inline-flex h-20 min-w-20 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 px-4 font-sans font-medium leading-none text-zinc-200",
        // the skirt: a hard 6px shadow the cap rests on, over a soft cast shadow
        "shadow-[0_6px_0_0_#3f3f46,0_10px_18px_-6px_rgba(0,0,0,0.6)]",
        reduceMotion ? "" : "transition-[translate,box-shadow]",
        pressed
          ? "translate-y-[6px] shadow-[0_0_0_0_#3f3f46,0_2px_4px_-2px_rgba(0,0,0,0.6)] duration-[40ms] ease-out"
          : // springs back a touch slower than it goes down, like a real switch
            "translate-y-0 duration-[140ms] ease-[cubic-bezier(0.23,1,0.32,1)]",
        label === "" ? "invisible" : "",
      ].join(" ")}
    >
      <span className={label === "⌘" ? "text-4xl" : label === "Ctrl" ? "text-2xl" : "text-3xl"}>{label}</span>
    </span>
  )
}
