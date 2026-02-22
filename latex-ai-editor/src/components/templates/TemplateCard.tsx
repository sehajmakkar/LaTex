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
    <article className="group flex h-full flex-col rounded-xs">
      {/* Preview image */}
      <div className="relative w-full shrink-0 overflow-hidden shadow-xl">
        <div className="relative aspect-[210/297] w-full">
          <Image
            src={TEMPLATE_PREVIEW_IMAGE}
            alt={`Preview of ${template.name} resume`}
            fill
            className="object-cover object-top"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      </div>

      {/* Content below image */}
      <div className="flex flex-1 flex-col p-1 pt-2">
        <h3 className="text-base font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          {template.name}
        </h3>
        <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
          {template.description}
        </p>
        <Button
          variant="default"
          size="sm"
          className="mt-3 w-full"
          onClick={() => onUseTemplate(template)}
        >
          Use template
        </Button>
      </div>
    </article>
  );
}