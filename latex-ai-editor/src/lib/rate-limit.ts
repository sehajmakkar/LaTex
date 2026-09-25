/**
 * Best-effort sliding-window limiter kept in memory. On Vercel each warm
 * instance has its own window, so this only blunts bursts from one client; the
 * monthly quota in the database is the real cap. (A shared store such as
 * Upstash Redis arrives with the anonymous ATS limits in Phase 4.)
 */
const windows = new Map<string, number[]>();

export function allowRequest(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (windows.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    windows.set(key, recent);
    return false;
  }
  recent.push(now);
  windows.set(key, recent);
  if (windows.size > 10_000) windows.clear(); // bound memory on a long-lived instance
  return true;
}
