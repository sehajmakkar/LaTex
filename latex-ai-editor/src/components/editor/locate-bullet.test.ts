import { describe, expect, it } from "vitest";
import { locateBullet } from "./locate-bullet";

const doc = String.raw`\section{Experience}
  \resumeItem{Cut API latency by \textbf{35\%} with Redis caching}
  \resumeItem{Mentored two junior developers}`;

describe("locateBullet", () => {
  it("finds the LaTeX line for a plain-text bullet", () => {
    const r = locateBullet(doc, "Cut API latency by 35% with Redis caching")!;
    expect(doc.slice(r.from, r.to)).toBe(String.raw`\resumeItem{Cut API latency by \textbf{35\%} with Redis caching}`);
  });
  it("returns null when nothing is close", () => {
    expect(locateBullet(doc, "Won a national robotics championship")).toBeNull();
  });
});
