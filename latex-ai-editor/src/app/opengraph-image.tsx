import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { VERO_LOGO as G } from "@/components/brand/vero-logo-geometry";
import { site } from "@/lib/site";

export const alt = `${site.name}: ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Preview image when a dashboard link (sign-in, templates) is shared. */
export default async function OpengraphImage() {
  const calSans = await readFile(join(process.cwd(), "assets/fonts/CalSans-Regular.ttf"));
  const wordH = 120;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          background: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "Cal Sans",
        }}
      >
        <svg width={(G.wordW * wordH) / G.viewH} height={wordH} viewBox={`0 0 ${G.wordW} ${G.viewH}`} fill="#fafafa">
          <path d={G.slash} />
          <path d={G.V} />
          <path d={G.e} />
          <path d={G.r} />
          <path d={G.o} />
        </svg>
        {/* The renderer draws Cal Sans' "Ta"/"Te" kerning but sizes the word without it,
            leaving extra space after "LaTeX": (137 + 34) units × 44px / 1000 ≈ 7.5px. */}
        <div style={{ display: "flex", fontSize: 44, color: "#a1a1aa" }}>
          {site.tagline.split(" ").map((word, i) => (
            <span key={i} style={{ marginRight: word === "LaTeX" ? 11 - 7.5 : 11 }}>
              {word}
            </span>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Cal Sans", data: calSans, style: "normal", weight: 400 }] }
  );
}
