"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Check, Loader2, Sparkles, Undo2 } from "lucide-react";
import { useLoop, useTypewriter } from "./use-loop";

const mono = "font-mono text-[11px] leading-[1.7]";
const cmd = (s: string) =>
  s.split(/(\\[a-zA-Z]+)/).map((part, i) =>
    part.startsWith("\\") ? (
      <span key={i} className="text-zinc-300">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );

/* ------------------------------------------------------------------ */
/* Command bar: ask, review the diff, keep                             */
/* ------------------------------------------------------------------ */

const COMMAND_PHASES = [700, 1500, 1100, 2300, 600, 2000];
const EDITS = [
  {
    before: "\\resumeItem{Worked on APIs using FastAPI and Postgres}",
    after: "\\resumeItem{Built REST APIs with FastAPI and PostgreSQL}",
  },
  {
    before: "\\textbf{Skills}{: Java, Python, SQL, Docker}",
    after: "\\textbf{Skills}{: Python, SQL, Docker, Java}",
  },
];

function Line({ text, tone }: { text: string; tone?: "del" | "add" | "kept" }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className={`truncate border-l-2 px-2 ${
        tone === "del"
          ? "border-red-400/60 bg-red-400/[0.07] text-zinc-500 line-through decoration-red-400/50"
          : tone === "add"
            ? "border-emerald-400/60 bg-emerald-400/[0.08] text-zinc-200"
            : tone === "kept"
              ? "border-transparent bg-emerald-400/[0.04] text-zinc-300"
              : "border-transparent text-zinc-500"
      }`}
    >
      {cmd(text)}
    </motion.div>
  );
}

export function CommandDemo() {
  const { ref, phase } = useLoop<HTMLDivElement>(COMMAND_PHASES);
  const typed = useTypewriter(
    "Tailor this to a backend role",
    phase >= 1,
    1300,
  );
  const reviewing = phase === 3 || phase === 4;
  const kept = phase === 5;

  return (
    <div ref={ref} aria-hidden className="relative flex h-full flex-col gap-3">
      <div
        className={`${mono} overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 h-[158px] py-3`}
      >
        <Line text="\section{Experience}" />
        <AnimatePresence initial={false}>
          {reviewing && <Line key="d0" text={EDITS[0].before} tone="del" />}
          {phase >= 3 ? (
            <Line key="a0" text={EDITS[0].after} tone={kept ? "kept" : "add"} />
          ) : (
            <Line key="b0" text={EDITS[0].before} />
          )}
        </AnimatePresence>
        <Line text="\resumeItem{Shipped a React dashboard for support agents}" />
        <Line text="\section{Technical Skills}" />
        <AnimatePresence initial={false}>
          {reviewing && <Line key="d1" text={EDITS[1].before} tone="del" />}
          {phase >= 3 ? (
            <Line key="a1" text={EDITS[1].after} tone={kept ? "kept" : "add"} />
          ) : (
            <Line key="b1" text={EDITS[1].before} />
          )}
        </AnimatePresence>
      </div>

      {/* the command bar, or the review bar while there's a diff */}
      <div className="relative mt-auto h-[52px]">
        <AnimatePresence mode="wait" initial={false}>
          {reviewing ? (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute inset-0 flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/90 px-3.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
              <span className="flex-1 text-xs font-medium text-zinc-200">
                Review 2 changes
              </span>
              <span className="flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-400">
                <Undo2 className="h-3 w-3" /> Undo all
              </span>
              <motion.span
                animate={phase === 4 ? { scale: [1, 0.92, 1] } : { scale: 1 }}
                transition={{ duration: 0.35 }}
                className="flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-900"
              >
                <Check className="h-3 w-3" /> Keep all
              </motion.span>
            </motion.div>
          ) : (
            <motion.div
              key="ask"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute inset-0 flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/90 pl-4 pr-2"
            >
              {phase === 2 ? (
                <span className="flex flex-1 items-center gap-2 text-xs text-zinc-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Editing your
                  resume…
                </span>
              ) : kept ? (
                <span className="flex flex-1 items-center gap-2 text-xs text-zinc-400">
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> Kept 2
                  changes · PDF updated
                </span>
              ) : (
                <span className="flex-1 truncate text-xs text-zinc-200">
                  {typed || (
                    <span className="text-zinc-600">
                      Ask Vero to edit your resume… ⌘I
                    </span>
                  )}
                  {phase === 1 && (
                    <span className="ml-px inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-zinc-300" />
                  )}
                </span>
              )}
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${typed && phase === 1 ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-500"}`}
              >
                <ArrowUp className="h-4 w-4" />
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Import: .zip, .pdf and .docx merge into one .tex                    */
/* ------------------------------------------------------------------ */

const IMPORT_PHASES = [1400, 700, 2200, 500];
const SOURCES = [
  { ext: ".zip", from: "Overleaf", x: -168 },
  { ext: ".pdf", from: "PDF", x: 0 },
  { ext: ".docx", from: "Word", x: 168 },
];

function FileTile({ ext, from, tex }: { ext: string; from: string; tex?: boolean }) {
  return (
    <div
      className={`relative flex h-[136px] w-[112px] flex-col items-center justify-end rounded-xl pb-4 [clip-path:polygon(0_0,72%_0,100%_22%,100%_100%,0_100%)] ${
        tex ? "bg-zinc-100 text-zinc-900" : "border border-zinc-800 bg-zinc-950 text-zinc-300"
      }`}
    >
      {/* folded corner */}
      <span className={`absolute right-0 top-0 h-[22%] w-[28%] rounded-bl-md ${tex ? "bg-zinc-300" : "bg-zinc-800"}`} />
      <span className="font-mono text-lg font-semibold">{ext}</span>
      <span className={`mt-0.5 text-xs ${tex ? "text-zinc-600" : "text-zinc-500"}`}>{from}</span>
    </div>
  );
}

export function ImportFilesDemo() {
  const { ref, phase } = useLoop<HTMLDivElement>(IMPORT_PHASES);
  // 0: three files · 1: they converge · 2: one .tex · 3: reset
  const merged = phase === 1 || phase === 2;

  return (
    <div ref={ref} aria-hidden className="relative flex h-[220px] items-center justify-center max-sm:h-[160px] max-sm:scale-[0.72]">
      {SOURCES.map((f, i) => (
        <motion.div
          key={f.ext}
          className="absolute"
          initial={false}
          animate={merged ? { x: 0, scale: 0.55, opacity: 0, rotate: (i - 1) * 8 } : { x: f.x, scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: merged ? 0.55 : 0.45, ease: [0.22, 1, 0.36, 1], delay: merged ? i * 0.05 : i * 0.06 }}
        >
          <FileTile ext={f.ext} from={f.from} />
        </motion.div>
      ))}
      <AnimatePresence>
        {phase === 2 && (
          <motion.div
            key="tex"
            className="absolute"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.35, duration: 0.5 }}
          >
            <FileTile ext=".tex" from="resume" tex />
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="absolute -right-28 top-1/2 flex -translate-y-1/2 items-center gap-1 whitespace-nowrap text-xs text-zinc-400"
            >
              <Check className="h-3 w-3 text-emerald-400" /> ready to edit
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
