import { headers } from "next/headers";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

/** The query values sign-in/up care about. */
export function authPageParams(sp: Record<string, string | string[] | undefined>) {
  return { intent: first(sp.intent), redirectUrl: first(sp.redirect_url) };
}

/** Origins that count as "this app" when Clerk hands back an absolute redirect_url. */
export async function ownOrigins(): Promise<string[]> {
  const origins = new Set<string>();
  if (process.env.NEXT_PUBLIC_APP_URL) origins.add(new URL(process.env.NEXT_PUBLIC_APP_URL).origin);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) origins.add(`${h.get("x-forwarded-proto") ?? "https"}://${host}`);
  if (host?.startsWith("localhost")) origins.add(`http://${host}`);
  return [...origins];
}
