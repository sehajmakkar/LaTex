"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TemplateManifest, TemplateVariable } from "@/types";
import { toast } from "sonner";

type UseTemplateDialogProps = {
  template: TemplateManifest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DEFAULT_VALUES: Record<string, string> = {
  name: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  github: "",
  website: "",
};

export function UseTemplateDialog({
  template,
  open,
  onOpenChange,
}: UseTemplateDialogProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(DEFAULT_VALUES);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!template) return;

    const required = template.variables.filter((v) => v.required);
    const missing = required.filter((v) => !values[v.key]?.trim());
    if (missing.length > 0) {
      toast.error("Missing required fields", {
        description: missing.map((v) => v.label).join(", "),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const contentRes = await fetch(`/api/templates/${template.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variables: values }),
      });
      if (!contentRes.ok) {
        const err = await contentRes.json();
        throw new Error(err.error?.message ?? "Failed to get template");
      }
      const { data: contentData } = await contentRes.json();

      const projectRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${template.name} - ${values.name || "Resume"}`,
          content: contentData.content,
          templateId: template.id,
        }),
      });
      if (!projectRes.ok) {
        const err = await projectRes.json();
        throw new Error(err.error?.message ?? "Failed to create project");
      }
      const { data: project } = await projectRes.json();

      toast.success("Project created");
      onOpenChange(false);
      setValues(DEFAULT_VALUES);
      router.push(`/project/${project.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [template, values, onOpenChange, router]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setValues(DEFAULT_VALUES);
      onOpenChange(next);
    },
    [onOpenChange]
  );

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customize your resume</DialogTitle>
          <DialogDescription>
            Fill in your details. They will be used to personalize the{" "}
            <strong>{template.name}</strong> template.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {template.variables.map((variable: TemplateVariable) => (
            <div key={variable.key} className="grid gap-2">
              <Label htmlFor={variable.key}>
                {variable.label}
                {variable.required && (
                  <span className="text-destructive ml-0.5">*</span>
                )}
              </Label>
              <Input
                id={variable.key}
                value={values[variable.key] ?? ""}
                onChange={(e) => handleChange(variable.key, e.target.value)}
                placeholder={variable.placeholder}
                className="font-mono text-sm"
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
