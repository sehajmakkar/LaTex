"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileCode2, FileText, Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { toast } from "sonner";
import { FREE_PROJECT_LIMIT } from "@/lib/constants";

type Project = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.status === 401) {
        router.push("/sign-in");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const { data } = await res.json();
      setProjects(data);
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
    if (projects.length >= FREE_PROJECT_LIMIT) {
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
        body: JSON.stringify({ name: "Untitled Project", content: "" }),
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
  }, [projects.length, router]);

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

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <FileCode2 className="h-5 w-5 text-primary" />
            <span className="font-semibold">LaTeX AI Editor</span>
          </Link>
          <span className="text-sm text-muted-foreground">
            {user?.firstName ?? "User"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/templates">Templates</Link>
          </Button>
          <Button size="sm" onClick={handleNewProject} disabled={creating} className="gap-2">
            <Plus className="h-4 w-4" />
            {creating ? "Creating..." : "New project"}
          </Button>
          <SignOutButton>
            <Button variant="ghost" size="sm">
              Sign out
            </Button>
          </SignOutButton>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Your projects</h1>
            <p className="text-sm text-muted-foreground">
              {projects.length} / {FREE_PROJECT_LIMIT} projects (free)
            </p>
          </div>
        </div>

        {projects.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
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
                  <CardTitle className="truncate text-base">
                    <Link
                      href={`/project/${project.id}`}
                      className="hover:underline"
                    >
                      {project.name}
                    </Link>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
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
