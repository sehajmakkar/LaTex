"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { EditorHeader, type SaveState } from "@/components/editor/EditorHeader";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { EditorApi, FixRequest, ReviewOutcome } from "@/components/editor/CodeMirrorEditor";
import { EditorPane } from "@/components/editor/EditorPane";
import { CommandBar } from "@/components/editor/CommandBar";
import { useAiCommands, type Proposal } from "@/hooks/use-ai-commands";
import { PdfPreview } from "@/components/preview/PdfPreview";
import { useEditorStore } from "@/stores/editor-store";
import { DEFAULT_LATEX_CONTENT } from "@/lib/constants";
import { toast } from "sonner";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [content, setContent] = useState(DEFAULT_LATEX_CONTENT);
  const [projectName, setProjectName] = useState("Loading...");
  const [projectLoaded, setProjectLoaded] = useState(false);
  const { compileState, setCompileState, pdfUrl, setPdfUrl, activeTab, setActiveTab } = useEditorStore();
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [fixRequest, setFixRequest] = useState<FixRequest | null>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [editorApi, setEditorApi] = useState<EditorApi | null>(null);
  // The AI change being reviewed in the editor (autosave pauses meanwhile).
  const [review, setReview] = useState<Proposal | null>(null);
  // `previewed`: the text last compiled successfully during the review (a preview, not saved).
  const reviewRef = useRef<(Proposal & { previewed?: string }) | null>(null);
  const [compileLog, setCompileLog] = useState<string | null>(null);
  // The last content known to be on the server, so autosave skips no-op writes.
  const savedRef = useRef<string | null>(null);

  // "Fix in editor" from an ATS report: ?fix=<bullet>&prompt=<instruction>
  useEffect(() => {
    if (!projectLoaded) return;
    const params = new URLSearchParams(window.location.search);
    const text = params.get("fix");
    const prompt = params.get("prompt");
    if (text && prompt) {
      setActiveTab("source");
      setFixRequest({ text, prompt });
    }
  }, [projectLoaded, setActiveTab]);

  const handleFixHandled = useCallback(() => {
    setFixRequest(null);
    router.replace(`/project/${id}`, { scroll: false });
  }, [router, id]);

  // The store is global: clear the previous resume's PDF when a project opens.
  useEffect(() => {
    setPdfUrl(null);
    setCompileState({ status: "idle" });
    setActiveTab("source");
  }, [id, setPdfUrl, setCompileState, setActiveTab]);

  useEffect(() => {
    if (id === "new") {
      router.replace("/dashboard");
      return;
    }
    if (!UUID_REGEX.test(id)) {
      setProjectLoaded(true);
      return;
    }
    let cancelled = false;
    fetch(`/api/projects/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.data) return;
        const loaded: string = data.data.content || DEFAULT_LATEX_CONTENT;
        savedRef.current = loaded;
        setContent(loaded);
        setProjectName(data.data.name);
      })
      .catch(() => { })
      .finally(() => {
        if (!cancelled) setProjectLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const saveContent = useCallback(async (contentToSave: string) => {
    if (id === "new" || !UUID_REGEX.test(id)) return;
    setSaveState("saving");
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contentToSave }),
      });
      if (!res.ok) throw new Error("Save failed");
      savedRef.current = contentToSave;
      setSaveState("saved");
    } catch {
      setSaveState("error");
      toast.error("Failed to save");
    }
  }, [id]);

  const debouncedSave = useDebouncedCallback((c: string) => saveContent(c), 2000);

  /**
   * Compiles `source` (default: the editor content) and, unless `save` is false,
   * saves it. Resolves with the result; never throws.
   */
  const compile = useCallback(
    async (source: string = content, { save = true } = {}): Promise<{ ok: boolean; log?: string }> => {
      setCompileState({ status: "compiling", startedAt: new Date() });
      const run = (async () => {
        const response = await fetch("/api/compile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: id, content: source }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          const log: string | undefined = body?.error?.details?.log || undefined;
          setCompileLog(log ?? null);
          throw Object.assign(new Error(body?.error?.message || "Compilation failed"), { log });
        }
        setCompileLog(null);
        setPdfUrl(body.data.pdfUrl);
        setActiveTab("output");
        setCompileState({ status: "success", pdfUrl: body.data.pdfUrl, compiledAt: new Date() });
        if (save) await saveContent(source);
        return body;
      })();
      toast.promise(run, {
        loading: "Compiling...",
        success: save ? "Compiled successfully!" : "Preview compiled. The AI changes aren't saved until you keep them.",
        error: (err) => {
          setCompileState({ status: "error", message: err.message });
          return err.message;
        },
      });
      try {
        await run;
        return { ok: true };
      } catch (err) {
        return { ok: false, log: (err as { log?: string }).log };
      }
    },
    [id, content, setCompileState, setPdfUrl, setActiveTab, saveContent]
  );

  const handleCompile = useCallback(async () => {
    const pending = reviewRef.current;
    if (!pending) {
      compile();
      return;
    }
    // Like ⌘K: compile the text with the AI changes in it, without saving it.
    const source = content;
    const result = await compile(source, { save: false });
    if (reviewRef.current === pending) pending.previewed = result.ok ? source : undefined;
  }, [compile, content]);

  const isCompiling = compileState.status === "compiling";

  useEffect(() => {
    if (!projectLoaded || id === "new" || !UUID_REGEX.test(id)) return;
    if (review) return; // an unreviewed AI change is never saved
    if (content === savedRef.current) {
      debouncedSave.cancel();
      return;
    }
    debouncedSave(content);
  }, [content, projectLoaded, id, debouncedSave, review]);

  // ── AI command bar ─────────────────────────────────────────────────────────
  const handleProposal = useCallback(
    (proposal: Proposal) => {
      if (!editorApi) return false;
      debouncedSave.flush();
      setActiveTab("source");
      if (!editorApi.startReview(proposal.proposed)) return false;
      reviewRef.current = proposal;
      setReview(proposal);
      return true;
    },
    [editorApi, debouncedSave, setActiveTab]
  );

  const commands = useAiCommands({ projectId: id, editorApi, onProposal: handleProposal });
  const { send: sendCommand, setStatus: setCommandStatus } = commands;

  const handleReviewEnd = useCallback(
    async (outcome: ReviewOutcome, original: string) => {
      const proposal = reviewRef.current;
      reviewRef.current = null;
      setReview(null);
      if (!proposal) return;
      setCommandStatus(proposal.messageId, outcome);
      if (!editorApi) return;
      const next = editorApi.getDoc();
      if (outcome === "rejected") {
        toast.info("AI changes undone");
        // The PDF shows the previewed AI version: render the original again (it's already saved).
        if (proposal.previewed !== undefined) await compile(next, { save: false });
        return;
      }
      // Keep the pre-AI text so it can be restored from the history menu.
      fetch(`/api/projects/${id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: original, label: `Before: ${proposal.instruction.slice(0, 100)}` }),
      }).catch(() => {});
      await saveContent(next);
      // Already compiled exactly this text as a preview: the PDF is current.
      if (proposal.previewed === next) return;
      const result = await compile(next);
      if (!result.ok && result.log && !proposal.autoFix) {
        toast.info("That change broke the build. Asking Vero to fix it…");
        sendCommand({ instruction: "Fix the LaTeX compile error.", compileLog: result.log, autoFix: true });
      }
    },
    [editorApi, id, saveContent, compile, sendCommand, setCommandStatus]
  );

  const handleRestoreVersion = useCallback(
    async (versionId: string) => {
      if (!editorApi || editorApi.isReviewing()) return;
      try {
        const res = await fetch(`/api/projects/${id}/versions/${versionId}`);
        if (!res.ok) throw new Error();
        const { data } = await res.json();
        const current = editorApi.getDoc();
        if (current === data.content) {
          toast.info("That version is the same as your current resume.");
          return;
        }
        await fetch(`/api/projects/${id}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: current, label: "Before restoring an earlier version" }),
        });
        setContent(data.content);
        toast.success("Version restored", { description: "Press ⌘Z in the editor to go back." });
      } catch {
        toast.error("Couldn't restore that version");
      }
    },
    [editorApi, id]
  );

  // If the editor unmounts mid-review (e.g. the layout switches), drop the unreviewed change.
  const handleEditorReady = useCallback(
    (api: EditorApi | null) => {
      setEditorApi(api);
      const pending = reviewRef.current;
      if (api || !pending) return;
      reviewRef.current = null;
      setReview(null);
      setContent(pending.original);
      setCommandStatus(pending.messageId, "rejected");
    },
    [setCommandStatus]
  );

  const commandBar = UUID_REGEX.test(id) ? (
    <CommandBar
      projectId={id}
      commands={commands}
      editorApi={editorApi}
      review={review}
      compileLog={compileLog}
      onRestoreVersion={handleRestoreVersion}
    />
  ) : null;

  const handleRename = useCallback(
    async (name: string) => {
      if (id === "new" || !UUID_REGEX.test(id)) return;
      try {
        const res = await fetch(`/api/projects/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error("Rename failed");
        setProjectName(name);
      } catch {
        toast.error("Failed to rename project");
      }
    },
    [id]
  );

  if (!projectLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading project...</div>
      </div>
    );
  }

  return (
    <>
      <EditorHeader
        projectId={id}
        projectName={projectName}
        onCompile={handleCompile}
        isCompiling={isCompiling}
        saveState={saveState}
        onRename={id !== "new" && UUID_REGEX.test(id) ? handleRename : undefined}
      />

      {isDesktop ? (
        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          <ResizablePanel defaultSize={55} minSize={30}>
            <EditorPane
              value={content}
              onChange={setContent}
              fixRequest={fixRequest}
              onFixHandled={handleFixHandled}
              onReady={handleEditorReady}
              onReviewEnd={handleReviewEnd}
            >
              {commandBar}
            </EditorPane>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={45} minSize={25}>
            <PdfPreview url={pdfUrl} isLoading={isCompiling} />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <>
          {/* Mobile: one pane at a time */}
          <div className="flex border-b" role="tablist" aria-label="Editor view">
            {(["source", "output"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-2.5 text-sm",
                  activeTab === tab ? "border-b-2 border-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {tab === "source" ? "Code" : "Preview"}
              </button>
            ))}
          </div>
          {/* Both stay mounted so an open AI review survives switching to Preview. */}
          <div className={cn("min-h-0 flex-1", activeTab !== "source" && "hidden")}>
            <EditorPane
              value={content}
              onChange={setContent}
              fixRequest={fixRequest}
              onFixHandled={handleFixHandled}
              onReady={handleEditorReady}
              onReviewEnd={handleReviewEnd}
            >
              {commandBar}
            </EditorPane>
          </div>
          <div className={cn("min-h-0 flex-1", activeTab !== "output" && "hidden")}>
            <PdfPreview url={pdfUrl} isLoading={isCompiling} />
          </div>
        </>
      )}
    </>
  );
}
