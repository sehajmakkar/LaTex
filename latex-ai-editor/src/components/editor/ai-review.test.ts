// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { history, undo } from "@codemirror/commands";
import { acceptChunk, getChunks, rejectChunk } from "@codemirror/merge";
import { createAiReview, type ReviewOutcome } from "./ai-review";

const original = ["\\section{Experience}", "\\resumeItem{Worked on checkout}", "a", "b", "c", "d", "e", "f", "g", "h", "\\resumeItem{Built a chess engine}"].join("\n");
const proposed = original.replace("Worked on checkout", "Owned the checkout service").replace("Built a chess engine", "Engineered a chess engine");

const views: EditorView[] = [];
function setup() {
  const ends: { outcome: ReviewOutcome; original: string }[] = [];
  const review = createAiReview((outcome, orig) => ends.push({ outcome, original: orig }));
  const view = new EditorView({ state: EditorState.create({ doc: original, extensions: [history(), review.extension] }), parent: document.body });
  views.push(view);
  return { view, review, ends, flush: () => new Promise((r) => setTimeout(r, 0)) };
}
afterEach(() => views.splice(0).forEach((v) => v.destroy()));

describe("AI review", () => {
  it("shows the proposal as separate chunks", () => {
    const { view, review } = setup();
    expect(review.start(view, proposed)).toBe(true);
    expect(view.state.doc.toString()).toBe(proposed);
    expect(getChunks(view.state)?.chunks).toHaveLength(2);
    expect(review.start(view, "other")).toBe(false); // one review at a time
  });

  it("refuses an empty proposal", () => {
    const { view, review } = setup();
    expect(review.start(view, original)).toBe(false);
    expect(review.isReviewing()).toBe(false);
  });

  it("keep all → accepted, and ⌘Z restores the original", async () => {
    const { view, review, ends } = setup();
    review.start(view, proposed);
    review.keepAll(view);
    expect(ends).toEqual([{ outcome: "accepted", original }]);
    expect(getChunks(view.state)).toBeNull(); // merge view removed
    undo(view);
    expect(view.state.doc.toString()).toBe(original);
  });

  it("undo all → rejected, text back to the original", () => {
    const { view, review, ends } = setup();
    review.start(view, proposed);
    review.undoAll(view);
    expect(view.state.doc.toString()).toBe(original);
    expect(ends[0].outcome).toBe("rejected");
  });

  it("keeping one chunk and undoing the other → partial, ends by itself", async () => {
    const { view, review, ends, flush } = setup();
    review.start(view, proposed);
    const [first, second] = getChunks(view.state)!.chunks;
    acceptChunk(view, first.fromB);
    await flush();
    expect(review.isReviewing()).toBe(true);
    rejectChunk(view, second.fromB);
    await flush();
    expect(review.isReviewing()).toBe(false);
    expect(ends[0].outcome).toBe("partial");
    expect(view.state.doc.toString()).toContain("Owned the checkout service");
    expect(view.state.doc.toString()).toContain("Built a chess engine");
  });

  it("undo all after keeping one chunk keeps that chunk", () => {
    const { view, review, ends } = setup();
    review.start(view, proposed);
    acceptChunk(view, getChunks(view.state)!.chunks[0].fromB);
    review.undoAll(view);
    expect(view.state.doc.toString()).toBe(original.replace("Worked on checkout", "Owned the checkout service"));
    expect(ends[0].outcome).toBe("partial");
  });
});
