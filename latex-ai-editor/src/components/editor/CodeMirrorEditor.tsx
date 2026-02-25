"use client";

import { useEffect, useRef, useCallback } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, indentOnInput } from "@codemirror/language";
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { lintKeymap } from "@codemirror/lint";
import { latex } from "codemirror-lang-latex";
import { aiExtension } from "@marimo-team/codemirror-ai";
import { toast } from "sonner";

type CodeMirrorEditorProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

async function handleAIPrompt({
  prompt,
  selection,
  codeBefore,
  codeAfter,
}: {
  prompt: string;
  selection: string;
  codeBefore: string;
  codeAfter: string;
}): Promise<string> {
  const response = await fetch("/api/ai/edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, selection, codeBefore, codeAfter }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "AI edit failed");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response stream");
  }

  const decoder = new TextDecoder();
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") {
          break;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) {
            result += parsed.content;
          }
          if (parsed.error) {
            throw new Error(parsed.error);
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  return result;
}

export function CodeMirrorEditor({ value, onChange, className }: CodeMirrorEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const handleChange = useCallback(
    (update: { state: EditorState; docChanged: boolean }) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    },
    [onChange]
  );

  useEffect(() => {
    if (!editorRef.current) return;

    const theme = EditorView.theme({
      "&": {
        height: "100%",
        fontSize: "14px",
      },
      ".cm-scroller": {
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        overflow: "auto",
      },
      ".cm-content": {
        padding: "16px 0",
      },
      ".cm-line": {
        padding: "0 16px",
      },
      ".cm-gutters": {
        backgroundColor: "hsl(var(--muted))",
        color: "hsl(var(--muted-foreground))",
        border: "none",
        paddingRight: "8px",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "hsl(var(--accent))",
      },
      ".cm-activeLine": {
        backgroundColor: "hsl(var(--accent) / 0.5)",
      },
      ".cm-selectionBackground": {
        backgroundColor: "hsl(var(--primary) / 0.2) !important",
      },
      "&.cm-focused .cm-selectionBackground": {
        backgroundColor: "hsl(var(--primary) / 0.3) !important",
      },
      ".cm-cursor": {
        borderLeftColor: "hsl(var(--foreground))",
      },
      ".cm-ai-input": {
        backgroundColor: "hsl(var(--background))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "6px",
        padding: "8px 12px",
        fontSize: "14px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        minWidth: "300px",
      },
      ".cm-ai-input:focus": {
        outline: "none",
        borderColor: "hsl(var(--primary))",
        boxShadow: "0 0 0 2px hsl(var(--primary) / 0.2)",
      },
      ".cm-ai-suggestion": {
        backgroundColor: "hsl(var(--accent) / 0.3)",
        borderLeft: "2px solid hsl(var(--primary))",
      },
      ".cm-ai-actions": {
        display: "flex",
        gap: "4px",
        marginTop: "4px",
      },
      ".cm-ai-accept, .cm-ai-reject": {
        padding: "4px 8px",
        borderRadius: "4px",
        fontSize: "12px",
        cursor: "pointer",
        border: "none",
      },
      ".cm-ai-accept": {
        backgroundColor: "hsl(var(--primary))",
        color: "hsl(var(--primary-foreground))",
      },
      ".cm-ai-reject": {
        backgroundColor: "hsl(var(--muted))",
        color: "hsl(var(--muted-foreground))",
      },
    });

    const aiTheme = EditorView.theme({
      ".cm-ai-panel": {
        position: "absolute",
        zIndex: 100,
        backgroundColor: "hsl(var(--popover))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "8px",
        padding: "12px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
        maxWidth: "400px",
      },
      ".cm-ai-diff-added": {
        backgroundColor: "hsl(142 76% 36% / 0.2)",
        color: "hsl(142 76% 36%)",
      },
      ".cm-ai-diff-removed": {
        backgroundColor: "hsl(0 84% 60% / 0.2)",
        color: "hsl(0 84% 60%)",
        textDecoration: "line-through",
      },
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        foldGutter(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightSelectionMatches(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        latex(),
        theme,
        aiTheme,
        aiExtension({
          prompt: async (opts) => {
            try {
              const result = await handleAIPrompt(opts);
              return result;
            } catch (error) {
              const message = error instanceof Error ? error.message : "AI edit failed";
              toast.error("AI Edit Failed", { description: message });
              throw error;
            }
          },
          onAcceptEdit: () => {
            toast.success("Edit accepted");
          },
          onRejectEdit: () => {
            toast.info("Edit rejected");
          },
          onError: (error) => {
            console.error("AI extension error:", error);
            toast.error("AI Error", {
              description: error instanceof Error ? error.message : "An error occurred"
            });
          },
          keymaps: {
            showInput: "Mod-k",
            acceptEdit: "Mod-y",
            rejectEdit: "Mod-u",
          },
        }),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...closeBracketsKeymap,
          ...searchKeymap,
          ...completionKeymap,
          ...lintKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of(handleChange),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentContent = view.state.doc.toString();
    if (currentContent !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      className={className}
      style={{ height: "100%", overflow: "hidden" }}
    />
  );
}
