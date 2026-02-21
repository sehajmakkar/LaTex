"use client";

import { useState, useCallback } from "react";
import { use } from "react";
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

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = use(params);
  const [content, setContent] = useState(DEFAULT_LATEX_CONTENT);
  const { compileState, setCompileState, pdfUrl, setPdfUrl } = useEditorStore();

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

  return (
    <>
      <Header
        projectName={id === "new" ? "Untitled Project" : `Project ${id}`}
        onCompile={handleCompile}
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
