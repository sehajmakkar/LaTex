"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Play, FileDown, Settings, Sparkles, FileCode2, ArrowLeft, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEditorStore } from "@/stores/editor-store";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

type HeaderProps = {
  projectName: string;
  onCompile: () => void;
  isCompiling?: boolean;
  backHref?: string;
  onRename?: (name: string) => void;
};

export function Header({ projectName, onCompile, isCompiling, backHref, onRename }: HeaderProps) {
  const { pdfUrl } = useEditorStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(projectName);
  useEffect(() => {
    if (!isEditingName) setEditName(projectName);
  }, [projectName, isEditingName]);

  const handleNameSave = useCallback(() => {
    const trimmed = editName.trim();
    setIsEditingName(false);
    if (trimmed && trimmed !== projectName && onRename) {
      onRename(trimmed);
    } else {
      setEditName(projectName);
    }
  }, [editName, projectName, onRename]);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background/70 backdrop-blur-md px-4">
      <div className="flex items-center gap-4 min-w-0">
        {backHref && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
            <Link href={backHref} aria-label="Go back">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        )}
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-5 w-5 shrink-0 text-muted-foreground" />
          <h1 className="font-display text-lg font-semibold truncate">TeXel</h1>
        </div>
        <span className="text-sm text-muted-foreground shrink-0">/</span>
        {onRename ? (
          isEditingName ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSave();
                if (e.key === "Escape") {
                  setIsEditingName(false);
                  setEditName(projectName);
                }
              }}
              className="min-w-[120px] max-w-[240px] rounded-xl border border-input bg-background px-2 py-1 text-sm font-medium ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring/50"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="text-sm font-medium truncate hover:underline text-left max-w-[200px] text-foreground/80"
            >
              {projectName}
            </button>
          )
        ) : (
          <span className="text-sm font-medium truncate text-foreground/80">{projectName}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onCompile}
          disabled={isCompiling}
          size="sm"
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          {isCompiling ? "Compiling..." : "Compile"}
        </Button>

        {pdfUrl && (
          <Button variant="outline" size="sm" asChild className="gap-2">
            <a href={pdfUrl} download="document.pdf">
              <FileDown className="h-4 w-4" />
              Download
            </a>
          </Button>
        )}

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-8 w-8",
              },
            }}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/templates" className="flex items-center gap-2">
                  <FileCode2 className="h-4 w-4" />
                  Resume templates
                </Link>
              </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/ats" className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    ATS score
                  </Link>
                </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/">Home</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                <p className="font-medium mb-1 text-foreground/60">AI Shortcuts</p>
                <p>⌘K - Trigger AI Edit</p>
                <p>⌘Y - Accept Edit</p>
                <p>⌘U - Reject Edit</p>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
