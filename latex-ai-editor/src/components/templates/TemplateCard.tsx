"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { TemplateManifest } from "@/types";

const TEMPLATE_PREVIEW_IMAGE =
  "https://res.cloudinary.com/drrvrit9i/image/upload/v1771757683/resume-demo_prcwka.png";

type TemplateCardProps = {
  template: TemplateManifest;
  onUseTemplate: (template: TemplateManifest) => void;
};

export function TemplateCard({ template, onUseTemplate }: TemplateCardProps) {
  return (
    <article className="group flex h-full flex-col rounded-md border border-border bg-card hover:border-ring/50 transition-all duration-300 overflow-hidden">
      {/* Preview image */}
      <div className="relative w-full shrink-0 overflow-hidden max-h-96">
        <div className="relative aspect-210/297 w-full">
          <Image
            src={TEMPLATE_PREVIEW_IMAGE}
            alt={`Preview of ${template.name} resume`}
            fill
            className="object-cover object-top transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      </div>

      {/* Content below image */}
      <div className="flex flex-1 flex-col p-3">
        <h3 className="font-display text-sm font-semibold tracking-tight">
          {template.name}
        </h3>
        <p className="line-clamp-2 text-xs text-muted-foreground mt-0.5 mb-2">
          {template.description}
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-auto w-full h-7 text-xs flex items-center justify-center"
          onClick={() => onUseTemplate(template)}
        >
          Use template
        </Button>
      </div>
    </article>
  );
}