"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Briefcase,
  Check,
  ChevronDown,
  History,
  Loader2,
  MessageSquare,
  Minimize2,
  Sparkles,
  Square,
  TriangleAlert,
  Undo2,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EditorApi } from "@/components/editor/CodeMirrorEditor";
import type { ChatMessage, CommandScopeChoice, SendOptions, useAiCommands } from "@/hooks/use-ai-commands";
import { useUsage } from "@/hooks/use-usage";
import { findSections, type LatexSection } from "@/lib/text-edits";
import { cn } from "@/lib/utils";

type Commands = ReturnType<typeof useAiCommands>;
type Version = { id: string; label: string; createdAt: string };

type CommandBarProps = {
  projectId: string;
  commands: Commands;
  editorApi: EditorApi | null;
  /** Set while the editor shows an AI diff. */
  review: { editCount: number } | null;
  /** Log of the last failed compile, which enables "Fix compile error". */
  compileLog: string | null;
  onRestoreVersion: (versionId: string) => void;
};

const QUICK = {
  onePage:
    "Make the resume fit on one page: tighten wordy bullets, merge or remove the least important lines, and reduce spacing if needed. Keep every job, degree and date.",
  impact:
    "Make the bullet points more impactful: lead with strong action verbs, show outcomes, cut filler, and put an [X] placeholder wherever a number is missing.",
  tailor: "Tailor my resume to this job description.",
  fix: "Fix the LaTeX compile error.",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Reviewing",
  accepted: "Kept",
  partial: "Partly kept",
  rejected: "Undone",
};

function scopeLabel(scope: CommandScopeChoice) {
  if (scope.type === "whole") return "Whole resume";
  if (scope.type === "selection") return "Selection";
  return scope.label;
}

