"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { EditorApi } from "@/components/editor/CodeMirrorEditor";
import { applyEdits, findSections, rebaseEdits, type TextEdit } from "@/lib/text-edits";

export type CommandStatus = "pending" | "accepted" | "partial" | "rejected";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: CommandStatus | null;
  editCount?: number;
  /** Local-only: the request failed, nothing was saved. */
  error?: boolean;
};

export type CommandScopeChoice = { type: "whole" } | { type: "selection" } | { type: "section"; label: string };

export type SendOptions = {
  instruction: string;
  scope?: CommandScopeChoice;
  jobDescription?: string;
  compileLog?: string;
  /** Marks the automatic retry after an AI change broke the build (no second retry). */
  autoFix?: boolean;
};

export type Proposal = {
  messageId: string;
  /** The editor text the edits were applied to, and the result. */
  original: string;
  proposed: string;
  instruction: string;
  autoFix: boolean;
  editCount: number;
};

type ApiError = { error?: { code?: string; message?: string } };

/** State and actions for the AI command bar of one resume. */
export function useAiCommands({
  projectId,
  editorApi,
  onProposal,
}: {
  projectId: string;
  editorApi: EditorApi | null;
  onProposal: (proposal: Proposal) => boolean;
}) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}/ai-messages`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!cancelled && Array.isArray(body?.data)) setMessages(body.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [projectId]);

  const setStatus = useCallback((messageId: string, status: CommandStatus) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, status } : m)));
    fetch(`/api/ai/command/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => {});
  }, []);

  const send = useCallback(
    async ({ instruction, scope = { type: "whole" }, jobDescription, compileLog, autoFix = false }: SendOptions): Promise<boolean | null> => {
      // null = not sent (nothing reached the server); boolean = whether a diff is being shown.
      if (!editorApi || loading || editorApi.isReviewing()) return null;
      const document = editorApi.getDoc();

      let range: { type: "whole" } | { type: "selection" | "section"; from: number; to: number; label?: string } = { type: "whole" };
      if (scope.type === "selection") {
        const sel = editorApi.getSelection();
        if (!sel) {
          toast.info("Select some text first, or switch the scope to the whole resume.");
          return null;
        }
        range = { type: "selection", ...sel };
      } else if (scope.type === "section") {
        const section = findSections(document).find((s) => s.label === scope.label);
        if (!section) {
          toast.info(`Couldn't find the "${scope.label}" section any more.`);
          return null;
        }
        range = { type: "section", from: section.from, to: section.to, label: section.label };
      }

      const history = messages
        .filter((m) => !m.error)
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
      const tempId = `local-${Date.now()}`;
      setMessages((prev) => [...prev, { id: tempId, role: "user", content: instruction }]);
      setLoading(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/ai/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, document, instruction, scope: range, jobDescription, compileLog, history }),
          signal: controller.signal,
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          const error = (body as ApiError | null)?.error;
          const message = error?.message || `The AI command failed (${res.status}).`;
          if (error?.code === "USAGE_LIMIT_REACHED" && /upgrade/i.test(message)) {
            toast.error("AI command limit reached", {
              description: message,
              action: { label: "Upgrade", onClick: () => window.location.assign("/billing") },
            });
          }
          setMessages((prev) => [...prev, { id: `${tempId}-err`, role: "assistant", content: message, error: true }]);
          return false;
        }

        const data = body.data as { messageId: string; message: string; edits: TextEdit[]; skipped: number; remaining: number };
        setRemaining(data.remaining);
        queryClient.invalidateQueries({ queryKey: ["usage"] });

        // The user may have typed while the AI was working.
        const current = editorApi.getDoc();
        const { edits, dropped } = current === document ? { edits: data.edits, dropped: 0 } : rebaseEdits(current, data.edits);
        const note = [
          data.skipped ? `${data.skipped} suggested change${data.skipped > 1 ? "s" : ""} failed the safety checks and ${data.skipped > 1 ? "were" : "was"} skipped.` : "",
          dropped ? `${dropped} change${dropped > 1 ? "s" : ""} no longer matched your text and ${dropped > 1 ? "were" : "was"} skipped.` : "",
        ]
          .filter(Boolean)
          .join(" ");
        const content = note ? `${data.message}\n\n${note}` : data.message;

        let shown = false;
        if (edits.length) {
          shown = onProposal({
            messageId: data.messageId,
            original: current,
            proposed: applyEdits(current, edits),
            instruction,
            autoFix,
            editCount: edits.length,
          });
        }
        setMessages((prev) => [
          ...prev,
          { id: data.messageId, role: "assistant", content, editCount: edits.length, status: shown ? "pending" : null },
        ]);
        return shown;
      } catch (error) {
        if (controller.signal.aborted) return false;
        setMessages((prev) => [
          ...prev,
          { id: `${tempId}-err`, role: "assistant", content: error instanceof Error ? error.message : "The AI command failed.", error: true },
        ]);
        return false;
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setLoading(false);
      }
    },
    [editorApi, loading, messages, projectId, onProposal, queryClient]
  );

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return { messages, loading, remaining, send, cancel, setStatus };
}
