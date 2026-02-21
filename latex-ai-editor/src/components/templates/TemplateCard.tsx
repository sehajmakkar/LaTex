"use client";

import { FileCode2 } from "lucide-react";
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

type TemplateCardProps = {
  template: TemplateManifest;
  onUseTemplate: (template: TemplateManifest) => void;
};

export function TemplateCard({ template, onUseTemplate }: TemplateCardProps) {
  return (
    <Card className="flex flex-col transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileCode2 className="h-6 w-6" />
        </div>
        <CardTitle className="text-base">{template.name}</CardTitle>
        <CardDescription className="line-clamp-2 text-xs">
          {template.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {template.category}
        </span>
      </CardContent>
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
