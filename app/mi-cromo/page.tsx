import { SignInLink } from "@/components/SignInLink";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShowcaseLoader } from "@/components/ShowcaseLoader";
import { ShareButtons } from "@/components/ShareButtons";
import { setCountry } from "@/app/actions";
import { CARD_COLUMNS, COUNTRIES, RARITIES, countryName, formatCount, type Card } from "@/lib/cards";
import { getT } from "@/lib/i18n/server";
import { errorText } from "@/lib/i18n/dict";
import { DEMO_CARDS } from "@/lib/demo";
import { getUser } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.myCard.title, robots: { index: false } };
}

type Search = { bienvenida?: string; guardado?: string; error?: string };

export default async function MiCromoPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { bienvenida, guardado, error } = await searchParams;
  const [{ supabase, user }, { t, locale }] = await Promise.all([getUser(), getT()]);
  if (supabase && !user) redirect("/?error=needLogin");
  const message = errorText(t, error);

  let card: Card | null = DEMO_CARDS[1];
  if (supabase && user) {
    const { data } = await supabase.from("cards").select(CARD_COLUMNS).eq("user_id", user.id).maybeSingle();
    card = data as Card | null;
  }

  if (!card) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="display text-5xl">{t.myCard.noCardTitle}</h1>
        <p className="mt-4 text-lg">{t.myCard.noCardBody}</p>
        <div className="mt-8">
          <SignInLink next="/mi-cromo">{t.myCard.create}</SignInLink>
        </div>
      </main>
    );
  }

  const url = `${siteUrl()}/c/${card.login}`;
  const owners = card.owners;

  const rule = t.rarity[card.rarity].rule;

  return (
    <main className="min-h-dvh bg-paper pb-24 md:pb-12">
      {/* Cabecera amarilla con el número grande */}
      <header className="border-b-[3px] border-ink bg-sun">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-6 pt-8 md:pt-10">
          {bienvenida && (
            <p className="inline-block self-start rounded-xl border-2 border-ink bg-white px-4 py-3 text-lg font-bold">
              {t.myCard.welcome}
            </p>
          )}
          {message && (
            <p role="alert" className="rounded-xl border-2 border-ink bg-white px-4 py-3 font-bold">
              {message}
            </p>
          )}
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
              <p className="font-mono text-xs font-extrabold uppercase tracking-wider md:text-sm">
                {RARITIES[card.rarity].symbol} {t.myCard.kicker(t.rarity[card.rarity].label)}
              </p>
              <h1 className="display mt-2 text-5xl md:text-8xl">{t.myCard.whoHasMe}</h1>
            </div>
            <p className="flex items-baseline gap-3 font-mono font-extrabold leading-none">
              <span className="text-6xl md:text-8xl">{owners}</span>
              <span className="max-w-[10ch] font-sans text-base leading-tight md:text-xl">{t.myCard.owners(owners)}</span>
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-10 md:grid-cols-[auto_1fr] md:gap-12">
        <div className="flex justify-center">
          <ShowcaseLoader card={card} />
        </div>

        <div className="min-w-0 space-y-8">
          <p className="max-w-[46ch] text-lg text-ink-soft">{t.myCard.body}</p>

          {/* Datos de la carta */}
          <section className="panel p-5">
            <h2 className="display text-3xl">{t.myCard.dataTitle}</h2>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="font-mono text-xs font-extrabold uppercase tracking-wider">{t.myCard.ruleLabel}</dt>
                <dd className="mt-1 font-bold">
                  {RARITIES[card.rarity].symbol} {t.rarity[card.rarity].label}: <span className="font-normal">{rule}</span>
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs font-extrabold uppercase tracking-wider">{t.myCard.languageLabel}</dt>
                <dd className="mt-1 font-bold">{card.top_language ?? t.card.polyglot}</dd>
              </div>
              <div>
                <dt className="font-mono text-xs font-extrabold uppercase tracking-wider">{t.myCard.reposLabel}</dt>
                <dd className="mt-1">
                  {card.top_repos.length ? (
                    <ul className="space-y-1 font-mono text-sm">
                      {card.top_repos.slice(0, 3).map((r) => (
                        <li key={r.name} className="flex justify-between gap-3">
                          <span className="min-w-0 truncate font-bold">{r.name}</span>
                          <span>★ {formatCount(r.stars)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span>{t.myCard.noRepos}</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          {/* Cómo subir el número */}
          <section>
            <h2 className="display text-3xl">{t.myCard.boostTitle}</h2>
            <ol className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
              <li className="panel flex flex-col gap-2 p-4 shadow-[4px_4px_0_#111] sm:col-span-2 md:col-span-1 lg:col-span-2">
                <span className="display text-4xl">1</span>
                <h3 className="font-extrabold">{t.myCard.boostShareTitle}</h3>
                <p className="text-sm text-ink-soft">{t.myCard.boostShareBody}</p>
                <div className="mt-auto pt-2">
                  <ShareButtons url={url} text={t.myCard.shareText} />
                </div>
              </li>
              <li className="panel flex flex-col gap-2 p-4 shadow-[4px_4px_0_#111]">
                <span className="display text-4xl">2</span>
                <h3 className="font-extrabold">{t.myCard.boostGiftTitle}</h3>
                <p className="text-sm text-ink-soft">{t.myCard.boostGiftBody}</p>
                <div className="mt-auto pt-2">
                  <Link href="/cambios" className="btn btn-dark">
                    {t.myCard.boostGiftCta}
                  </Link>
                </div>
              </li>
              <li className="panel flex flex-col gap-2 p-4 shadow-[4px_4px_0_#111]">
                <span className="display text-4xl">3</span>
                <h3 className="font-extrabold">{t.myCard.boostInviteTitle}</h3>
                <p className="text-sm text-ink-soft">{t.myCard.boostInviteBody}</p>
                <p className="mt-auto break-all rounded-lg border-2 border-ink bg-white px-3 py-2 font-mono text-xs font-bold">
                  {url}
                </p>
              </li>
            </ol>
          </section>

          <form action={setCountry} className="panel flex flex-wrap items-end gap-3 p-5">
            <label className="flex min-w-48 flex-1 flex-col gap-2 font-bold">
              {t.myCard.countryLabel}
              <select
                name="country"
                defaultValue={card.country ?? ""}
                className="min-h-12 rounded-xl border-2 border-ink bg-white px-3 text-base font-semibold"
              >
                <option value="">{t.myCard.noCountry}</option>
                {Object.keys(COUNTRIES)
                  .map((code) => [code, countryName(code, locale, t.myCard.otherCountry)] as const)
                  .sort((a, b) => a[1].localeCompare(b[1], locale))
                  .map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
              </select>
            </label>
            <button type="submit" className="btn btn-dark" disabled={!supabase}>
              {t.myCard.save}
            </button>
            {guardado && <span className="w-full font-bold">{t.myCard.saved}</span>}
          </form>

          {supabase && (
            <div>
              <SignInLink next="/mi-cromo" className="inline-flex items-center gap-2 font-bold underline underline-offset-4">
                {t.myCard.refresh}
              </SignInLink>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
