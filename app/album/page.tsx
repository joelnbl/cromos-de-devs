import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlbumGrid } from "@/components/AlbumGrid";
import { CARD_COLUMNS, countryName, type Card } from "@/lib/cards";
import { getT } from "@/lib/i18n/server";
import { DEMO_CARDS } from "@/lib/demo";
import { getUser } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.album.title };
}

type Search = { lenguaje?: string; pais?: string };

export default async function AlbumPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { lenguaje, pais } = await searchParams;
  const [{ supabase, user }, { t, locale }] = await Promise.all([getUser(), getT()]);
  if (supabase && !user) redirect("/?error=needLogin");
  const country = (c: string) => countryName(c, locale, t.myCard.otherCountry);

  let cards: Card[] = [];
  let owned = new Map<number, number>();
  let languages: string[] = [];
  let countries: string[] = [];

  if (!supabase || !user) {
    cards = DEMO_CARDS;
    owned = new Map(DEMO_CARDS.filter((_, i) => i % 3 !== 1).map((c) => [c.id, c.id === 42 ? 2 : 1]));
  } else {
    let query = supabase.from("cards").select(CARD_COLUMNS).order("id").limit(240);
    if (lenguaje) query = query.eq("top_language", lenguaje);
    if (pais) query = query.eq("country", pais);
    const [{ data: c }, { data: mine }, { data: facets }] = await Promise.all([
      query,
      supabase.from("collection").select("card_id, quantity").eq("user_id", user.id),
      supabase.from("cards").select("top_language, country").limit(2000),
    ]);
    cards = (c ?? []) as Card[];
    owned = new Map((mine ?? []).map((m) => [m.card_id as number, m.quantity as number]));
    languages = [...new Set((facets ?? []).map((f) => f.top_language).filter(Boolean) as string[])].sort();
    countries = [...new Set((facets ?? []).map((f) => f.country).filter(Boolean) as string[])].sort();
  }

  if (!supabase) {
    languages = [...new Set(DEMO_CARDS.map((c) => c.top_language!))].sort();
    countries = [...new Set(DEMO_CARDS.map((c) => c.country!))].sort();
    if (lenguaje) cards = cards.filter((c) => c.top_language === lenguaje);
    if (pais) cards = cards.filter((c) => c.country === pais);
  }

  const have = cards.filter((c) => owned.has(c.id)).length;
  const title = pais ? t.album.selection(country(pais)) : lenguaje ? t.album.collection(lenguaje) : t.album.complete;
  const pct = cards.length ? Math.round((have / cards.length) * 100) : 0;

  return (
    <main className="min-h-dvh bg-paper pb-24 md:pb-12">
      <div className="border-b-[3px] border-ink bg-sun">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <p className="font-mono text-sm font-bold uppercase">{title}</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="display text-6xl">{t.album.title}</h1>
            <p className="font-mono text-2xl font-bold">
              {have} / {cards.length}
            </p>
          </div>
          <div
            className="mt-3 h-4 overflow-hidden rounded-full border-2 border-ink bg-white"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t.album.progressAria}
          >
            <div className="h-full bg-ink transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4">
        <nav aria-label={t.album.albumsAria} className="flex gap-2 overflow-x-auto py-4">
          <Link href="/album" className="chip" aria-current={!lenguaje && !pais ? "page" : undefined}>
            {t.album.all}
          </Link>
          {countries.map((c) => (
            <Link key={c} href={`/album?pais=${c}`} className="chip" aria-current={pais === c ? "page" : undefined}>
              {country(c)}
            </Link>
          ))}
          {languages.map((l) => (
            <Link
              key={l}
              href={`/album?lenguaje=${encodeURIComponent(l)}`}
              className="chip"
              aria-current={lenguaje === l ? "page" : undefined}
            >
              {l}
            </Link>
          ))}
        </nav>

        <AlbumGrid cards={cards} owned={Object.fromEntries(owned)} />
      </div>
    </main>
  );
}
