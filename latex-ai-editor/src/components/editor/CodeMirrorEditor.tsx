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

// IMPORTANT: CSS variables in globals.css are full oklch() values
// (e.g. --foreground: oklch(0.145 0 0)), so reference them as var(--x) directly.
// Do NOT wrap in hsl() — that only works when the variable stores bare "H S% L%" channels.
// For alpha variants, use color-mix(in oklch, var(--x) N%, transparent).

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

    // ── Editor chrome ────────────────────────────────────────────────────────
    const editorTheme = EditorView.theme({
      "&": {
        height: "100%",
        fontSize: "14px",
      },
      ".cm-scroller": {
        fontFamily: "var(--font-mono), ui-monospace, monospace",
        overflow: "auto",
      },
      ".cm-content": {
        padding: "16px 0",
        caretColor: "var(--foreground)",
      },
      ".cm-line": {
        padding: "0 16px",
      },
      ".cm-gutters": {
        backgroundColor: "var(--muted)",
        color: "var(--muted-foreground)",
        border: "none",
        paddingRight: "8px",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "var(--accent)",
      },
      ".cm-activeLine": {
        backgroundColor: "color-mix(in oklch, var(--accent) 50%, transparent)",
      },
      ".cm-selectionBackground": {
        backgroundColor: "color-mix(in oklch, var(--primary) 20%, transparent) !important",
      },
      "&.cm-focused .cm-selectionBackground": {
        backgroundColor: "color-mix(in oklch, var(--primary) 30%, transparent) !important",
      },
      "&.cm-focused .cm-cursor": {
        borderLeftColor: "var(--foreground)",
        borderLeftWidth: "2px",
      },
    });

    // ── AI tooltip / panel ───────────────────────────────────────────────────
    // @marimo-team/codemirror-ai uses EditorView.baseTheme() (lower precedence).
    // EditorView.theme() always wins over baseTheme.
    const aiTheme = EditorView.theme({
      ".cm-tooltip.cm-ai-tooltip": {
        backgroundColor: "var(--popover)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "0",
        boxShadow: "0 8px 32px color-mix(in oklch, var(--foreground) 12%, transparent), 0 2px 8px color-mix(in oklch, var(--foreground) 6%, transparent)",
        overflow: "hidden",
        minWidth: "320px",
        maxWidth: "480px",
      },
      ".cm-ai-input-wrapper": {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 14px",
        backgroundColor: "var(--popover)",
      },
      ".cm-ai-input": {
        flex: "1",
        background: "transparent",
        border: "none",
        outline: "none",
        fontSize: "13px",
        lineHeight: "1.5",
        color: "var(--popover-foreground)",
        caretColor: "var(--foreground)",
        fontFamily: "inherit",
        padding: "0",
        width: "100%",
      },
      ".cm-ai-input::placeholder": {
        color: "var(--muted-foreground)",
      },
      ".cm-tooltip.cm-ai-tooltip:focus-within": {
        borderColor: "var(--ring)",
        boxShadow: "0 8px 32px color-mix(in oklch, var(--foreground) 12%, transparent), 0 0 0 2px color-mix(in oklch, var(--ring) 25%, transparent)",
      },
      ".cm-ai-diff-added": {
        backgroundColor: "oklch(0.55 0.15 145 / 0.15)",
        color: "oklch(0.6 0.15 145)",
      },
      ".cm-ai-diff-removed": {
        backgroundColor: "oklch(0.6 0.2 27 / 0.12)",
        color: "oklch(0.6 0.2 27)",
        textDecoration: "line-through",
        textDecorationColor: "oklch(0.6 0.2 27 / 0.6)",
      },
      ".cm-ai-actions": {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 14px",
        borderTop: "1px solid var(--border)",
        backgroundColor: "color-mix(in oklch, var(--muted) 40%, transparent)",
      },
      ".cm-ai-accept": {
        padding: "4px 12px",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: "500",
        cursor: "pointer",
        border: "none",
        backgroundColor: "var(--primary)",
        color: "var(--primary-foreground)",
        transition: "opacity 0.15s",
      },
      ".cm-ai-accept:hover": {
        opacity: "0.85",
      },
      ".cm-ai-reject": {
        padding: "4px 12px",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: "500",
        cursor: "pointer",
        border: "1px solid var(--border)",
        backgroundColor: "transparent",
        color: "var(--muted-foreground)",
        transition: "background-color 0.15s, color 0.15s",
      },
      ".cm-ai-reject:hover": {
        backgroundColor: "var(--muted)",
        color: "var(--foreground)",
      },
      ".cm-ai-keybinding": {
        marginLeft: "auto",
        fontSize: "11px",
        color: "var(--muted-foreground)",
        display: "flex",
        gap: "4px",
        alignItems: "center",
      },
      ".cm-ai-keybinding kbd": {
        padding: "1px 5px",
        borderRadius: "4px",
        backgroundColor: "var(--muted)",
        border: "1px solid var(--border)",
        fontFamily: "var(--font-mono), ui-monospace, monospace",
        fontSize: "10px",
        color: "var(--muted-foreground)",
      },
      ".cm-ai-loading": {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 14px",
        fontSize: "13px",
        color: "var(--muted-foreground)",
      },
      ".cm-ai-selection": {
        backgroundColor: "color-mix(in oklch, var(--primary) 8%, transparent)",
        borderLeft: "2px solid color-mix(in oklch, var(--primary) 40%, transparent)",
      },

      // ── Generic tooltip catch-all ─────────────────────────────────────────
      ".cm-tooltip": {
        border: "1px solid var(--border)",
        borderRadius: "8px",
        backgroundColor: "var(--popover)",
        color: "var(--popover-foreground)",
      },

      // ── Autocomplete / intellisense dropdown ──────────────────────────────
      // Must come after the catch-all so the double-class specificity wins
      ".cm-tooltip.cm-tooltip-autocomplete": {
        backgroundColor: "var(--popover)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        boxShadow: "0 4px 16px color-mix(in oklch, var(--foreground) 10%, transparent)",
        padding: "4px",
        overflow: "hidden",
      },
      ".cm-tooltip-autocomplete ul": {
        backgroundColor: "transparent",
        fontFamily: "var(--font-mono), ui-monospace, monospace",
        fontSize: "13px",
        maxHeight: "240px",
        overflowY: "auto",
      },
      ".cm-tooltip-autocomplete ul li": {
        color: "var(--popover-foreground)",
        borderRadius: "4px",
        padding: "4px 8px",
      },
      ".cm-tooltip-autocomplete ul li[aria-selected='true']": {
        backgroundColor: "var(--accent)",
        color: "var(--accent-foreground)",
      },
      ".cm-completionIcon": {
        color: "var(--muted-foreground)",
        opacity: "0.7",
      },
      ".cm-completionLabel": {
        color: "var(--popover-foreground)",
      },
      ".cm-completionMatchedText": {
        color: "var(--primary)",
        fontWeight: "600",
        textDecoration: "none",
      },
      ".cm-completionDetail": {
        color: "var(--muted-foreground)",
        fontSize: "12px",
        marginLeft: "8px",
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
        editorTheme,
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
              description: error instanceof Error ? error.message : "An error occurred",
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
