import { cn } from "@/lib/utils";

/** Colour for a 0–100 score. */
export function scoreTone(score: number) {
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

/** Colour for a 0–10 category score. */
export function categoryTone(score: number | null) {
  if (score === null) return "text-muted-foreground bg-muted";
  if (score >= 8) return "text-emerald-700 bg-emerald-500/10 dark:text-emerald-400";
  if (score >= 5) return "text-amber-700 bg-amber-500/10 dark:text-amber-400";
  return "text-red-700 bg-red-500/10 dark:text-red-400";
}

/** Circular score gauge. `max` is 100 (overall, job match) or 10 (categories). */
export function ScoreRing({ score, max = 100, size = 88, label }: { score: number | null; max?: number; size?: number; label?: string }) {
  const stroke = size > 70 ? 7 : 5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const value = score === null ? 0 : Math.max(0, Math.min(1, score / max));
  const tone = score === null ? "text-muted-foreground" : scoreTone(max === 10 ? score * 10 : score);
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value)}
          className={cn("stroke-current transition-[stroke-dashoffset] duration-700", tone)}
        />
      </svg>
      <span className={cn("absolute font-display tabular-nums", tone, size > 70 ? "text-2xl" : "text-base")}>
        {score === null ? "–" : score}
        {label && <span className="ml-0.5 text-xs text-muted-foreground">{label}</span>}
      </span>
    </div>
  );
}
