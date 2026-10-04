import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Cromo } from "@/components/Cromo";
import { CARD_COLUMNS, cardNumber, countryName, type Card } from "@/lib/cards";
import { DEMO_CARDS } from "@/lib/demo";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t.ranking.metaTitle,
    description: t.ranking.metaDescription,
    alternates: { canonical: "/ranking" },
    robots: { index: true, follow: true },
  };
}

type Search = { pais?: string; lenguaje?: string };

const TOP = 50;
const POOL = 400;

const byOwners = (a: Card, b: Card) => b.owners - a.owners || a.id - b.id;

async function loadCards(): Promise<Card[]> {
  const supabase = await createClient();
  if (!supabase) return [...DEMO_CARDS].sort(byOwners);
  const { data } = await supabase
    .from("cards")
    .select(CARD_COLUMNS)
    .gt("owners", 0)
    .order("owners", { ascending: false })
    .order("id", { ascending: true })
    .limit(POOL);
  return (data ?? []) as Card[];
}

export default async function RankingPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { pais, lenguaje } = await searchParams;
  const [{ t, locale }, loaded] = await Promise.all([getT(), loadCards()]);
  const all = loaded.filter((c) => c.owners > 0).sort(byOwners);
  const country = (c: string) => countryName(c, locale, t.myCard.otherCountry);

  const countries = [...new Set(all.map((c) => c.country ?? ""))].filter(Boolean).sort((a, b) => country(a).localeCompare(country(b), locale));
  const languages = [...new Set(all.map((c) => c.top_language ?? ""))].filter(Boolean).sort();

  const href = (patch: Search) => {
    const next = { pais, lenguaje, ...patch };
    const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
    return qs ? `/ranking?${qs}` : "/ranking";
  };

  let list = all;
  if (pais) list = list.filter((c) => c.country === pais);
  if (lenguaje) list = list.filter((c) => c.top_language === lenguaje);
  list = list.slice(0, TOP);
  const podium = list.slice(0, 3);
  const rest = list.slice(3);
  // Orden visual del podio: 2.º, 1.º, 3.º
  const podiumOrder = podium.length === 3 ? [1, 0, 2] : podium.map((_, i) => i);

  return (
    <main className="min-h-dvh bg-paper pb-28 md:pb-12">
      <header className="border-b-[3px] border-ink bg-sun">
        <div className="mx-auto max-w-6xl px-4 pb-6 pt-8 md:pt-10">
          <p className="font-mono text-xs font-extrabold uppercase tracking-wider md:text-sm">{t.ranking.kicker}</p>
          <h1 className="display mt-2 text-5xl md:text-8xl">{t.ranking.title}</h1>
        </div>
      </header>

      {all.length === 0 ? (
        <div className="mx-auto max-w-6xl px-4 pt-6">
          <div className="panel flex flex-col items-center gap-4 p-8 text-center">
            <p className="text-lg font-bold">{t.ranking.empty}</p>
            <p className="text-ink-soft">{t.ranking.emptyBody}</p>
            <Link href="/sobre" className="btn btn-sun">
              {t.ranking.emptyCta}
            </Link>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pt-5">
          <nav aria-label={t.ranking.countriesAria} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <Link href={href({ pais: undefined })} aria-current={!pais ? "page" : undefined} className="chip">
              {t.ranking.allFilter}
            </Link>
            {countries.map((c) => (
              <Link key={c} href={href({ pais: c })} aria-current={pais === c ? "page" : undefined} className="chip">
                {country(c)}
              </Link>
            ))}
          </nav>
          <nav aria-label={t.ranking.languagesAria} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <Link href={href({ lenguaje: undefined })} aria-current={!lenguaje ? "page" : undefined} className="chip">
              {t.ranking.allFilter}
            </Link>
            {languages.map((l) => (
              <Link key={l} href={href({ lenguaje: l })} aria-current={lenguaje === l ? "page" : undefined} className="chip">
                {l}
              </Link>
            ))}
          </nav>

          {list.length === 0 ? (
            <div className="panel flex flex-col items-center gap-4 p-8 text-center">
              <p className="text-lg font-bold">{t.ranking.noResults}</p>
              <Link href="/ranking" className="btn btn-sun">
                {t.ranking.clearFilters}
              </Link>
            </div>
          ) : (
            <>
              <ol aria-label={t.ranking.podiumAria} className="grid grid-cols-3 items-end gap-2 sm:gap-6">
                {podiumOrder.map((i) => {
                  const c = podium[i];
                  return (
                    <li key={c.id} className="flex min-w-0 flex-col items-center gap-2 text-center">
                      <Link href={`/c/${c.login}`} aria-label={`${t.ranking.place(i + 1)}: ${c.name?.trim() || c.login}`} className="no-underline">
                        <Cromo
                          card={c}
                          interactive={false}
                          eager={i === 0}
                          style={{ "--w": "clamp(92px, 27vw, 200px)" } as CSSProperties}
                        />
                      </Link>
                      <p className="font-mono font-extrabold leading-none">
                        <span className="text-xs">#{i + 1}</span>{" "}
                        <span className="text-2xl sm:text-4xl">{c.owners}</span>
                      </p>
                      <p className="text-xs font-bold sm:text-sm">{t.ranking.people(c.owners)}</p>
                    </li>
                  );
                })}
              </ol>

              {rest.length > 0 && (
                <ol start={4} aria-label={t.ranking.listAria} className="flex flex-col gap-2">
                  {rest.map((c, i) => (
                    <li key={c.id}>
                      <Link
                        href={`/c/${c.login}`}
                        className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-ink bg-white px-3 py-2 text-ink no-underline hover:bg-sun/30"
                      >
                        <span className="w-7 shrink-0 text-center font-mono text-sm font-extrabold">{i + 4}</span>
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt="" width={44} height={44} loading="lazy" className="h-11 w-11 shrink-0 rounded-full border-2 border-ink bg-paper object-cover" />
                        ) : (
                          <span className="h-11 w-11 shrink-0 rounded-full border-2 border-ink bg-paper" aria-hidden="true" />
                        )}
                        <span className="min-w-0 grow">
                          <span className="block truncate text-[15px] font-extrabold">
                            <span className="font-mono text-xs text-ink-soft">#{cardNumber(c.id)}</span> {c.name?.trim() || c.login}
                          </span>
                          <span className="block truncate text-sm font-semibold text-ink-soft">
                            @{c.login} · {t.rarity[c.rarity].label}
                          </span>
                        </span>
                        <span className="shrink-0 text-right font-mono font-extrabold leading-tight">
                          <span className="block text-xl">{c.owners}</span>
                          <span className="block text-[11px] font-bold">{t.ranking.people(c.owners)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}
