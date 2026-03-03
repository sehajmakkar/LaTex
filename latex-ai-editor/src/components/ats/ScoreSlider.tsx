"use client";

type ScoreSliderProps = {
  parseScore: number;
  qualityScore: number;
  combinedScore: number;
};

function scoreColor(score: number): string {
  if (score < 50) return "bg-red-500";
  if (score < 75) return "bg-yellow-400";
  return "bg-emerald-500";
}

function scoreLabel(score: number): string {
  if (score < 50) return "Needs work";
  if (score < 75) return "Decent";
  return "Strong";
}

export function ScoreSlider({ parseScore, qualityScore, combinedScore }: ScoreSliderProps) {
  const combinedColor = scoreColor(combinedScore);

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Overall ATS score
            </p>
            <p className="text-2xl font-display font-semibold">
              {combinedScore}
              <span className="text-sm font-normal text-muted-foreground"> / 100</span>
            </p>
          </div>
          <span className="text-xs rounded-full bg-muted px-3 py-1 text-muted-foreground">
            {scoreLabel(combinedScore)}
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`${combinedColor} h-full transition-all duration-500`}
            style={{ width: `${Math.max(0, Math.min(100, combinedScore))}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground">ATS parse</span>
            <span className="font-mono text-foreground">{parseScore}/100</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`${scoreColor(parseScore)} h-full`}
              style={{ width: `${Math.max(0, Math.min(100, parseScore))}%` }}
            />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground">Quality</span>
            <span className="font-mono text-foreground">{qualityScore}/100</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`${scoreColor(qualityScore)} h-full`}
              style={{ width: `${Math.max(0, Math.min(100, qualityScore))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

