import { SignInLink } from "@/components/SignInLink";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cromo } from "@/components/Cromo";
import { cardByLogin } from "@/lib/data";
import { RARITIES } from "@/lib/cards";
import { getUser } from "@/lib/supabase/server";

type Params = { login: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { login } = await params;
  const card = await cardByLogin(login);
  if (!card) return { title: "Cromo no encontrado" };
  const name = card.name ?? card.login;
  return {
    title: `${name} (@${card.login})`,
    description: `¿Quién tiene a ${name}? Cromo ${RARITIES[card.rarity].label.toLowerCase()} en Cromos de devs.`,
  };
}

export default async function CardPage({ params }: { params: Promise<Params> }) {
  const { login } = await params;
  const [card, { user }] = await Promise.all([cardByLogin(login), getUser()]);
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
            {RARITIES[card.rarity].symbol} Cromo {RARITIES[card.rarity].label.toLowerCase()}
          </p>
          <h1 className="display mt-3 text-6xl md:text-7xl">¿Quién tiene a {name}?</h1>
          <p className="mt-6 flex items-baseline gap-3">
            <span className="font-mono text-7xl font-bold leading-none text-sun">{card.owners}</span>
            <span className="text-xl font-bold">{card.owners === 1 ? "persona" : "personas"} en su álbum</span>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <Link href="/sobre" className="btn btn-sun">
                Abrir mi sobre de hoy
              </Link>
            ) : (
              <SignInLink className="btn btn-sun">Consigue tu cromo</SignInLink>
            )}
            <a
              href={`https://github.com/${card.login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost border-white text-white"
            >
              Ver su GitHub
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
