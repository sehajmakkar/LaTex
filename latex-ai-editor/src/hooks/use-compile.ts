import { useState, useCallback } from "react";
import type { CompileState } from "@/types";
import { getErrorMessage } from "@/lib/errors";

export function useCompile(projectId: string) {
  const [state, setState] = useState<CompileState>({ status: "idle" });

  const compile = useCallback(
    async (content: string) => {
      setState({ status: "compiling", startedAt: new Date() });

      try {
        const response = await fetch("/api/compile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, content }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error?.message || "Compilation failed");
        }

        setState({
          status: "success",
          pdfUrl: result.data.pdfUrl,
          compiledAt: new Date(),
        });

        return result.data;
      } catch (error) {
        const message = getErrorMessage(error);
        setState({ status: "error", message });
        throw error;
      }
    },
    [projectId]
  );

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return {
    ...state,
    compile,
    reset,
    isCompiling: state.status === "compiling",
    isError: state.status === "error",
    isSuccess: state.status === "success",
  };
}
