"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LayoutTemplate } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { EmptyState, Page, PageHeader } from "@/components/shell/Page";
import { createProjectFromTemplate } from "@/lib/client/actions";
import { cn } from "@/lib/utils";
import type { TemplateManifest } from "@/types";

const ALL = "All";

export default function TemplatesPage() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const firstName = user?.firstName;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [templates, setTemplates] = useState<TemplateManifest[] | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [filter, setFilter] = useState(ALL);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/templates")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => {
        setTemplates(json.data ?? []);
        setTags(json.tags ?? []);
      })
      .catch(() => setTemplates([]));
  }, []);

  const handleUse = useCallback(
    async (template: TemplateManifest) => {
      if (!isSignedIn) {
        router.push(`/sign-up?intent=${encodeURIComponent(`template:${template.id}`)}`);
        return;
      }
      setCreatingId(template.id);
      try {
        const id = await createProjectFromTemplate(template.id, firstName);
        queryClient.invalidateQueries({ queryKey: ["usage"] });
        router.push(`/project/${id}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        toast.error(message, /limited/i.test(message) ? { action: { label: "Upgrade", onClick: () => router.push("/billing") } } : undefined);
        setCreatingId(null);
      }
    },
    [isSignedIn, firstName, router, queryClient]
  );

  /** "All" shows one section per tag; a tag filter shows just that tag. */
  const sections = useMemo(() => {
    if (!templates) return [];
    if (filter !== ALL) return [{ heading: filter, items: templates.filter((t) => t.tags.includes(filter)) }];
    const seen = new Set<string>();
    const grouped = tags
      .map((tag) => {
        const items = templates.filter((t) => t.tags.includes(tag));
        items.forEach((t) => seen.add(t.id));
        return { heading: tag, items };
      })
      .filter((s) => s.items.length > 0);
    const rest = templates.filter((t) => !seen.has(t.id));
    return rest.length ? [...grouped, { heading: "Other", items: rest }] : grouped;
  }, [templates, tags, filter]);

  return (
    <Page>
      <PageHeader
        title="Templates"
        description={
          isSignedIn
            ? "Pick a layout. It opens in the editor, ready for your details."
            : "Pick a layout. Create a free account and it opens in the editor, ready for your details."
        }
      />

      {tags.length > 0 && (
        <div className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="tablist" aria-label="Filter templates">
          {[ALL, ...tags].map((tag) => (
            <button
              key={tag}
              type="button"
              role="tab"
              aria-selected={filter === tag}
              onClick={() => setFilter(tag)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                filter === tag
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-ring/60 hover:text-foreground"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {templates === null ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-[210/330] rounded-xl" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState icon={<LayoutTemplate className="h-5 w-5" />} title="No templates available" description="Refresh the page to try again." />
      ) : (
        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.heading}>
              {filter === ALL && <h2 className="mb-4 font-heading text-base font-semibold">{section.heading}</h2>}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {section.items.map((template) => (
                  <TemplateCard
                    key={`${section.heading}-${template.id}`}
                    template={template}
                    onUseTemplate={handleUse}
                    isCreating={creatingId === template.id}
                    ctaLabel={isSignedIn ? "Use template" : "Use this template"}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}
