import type { SupabaseClient } from "@supabase/supabase-js";
import type { Card } from "@/lib/cards";
import { todayUtc } from "@/lib/site";

export type BadgeKey =
  | "streak3"
  | "streak7"
  | "packs10"
  | "firstTrade"
  | "trades5"
  | "firstGift"
  | "album25"
  | "epic"
  | "legend"
  | "owners5"
  | "team";

export type Badge = { key: BadgeKey; earned: boolean; progress: string };

function dayOffset(today: string, n: number): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Insignias calculadas al vuelo con datos existentes (no se guarda nada). */
export async function getBadges(
  supabase: SupabaseClient,
  userId: string,
  myCard: Pick<Card, "owners">,
): Promise<Badge[]> {
  const today = todayUtc();
  const [{ data: openings }, { count: packCount }, { data: mine }, { data: all }, { data: trades }] = await Promise.all([
    supabase.from("pack_openings").select("opened_on").eq("user_id", userId).gte("opened_on", dayOffset(today, -90)),
    supabase.from("pack_openings").select("opened_on", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("collection").select("card_id, quantity").eq("user_id", userId),
    supabase.from("cards").select("id, country, rarity").limit(2000),
    supabase
      .from("trades")
      .select("from_user, want_card_id")
      .eq("status", "hecho")
      .or(`from_user.eq.${userId},accepted_by.eq.${userId}`)
      .limit(500),
  ]);

  // Racha máxima de los últimos 90 días
  const opened = new Set((openings ?? []).map((o) => o.opened_on as string));
  let best = 0;
  let run = 0;
  for (let i = -90; i <= 0; i++) {
    run = opened.has(dayOffset(today, i)) ? run + 1 : 0;
    if (run > best) best = run;
  }

  const ownedIds = new Set((mine ?? []).filter((m) => (m.quantity as number) > 0).map((m) => m.card_id as number));
  const cards = (all ?? []) as Pick<Card, "id" | "country" | "rarity">[];
  const total = cards.length;
  const albumPct = total ? Math.floor((ownedIds.size / total) * 100) : 0;
  const ownedCards = cards.filter((c) => ownedIds.has(c.id));
  const hasEpic = ownedCards.some((c) => c.rarity === "epica" || c.rarity === "legendaria" || c.rarity === "icono");
  const hasLegend = ownedCards.some((c) => c.rarity === "legendaria" || c.rarity === "icono");

  // Selección completa: todos los cromos de un país (mínimo 2)
  const byCountry = new Map<string, { have: number; all: number }>();
  for (const c of cards) {
    if (!c.country) continue;
    const e = byCountry.get(c.country) ?? { have: 0, all: 0 };
    e.all++;
    if (ownedIds.has(c.id)) e.have++;
    byCountry.set(c.country, e);
  }
  const teams = [...byCountry.values()].filter((e) => e.all >= 2);
  const teamDone = teams.some((e) => e.have === e.all);
  const teamBest = teams.reduce((m, e) => Math.max(m, e.all - e.have > 0 ? e.have / e.all : 1), 0);

  const doneTrades = trades ?? [];
  const nTrades = doneTrades.length;
  const gifts = doneTrades.filter((tr) => tr.from_user === userId && tr.want_card_id == null).length;
  const cap = (n: number, max: number) => `${Math.min(n, max)}/${max}`;

  return [
    { key: "streak3", earned: best >= 3, progress: cap(best, 3) },
    { key: "streak7", earned: best >= 7, progress: cap(best, 7) },
    { key: "packs10", earned: (packCount ?? 0) >= 10, progress: cap(packCount ?? 0, 10) },
    { key: "firstTrade", earned: nTrades >= 1, progress: cap(nTrades, 1) },
    { key: "trades5", earned: nTrades >= 5, progress: cap(nTrades, 5) },
    { key: "firstGift", earned: gifts >= 1, progress: cap(gifts, 1) },
    { key: "album25", earned: albumPct >= 25, progress: `${Math.min(albumPct, 25)}/25 %` },
    { key: "epic", earned: hasEpic, progress: hasEpic ? "1/1" : "0/1" },
    { key: "legend", earned: hasLegend, progress: hasLegend ? "1/1" : "0/1" },
    { key: "owners5", earned: myCard.owners >= 5, progress: cap(myCard.owners, 5) },
    { key: "team", earned: teamDone, progress: teamDone ? "100 %" : `${Math.floor(teamBest * 100)} %` },
  ];
}
