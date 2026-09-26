import { ImageResponse } from "next/og"
import { site } from "@/lib/site"

export const alt = site.title
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

/** Preview image shown when the site is shared (WhatsApp, LinkedIn, X, Slack…). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#09090b", color: "#f4f4f5", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="64" height="64" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="8" fill="#f4f4f5" />
            <path d="M9 10.5 L15 22 L23.5 8.5" fill="none" stroke="#09090b" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontSize: 44, fontWeight: 700 }}>Vero</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 80, fontWeight: 700, letterSpacing: -2 }}>Cursor for LaTeX</div>
          <div style={{ fontSize: 56, fontWeight: 700, color: "#a1a1aa", letterSpacing: -1 }}>Write smarter, land faster.</div>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 28, color: "#a1a1aa" }}>
          <span>Resume templates</span>
          <span>·</span>
          <span>Inline AI editing</span>
          <span>·</span>
          <span>Free ATS check</span>
        </div>
      </div>
    ),
    size
  )
}
