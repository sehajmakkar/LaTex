import { cn } from "@/lib/utils";
import { VERO_LOGO as G } from "@/components/brand/vero-logo-geometry";

/**
 * Vero mark: "\V" in Cal Sans, the backslash drawn parallel to the V's left
 * stroke. Drawn in currentColor, so it follows the theme (ink on light, paper
 * on dark). Size it by height; the width follows.
 */
export function VeroMark({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${G.markW} ${G.capH}`} fill="currentColor" aria-hidden className={cn("h-5 w-auto shrink-0", className)}>
      <path d={G.slash} />
      <path d={G.V} />
    </svg>
  );
}

/** "\Vero" wordmark, or the mark alone with `showWordmark={false}`. */
export function VeroLogo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  if (!showWordmark) return <VeroMark className={cn("text-foreground", className)} />;
  return (
    <svg
      viewBox={`0 0 ${G.wordW} ${G.viewH}`}
      fill="currentColor"
      role="img"
      aria-label="Vero"
      className={cn("h-5 w-auto shrink-0 text-foreground", className)}
    >
      <path d={G.slash} />
      <path d={G.V} />
      <path d={G.e} />
      <path d={G.r} />
      <path d={G.o} />
    </svg>
  );
}
