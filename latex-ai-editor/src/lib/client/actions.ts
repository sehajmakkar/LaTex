"use client";

import { DEFAULT_LATEX_CONTENT } from "@/lib/constants";

type ApiError = { error?: { code?: string; message?: string } };

/** An API error with its code (e.g. PROJECT_LIMIT_REACHED), so callers can offer the right action. */
export class ApiRequestError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
  }
}

async function readError(res: Response, fallback: string): Promise<never> {
  const body = (await res.json().catch(() => null)) as ApiError | null;
  throw new ApiRequestError(body?.error?.message ?? fallback, body?.error?.code);
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

/** Copies a resume; returns the new project's id and name. */
export async function duplicateProject(id: string, name?: string): Promise<{ id: string; name: string; createdAt: string; updatedAt: string }> {
  const res = await fetch(`/api/projects/${id}/duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(name ? { name } : {}),
  });
  if (!res.ok) await readError(res, "Couldn't copy the resume");
  return (await res.json()).data;
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

/** Opens Dodo's customer portal (cancel, card, invoices). */
export async function openBillingPortal(): Promise<void> {
  const res = await fetch("/api/billing/portal", { method: "POST" });
  if (!res.ok) await readError(res, "Couldn't open the billing portal");
  const url = (await res.json()).data?.url as string | undefined;
  if (!url) throw new Error("Couldn't open the billing portal");
  window.location.href = url;
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
