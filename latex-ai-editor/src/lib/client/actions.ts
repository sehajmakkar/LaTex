"use client";

import { DEFAULT_LATEX_CONTENT } from "@/lib/constants";

type ApiError = { error?: { code?: string; message?: string } };

async function readError(res: Response, fallback: string): Promise<never> {
  const body = (await res.json().catch(() => null)) as ApiError | null;
  throw new Error(body?.error?.message ?? fallback);
}

/** Creates a project and returns its id. */
export async function createProject(input: { name: string; content: string; templateId?: string | null }): Promise<string> {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await readError(res, "Failed to create the resume");
  return (await res.json()).data.id as string;
}

export function createBlankProject() {
  return createProject({ name: "Untitled resume", content: DEFAULT_LATEX_CONTENT });
}

/** Creates a project from a template (raw content, the user fills it in the editor). */
export async function createProjectFromTemplate(templateId: string, ownerName?: string | null): Promise<string> {
  const res = await fetch(`/api/templates/${encodeURIComponent(templateId)}`);
  if (!res.ok) await readError(res, "That template isn't available");
  const template = (await res.json()).data as { name: string; content: string };
  return createProject({
    name: ownerName ? `${template.name} – ${ownerName}` : template.name,
    content: template.content,
    templateId,
  });
}

/** Starts Dodo checkout for Pro and navigates to it. */
export async function startProCheckout(): Promise<void> {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan: "pro" }),
  });
  if (!res.ok) await readError(res, "Couldn't start checkout");
  const url = (await res.json()).data?.checkout_url as string | undefined;
  if (!url) throw new Error("Couldn't start checkout");
  window.location.href = url;
}
