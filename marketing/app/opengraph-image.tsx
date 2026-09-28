import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"
import { VERO_LOGO as G } from "@/components/brand/vero-logo-geometry"
import { site } from "@/lib/site"

export const alt = site.title
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

/** Preview image shown when the site is shared (WhatsApp, LinkedIn, X, Slack…). */
export default async function OpengraphImage() {
  const calSans = await readFile(join(process.cwd(), "assets/fonts/CalSans-Regular.ttf"))
  const wordH = 58
  const markH = 560
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#09090b", color: "#fafafa", fontFamily: "Cal Sans" }}>
        {/* The \V mark, large and quiet, bleeding off the right edge */}
        <svg
          width={(G.markW * markH) / G.capH}
          height={markH}
          viewBox={`0 0 ${G.markW} ${G.capH}`}
          fill="#18181b"
          style={{ position: "absolute", right: -120, top: 35 }}
        >
          <path d={G.slash} />
          <path d={G.V} />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, width: "100%", height: "100%" }}>
          <svg width={(G.wordW * wordH) / G.viewH} height={wordH} viewBox={`0 0 ${G.wordW} ${G.viewH}`} fill="#fafafa">
            <path d={G.slash} />
            <path d={G.V} />
            <path d={G.e} />
            <path d={G.r} />
            <path d={G.o} />
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 92, letterSpacing: -2, lineHeight: 1.05 }}>Cursor for LaTeX</div>
            <div style={{ fontSize: 60, letterSpacing: -1, lineHeight: 1.1, color: "#a1a1aa" }}>Write smarter, land faster.</div>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 28, color: "#71717a" }}>
            <span>Resume templates</span>
            <span>·</span>
            <span>AI editing</span>
            <span>·</span>
            <span>Free ATS check</span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Cal Sans", data: calSans, style: "normal", weight: 400 }] }
  )
}
