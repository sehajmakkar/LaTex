"use client";

import { useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Check, CircleAlert, FileDown, Keyboard, Loader2, Play, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { VeroMark } from "@/components/brand/VeroLogo";
import { useEditorStore } from "@/stores/editor-store";

export type SaveState = "saved" | "saving" | "error";

type EditorHeaderProps = {
  projectId: string;
  projectName: string;
  onRename?: (name: string) => void;
  onCompile: () => void;
  isCompiling?: boolean;
  saveState: SaveState;
};

const SHORTCUTS = [
  ["⌘ K", "AI edit on the selection"],
  ["⌘ Y", "Accept the AI edit"],
  ["⌘ U", "Reject the AI edit"],
  ["⌘ F", "Find in the document"],
] as const;

function slug(name: string) {
  return name.trim().replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-").toLowerCase() || "resume";
}

export function EditorHeader({ projectId, projectName, onRename, onCompile, isCompiling, saveState }: EditorHeaderProps) {
  const { pdfUrl } = useEditorStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(projectName);

  const commit = () => {
    setEditing(false);
    const name = draft.trim();
    if (name && name !== projectName) onRename?.(name);
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/80 px-3 backdrop-blur-md md:px-4">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <Link href="/dashboard" aria-label="Back to your resumes" className="rounded-lg transition-opacity hover:opacity-80">
          <VeroMark />
        </Link>
        <nav className="flex min-w-0 items-center gap-1.5 text-sm" aria-label="Breadcrumb">
          <Link href="/dashboard" className="hidden text-muted-foreground hover:text-foreground sm:inline">
            Resumes
          </Link>
          <span className="hidden text-muted-foreground/60 sm:inline">/</span>
          {editing && onRename ? (
            <input
              autoFocus
              value={draft}
              maxLength={100}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") setEditing(false);
              }}
              aria-label="Resume name"
              className="w-44 rounded-md border border-input bg-background px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring/50 md:w-60"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(projectName);
                setEditing(true);
              }}
              disabled={!onRename}
              title="Rename"
              className="max-w-[40vw] truncate rounded-md px-1 py-0.5 font-medium hover:bg-accent md:max-w-[280px]"
            >
              {projectName}
            </button>
          )}
        </nav>
        <span className="hidden items-center gap-1 text-xs text-muted-foreground lg:flex" aria-live="polite">
          {saveState === "saving" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </>
          )}
          {saveState === "saved" && (
            <>
              <Check className="h-3 w-3" /> Saved
            </>
          )}
          {saveState === "error" && (
            <span className="flex items-center gap-1 text-destructive">
              <CircleAlert className="h-3 w-3" /> Not saved
            </span>
          )}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Button variant="ghost" size="sm" className="hidden md:inline-flex" asChild>
          <Link href={`/ats?project=${projectId}`}>
            <ScanSearch className="h-4 w-4" />
            ATS check
          </Link>
        </Button>
        {pdfUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={pdfUrl} download={`${slug(projectName)}.pdf`} aria-label="Download PDF">
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </a>
          </Button>
        )}
        <Button size="sm" onClick={onCompile} disabled={isCompiling}>
          {isCompiling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {isCompiling ? "Compiling" : "Compile"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hidden h-8 w-8 md:inline-flex" aria-label="Keyboard shortcuts">
              <Keyboard className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Shortcuts</DropdownMenuLabel>
            <ul className="space-y-1.5 px-2 pb-1 text-sm">
              {SHORTCUTS.map(([keys, label]) => (
                <li key={keys} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{label}</span>
                  <kbd className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[11px]">{keys}</kbd>
                </li>
              ))}
            </ul>
          </DropdownMenuContent>
        </DropdownMenu>
        <ThemeToggle />
        <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
      </div>
    </header>
  );
}
