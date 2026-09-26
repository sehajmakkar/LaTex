import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

/** iPhone home-screen icon: the Vero mark. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#171717" }}>
        <svg width="120" height="120" viewBox="0 0 32 32">
          <path d="M9 10.5 L15 22 L23.5 8.5" fill="none" stroke="#fafafa" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    size
  )
}
