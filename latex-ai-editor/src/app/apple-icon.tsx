import { ImageResponse } from "next/og";
import { VERO_LOGO as G } from "@/components/brand/vero-logo-geometry";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iPhone home-screen icon: the \V mark on an ink tile (iOS needs an opaque icon). */
export default function AppleIcon() {
  const h = 84;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
        <svg width={(G.markW * h) / G.capH} height={h} viewBox={`0 0 ${G.markW} ${G.capH}`} fill="#fafafa">
          <path d={G.slash} />
          <path d={G.V} />
        </svg>
      </div>
    ),
    size
  );
}
