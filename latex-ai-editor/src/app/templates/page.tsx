"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileCode2, Loader2, LayoutDashboard } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { UseTemplateDialog } from "@/components/templates/UseTemplateDialog";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import type { TemplateManifest } from "@/types";

export default function TemplatesPage() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateManifest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Failed to fetch");
      const { data } = await res.json();
      setTemplates(data);
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
    (template: TemplateManifest) => {
      if (!isSignedIn) {
        // Redirect to sign-in and then back to templates
        router.push("/sign-in?redirect_url=/templates");
        return;
      }
      setSelectedTemplate(template);
      setDialogOpen(true);
    },
    [isSignedIn, router]
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b border-border bg-background/70 backdrop-blur-md px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={isSignedIn ? "/dashboard" : "/"}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <FileCode2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <h1 className="font-display text-lg font-semibold">Developer resume templates</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isSignedIn ? (
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
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <p className="mb-6 text-sm text-muted-foreground">
          Choose a template to start your tech resume. You can customize your
          contact details and then edit the LaTeX in the editor.
        </p>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading templates...</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
            No templates available.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onUseTemplate={handleUseTemplate}
              />
            ))}
          </div>
        )}
      </main>

      <UseTemplateDialog
        template={selectedTemplate}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
