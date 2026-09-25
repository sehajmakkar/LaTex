"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TemplateManifest } from "@/types";

const FALLBACK_PREVIEW_IMAGE =
  "https://res.cloudinary.com/drrvrit9i/image/upload/v1771757683/resume-demo_prcwka.png";

const TEMPLATE_IMAGES: Record<string, string> = {
  "academic": "/templates/academic-template.jpg",
  "chicago": "/templates/chicago-template.jpg",
  "classic": "/templates/classic-template.jpg",
  "geometric": "/templates/geometric-template.avif",
  "milano": "/templates/milano-template.jpg",
  "project-highlights": "/templates/project-highlights-template.jpg",
  "scholarly": "/templates/scholarly-template.jpg",
  "simple": "/templates/simple-template.jpg",
  "technical": "/templates/technical-template.jpg",
};

type TemplateCardProps = {
  template: TemplateManifest;
  onUseTemplate: (template: TemplateManifest) => void;
  isCreating?: boolean;
  ctaLabel?: string;
};

export function TemplateCard({ template, onUseTemplate, isCreating, ctaLabel = "Use template" }: TemplateCardProps) {
  const imageUrl = TEMPLATE_IMAGES[template.id] || FALLBACK_PREVIEW_IMAGE;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors duration-300 hover:border-ring/60">
      {/* Preview image */}
      <div className="relative max-h-96 w-full shrink-0 overflow-hidden border-b bg-muted/40">
        <div className="relative aspect-210/297 w-full">
          <Image
            src={imageUrl}
            alt={`Preview of ${template.name} resume`}
            fill
            className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      </div>

      {/* Content below image */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-sm font-semibold tracking-tight">
          {template.name}
        </h3>
        <p className="mb-3 mt-1 line-clamp-2 text-xs text-muted-foreground">
          {template.description}
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-auto h-8 w-full text-xs"
          onClick={() => onUseTemplate(template)}
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Creating...
            </>
          ) : (
            ctaLabel
          )}
        </Button>
      </div>
    </article>
  );
}