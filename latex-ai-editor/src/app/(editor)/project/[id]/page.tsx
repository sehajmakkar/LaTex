"use client";

import { useState, useCallback, useEffect } from "react";
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
import type { FixRequest } from "@/components/editor/CodeMirrorEditor";
import { EditorPane } from "@/components/editor/EditorPane";
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
        setContent(data.data.content || DEFAULT_LATEX_CONTENT);
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
      setSaveState("saved");
    } catch {
      setSaveState("error");
      toast.error("Failed to save");
    }
  }, [id]);

  const debouncedSave = useDebouncedCallback((c: string) => saveContent(c), 2000);

  const handleCompile = useCallback(async () => {
    setCompileState({ status: "compiling", startedAt: new Date() });

    toast.promise(
      (async () => {
        const response = await fetch("/api/compile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: id, content }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || "Compilation failed");
        }

        const result = await response.json();
        setPdfUrl(result.data.pdfUrl);
        setActiveTab("output");
        setCompileState({
          status: "success",
          pdfUrl: result.data.pdfUrl,
          compiledAt: new Date(),
        });
        await saveContent(content);
        return result;
      })(),
      {
        loading: "Compiling...",
        success: "Compiled successfully!",
        error: (err) => {
          setCompileState({ status: "error", message: err.message });
          return err.message;
        },
      }
    );
  }, [id, content, setCompileState, setPdfUrl, setActiveTab, saveContent]);

  const isCompiling = compileState.status === "compiling";

  useEffect(() => {
    if (!projectLoaded || id === "new" || !UUID_REGEX.test(id)) return;
    debouncedSave(content);
  }, [content, projectLoaded, id, debouncedSave]);

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
            <EditorPane value={content} onChange={setContent} fixRequest={fixRequest} onFixHandled={handleFixHandled} />
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
          <div className="min-h-0 flex-1">
            {activeTab === "source" ? (
              <EditorPane value={content} onChange={setContent} fixRequest={fixRequest} onFixHandled={handleFixHandled} />
            ) : (
              <PdfPreview url={pdfUrl} isLoading={isCompiling} />
            )}
          </div>
        </>
      )}
    </>
  );
}
