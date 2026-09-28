"use client"

import { useEffect, useRef, type RefObject } from "react"

/**
 * A quiet field of LaTeX special characters that the pointer stirs like ink.
 * Moving the pointer pushes velocity and "ink" into a small fluid field; the
 * ink drifts with the motion, spreads and fades. Where there's ink, glyphs
 * brighten from grey to silver-white and drift with the flow; the densest ink
 * blooms into heavier LaTeX glyphs, over a faint silver glow.
 *
 * 2D canvas: the dim field is drawn once, and each frame only the inked cells
 * are repainted. The area around `clearRef` (the hero copy) is masked out with
 * feathered edges, leaving a U: both sides and the band below the CTA.
 */

/** Light to heavy: what densely inked cells bloom into. */
const RAMP = "·.:-~^_=+{}[]\\$&%#"

/** Mostly single special characters, with the occasional short command. */
const SPECIALS = ["\\", "{", "}", "[", "]", "$", "&", "%", "#", "^", "_", "~", "\\\\", "{}", "$$", "^{", "_{"]
const COMMANDS = ["\\begin", "\\end", "\\item", "\\frac", "\\sum", "\\int", "\\alpha", "\\section", "\\textbf", "\\label", "\\ref", "\\hfill", "\\vspace", "\\LaTeX"]

function latexStream(length: number) {
  let seed = 7
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  let out = ""
  while (out.length < length) {
    out += rand() < 0.14 ? COMMANDS[Math.floor(rand() * COMMANDS.length)] : SPECIALS[Math.floor(rand() * SPECIALS.length)]
    out += " ".repeat(1 + Math.floor(rand() * 3))
  }
  return out
}

const FONT_SIZE = 13
const LINE_HEIGHT = 19
const MONO = `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace`
const FONT = `500 ${FONT_SIZE}px ${MONO}`
const HEAVY_FONT = `700 ${FONT_SIZE}px ${MONO}`
const BASE_COLOR = "rgba(113, 113, 122, 0.22)" // zinc-500, dim

/** Inked glyphs: zinc-500 through zinc-300 to white. */
const LIT = ["#52525b", "#63636b", "#71717a", "#8a8a93", "#a1a1aa", "#babac1", "#d4d4d8", "#e4e4e7", "#f4f4f5", "#ffffff"]

const SIM = 8 // px per fluid cell
const VELOCITY_DECAY = 0.94
const INK_DECAY = 0.978
const RADIUS = 2.6 // splat radius in fluid cells (gaussian sigma)

type Props = {
  /** The content to keep clear (the hero copy); the effect wraps around it. */
  clearRef: RefObject<HTMLElement | null>
  className?: string
}

