import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/env";
import { siteUrl } from "@/lib/site";

export const revalidate = 3600;

const MAX_CARDS = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const entries: MetadataRoute.Sitemap = [{ url: `${base}/`, changeFrequency: "daily", priority: 1 }];
  if (!isSupabaseConfigured) return entries;

  // Cliente anónimo sin cookies: así el sitemap se puede cachear y revalidar cada hora.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await supabase
    .from("cards")
    .select("login")
    .order("owners", { ascending: false })
    .limit(MAX_CARDS);

  for (const row of (data ?? []) as { login: string }[]) {
    if (!/^[A-Za-z0-9-]{1,39}$/.test(row.login)) continue;
    entries.push({ url: `${base}/c/${row.login}`, changeFrequency: "weekly", priority: 0.6 });
  }
  return entries;
}
