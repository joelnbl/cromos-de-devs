export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** Siguiente reparto de sobres: medianoche UTC. */
export function nextPackAt(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

export function todayUtc(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function safeNext(next: string | null | undefined, fallback = "/sobre"): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
