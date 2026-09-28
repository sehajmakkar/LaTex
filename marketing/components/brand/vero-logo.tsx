"use client";

import { useEffect, useId, useRef } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type AnimationPlaybackControls } from "motion/react";
import { VERO_LOGO as G } from "./vero-logo-geometry";

const EASE_IN: [number, number, number, number] = [0.55, 0, 0.8, 0.2];
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1];

type VeroLogoProps = {
  /** true: "\Vero" wordmark; false: "\V" mark. */
  expanded: boolean;
  /** Rendered height in px (cap height is ~98% of it). */
  height?: number;
  className?: string;
};

/**
 * The Vero logo, animating between the "\Vero" wordmark and the "\V" mark.
 *
 * Anthropic's slash can sweep across its letters because it trails them. Ours
 * leads, so the V does that job instead: its right stroke is a forward slash,
 * and "ero" slides out from under it (clipped along its exact angle). The
 * backslash is parallel to the V's left stroke, so it can slide into that
 * stroke and disappear:
 *   collapse: the slash and "ero" both sink into the V, then the slash pops back out;
 *   expand:   the slash presses into the V, and "ero" slides out the other side
 *             as the slash springs back.
 */
export function VeroLogo({ expanded, height = 18, className }: VeroLogoProps) {
  const clipId = `vero-ero-${useId().replace(/:/g, "")}`;
  const reduceMotion = useReducedMotion();
  const scale = height / G.viewH;

  // 0 = "\V", 1 = "\Vero". Width and the letters follow one value so they never drift apart.
  const progress = useMotionValue(expanded ? 1 : 0);
  const slashX = useMotionValue(0);
  const width = useTransform(progress, [0, 1], [G.markW * scale, G.wordW * scale]);
  const stripX = useTransform(progress, [0, 1], [G.stripDX, 0]);

  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (reduceMotion) {
      progress.set(expanded ? 1 : 0);
      slashX.set(0);
      return;
    }
    // Each run starts from the current values, so a quick scroll back and forth doesn't jump.
    const runs: AnimationPlaybackControls[] = expanded
      ? [
          animate(slashX, [slashX.get(), G.merge, 0], { duration: 0.7, times: [0, 0.26, 1], ease: [EASE_IN, EASE_OUT] }),
          animate(progress, 1, { delay: 0.14, duration: 0.62, ease: EASE_OUT }),
        ]
      : [
          animate(progress, 0, { duration: 0.46, ease: EASE_IN_OUT }),
          animate(slashX, [slashX.get(), G.merge, 0], { duration: 0.74, times: [0, 0.44, 1], ease: [EASE_IN_OUT, EASE_OUT] }),
        ];
    return () => runs.forEach((run) => run.stop());
  }, [expanded, reduceMotion, progress, slashX]);

  return (
    <motion.span className={`relative inline-block shrink-0 overflow-hidden ${className ?? ""}`} style={{ width, height }}>
      <svg
        viewBox={`0 0 ${G.wordW} ${G.viewH}`}
        width={G.wordW * scale}
        height={height}
        fill="currentColor"
        aria-hidden
        className="absolute left-0 top-0 block overflow-visible"
      >
        <defs>
          <clipPath id={clipId}>
            <path d={G.clip} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <motion.g style={{ x: stripX }}>
            <path d={G.e} />
            <path d={G.r} />
            <path d={G.o} />
          </motion.g>
        </g>
        <motion.path d={G.slash} style={{ x: slashX }} />
        <path d={G.V} />
      </svg>
    </motion.span>
  );
}
