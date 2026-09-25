/**
 * "Intents" let the landing site deep-link into the app and have the action
 * survive sign-up, e.g. https://app.example.com/sign-up?intent=template:chicago
 * Only whitelisted values are accepted, so an intent can never become an open
 * redirect.
 */
export type Intent =
  | { kind: "start" }
  | { kind: "ats" }
  | { kind: "pro" }
  | { kind: "template"; templateId: string };

export function parseIntent(raw: string | null | undefined): Intent | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (value === "start" || value === "ats" || value === "pro") return { kind: value };
  const template = /^template:([a-z0-9-]{1,64})$/.exec(value);
  if (template) return { kind: "template", templateId: template[1] };
  return null;
}

export function serializeIntent(intent: Intent): string {
  return intent.kind === "template" ? `template:${intent.templateId}` : intent.kind;
}

/** Where to go after sign-in/up: the dashboard, which carries out the intent. */
export function postAuthPath(intent: Intent | null): string {
  return intent ? `/dashboard?intent=${encodeURIComponent(serializeIntent(intent))}` : "/dashboard";
}

/** Accepts only same-site relative paths (Clerk's redirect_url), never "//host". */
export function safeRelativePath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  return raw;
}

/**
 * Clerk sends users back with redirect_url, sometimes as an absolute URL on our
 * own origin. Keep only the path (and query) if the origin is ours.
 */
export function sameSiteRedirect(raw: string | null | undefined, ownOrigins: string[]): string | null {
  const relative = safeRelativePath(raw);
  if (relative) return relative;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return ownOrigins.includes(url.origin) ? safeRelativePath(`${url.pathname}${url.search}`) : null;
  } catch {
    return null;
  }
}

/** Where sign-in/up should land: an intent wins, then a same-site redirect, then the dashboard. */
export function resolvePostAuth(params: { intent?: string | null; redirectUrl?: string | null }, ownOrigins: string[]): string {
  const intent = parseIntent(params.intent);
  if (intent) return postAuthPath(intent);
  return sameSiteRedirect(params.redirectUrl, ownOrigins) ?? "/dashboard";
}
