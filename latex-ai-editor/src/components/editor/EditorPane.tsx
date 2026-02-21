"use client";

import dynamic from "next/dynamic";
import { Sparkles } from "lucide-react";
import { EditorSkeleton } from "./EditorSkeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const CodeMirrorEditor = dynamic(
  () => import("./CodeMirrorEditor").then((mod) => mod.CodeMirrorEditor),
  {
    loading: () => <EditorSkeleton />,
    ssr: false,
  }
);

type EditorPaneProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function EditorPane({ value, onChange, className }: EditorPaneProps) {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-medium text-muted-foreground">main.tex</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                <span className="hidden sm:inline">AI Edit:</span>
                <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-2 text-xs">
                <p className="font-medium">AI Inline Edit</p>
                <div className="space-y-1 text-muted-foreground">
                  <p><kbd className="rounded bg-muted px-1 py-0.5 font-mono">⌘K</kbd> Select text and trigger AI edit</p>
                  <p><kbd className="rounded bg-muted px-1 py-0.5 font-mono">⌘Y</kbd> Accept suggested edit</p>
                  <p><kbd className="rounded bg-muted px-1 py-0.5 font-mono">⌘U</kbd> Reject suggested edit</p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex-1 overflow-hidden">
        <CodeMirrorEditor value={value} onChange={onChange} className={className} />
      </div>
    </div>
  );
}