function Message({ m }: { m: ChatMessage }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground">{m.content}</p>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <span className={cn("mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", m.error ? "bg-destructive/10 text-destructive" : "bg-muted")}>
        {m.error ? <TriangleAlert className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("whitespace-pre-wrap text-sm leading-relaxed", m.error && "text-destructive")}>{m.content}</p>
        {!!m.editCount && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {m.editCount} change{m.editCount > 1 ? "s" : ""}
            {m.status ? ` · ${STATUS_LABEL[m.status] ?? m.status}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

export function CommandBar({ projectId, commands, editorApi, review, compileLog, onRestoreVersion }: CommandBarProps) {
  const { messages, loading, remaining, send, cancel } = commands;
  const { data: usage } = useUsage();
  const [input, setInput] = useState("");
  const [scope, setScope] = useState<CommandScopeChoice>({ type: "whole" });
  const [sections, setSections] = useState<LatexSection[]>([]);
  const [hasSelection, setHasSelection] = useState(false);
  const [open, setOpen] = useState(false);
  const [job, setJob] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const left = remaining ?? (usage ? Math.max(0, usage.limits.aiCommandsPerMonth - usage.usage.aiCommands) : null);

  // ⌘I focuses the command bar from anywhere in the editor.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [open, messages.length, loading]);

  const refreshSelection = () => {
    const selected = !!editorApi?.getSelection();
    setHasSelection(selected);
    // Selecting text before typing is the natural way to scope a command.
    if (selected && scope.type === "whole") setScope({ type: "selection" });
    if (!selected && scope.type === "selection") setScope({ type: "whole" });
  };

  const submit = async (options: SendOptions) => {
    const draft = input;
    setOpen(true);
    setInput("");
    const result = await send(options);
    if (result === null) setInput(draft);
    else if (options.jobDescription) setJob(null);
  };

  const onSubmit = () => {
    const instruction = input.trim();
    if (!instruction || loading) return;
    submit({ instruction, scope, jobDescription: job?.trim() || undefined });
  };

  const loadVersions = () => {
    setVersions(null);
    fetch(`/api/projects/${projectId}/versions`)
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((body) => setVersions(body.data ?? []))
      .catch(() => setVersions([]));
  };

  if (review) {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-3 md:p-4">
        <div className="pointer-events-auto flex w-full max-w-2xl flex-wrap items-center gap-3 rounded-2xl border bg-popover/95 px-4 py-3 shadow-lg backdrop-blur">
          <Sparkles className="h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              Review {review.editCount} change{review.editCount > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Compile to preview them first if you like. Keep or undo each one in the editor, or all at once.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => editorApi?.rejectAll()}>
              <Undo2 className="h-3.5 w-3.5" /> Undo all
            </Button>
            <Button size="sm" onClick={() => editorApi?.acceptAll()}>
              <Check className="h-3.5 w-3.5" /> Keep all
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-3 md:p-4">
      <div className="pointer-events-auto w-full max-w-2xl overflow-hidden rounded-2xl border bg-popover/95 shadow-lg backdrop-blur">
        {open && (messages.length > 0 || loading) && (
          <div className="border-b">
            <div className="flex items-center justify-between px-4 pt-2.5">
              <span className="text-xs font-medium text-muted-foreground">Vero</span>
              <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Hide conversation">
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div ref={listRef} className="max-h-72 space-y-3 overflow-y-auto px-4 pb-3 pt-2">
              {messages.map((m) => (
                <Message key={m.id} m={m} />
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Editing your resume…
                </div>
              )}
            </div>
          </div>
        )}

        {job !== null && (
          <div className="border-b px-3 pt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium">Job description</span>
              <button type="button" onClick={() => setJob(null)} className="text-muted-foreground hover:text-foreground" aria-label="Remove job description">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <textarea
              value={job}
              onChange={(e) => setJob(e.target.value)}
              maxLength={10_000}
              rows={4}
              placeholder="Paste the job posting…"
              className="mb-3 w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
        )}

        {!input && job === null && !loading && (
          <div className="flex gap-1.5 overflow-x-auto px-3 pt-3 [scrollbar-width:none]">
            {compileLog && (
              <button
                type="button"
                onClick={() => submit({ instruction: QUICK.fix, compileLog })}
                className="flex shrink-0 items-center gap-1 rounded-full border border-destructive/40 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/5"
              >
                <TriangleAlert className="h-3 w-3" /> Fix compile error
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setJob("");
                setInput(QUICK.tailor);
              }}
              className="flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-accent"
            >
              <Briefcase className="h-3 w-3" /> Tailor to a job
            </button>
            <button
              type="button"
              onClick={() => submit({ instruction: QUICK.impact, scope })}
              className="flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-accent"
            >
              <Zap className="h-3 w-3" /> Stronger bullets
            </button>
            <button
              type="button"
              onClick={() => submit({ instruction: QUICK.onePage })}
              className="flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-accent"
            >
              <Minimize2 className="h-3 w-3" /> Fit on one page
            </button>
          </div>
        )}

        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={refreshSelection}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSubmit();
            } else if (e.key === "Escape") {
              setOpen(false);
              editorApi?.focus();
            }
          }}
          maxLength={1000}
          rows={1}
          placeholder={job !== null ? "What should change for this job?" : "Ask Vero to edit your resume…  ⌘I"}
          aria-label="AI command"
          className="block max-h-40 min-h-11 w-full resize-none bg-transparent px-4 pt-3 text-sm outline-none [field-sizing:content] placeholder:text-muted-foreground"
        />

        <div className="flex items-center gap-1 px-2 pb-2 pt-1">
          <DropdownMenu
            onOpenChange={(o) => {
              if (!o || !editorApi) return;
              setSections(findSections(editorApi.getDoc()));
              setHasSelection(!!editorApi.getSelection());
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 max-w-44 gap-1 px-2 text-xs text-muted-foreground">
                <span className="truncate">{scopeLabel(scope)}</span>
                <ChevronDown className="h-3 w-3 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
              <DropdownMenuLabel className="text-xs">Edit only…</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setScope({ type: "whole" })}>Whole resume</DropdownMenuItem>
              <DropdownMenuItem disabled={!hasSelection} onSelect={() => setScope({ type: "selection" })}>
                Selected text{!hasSelection && <span className="ml-auto text-[10px]">select first</span>}
              </DropdownMenuItem>
              {sections.length > 0 && <DropdownMenuSeparator />}
              {sections.map((s) => (
                <DropdownMenuItem key={`${s.label}-${s.from}`} onSelect={() => setScope({ type: "section", label: s.label })}>
                  <span className="truncate">{s.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu onOpenChange={(o) => o && loadVersions()}>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" aria-label="Version history">
                <History className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 w-72 overflow-y-auto">
              <DropdownMenuLabel className="text-xs">Restore a version from before an AI change</DropdownMenuLabel>
              {versions === null && (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {versions?.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">No versions yet. One is saved each time you keep an AI change.</p>}
              {versions?.map((v) => (
                <DropdownMenuItem key={v.id} onSelect={() => onRestoreVersion(v.id)} className="flex-col items-start gap-0.5">
                  <span className="line-clamp-1 text-sm">{v.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(v.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {messages.length > 0 && !open && (
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" aria-label="Show conversation" onClick={() => setOpen(true)}>
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            {left !== null && (
              <span className={cn("text-[11px] tabular-nums text-muted-foreground", left <= 2 && "text-amber-600 dark:text-amber-400")}>
                {left} left
              </span>
            )}
            {loading ? (
              <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={cancel} aria-label="Stop">
                <Square className="h-3 w-3 fill-current" />
              </Button>
            ) : (
              <Button size="icon" className="h-8 w-8 rounded-full" onClick={onSubmit} disabled={!input.trim()} aria-label="Send">
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
