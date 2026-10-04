import { SignInLink } from "@/components/SignInLink";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cromo } from "@/components/Cromo";
import { cardByLogin } from "@/lib/data";
import { RARITIES } from "@/lib/cards";
import { getUser } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

type Params = { login: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { login } = await params;
  const [card, { t }] = await Promise.all([cardByLogin(login), getT()]);
  if (!card) return { title: t.cardPage.notFound };
  const name = card.name ?? card.login;
  const title = `${name} (@${card.login})`;
  const description = t.cardPage.description(name, t.rarity[card.rarity].label);
  const path = `/c/${card.login}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title,
      description,
      url: path,
      siteName: "Cromos de devs",
      locale: t.meta.ogLocale,
      alternateLocale: ["es_ES", "en_US"],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CardPage({ params }: { params: Promise<Params> }) {
  const { login } = await params;
  const [card, { user }, { t }] = await Promise.all([cardByLogin(login), getUser(), getT()]);
  if (!card) notFound();
  const name = card.name ?? card.login;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-ink pb-24 text-white md:pb-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(circle at 30% 40%, rgba(255,199,44,0.22), transparent 55%)" }}
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 md:grid-cols-[auto_1fr]">
        <div className="flex justify-center">
          <Cromo card={card} className="[--w:min(82vw,330px)]" />
        </div>
        <div>
          <p className="font-mono text-sm font-bold uppercase text-sun">
            {RARITIES[card.rarity].symbol} {t.cardPage.kicker(t.rarity[card.rarity].label)}
          </p>
          <h1 className="display mt-3 text-6xl md:text-7xl">{t.cardPage.whoHas(name)}</h1>
          <p className="mt-6 flex items-baseline gap-3">
            <span className="font-mono text-7xl font-bold leading-none text-sun">{card.owners}</span>
            <span className="text-xl font-bold">{t.cardPage.inAlbum(card.owners)}</span>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <Link href="/sobre" className="btn btn-sun">
                {t.cardPage.openMyPack}
              </Link>
            ) : (
              <SignInLink className="btn btn-sun">{t.cardPage.getYours}</SignInLink>
            )}
            <a
              href={`https://github.com/${card.login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost border-white text-white"
            >
              {t.cardPage.seeGithub}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
