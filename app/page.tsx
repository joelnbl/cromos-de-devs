import { SignInLink } from "@/components/SignInLink";
import type { Metadata } from "next";
import Link from "next/link";
import { Cromo } from "@/components/Cromo";
import { MiniCard } from "@/components/MiniCard";
import { HeroFan } from "@/components/HeroFan";
import { featuredCards, homeStats } from "@/lib/data";
import { DEMO_CARDS } from "@/lib/demo";
import { RARITIES, RARITY_ORDER, formatCount } from "@/lib/cards";
import { getUser } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { errorText } from "@/lib/i18n/dict";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const [{ user }, hero, { t }, stats] = await Promise.all([getUser(), featuredCards(3), getT(), homeStats()]);
  const showLive = !!stats && stats.devs >= 3;
  const showTop = !!stats && stats.top.length >= 3;
  const message = errorText(t, error);
  const byRarity = RARITY_ORDER.map((r) => DEMO_CARDS.find((c) => c.rarity === r)!);

  const cta = user ? (
    <Link href="/sobre" className="btn btn-dark min-h-14 px-7 text-lg">
      {t.home.ctaOpen}
    </Link>
  ) : (
    <SignInLink className="btn btn-dark min-h-14 px-7 text-lg">{t.home.ctaGet}</SignInLink>
  );

  const jsonLd = { "@context": "https://schema.org", "@type": "WebSite", name: "Cromos de devs", url: siteUrl() };

  return (
    <main className="pb-20 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <section className="relative overflow-hidden border-b-[3px] border-ink bg-sun">
        <div className="halftone pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 md:grid-cols-2 md:pb-24 md:pt-16">
          <div>
            {message && (
              <p role="alert" className="mb-5 rounded-xl border-2 border-ink bg-white px-4 py-3 font-bold">
                {message}
              </p>
            )}
            <span className="inline-flex items-center rounded-full border-2 border-ink px-3 py-1 font-mono text-sm font-bold uppercase">
              {t.home.season}
            </span>
            <h1 className="display mt-5 text-[clamp(2.5rem,8.4vw,5.4rem)]">
              {t.home.h1a}
              <br />
              {t.home.h1b}
            </h1>
            <p className="mt-6 max-w-[34ch] text-xl font-medium leading-snug">
              {t.home.intro}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {cta}
              <Link href="#como" className="btn btn-ghost min-h-14 px-7 text-lg">
                {t.home.how}
              </Link>
            </div>
          </div>
          <HeroFan cards={hero} />
        </div>
      </section>

      {stats && showLive && (
        <section aria-label={t.home.liveKicker} className="border-b-[3px] border-ink bg-paper">
          <div className="mx-auto max-w-6xl px-4 py-10">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <span className="inline-flex items-center gap-2 font-mono text-sm font-bold uppercase">
                <span className="h-3 w-3 rounded-full border-2 border-ink bg-sun" aria-hidden="true" />
                {t.home.liveKicker}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="display text-5xl leading-none">{formatCount(stats.devs)}</span>
                <span className="font-mono text-sm font-bold uppercase">{t.home.liveDevs(stats.devs)}</span>
              </div>
              {stats.tradesDone > 0 && (
                <div className="flex items-baseline gap-2">
                  <span className="display text-5xl leading-none">{formatCount(stats.tradesDone)}</span>
                  <span className="font-mono text-sm font-bold uppercase">{t.home.liveTrades(stats.tradesDone)}</span>
                </div>
              )}
            </div>
            {showTop && (
              <div className="mt-8">
                <h2 className="display text-3xl">{t.home.liveTop}</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {stats.top.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/c/${c.login}`}
                        className="panel flex min-h-14 items-center justify-between gap-3 p-3 !shadow-[4px_4px_0_var(--color-ink)]"
                      >
                        <MiniCard card={c} />
                        <span className="shrink-0 text-right font-mono text-xs font-bold">{t.home.liveOwners(c.owners)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-10 px-4 py-16">
          <div className="max-w-xl">
            <p className="font-mono text-sm font-bold uppercase text-sun">{t.home.scoreKicker}</p>
            <h2 className="display mt-3 text-6xl">{t.home.whoHasYou}</h2>
            <p className="mt-4 text-lg leading-relaxed text-white/85">
              {t.home.whoBody}
            </p>
          </div>
          <div className="flex items-baseline gap-4 rounded-2xl border-2 border-sun px-7 py-6">
            <span className="font-mono text-7xl font-bold leading-none text-sun">∞</span>
            <span className="text-xl font-bold leading-tight">
              {t.home.infinityA}
              <br />
              {t.home.infinityB}
            </span>
          </div>
        </div>
      </section>

      <section id="como" className="cv-auto mx-auto max-w-6xl scroll-mt-24 px-4 py-20">
        <h2 className="display text-6xl">{t.home.how}</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {t.home.steps.map((s, i) => (
            <div key={s.title} className="rounded-2xl border-2 border-ink bg-white p-7 shadow-[6px_6px_0_#FFC72C]">
              <div className="grid h-13 w-13 place-items-center rounded-full bg-ink font-mono text-2xl font-bold text-sun">
                {i + 1}
              </div>
              <h3 className="display mt-5 text-3xl">{s.title}</h3>
              <p className="mt-2 text-lg leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cv-auto border-y-[3px] border-ink bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="display text-6xl">{t.home.raritiesTitle}</h2>
          <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
            {t.home.raritiesBody}
          </p>
          <div className="mt-12 grid grid-cols-2 justify-items-center gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
            {byRarity.map((card) => (
              <div key={card.rarity} className="flex flex-col items-center gap-4">
                <Cromo card={card} width={200} className="max-sm:[--w:160px]!" />
                <div className="text-center">
                  <div className="display text-2xl">
                    {RARITIES[card.rarity].symbol} {t.rarity[card.rarity].label}
                  </div>
                  <div className="text-sm font-semibold text-ink-soft">{t.rarity[card.rarity].finish}</div>
                  <div className="text-sm text-ink-soft">{t.rarity[card.rarity].rule}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-sun">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-16">
          <h2 className="display text-6xl">{t.home.waiting}</h2>
          {cta}
        </div>
        <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 border-t-2 border-ink px-4 py-6 text-sm font-semibold">
          <span>
            {t.home.madeBy}{" "}
            <a href="https://github.com/joelnbl" className="underline underline-offset-2">
              @joelnbl
            </a>
          </span>
          <Link href="/ranking" className="underline underline-offset-2">
            {t.nav.ranking}
          </Link>
          <span>{t.home.privacy}</span>
        </footer>
      </section>
    </main>
  );
}
