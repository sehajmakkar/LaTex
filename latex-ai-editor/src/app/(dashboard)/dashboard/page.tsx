"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileCode2, FileText, Plus, Loader2, Trash2, Pencil, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { FREE_PROJECT_LIMIT, DEFAULT_LATEX_CONTENT } from "@/lib/constants";
import { DashboardNav } from "@/components/shared/DashboardNav";

type Project = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export default function DashboardPage() {
  const { isLoaded } = useUser();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [plan, setPlan] = useState<string>("free");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.status === 401) {
        router.push("/sign-in");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setProjects(json.data ?? []);
      setPlan(json.plan ?? "free");
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (isLoaded) {
      fetchProjects();
    }
  }, [isLoaded, fetchProjects]);

  const handleNewProject = useCallback(async () => {
    if (plan === "free" && projects.length >= FREE_PROJECT_LIMIT) {
      toast.error(
        `Free accounts are limited to ${FREE_PROJECT_LIMIT} projects. Delete one to create a new one.`
      );
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Untitled Project",
          content: DEFAULT_LATEX_CONTENT,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.code === "PROJECT_LIMIT_REACHED") {
          toast.error(data.error.message);
        } else {
          toast.error(data.error?.message ?? "Failed to create project");
        }
        return;
      }
      router.push(`/project/${data.data.id}`);
    } catch {
      toast.error("Failed to create project");
    } finally {
      setCreating(false);
    }
  }, [plan, projects.length, router]);

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete");
        setProjects((prev) => prev.filter((p) => p.id !== id));
        toast.success("Project deleted");
      } catch {
        toast.error("Failed to delete project");
      } finally {
        setDeletingId(null);
      }
    },
    []
  );

  const handleStartRename = useCallback((project: Project) => {
    setEditingId(project.id);
    setEditName(project.name);
  }, []);

  const handleRename = useCallback(
    async (id: string) => {
      const name = editName.trim();
      setEditingId(null);
      if (!name || name === projects.find((p) => p.id === id)?.name) return;
      try {
        const res = await fetch(`/api/projects/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error("Failed to rename");
        setProjects((prev) =>
          prev.map((p) => (p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p))
        );
        toast.success("Project renamed");
      } catch {
        toast.error("Failed to rename project");
      }
    },
    [editName, projects]
  );

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardNav
        rightContent={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/billing" className="gap-2">
                <CreditCard className="h-3.5 w-3.5" />
                Billing
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/templates">Templates</Link>
            </Button>
            <Button size="sm" onClick={handleNewProject} disabled={creating} className="gap-2">
              <Plus className="h-4 w-4" />
              {creating ? "Creating..." : "New project"}
            </Button>
          </>
        }
      />

      <main className="flex-1 overflow-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold">Your projects</h1>
            <p className="text-sm text-muted-foreground">
              {plan === "free"
                ? `${projects.length} / ${FREE_PROJECT_LIMIT} projects`
                : `${projects.length} projects`}
            </p>
          </div>
        </div>

        {projects.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                No projects yet
              </CardTitle>
              <CardDescription>
                Create a blank project or start from a resume template.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button onClick={handleNewProject} disabled={creating} className="gap-2">
                <Plus className="h-4 w-4" />
                New project
              </Button>
              <Button variant="outline" asChild>
                <Link href="/templates">Browse templates</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    {editingId === project.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => handleRename(project.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(project.id);
                          if (e.key === "Escape") {
                            setEditingId(null);
                            setEditName("");
                          }
                        }}
                        className="flex-1 min-w-0 rounded-xl border border-input bg-background px-2 py-1 text-sm font-medium ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring/50"
                        autoFocus
                      />
                    ) : (
                      <>
                        <CardTitle className="truncate text-base">
                          <Link
                            href={`/project/${project.id}`}
                            className="hover:text-foreground/70 transition-colors"
                          >
                            {project.name}
                          </Link>
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={(e) => {
                            e.preventDefault();
                            handleStartRename(project);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 hover:text-destructive"
                    onClick={() => handleDelete(project.id)}
                    disabled={deletingId === project.id}
                  >
                    {deletingId === project.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </CardHeader>
                <CardContent className="mt-auto pt-0">
                  <Button variant="secondary" size="sm" className="w-full" asChild>
                    <Link href={`/project/${project.id}`}>Open</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
