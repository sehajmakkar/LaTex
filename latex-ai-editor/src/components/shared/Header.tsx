"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Play, Save, FileDown, Settings, Sparkles, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEditorStore } from "@/stores/editor-store";

type HeaderProps = {
  projectName: string;
  onCompile: () => void;
  onSave?: () => void;
  isCompiling?: boolean;
};

export function Header({ projectName, onCompile, onSave, isCompiling }: HeaderProps) {
  const { pdfUrl } = useEditorStore();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">LaTeX AI Editor</h1>
        </div>
        <span className="text-sm text-muted-foreground">/</span>
        <span className="text-sm font-medium">{projectName}</span>
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

        {onSave && (
          <Button variant="outline" size="sm" onClick={onSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save
          </Button>
        )}

        {pdfUrl && (
          <Button variant="outline" size="sm" asChild className="gap-2">
            <a href={pdfUrl} download="document.pdf">
              <FileDown className="h-4 w-4" />
              Download
            </a>
          </Button>
        )}

        <div className="flex items-center gap-1">
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
              <Link href="/">Home</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              <p className="font-medium mb-1">AI Shortcuts</p>
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
