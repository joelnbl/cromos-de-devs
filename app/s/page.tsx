import type { Metadata } from "next";
import Link from "next/link";
import { Cromo } from "@/components/Cromo";
import { SignInLink } from "@/components/SignInLink";
import type { Card } from "@/lib/cards";
import { cardById } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { parseCardIds } from "@/lib/share-ids";
import { getUser } from "@/lib/supabase/server";

type Search = { c?: string | string[] };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }): Promise<Metadata> {
  const [{ c }, { t }] = await Promise.all([searchParams, getT()]);
  const ids = parseCardIds(c);
  const image = `/s/og${ids.length ? `?c=${ids.join(",")}` : ""}`;
  return {
    title: t.share2.title,
    description: t.share2.description,
    robots: { index: false },
    openGraph: { title: t.share2.title, description: t.share2.description, images: [{ url: image, width: 1200, height: 630, alt: t.share2.ogAlt }] },
    twitter: { card: "summary_large_image", title: t.share2.title, description: t.share2.description, images: [image] },
  };
}

export default async function SharedPackPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { c } = await searchParams;
  const ids = parseCardIds(c);
  const [{ user }, { t }, found] = await Promise.all([getUser(), getT(), Promise.all(ids.map((id) => cardById(id)))]);
  const cards = found.filter((x): x is Card => x !== null);

  return (
    <main className="min-h-dvh bg-ink pb-24 text-white md:pb-12">
      <div className="mx-auto max-w-5xl px-4 py-12 text-center">
        <h1 className="display text-4xl md:text-6xl">{t.share2.title}</h1>
        {cards.length === 0 ? (
          <p className="mt-8 text-lg font-semibold text-white/85">{t.share2.empty}</p>
        ) : (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {cards.map((card) => (
              <Cromo key={card.id} card={card} width={150} interactive={false} />
            ))}
          </div>
        )}
        <div className="mt-12 flex justify-center">
          {user ? (
            <Link href="/sobre" className="btn btn-sun">
              {t.share2.open}
            </Link>
          ) : (
            <SignInLink next="/sobre" className="btn btn-sun">
              {t.share2.cta}
            </SignInLink>
          )}
        </div>
      </div>
    </main>
  );
}
