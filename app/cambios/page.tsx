import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MiniCard, type MiniCardData } from "@/components/MiniCard";
import { cancelTrade, createTrade } from "@/app/actions";
import { cardNumber } from "@/lib/cards";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Cambios" };

const MINI = "id, login, name, rarity";

type TradeRow = {
  code: string;
  from_user: string;
  offer: MiniCardData;
  want: MiniCardData;
};

export default async function CambiosPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { supabase, user } = await getUser();
  if (supabase && !user) redirect("/?error=" + encodeURIComponent("Entra con GitHub para hacer cambios."));

  if (!supabase || !user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 pb-24">
        <h1 className="display text-6xl">Cambios</h1>
        <p className="mt-4 text-lg">
          Aquí ofreces un cromo repetido y pides otro que te falte. Se crea un enlace: quien lo abra y tenga ese cromo
          puede aceptar el cambio. En modo demo no se guardan cambios.
        </p>
      </main>
    );
  }

  const [{ data: mine }, { data: all }, { data: openTrades }] = await Promise.all([
    supabase.from("collection").select(`quantity, card:cards(${MINI})`).eq("user_id", user.id),
    supabase.from("cards").select(MINI).order("id").limit(500),
    supabase
      .from("trades")
      .select(`code, from_user, offer:cards!trades_offer_card_id_fkey(${MINI}), want:cards!trades_want_card_id_fkey(${MINI})`)
      .eq("status", "abierto")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const collection = (mine ?? []) as unknown as { quantity: number; card: MiniCardData }[];
  const ownedIds = new Set(collection.map((c) => c.card.id));
  const duplicates = collection.filter((c) => c.quantity >= 2);
  const missing = ((all ?? []) as MiniCardData[]).filter((c) => !ownedIds.has(c.id));
  const trades = (openTrades ?? []) as unknown as TradeRow[];
  const myTrades = trades.filter((t) => t.from_user === user.id);
  const board = trades.filter((t) => t.from_user !== user.id);

  return (
    <main className="min-h-dvh bg-paper pb-24 md:pb-12">
      <div className="border-b-[3px] border-ink bg-sun">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="display text-6xl">Cambios</h1>
          <p className="mt-2 text-lg font-semibold">Da un repetido, pide uno que te falte y comparte el enlace.</p>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-2">
        <section className="panel p-6">
          <h2 className="display text-3xl">Nuevo cambio</h2>
          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-sun px-3 py-2 font-bold">
              {error}
            </p>
          )}
          {duplicates.length === 0 ? (
            <p className="mt-4 text-lg">
              Aún no tienes repetidos. <Link href="/sobre" className="font-bold underline">Abre tu sobre de hoy</Link>.
            </p>
          ) : missing.length === 0 ? (
            <p className="mt-4 text-lg">¡Tienes todos los cromos! No hay nada que pedir.</p>
          ) : (
            <form action={createTrade} className="mt-5 flex flex-col gap-4">
              <label className="flex flex-col gap-2 font-bold">
                Doy (repetido)
                <select name="offer" required className="min-h-12 rounded-xl border-2 border-ink bg-white px-3 font-semibold">
                  {duplicates.map(({ card, quantity }) => (
                    <option key={card.id} value={card.id}>
                      #{cardNumber(card.id)} {card.name ?? card.login} (tienes {quantity})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 font-bold">
                Pido (me falta)
                <select name="want" required className="min-h-12 rounded-xl border-2 border-ink bg-white px-3 font-semibold">
                  {missing.map((card) => (
                    <option key={card.id} value={card.id}>
                      #{cardNumber(card.id)} {card.name ?? card.login}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="btn btn-dark self-start">
                Crear cambio y enlace
              </button>
            </form>
          )}

          {myTrades.length > 0 && (
            <>
              <h3 className="mt-8 text-xl font-extrabold">Tus cambios abiertos</h3>
              <ul className="mt-3 flex flex-col gap-3">
                {myTrades.map((t) => (
                  <li key={t.code} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-ink p-3">
                    <Link href={`/t/${t.code}`} className="flex min-w-0 flex-1 items-center gap-2 no-underline">
                      <MiniCard card={t.offer} />
                      <span aria-hidden="true" className="font-bold">→</span>
                      <MiniCard card={t.want} />
                    </Link>
                    <form action={cancelTrade}>
                      <input type="hidden" name="code" value={t.code} />
                      <button type="submit" className="btn btn-ghost min-h-11 px-4 text-sm">
                        Cancelar
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="panel p-6">
          <h2 className="display text-3xl">Tablón de cambios</h2>
          <p className="mt-2 text-ink-soft">Ofertas abiertas de otros devs. Si tienes lo que piden, acéptala.</p>
          {board.length === 0 ? (
            <p className="mt-5 text-lg">Todavía no hay ofertas. Crea la primera.</p>
          ) : (
            <ul className="mt-5 flex flex-col gap-3">
              {board.map((t) => {
                const canHelp = ownedIds.has(t.want.id);
                return (
                  <li key={t.code}>
                    <Link
                      href={`/t/${t.code}`}
                      className={`flex items-center gap-2 rounded-xl border-2 p-3 no-underline ${canHelp ? "border-ink bg-sun/40" : "border-ink/25"}`}
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                        <span className="text-xs font-bold uppercase text-ink-soft sm:hidden">Da</span>
                        <MiniCard card={t.offer} />
                        <span className="hidden font-bold sm:inline" aria-hidden="true">⇄</span>
                        <span className="text-xs font-bold uppercase text-ink-soft sm:hidden">Pide</span>
                        <MiniCard card={t.want} />
                      </span>
                      {canHelp && <span className="shrink-0 rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">Lo tienes</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
