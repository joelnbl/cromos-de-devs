import { SignInLink } from "@/components/SignInLink";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShowcaseLoader } from "@/components/ShowcaseLoader";
import { ShareButtons } from "@/components/ShareButtons";
import { setCountry } from "@/app/actions";
import { CARD_COLUMNS, COUNTRIES, RARITIES, countryName, type Card } from "@/lib/cards";
import { getT } from "@/lib/i18n/server";
import { errorText } from "@/lib/i18n/dict";
import { DEMO_CARDS } from "@/lib/demo";
import { getUser } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.myCard.title };
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

  return (
    <main className="min-h-dvh bg-paper pb-24 md:pb-12">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 md:grid-cols-[auto_1fr]">
        <div className="flex justify-center">
          <ShowcaseLoader card={card} />
        </div>
        <div>
          {bienvenida && (
            <p className="mb-6 inline-block rounded-xl border-2 border-ink bg-sun px-4 py-3 text-lg font-bold">
              {t.myCard.welcome}
            </p>
          )}
          {message && (
            <p role="alert" className="mb-6 rounded-xl border-2 border-ink bg-white px-4 py-3 font-bold">
              {message}
            </p>
          )}
          <p className="font-mono text-sm font-bold uppercase">
            {RARITIES[card.rarity].symbol} {t.myCard.kicker(t.rarity[card.rarity].label)}
          </p>
          <h1 className="display mt-2 text-6xl">{t.myCard.whoHasMe}</h1>
          <p className="mt-5 flex items-baseline gap-3">
            <span className="font-mono text-7xl font-bold leading-none">{owners}</span>
            <span className="text-xl font-bold">{t.myCard.owners(owners)}</span>
          </p>
          <p className="mt-4 max-w-[46ch] text-lg text-ink-soft">
            {t.myCard.body}
          </p>
          <div className="mt-6">
            <ShareButtons url={url} text={t.myCard.shareText} />
          </div>

          <form action={setCountry} className="panel mt-10 flex flex-wrap items-end gap-3 p-5">
            <label className="flex min-w-56 flex-1 flex-col gap-2 font-bold">
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
            <div className="mt-4">
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
