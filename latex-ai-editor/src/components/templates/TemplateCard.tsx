"use client";

import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative w-full aspect-[3/4] max-h-52 shrink-0 bg-muted/50">
        <Image
          src={TEMPLATE_PREVIEW_IMAGE}
          alt={`Preview of ${template.name} resume`}
          fill
          className="object-contain"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
      <CardHeader className="pb-1 pt-3">
        <CardTitle className="text-base">{template.name}</CardTitle>
        <CardDescription className="line-clamp-1 text-xs">
          {template.description}
        </CardDescription>
      </CardHeader>
      <CardFooter className="pt-2">
        <Button
          variant="default"
          size="sm"
          className="w-full"
          onClick={() => onUseTemplate(template)}
        >
          Use template
        </Button>
      </CardFooter>
    </Card>
  );
}
