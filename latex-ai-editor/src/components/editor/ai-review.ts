import { Compartment, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { getChunks, getOriginalDoc, unifiedMergeView } from "@codemirror/merge";

export type ReviewOutcome = "accepted" | "partial" | "rejected";

function chunkButton(type: "accept" | "reject", action: (e: MouseEvent) => void) {
  const button = document.createElement("button");
  button.type = "button";
  button.name = type;
  button.className = `cm-review-${type}`;
  button.textContent = type === "accept" ? "Keep" : "Undo";
  button.title = type === "accept" ? "Keep this change" : "Revert this change";
  button.onmousedown = action;
  return button;
}

/**
 * Review mode for AI command bar changes: shows the proposed text as a unified
 * diff against the current text, with Keep/Undo on each change. The review ends
 * when every change is resolved (or on keepAll/undoAll) and reports whether the
 * user kept all, some or none of it.
 */
export function createAiReview(onEnd: (outcome: ReviewOutcome, original: string) => void) {
  const compartment = new Compartment();
  let review: { original: string; proposed: string } | null = null;

  function end(view: EditorView) {
    if (!review) return;
    const { original, proposed } = review;
    review = null;
    view.dispatch({ effects: compartment.reconfigure([]) });
    const doc = view.state.doc.toString();
    onEnd(doc === original ? "rejected" : doc === proposed ? "accepted" : "partial", original);
  }

  const extension: Extension = [
    compartment.of([]),
    EditorView.updateListener.of((update) => {
      if (!review || update.transactions.length === 0) return;
      const chunks = getChunks(update.state);
      // Can't dispatch inside an update listener, so finish right after it.
      if (chunks && chunks.chunks.length === 0) queueMicrotask(() => end(update.view));
    }),
  ];

  return {
    extension,
    isReviewing: () => review !== null,
    start(view: EditorView, proposed: string): boolean {
      const original = view.state.doc.toString();
      if (review || proposed === original) return false;
      review = { original, proposed };
      view.dispatch({
        changes: { from: 0, to: original.length, insert: proposed },
        effects: compartment.reconfigure(
          unifiedMergeView({
            original,
            mergeControls: chunkButton,
            gutter: true,
            syntaxHighlightDeletions: false,
            collapseUnchanged: { margin: 3, minSize: 8 },
          })
        ),
        userEvent: "input.ai-command",
      });
      const first = getChunks(view.state)?.chunks[0];
      if (first) view.dispatch({ effects: EditorView.scrollIntoView(first.fromB, { y: "center" }) });
      return true;
    },
    /** Keeps every remaining change. */
    keepAll(view: EditorView) {
      end(view);
    },
    /** Reverts every remaining change (changes already kept one by one stay). */
    undoAll(view: EditorView) {
      if (!review) return;
      const baseline = getOriginalDoc(view.state).toString();
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: baseline }, userEvent: "input.ai-command" });
      end(view);
    },
    /** Drops review mode without reporting (editor unmounting). */
    reset() {
      review = null;
    },
  };
}
