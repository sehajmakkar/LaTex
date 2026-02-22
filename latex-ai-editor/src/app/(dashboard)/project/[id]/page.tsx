"use client";

import { useState, useCallback, useEffect } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Header } from "@/components/shared/Header";
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
  const { compileState, setCompileState, pdfUrl, setPdfUrl } = useEditorStore();

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
        setContent(data.data.content);
        setProjectName(data.data.name);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setProjectLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

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
        setCompileState({
          status: "success",
          pdfUrl: result.data.pdfUrl,
          compiledAt: new Date(),
        });
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
  }, [id, content, setCompileState, setPdfUrl]);

  const isCompiling = compileState.status === "compiling";

  const handleSave = useCallback(async () => {
    if (id === "new" || !UUID_REGEX.test(id)) return;
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Project saved");
    } catch {
      toast.error("Failed to save");
    }
  }, [id, content]);

  if (!projectLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading project...</div>
      </div>
    );
  }

  return (
    <>
      <Header
        projectName={projectName}
        onCompile={handleCompile}
        onSave={id !== "new" && UUID_REGEX.test(id) ? handleSave : undefined}
        isCompiling={isCompiling}
      />
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={55} minSize={30}>
          <EditorPane value={content} onChange={setContent} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={45} minSize={25}>
          <PdfPreview url={pdfUrl} isLoading={isCompiling} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}
