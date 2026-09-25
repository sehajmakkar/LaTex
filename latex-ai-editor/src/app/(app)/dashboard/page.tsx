"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  ArrowRight,
  FileText,
  LayoutTemplate,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  ScanSearch,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Page, PageHeader } from "@/components/shell/Page";
import { IntentHandler } from "@/components/shell/IntentHandler";
import { createBlankProject } from "@/lib/client/actions";
import { useUsage } from "@/hooks/use-usage";

type Project = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
function editedAgo(iso: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

function ResumeTile() {
  return (
    <div className="flex aspect-[4/3] items-start justify-center overflow-hidden rounded-t-xl border-b bg-muted/50 px-8 pt-6">
      <div className="flex h-full w-full max-w-[150px] flex-col gap-1.5 rounded-t-md bg-background p-3 shadow-sm ring-1 ring-border">
        <div className="mx-auto h-1.5 w-1/2 rounded-full bg-foreground/60" />
        <div className="mx-auto mb-1 h-1 w-2/3 rounded-full bg-muted-foreground/30" />
        {[0.9, 0.75, 0.85, 0.6, 0.8, 0.7].map((w, i) => (
          <div key={i} className="h-1 rounded-full bg-muted-foreground/20" style={{ width: `${w * 100}%` }} />
        ))}
      </div>
    </div>
  );
}

function OnboardingChoice({
  icon,
  title,
  description,
  onClick,
  href,
  primary,
  busy,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  href?: string;
  primary?: boolean;
  busy?: boolean;
}) {
  const body = (
    <>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
      </div>
      <div className="flex-1">
        <p className="flex items-center gap-2 font-medium">
          {title}
          {primary && (
            <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background">Recommended</span>
          )}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </>
  );
  const className =
    "group flex w-full items-center gap-4 rounded-2xl border bg-card p-5 text-left transition-colors hover:border-ring/60 disabled:opacity-60";
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} disabled={busy} className={className}>
      {body}
    </button>
  );
}

function ResumesPage() {
  const { isLoaded } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: usage } = useUsage();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refreshUsage = useCallback(() => queryClient.invalidateQueries({ queryKey: ["usage"] }), [queryClient]);

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    fetch("/api/projects")
      .then(async (res) => {
        if (res.status === 401) return router.push("/sign-in");
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (!cancelled) setProjects(json.data ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setProjects([]);
          toast.error("Couldn't load your resumes. Refresh to try again.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, router]);

  const atLimit = usage ? usage.plan === "free" && usage.usage.projects >= usage.limits.projects : false;

  const handleNew = useCallback(async () => {
    if (atLimit) {
      toast.error(`The free plan includes ${usage?.limits.projects} resumes.`, {
        description: "Delete one, or upgrade to Pro for unlimited resumes.",
        action: { label: "Upgrade", onClick: () => router.push("/billing") },
      });
      return;
    }
    setCreating(true);
    try {
      const id = await createBlankProject();
      refreshUsage();
      router.push(`/project/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create the resume");
      setCreating(false);
    }
  }, [atLimit, usage, router, refreshUsage]);

  const handleRename = useCallback(
    async (project: Project) => {
      const name = renameValue.trim();
      setRenamingId(null);
      if (!name || name === project.name) return;
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }).catch(() => null);
      if (!res?.ok) return toast.error("Couldn't rename the resume");
      setProjects((prev) => prev?.map((p) => (p.id === project.id ? { ...p, name, updatedAt: new Date().toISOString() } : p)) ?? null);
    },
    [renameValue]
  );

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const res = await fetch(`/api/projects/${pendingDelete.id}`, { method: "DELETE" }).catch(() => null);
    setDeleting(false);
    if (!res?.ok) return toast.error("Couldn't delete the resume");
    setProjects((prev) => prev?.filter((p) => p.id !== pendingDelete.id) ?? null);
    setPendingDelete(null);
    refreshUsage();
    toast.success("Resume deleted");
  }, [pendingDelete, refreshUsage]);

  const eyebrow = usage
    ? usage.plan === "free"
      ? `Free plan · ${usage.usage.projects} of ${usage.limits.projects} resumes`
      : "Pro plan · unlimited resumes"
    : undefined;

  return (
    <Page>
      <Suspense>
        <IntentHandler />
      </Suspense>
      <PageHeader
        title="Resumes"
        eyebrow={eyebrow}
        description="Your LaTeX resumes. Open one to edit the code, use ⌘K for AI edits, and compile to PDF."
        actions={
          projects && projects.length > 0 ? (
            <>
              <Button variant="outline" asChild>
                <Link href="/templates">
                  <LayoutTemplate className="h-4 w-4" />
                  From a template
                </Link>
              </Button>
              <Button onClick={handleNew} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                New resume
              </Button>
            </>
          ) : null
        }
      />

      {projects === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-[4/3.6] rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="max-w-2xl">
          <h2 className="font-heading text-lg font-semibold">Let&apos;s build your resume</h2>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">Pick how you want to start. You can switch templates later.</p>
          <div className="flex flex-col gap-3">
            <OnboardingChoice
              primary
              href="/templates"
              icon={<LayoutTemplate className="h-5 w-5" />}
              title="Start from a template"
              description="Pick a proven resume layout and fill in your details."
            />
            <OnboardingChoice
              onClick={handleNew}
              busy={creating}
              icon={<FileText className="h-5 w-5" />}
              title="Blank LaTeX resume"
              description="Start from a clean, ATS-friendly one-page layout."
            />
            <OnboardingChoice
              href="/ats"
              icon={<ScanSearch className="h-5 w-5" />}
              title="Check an existing resume"
              description="Upload a PDF or DOCX and get a free ATS score first."
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="group relative flex flex-col rounded-xl border bg-card transition-colors hover:border-ring/60">
              <Link href={`/project/${project.id}`} aria-label={`Open ${project.name}`}>
                <ResumeTile />
              </Link>
              <div className="flex items-center gap-2 p-3">
                <div className="min-w-0 flex-1">
                  {renamingId === project.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRename(project)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(project);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      maxLength={100}
                      aria-label="Resume name"
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring/50"
                    />
                  ) : (
                    <Link href={`/project/${project.id}`} className="block truncate text-sm font-medium hover:underline">
                      {project.name}
                    </Link>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">Edited {editedAgo(project.updatedAt)}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Actions for ${project.name}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/project/${project.id}`}>
                        <FileText className="h-4 w-4" />
                        Open
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setRenameValue(project.name);
                        setRenamingId(project.id);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/ats?project=${project.id}`}>
                        <ScanSearch className="h-4 w-4" />
                        ATS check
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setPendingDelete(project)}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{pendingDelete?.name}&rdquo;?</DialogTitle>
            <DialogDescription>This permanently deletes the resume&apos;s LaTeX source. It can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete resume
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

export default function DashboardPage() {
  return <ResumesPage />;
}
