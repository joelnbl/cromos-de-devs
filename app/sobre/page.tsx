import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PackOpener, type PackInfo } from "@/components/PackOpener";
import { openPack } from "@/app/actions";
import { CARD_COLUMNS, type Card } from "@/lib/cards";
import { DEMO_CARDS } from "@/lib/demo";
import { getUser } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { nextPackAt, siteUrl, todayUtc } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.pack.title, robots: { index: false } };
}

/** Día UTC desplazado n días, como "YYYY-MM-DD" (los sobres van por día UTC). */
function dayOffset(today: string, n: number): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export default async function SobrePage() {
  const [{ supabase, user }, { t, locale }] = await Promise.all([getUser(), getT()]);
  const demo = !supabase;
  if (supabase && !user) redirect("/?error=needLogin");

  const today = todayUtc();
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" });
  const dateLabel = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${today}T12:00:00Z`),
  );

  let opened = new Set<string>();
  let todayIds: number[] = [];
  let cards: Pick<Card, "id" | "country">[] = DEMO_CARDS;
  let owned: Record<number, number> = {};
  let offers: PackInfo["offers"] = [];
  let todayCards: Card[] = [];

  if (supabase && user) {
    const [{ data: openings }, { data: all }, { data: mine }, { data: trades }] = await Promise.all([
      supabase
        .from("pack_openings")
        .select("opened_on, card_ids")
        .eq("user_id", user.id)
        .gte("opened_on", dayOffset(today, -90))
        .order("opened_on", { ascending: false }),
      supabase.from("cards").select("id, country").limit(2000),
      supabase.from("collection").select("card_id, quantity").eq("user_id", user.id),
      supabase.from("trades").select("from_user, offer_card_id, want_card_id").eq("status", "abierto").limit(300),
    ]);
    opened = new Set((openings ?? []).map((o) => o.opened_on as string));
    todayIds = ((openings ?? []).find((o) => o.opened_on === today)?.card_ids as number[] | null) ?? [];
    cards = (all ?? []) as Pick<Card, "id" | "country">[];
    owned = Object.fromEntries((mine ?? []).map((m) => [m.card_id as number, m.quantity as number]));
    offers = (trades ?? [])
      .filter((tr) => tr.from_user !== user.id)
      .map((tr) => ({ offer: tr.offer_card_id as number, want: tr.want_card_id as number }));
    if (todayIds.length) {
      const { data } = await supabase.from("cards").select(CARD_COLUMNS).in("id", todayIds);
      const byId = new Map(((data ?? []) as Card[]).map((c) => [c.id, c]));
      todayCards = todayIds.map((id) => byId.get(id)).filter((c): c is Card => Boolean(c));
    }
  }

  // Racha: días seguidos hasta hoy (o hasta ayer si hoy aún no lo abrió)
  let streak = 0;
  for (let i = opened.has(today) ? 0 : 1; opened.has(dayOffset(today, -i)); i++) streak++;
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = dayOffset(today, i - 6);
    return { label: weekday.format(new Date(`${day}T12:00:00Z`)), done: opened.has(day), today: day === today };
  });

  const info: PackInfo = {
    dateLabel,
    streak,
    week,
    owned,
    countryOf: Object.fromEntries(cards.filter((c) => c.country).map((c) => [c.id, c.country as string])),
    total: cards.length,
    offers,
    todayCards,
    site: siteUrl(),
  };

  return (
    <main className="min-h-[calc(100dvh-68px)] bg-ink pb-20 md:pb-0">
      <h1 className="sr-only">{t.pack.title}</h1>
      <PackOpener
        demo={demo}
        openedToday={opened.has(today)}
        nextAt={nextPackAt().toISOString()}
        open={demo ? undefined : openPack}
        info={info}
      />
    </main>
  );
}
