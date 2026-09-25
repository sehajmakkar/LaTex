import { cn } from "@/lib/utils";

/**
 * Vero mark: a check-shaped "V" (vero = "true") in a rounded square. Uses
 * currentColor for the tile, so it follows the monochrome theme.
 */
export function VeroMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("h-7 w-7 shrink-0", className)}>
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path
        d="M9 10.5 L15 22 L23.5 8.5"
        fill="none"
        stroke="var(--background)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VeroLogo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-foreground", className)}>
      <VeroMark />
      {showWordmark && <span className="font-display text-lg font-semibold leading-none tracking-tight">Vero</span>}
    </span>
  );
}
