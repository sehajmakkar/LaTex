"use client";

import { useEffect, useRef, useCallback } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { EditorSelection, EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, indentOnInput } from "@codemirror/language";
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { lintKeymap } from "@codemirror/lint";
import { latex } from "codemirror-lang-latex";
import { aiExtension, showAiEditInput } from "@marimo-team/codemirror-ai";
import { createAiReview, type ReviewOutcome } from "./ai-review";
import { locateBullet } from "./locate-bullet";
import { toast } from "sonner";

/** A fix requested from the ATS report: select this bullet and pre-fill ⌘K. */
export type FixRequest = { text: string; prompt: string };

export type { ReviewOutcome };

/** What the AI command bar needs from the editor. */
export type EditorApi = {
  getDoc: () => string;
  /** The current selection, or null when nothing is selected. */
  getSelection: () => { from: number; to: number } | null;
  /** Shows `proposed` as an inline diff against the current text, with per-change Accept/Reject. */
  startReview: (proposed: string) => boolean;
  /** Keeps every remaining change and leaves review mode. */
  acceptAll: () => void;
  /** Reverts every remaining change and leaves review mode. */
  rejectAll: () => void;
  isReviewing: () => boolean;
  focus: () => void;
};

type CodeMirrorEditorProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  fixRequest?: FixRequest | null;
  onFixHandled?: () => void;
  onReady?: (api: EditorApi | null) => void;
  /** Called once the last change of a review is resolved (or Accept/Reject all). */
  onReviewEnd?: (outcome: ReviewOutcome, original: string) => void;
};

type AIEditErrorBody = {
  error?: { code?: string; message?: string };
};

/** An error whose toast has already been shown (so onError doesn't repeat it). */
class ShownError extends Error {}

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
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (body as AIEditErrorBody | null)?.error;
    const message = error?.message || `AI edit failed (${response.status})`;
    if (error?.code === "USAGE_LIMIT_REACHED" && /upgrade/i.test(message)) {
      toast.error("AI edit limit reached", {
        description: message,
        action: { label: "Upgrade", onClick: () => window.location.assign("/billing") },
      });
    } else {
      toast.error("AI edit failed", { description: message });
    }
    throw new ShownError(message);
  }

  const data = (body as { data?: { replacement?: string; notes?: string | null } } | null)?.data;
  if (typeof data?.replacement !== "string") {
    toast.error("AI edit failed", { description: "The AI returned no edit. Nothing was changed." });
    throw new ShownError("Empty AI response");
  }
  if (data.notes) {
    toast.info("AI note", { description: data.notes });
  }
  return data.replacement;
}

// IMPORTANT: CSS variables in globals.css are full oklch() values
// (e.g. --foreground: oklch(0.145 0 0)), so reference them as var(--x) directly.
// Do NOT wrap in hsl() — that only works when the variable stores bare "H S% L%" channels.
// For alpha variants, use color-mix(in oklch, var(--x) N%, transparent).

export function CodeMirrorEditor({
  value,
  onChange,
  className,
  fixRequest,
  onFixHandled,
  onReady,
  onReviewEnd,
}: CodeMirrorEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onReviewEndRef = useRef(onReviewEnd);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReviewEndRef.current = onReviewEnd;
    onReadyRef.current = onReady;
  });

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
        // Room at the bottom so the AI command bar never hides the last lines.
        padding: "16px 0 200px",
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

    // ── AI command bar review (unified diff) ─────────────────────────────────
    const reviewTheme = EditorView.theme({
      ".cm-changedLine, .cm-inlineChangedLine": {
        backgroundColor: "oklch(0.55 0.15 145 / 0.10) !important",
      },
      ".cm-changedText": {
        background: "oklch(0.55 0.15 145 / 0.22) !important",
      },
      ".cm-deletedChunk": {
        backgroundColor: "oklch(0.6 0.2 27 / 0.08) !important",
        paddingLeft: "16px",
        position: "relative",
      },
      ".cm-deletedChunk .cm-deletedText, .cm-deletedChunk del": {
        background: "oklch(0.6 0.2 27 / 0.18) !important",
        textDecoration: "line-through",
        textDecorationColor: "oklch(0.6 0.2 27 / 0.6)",
      },
      ".cm-deletedChunk .cm-chunkButtons": {
        position: "absolute",
        insetInlineEnd: "10px",
        top: "2px",
        display: "flex",
        gap: "4px",
        zIndex: "1",
      },
      ".cm-review-accept, .cm-review-reject": {
        padding: "1px 8px",
        borderRadius: "5px",
        fontSize: "11px",
        fontWeight: "500",
        fontFamily: "var(--font-sans), system-ui, sans-serif",
        cursor: "pointer",
      },
      ".cm-review-accept": {
        border: "none",
        backgroundColor: "var(--primary)",
        color: "var(--primary-foreground)",
      },
      ".cm-review-reject": {
        border: "1px solid var(--border)",
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      },
      ".cm-changedLineGutter": { background: "oklch(0.6 0.15 145) !important" },
      ".cm-deletedLineGutter": { background: "oklch(0.6 0.2 27) !important" },
      ".cm-collapsedLines": {
        color: "var(--muted-foreground) !important",
        background: "var(--muted) !important",
        fontSize: "12px",
      },
    });

    const review = createAiReview((outcome, original) => onReviewEndRef.current?.(outcome, original));

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
        reviewTheme,
        review.extension,
        aiExtension({
          prompt: (opts) => handleAIPrompt(opts),
          onAcceptEdit: () => {
            toast.success("Edit accepted");
          },
          onRejectEdit: () => {
            toast.info("Edit rejected");
          },
          onError: (error) => {
            if (error instanceof ShownError) return;
            console.error("AI extension error:", error);
            toast.error("AI edit failed", {
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

    const api: EditorApi = {
      getDoc: () => view.state.doc.toString(),
      getSelection: () => {
        const { from, to } = view.state.selection.main;
        return from === to ? null : { from, to };
      },
      startReview: (proposed) => review.start(view, proposed),
      acceptAll: () => review.keepAll(view),
      rejectAll: () => review.undoAll(view),
      isReviewing: () => review.isReviewing(),
      focus: () => view.focus(),
    };
    onReadyRef.current?.(api);

    return () => {
      onReadyRef.current?.(null);
      review.reset();
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

  // ATS "Fix in editor": select the bullet and open ⌘K with the prompt filled in.
  // Declared after the mount effect, so the view already exists when it runs.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !fixRequest) return;
    const range = locateBullet(view.state.doc.toString(), fixRequest.text);
    onFixHandled?.();
    if (!range) {
      navigator.clipboard?.writeText(fixRequest.prompt).catch(() => {});
      toast.info("Couldn't find that bullet automatically", {
        description: "The prompt is copied: select the bullet, press ⌘K and paste.",
      });
      return;
    }
    view.dispatch({ selection: EditorSelection.range(range.from, range.to), scrollIntoView: true });
    view.focus();
    showAiEditInput(view);
    // The ⌘K input is created on the next frame; fill it so the user just presses Enter.
    const timer = setTimeout(() => {
      const input = view.dom.querySelector<HTMLInputElement | HTMLTextAreaElement>(".cm-ai-input");
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")?.set;
      setter?.call(input, fixRequest.prompt);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    }, 80);
    return () => clearTimeout(timer);
  }, [fixRequest, onFixHandled]);

  return (
    <div
      ref={editorRef}
      className={className}
      style={{ height: "100%", overflow: "hidden" }}
    />
  );
}
