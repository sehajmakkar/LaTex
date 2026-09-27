"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const imageUrl = template.preview ?? TEMPLATE_IMAGES[template.id] ?? FALLBACK_PREVIEW_IMAGE;
  const [previewOpen, setPreviewOpen] = useState(false);

  const useButton = (className?: string) => (
    <Button size="sm" className={className} onClick={() => onUseTemplate(template)} disabled={isCreating}>
      {isCreating ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Creating…
        </>
      ) : (
        ctaLabel
      )}
    </Button>
  );

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-[border-color,box-shadow] duration-300 hover:border-ring/60 hover:shadow-md">
      {/* Top of the page, framed and cropped (full page in the preview dialog) */}
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        aria-label={`Preview ${template.name}`}
        className="relative block aspect-[4/3] w-full overflow-hidden border-b bg-muted/50 px-[7%] pt-5 text-left"
      >
        <div className="relative aspect-[210/297] w-full overflow-hidden rounded-t-md bg-white shadow-sm ring-1 ring-border transition-transform duration-500 group-hover:-translate-y-1.5">
          <Image
            src={imageUrl}
            alt={`Preview of ${template.name}`}
            fill
            className="object-cover object-top"
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 360px"
          />
        </div>
        {/* Fade where the page is cut off */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[11px] font-medium opacity-0 shadow-sm ring-1 ring-border transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Eye className="h-3 w-3" /> Preview
        </span>
        {template.hasPhoto && (
          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2 py-0.5 text-[10px] text-muted-foreground ring-1 ring-border" title="Photos show as an empty box for now">
            Photo
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-sm font-semibold tracking-tight">{template.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{template.description}</p>
        {template.source && (
          <p className="mt-2 truncate text-[11px] text-muted-foreground">
            by{" "}
            <a href={template.source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
              {template.source.author}
            </a>{" "}
            · {template.source.license}
          </p>
        )}
        <div className="mt-auto flex gap-2 pt-4">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-3.5 w-3.5" /> Preview
          </Button>
          {useButton("flex-1")}
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[92dvh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b px-5 py-4 text-left">
            <DialogTitle>{template.name}</DialogTitle>
            <DialogDescription className="line-clamp-2">{template.description}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(92dvh-9rem)] overflow-y-auto bg-muted/50 p-4 sm:p-6">
            <div className="relative mx-auto aspect-[210/297] w-full max-w-xl overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-border">
              <Image src={imageUrl} alt={`Full page preview of ${template.name}`} fill className="object-contain" sizes="(max-width: 640px) 100vw, 576px" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t px-5 py-3">
            <p className="min-w-0 truncate text-xs text-muted-foreground">
              {template.source ? `by ${template.source.author} · ${template.source.license}` : "Vero template"}
              {template.hasPhoto ? " · photo shows as an empty box for now" : ""}
            </p>
            {useButton("shrink-0")}
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}
