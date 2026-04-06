"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileCode2,
  Loader2,
  LayoutDashboard,
  ChevronDown,
  Check,
} from "lucide-react";
import { useAuth, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { DashboardNav } from "@/components/shared/DashboardNav";
import { toast } from "sonner";
import type { TemplateManifest } from "@/types";

const ALL_FILTER = "All";

export default function TemplatesPage() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateManifest[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState("Top Picks");
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setTemplates(json.data);
      if (json.tags) setTags(json.tags);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleUseTemplate = useCallback(
    async (template: TemplateManifest) => {
      if (!isSignedIn) {
        router.push("/sign-in?redirect_url=/templates");
        return;
      }

      setCreatingId(template.id);
      try {
        // Fetch raw template content (no variable substitution)
        const contentRes = await fetch(`/api/templates/${template.id}`);
        if (!contentRes.ok) {
          const err = await contentRes.json();
          throw new Error(err.error?.message ?? "Failed to get template");
        }
        const { data: templateData } = await contentRes.json();

        // Use user's profile name for the project name
        const userName = user?.fullName || user?.firstName || "Resume";
        const projectRes = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${template.name} - ${userName}`,
            content: templateData.content,
            templateId: template.id,
          }),
        });
        if (!projectRes.ok) {
          const err = await projectRes.json();
          throw new Error(err.error?.message ?? "Failed to create project");
        }
        const { data: project } = await projectRes.json();

        toast.success("Project created from template");
        router.push(`/project/${project.id}`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Something went wrong"
        );
      } finally {
        setCreatingId(null);
      }
    },
    [isSignedIn, user, router]
  );

  /** Group templates by each tag they belong to (preserving tag order). */
  const groupedSections = useMemo(() => {
    if (activeFilter !== ALL_FILTER) {
      const filtered = templates.filter((t) =>
        t.tags.includes(activeFilter)
      );
      return [{ heading: activeFilter, templates: filtered }];
    }

    // "All" → show every tag as a section, then an "Other" bucket
    const seen = new Set<string>();
    const sections: { heading: string; templates: TemplateManifest[] }[] = [];

    for (const tag of tags) {
      const matching = templates.filter((t) => t.tags.includes(tag));
      if (matching.length > 0) {
        sections.push({ heading: tag, templates: matching });
        matching.forEach((t) => seen.add(t.id));
      }
    }

    const uncategorized = templates.filter((t) => !seen.has(t.id));
    if (uncategorized.length > 0) {
      sections.push({ heading: "Other", templates: uncategorized });
    }

    return sections;
  }, [templates, tags, activeFilter]);

  const filterOptions = [ALL_FILTER, ...tags];

  const leftContent = (
    <>
      <Button variant="ghost" size="icon" asChild>
        <Link href={isSignedIn ? "/dashboard" : "/"}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
          <FileCode2 className="h-4 w-4 text-muted-foreground" />
        </div>
        <span className="font-display font-semibold">TeXel</span>
      </div>
    </>
  );

  const rightContent = isSignedIn ? (
    <Button variant="outline" size="sm" asChild>
      <Link href="/dashboard">Back to projects</Link>
    </Button>
  ) : (
    <Button size="sm" asChild className="gap-2">
      <Link href="/sign-in?redirect_url=/templates">
        <LayoutDashboard className="h-4 w-4" />
        Sign in
      </Link>
    </Button>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardNav leftContent={leftContent} rightContent={rightContent} />

      <main className="flex-1 overflow-auto p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="font-display text-xl font-semibold">
            Resume Templates
          </h1>
          {tags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0 text-xs"
                >
                  {activeFilter}
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                {filterOptions.map((option) => (
                  <DropdownMenuItem
                    key={option}
                    onClick={() => setActiveFilter(option)}
                    className="flex items-center justify-between text-sm"
                  >
                    {option}
                    {activeFilter === option && (
                      <Check className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Choose a template to get started. Clicking &ldquo;Use template&rdquo; will
          create a project and open it directly in the editor.
        </p>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Loading templates...
            </span>
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
            No templates available.
          </div>
        ) : (
          <div className="space-y-8">
            {groupedSections.map((section) => (
              <section key={section.heading}>
                <h2 className="mb-3 font-display text-base font-semibold tracking-tight text-foreground">
                  {section.heading}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {section.templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onUseTemplate={handleUseTemplate}
                      isCreating={creatingId === template.id}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>


    </div>
  );
}
