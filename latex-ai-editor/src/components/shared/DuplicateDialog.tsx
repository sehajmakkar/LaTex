"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiRequestError, duplicateProject } from "@/lib/client/actions";
import { MAX_PROJECT_NAME } from "@/lib/project-names";

export type DuplicatedProject = Awaited<ReturnType<typeof duplicateProject>>;

type DuplicateDialogProps = {
  /** The resume to copy; null closes the dialog. */
  source: { id: string; name: string } | null;
  /** Pre-filled name, e.g. "Resume (copy)". */
  suggestedName: string;
  onClose: () => void;
  /** Runs before copying (e.g. save pending edits). Return false to cancel. */
  beforeCopy?: () => Promise<boolean>;
  onCopied: (project: DuplicatedProject) => void;
};

/** "Make a copy" (as in Overleaf): name the copy, then create it. */
export function DuplicateDialog({ source, suggestedName, onClose, beforeCopy, onCopied }: DuplicateDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(suggestedName);
  const [busy, setBusy] = useState(false);
  const [lastSource, setLastSource] = useState(source);
  // Reset the field each time the dialog opens for a resume.
  if (source !== lastSource) {
    setLastSource(source);
    setName(suggestedName);
  }

  const submit = async () => {
    if (!source || busy) return;
    setBusy(true);
    try {
      if (beforeCopy && !(await beforeCopy())) return;
      const project = await duplicateProject(source.id, name.trim() || undefined);
      onCopied(project);
      onClose();
    } catch (error) {
      const limit = error instanceof ApiRequestError && error.code === "PROJECT_LIMIT_REACHED";
      toast.error(limit ? "Resume limit reached" : "Couldn't copy the resume", {
        description: error instanceof Error ? error.message : undefined,
        action: limit ? { label: "Upgrade", onClick: () => router.push("/billing") } : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!source} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make a copy</DialogTitle>
          <DialogDescription>
            Copies the LaTeX of &ldquo;{source?.name}&rdquo; into a new resume, e.g. to tailor it for another job. The AI chat and version
            history stay with the original.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="copy-name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="copy-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            maxLength={MAX_PROJECT_NAME}
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
              Make a copy
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
