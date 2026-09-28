import { LATEX_LOGO } from "./latex-logo-paths"

/**
 * The LaTeX logo, drawn from TeX's own output (raised A, lowered E), sized to
 * sit in running text: its capitals match Cal Sans' cap height (0.7em), its
 * baseline sits on the text baseline, and it takes currentColor.
 */
export function LatexLogo({ weight = "regular", className }: { weight?: keyof typeof LATEX_LOGO; className?: string }) {
  const g = LATEX_LOGO[weight]
  const em = 0.7 / g.cap // CSS em per TeX point
  return (
    <span className={className}>
      <span className="sr-only">LaTeX</span>
      <svg
        aria-hidden
        viewBox={`0 0 ${g.w} ${g.h}`}
        fill="currentColor"
        overflow="visible"
        style={{ display: "inline-block", height: `${g.h * em}em`, width: `${g.w * em}em`, verticalAlign: `${-(g.h - g.baseline) * em}em` }}
      >
        {g.glyphs.map((p, i) => (
          <path key={i} transform={`translate(${p.x} ${p.y})`} d={p.d} />
        ))}
      </svg>
    </span>
  )
}
