import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MiniCard, type MiniCardData } from "@/components/MiniCard";
import { cancelTrade, createTrade } from "@/app/actions";
import { cardNumber } from "@/lib/cards";
import { getUser } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { errorText } from "@/lib/i18n/dict";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.trades.title };
}

const MINI = "id, login, name, rarity";

type TradeRow = {
  code: string;
  from_user: string;
  offer: MiniCardData;
  want: MiniCardData;
};

export default async function CambiosPage({ searchParams }: { searchParams: Promise<{ error?: string; dar?: string; busco?: string }> }) {
  const { error, dar, busco } = await searchParams;
  const [{ supabase, user }, { t }] = await Promise.all([getUser(), getT()]);
  if (supabase && !user) redirect("/?error=needLogin");
  const message = errorText(t, error);

  if (!supabase || !user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 pb-24">
        <h1 className="display text-6xl">{t.trades.title}</h1>
        <p className="mt-4 text-lg">{t.trades.demoBody}</p>
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
  const myTrades = trades.filter((tr) => tr.from_user === user.id);
  const board = trades.filter((tr) => tr.from_user !== user.id);

  return (
    <main className="min-h-dvh bg-paper pb-24 md:pb-12">
      <div className="border-b-[3px] border-ink bg-sun">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="display text-6xl">{t.trades.title}</h1>
          <p className="mt-2 text-lg font-semibold">{t.trades.subtitle}</p>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-2">
        <section className="panel p-6">
          <h2 className="display text-3xl">{t.trades.newTrade}</h2>
          {message && (
            <p role="alert" className="mt-3 rounded-lg bg-sun px-3 py-2 font-bold">
              {message}
            </p>
          )}
          {duplicates.length === 0 ? (
            <p className="mt-4 text-lg">
              {t.trades.noDupes}{" "}
              <Link href="/sobre" className="font-bold underline">
                {t.trades.openToday}
              </Link>
            </p>
          ) : missing.length === 0 ? (
            <p className="mt-4 text-lg">{t.trades.allCards}</p>
          ) : (
            <form action={createTrade} className="mt-5 flex flex-col gap-4">
              <label className="flex flex-col gap-2 font-bold">
                {t.trades.give}
                <select name="offer" required defaultValue={dar} key={`o${dar ?? ""}`} className="min-h-12 rounded-xl border-2 border-ink bg-white px-3 font-semibold">
                  {duplicates.map(({ card, quantity }) => (
                    <option key={card.id} value={card.id}>
                      #{cardNumber(card.id)} {card.name ?? card.login} ({t.trades.youHave(quantity)})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 font-bold">
                {t.trades.want}
                <select name="want" required defaultValue={busco} key={`w${busco ?? ""}`} className="min-h-12 rounded-xl border-2 border-ink bg-white px-3 font-semibold">
                  {missing.map((card) => (
                    <option key={card.id} value={card.id}>
                      #{cardNumber(card.id)} {card.name ?? card.login}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="btn btn-dark self-start">
                {t.trades.create}
              </button>
            </form>
          )}

          {myTrades.length > 0 && (
            <>
              <h3 className="mt-8 text-xl font-extrabold">{t.trades.yourOpen}</h3>
              <ul className="mt-3 flex flex-col gap-3">
                {myTrades.map((tr) => (
                  <li key={tr.code} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-ink p-3">
                    <Link href={`/t/${tr.code}`} className="flex min-w-0 flex-1 items-center gap-2 no-underline">
                      <MiniCard card={tr.offer} />
                      <span aria-hidden="true" className="font-bold">→</span>
                      <MiniCard card={tr.want} />
                    </Link>
                    <form action={cancelTrade}>
                      <input type="hidden" name="code" value={tr.code} />
                      <button type="submit" className="btn btn-ghost min-h-11 px-4 text-sm">
                        {t.trades.cancel}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="panel p-6">
          <h2 className="display text-3xl">{t.trades.board}</h2>
          <p className="mt-2 text-ink-soft">{t.trades.boardBody}</p>
          {board.length === 0 ? (
            <p className="mt-5 text-lg">{t.trades.boardEmpty}</p>
          ) : (
            <ul className="mt-5 flex flex-col gap-3">
              {board.map((tr) => {
                const canHelp = ownedIds.has(tr.want.id);
                return (
                  <li key={tr.code}>
                    <Link
                      href={`/t/${tr.code}`}
                      className={`flex items-center gap-2 rounded-xl border-2 p-3 no-underline ${canHelp ? "border-ink bg-sun/40" : "border-ink/25"}`}
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                        <span className="text-xs font-bold uppercase text-ink-soft sm:hidden">{t.trades.gives}</span>
                        <MiniCard card={tr.offer} />
                        <span className="hidden font-bold sm:inline" aria-hidden="true">⇄</span>
                        <span className="text-xs font-bold uppercase text-ink-soft sm:hidden">{t.trades.asks}</span>
                        <MiniCard card={tr.want} />
                      </span>
                      {canHelp && <span className="shrink-0 rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">{t.trades.youHaveIt}</span>}
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