export function LatexFluid({ clearRef, className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!wrap || !canvas || !ctx) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const base = document.createElement("canvas")
    const baseCtx = base.getContext("2d")
    const glow = document.createElement("canvas")
    const glowCtx = glow.getContext("2d")
    if (!baseCtx || !glowCtx) return

    let w = 0, h = 0, dpr = 1
    let cw = 8, cols = 0, rows = 0
    let sw = 0, sh = 0
    let u = new Float32Array(0), v = new Float32Array(0), ink = new Float32Array(0)
    let u2 = new Float32Array(0), v2 = new Float32Array(0), ink2 = new Float32Array(0)
    let glowImage: ImageData | null = null
    let text = ""
    let dirty = false
    let active = false // any ink left worth drawing
    let visible = true
    let raf = 0
    let lastInput = 0
    let nextAmbient = 0
    let ambient: { t: number; x: number; y: number; dx: number; dy: number } | null = null
    const pointer = { x: 0, y: 0, has: false }

    const charAt = (r: number, c: number) => text[(((r * cols + c) % text.length) + text.length) % text.length]

    // --- layout -----------------------------------------------------------
    const updateMask = () => {
      const clear = clearRef.current
      if (!clear) return
      const box = wrap.getBoundingClientRect()
      const r = clear.getBoundingClientRect()
      const cx = r.left - box.left + r.width / 2
      // A horseshoe: an elliptical hole anchored at the top edge, wide enough for the copy and
      // reaching just below the CTA. Everything outside it (both sides, top to bottom, and the band
      // under the CTA) shows the field; the ellipse's edge is feathered.
      // The clear core covers the copy plus a margin; the feather sits outside it.
      const CORE = 0.82
      const rx = (r.width / 2 + Math.min(90, box.width * 0.05)) / CORE
      const ry = (r.bottom - box.top + 50) / CORE
      const masks = [
        `radial-gradient(${rx}px ${ry}px at ${cx}px 0px, transparent ${CORE * 100}%, #000 100%)`,
        // soft top (behind the navbar) and bottom (into the next section) edges
        `linear-gradient(to bottom, transparent 0px, #000 110px, #000 calc(100% - 90px), transparent 100%)`,
      ].join(", ")
      wrap.style.maskImage = masks
      wrap.style.webkitMaskImage = masks
      wrap.style.maskComposite = "intersect"
      wrap.style.setProperty("-webkit-mask-composite", "source-in")
    }

    const resize = () => {
      const box = wrap.getBoundingClientRect()
      w = Math.max(1, Math.round(box.width))
      h = Math.max(1, Math.round(box.height))
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      for (const c of [canvas, base]) {
        c.width = Math.round(w * dpr)
        c.height = Math.round(h * dpr)
      }
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.textBaseline = baseCtx.textBaseline = "middle"

      baseCtx.font = FONT
      cw = baseCtx.measureText("M").width
      cols = Math.ceil(w / cw)
      rows = Math.ceil(h / LINE_HEIGHT)
      text = latexStream(cols * rows + 64)

      // Dim field: one fillText per row keeps glyphs exactly on the cell grid.
      baseCtx.clearRect(0, 0, w, h)
      baseCtx.fillStyle = BASE_COLOR
      for (let r = 0; r < rows; r++) baseCtx.fillText(text.slice(r * cols, r * cols + cols), 0, r * LINE_HEIGHT + LINE_HEIGHT / 2)
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(base, 0, 0, w, h)

      sw = Math.ceil(w / SIM) + 2
      sh = Math.ceil(h / SIM) + 2
      const n = sw * sh
      u = new Float32Array(n); v = new Float32Array(n); ink = new Float32Array(n)
      u2 = new Float32Array(n); v2 = new Float32Array(n); ink2 = new Float32Array(n)
      glow.width = sw
      glow.height = sh
      glowImage = glowCtx.createImageData(sw, sh)
      updateMask()
    }

    // --- fluid ------------------------------------------------------------
    /** Push velocity (dx, dy in px) and ink into a soft gaussian around (px, py). */
    const splat = (px: number, py: number, dx: number, dy: number, amount: number) => {
      const sx = px / SIM, sy = py / SIM
      const reach = Math.ceil(RADIUS * 3)
      const inv = 1 / (2 * RADIUS * RADIUS)
      for (let y = Math.max(1, Math.floor(sy) - reach); y <= Math.min(sh - 2, Math.floor(sy) + reach); y++) {
        for (let x = Math.max(1, Math.floor(sx) - reach); x <= Math.min(sw - 2, Math.floor(sx) + reach); x++) {
          const g = Math.exp(-((x - sx) ** 2 + (y - sy) ** 2) * inv)
          if (g < 0.01) continue
          const i = y * sw + x
          u[i] += (dx / SIM) * 0.35 * g
          v[i] += (dy / SIM) * 0.35 * g
          ink[i] = Math.min(1.6, ink[i] + amount * g)
        }
      }
      active = true
    }

    const sample = (f: Float32Array, x: number, y: number) => {
      x = Math.min(sw - 1.001, Math.max(0, x))
      y = Math.min(sh - 1.001, Math.max(0, y))
      const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0
      const i = y0 * sw + x0
      return (f[i] * (1 - fx) + f[i + 1] * fx) * (1 - fy) + (f[i + sw] * (1 - fx) + f[i + sw + 1] * fx) * fy
    }

    /** One step: carry velocity and ink along the flow, soften, and fade. */
    const step = () => {
      let total = 0
      for (let y = 1; y < sh - 1; y++) {
        for (let x = 1; x < sw - 1; x++) {
          const i = y * sw + x
          const bx = x - u[i], by = y - v[i]
          // semi-Lagrangian advection, then a light blur so everything stays soft
          const nu = sample(u, bx, by) * 0.8 + (u[i - 1] + u[i + 1] + u[i - sw] + u[i + sw]) * 0.05
          const nv = sample(v, bx, by) * 0.8 + (v[i - 1] + v[i + 1] + v[i - sw] + v[i + sw]) * 0.05
          const ni = sample(ink, bx, by) * 0.72 + (ink[i - 1] + ink[i + 1] + ink[i - sw] + ink[i + sw]) * 0.07
          u2[i] = nu * VELOCITY_DECAY
          v2[i] = nv * VELOCITY_DECAY
          ink2[i] = ni * INK_DECAY
          total += ink2[i]
        }
      }
      ;[u, u2] = [u2, u]
      ;[v, v2] = [v2, v]
      ;[ink, ink2] = [ink2, ink]
      active = total > 0.5
    }

    // --- drawing ----------------------------------------------------------
    const litCells: number[][] = LIT.map(() => [])
    const litChars: string[][] = LIT.map(() => [])
    const heavyCells: number[][] = LIT.map(() => [])
    const heavyChars: string[][] = LIT.map(() => [])

    const draw = () => {
      if (!active && !dirty) return
      for (const list of [litCells, litChars, heavyCells, heavyChars]) for (const a of list) a.length = 0

      for (let r = 0; r < rows; r++) {
        const sy = (r * LINE_HEIGHT + LINE_HEIGHT / 2) / SIM
        for (let c = 0; c < cols; c++) {
          const sx = ((c + 0.5) * cw) / SIM
          const d = sample(ink, sx, sy)
          const e = 1 - Math.exp(-d * 1.8) // soft saturation
          if (e < 0.05) continue
          const cell = r * cols + c
          const level = Math.min(LIT.length - 1, Math.floor(((e - 0.05) / 0.9) * LIT.length))
          if (e > 0.72) {
            // densest ink blooms into heavier glyphs, varied per cell
            const k = (e - 0.72) / 0.28
            const jitter = ((cell * 2654435761) >>> 0) / 4294967296 - 0.5
            const g = Math.round(k * (RAMP.length - 1) + jitter * 5)
            heavyCells[level].push(cell)
            heavyChars[level].push(RAMP[Math.min(RAMP.length - 1, Math.max(0, g))])
          } else {
            // glyphs drift with the flow: read the character from upstream
            const i = Math.round(sy) * sw + Math.round(sx)
            litCells[level].push(cell)
            litChars[level].push(charAt(r - Math.round(v[i] * 0.5), c - Math.round(u[i] * 1.2)))
          }
        }
      }

      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(base, 0, 0, w, h)
      const paint = (cells: number[][], chars: string[][], font: string) => {
        ctx.font = font
        for (let l = 0; l < LIT.length; l++) {
          if (!cells[l].length) continue
          ctx.fillStyle = LIT[l]
          for (let j = 0; j < cells[l].length; j++) {
            const cell = cells[l][j]
            const x = (cell % cols) * cw
            const y = Math.floor(cell / cols) * LINE_HEIGHT
            ctx.clearRect(x, y, cw, LINE_HEIGHT)
            ctx.fillText(chars[l][j], x, y + LINE_HEIGHT / 2)
          }
        }
      }
      paint(litCells, litChars, FONT)
      paint(heavyCells, heavyChars, HEAVY_FONT)

      // faint silver wash under the ink, upscaled from the fluid grid so it stays soft
      if (glowImage) {
        const px = glowImage.data
        for (let i = 0; i < ink.length; i++) {
          const a = Math.min(1, ink[i]) * 42
          px[i * 4] = 228; px[i * 4 + 1] = 228; px[i * 4 + 2] = 231; px[i * 4 + 3] = a
        }
        glowCtx.putImageData(glowImage, 0, 0)
        ctx.globalCompositeOperation = "lighter"
        ctx.imageSmoothingEnabled = true
        ctx.drawImage(glow, 0, 0, sw, sh, 0, 0, sw * SIM, sh * SIM)
        ctx.globalCompositeOperation = "source-over"
      }
      dirty = active
    }

    const tick = (now: number) => {
      raf = 0
      if (!visible) return
      // When nobody's stirring, a slow soft stroke now and then keeps the field alive.
      if (now - lastInput > 3500) {
        if (!ambient && now > nextAmbient) {
          const left = Math.random() < 0.5
          ambient = {
            t: 0,
            x: left ? w * (0.04 + Math.random() * 0.14) : w * (0.82 + Math.random() * 0.14),
            y: h * (0.7 + Math.random() * 0.2),
            dx: (left ? 1 : -1) * (1.2 + Math.random()),
            dy: -0.6 - Math.random() * 0.6,
          }
        }
        if (ambient) {
          ambient.t++
          ambient.x += ambient.dx
          ambient.y += ambient.dy
          splat(ambient.x, ambient.y, ambient.dx * 3, ambient.dy * 3, 0.12)
          if (ambient.t > 70) {
            ambient = null
            nextAmbient = now + 2500 + Math.random() * 2500
          }
        }
      }
      if (active) step()
      draw()
      raf = requestAnimationFrame(tick) // runs only while the hero is on screen
    }
    const wake = () => {
      if (!raf && visible && !reduceMotion) raf = requestAnimationFrame(tick)
    }

    // --- input ------------------------------------------------------------
    const onMove = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect()
      const x = e.clientX - box.left
      const y = e.clientY - box.top
      if (x < 0 || y < 0 || x > box.width || y > box.height) {
        pointer.has = false
        return
      }
      if (pointer.has) {
        const dx = x - pointer.x, dy = y - pointer.y
        const dist = Math.hypot(dx, dy)
        const steps = Math.min(20, Math.max(1, Math.floor(dist / 8)))
        const amount = Math.min(1.1, 0.25 + dist * 0.02) / Math.sqrt(steps)
        for (let s = 1; s <= steps; s++) splat(pointer.x + (dx * s) / steps, pointer.y + (dy * s) / steps, dx / steps, dy / steps, amount)
      }
      pointer.x = x
      pointer.y = y
      pointer.has = true
      lastInput = performance.now()
      wake()
    }

    resize()
    const ro = new ResizeObserver(() => {
      resize()
      wake()
    })
    ro.observe(wrap)
    if (clearRef.current) ro.observe(clearRef.current)
    if (reduceMotion) return () => ro.disconnect()

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      wake()
    })
    io.observe(wrap)
    window.addEventListener("pointermove", onMove, { passive: true })
    wake()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener("pointermove", onMove)
    }
  }, [clearRef])

  return (
    <div ref={wrapRef} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}>
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  )
}
