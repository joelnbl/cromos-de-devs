import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TradesWorkspace, type TradeView, type Who } from "@/components/TradesWorkspace";
import { CARD_COLUMNS, type Card } from "@/lib/cards";
import { getUser } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { errorText } from "@/lib/i18n/dict";
import { siteUrl } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.trades.title };
}

type Search = { error?: string; dar?: string; busco?: string; hecho?: string };
type TradeRow = {
  code: string;
  from_user: string;
  accepted_by: string | null;
  offer_card_id: number;
  want_card_id: number;
  status: string;
  created_at: string;
  closed_at: string | null;
};

/** «hace 2 h», «ayer»… en el idioma de la persona. */
function timeAgo(iso: string, locale: string, now: number): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  const min = Math.round((new Date(iso).getTime() - now) / 60_000);
  if (min > -60) return rtf.format(Math.min(-1, min), "minute");
  const h = Math.round(min / 60);
  if (h > -24) return rtf.format(h, "hour");
  const d = Math.round(h / 24);
  if (d > -30) return rtf.format(d, "day");
  return rtf.format(Math.round(d / 30), "month");
}

const TRADE_COLUMNS = "code, from_user, accepted_by, offer_card_id, want_card_id, status, created_at, closed_at";

export default async function CambiosPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { error, dar, busco, hecho } = await searchParams;
  const [{ supabase, user }, { t, locale }] = await Promise.all([getUser(), getT()]);
  if (supabase && !user) redirect("/?error=needLogin");

  if (!supabase || !user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 pb-24">
        <h1 className="display text-6xl">{t.trades.title}</h1>
        <p className="mt-4 text-lg">{t.trades.demoBody}</p>
      </main>
    );
  }

  const [{ data: cardRows }, { data: mine }, { data: openRows }, { data: doneRows }] = await Promise.all([
    supabase.from("cards").select(`${CARD_COLUMNS}, user_id`).order("id").limit(1000),
    supabase.from("collection").select("card_id, quantity").eq("user_id", user.id),
    supabase.from("trades").select(TRADE_COLUMNS).eq("status", "abierto").order("created_at", { ascending: false }).limit(300),
    supabase
      .from("trades")
      .select(TRADE_COLUMNS)
      .eq("status", "hecho")
      .or(`from_user.eq.${user.id},accepted_by.eq.${user.id}`)
      .order("closed_at", { ascending: false })
      .limit(30),
  ]);

  const now = new Date().getTime();
  const ago = (iso: string) => timeAgo(iso, locale, now);
  const cards = (cardRows ?? []) as (Card & { user_id: string })[];
  const byId = new Map(cards.map((c) => [c.id, c as Card]));
  const byUser = new Map(cards.map((c) => [c.user_id, c]));
  const qty = new Map((mine ?? []).map((m) => [m.card_id as number, m.quantity as number]));
  const who = (uid: string | null): Who | null => {
    const c = uid ? byUser.get(uid) : null;
    return c ? { login: c.login, avatar: c.avatar_url } : null;
  };
  const view = (r: TradeRow): TradeView | null => {
    const offer = byId.get(r.offer_card_id);
    const want = byId.get(r.want_card_id);
    if (!offer || !want) return null;
    return { code: r.code, from: who(r.from_user), offer, want, ago: ago(r.created_at) };
  };

  const open = ((openRows ?? []) as TradeRow[]).map((r) => ({ r, v: view(r) })).filter((x) => x.v) as { r: TradeRow; v: TradeView }[];
  const others = open.filter(({ r }) => r.from_user !== user.id);
  const myOpen = open.filter(({ r }) => r.from_user === user.id).map(({ v }) => v);

  // Para ti: me dan uno que me falta y piden uno que tengo repetido. Uno por cromo ofrecido.
  const seenOffer = new Set<number>();
  const matches = others
    .filter(({ v }) => !qty.has(v.offer.id) && (qty.get(v.want.id) ?? 0) >= 2)
    .filter(({ v }) => !seenOffer.has(v.offer.id) && Boolean(seenOffer.add(v.offer.id)))
    .slice(0, 6)
    .map(({ v }) => ({ ...v, myQty: qty.get(v.want.id) ?? 0 }));
  const matchCodes = new Set(matches.map((m) => m.code));

  const board = others
    .filter(({ v }) => !matchCodes.has(v.code))
    .map(({ v }) => {
      const have = qty.get(v.want.id) ?? 0;
      const kind: "can" | "want" | "other" = have > 0 ? "can" : !qty.has(v.offer.id) ? "want" : "other";
      return { ...v, myQty: have, kind };
    })
    .slice(0, 60);

  // Cuántas personas ofrecen cada cromo (para elegir qué pedir)
  const offered = new Map<number, number>();
  for (const { v } of others) offered.set(v.offer.id, (offered.get(v.offer.id) ?? 0) + 1);

  const dupes = cards.filter((c) => (qty.get(c.id) ?? 0) >= 2).map((c) => ({ card: c as Card, qty: qty.get(c.id)! }));
  const missing = cards
    .filter((c) => !qty.has(c.id))
    .map((c) => ({ card: c as Card, offered: offered.get(c.id) ?? 0 }))
    .sort((a, b) => b.offered - a.offered || a.card.id - b.card.id);

  const done = (doneRows ?? []) as TradeRow[];
  const history = done
    .map((r) => {
      const offer = byId.get(r.offer_card_id);
      const want = byId.get(r.want_card_id);
      if (!offer || !want) return null;
      const iCreated = r.from_user === user.id;
      return {
        code: r.code,
        partner: who(iCreated ? r.accepted_by : r.from_user),
        gave: iCreated ? offer : want,
        got: iCreated ? want : offer,
        at: r.closed_at ?? r.created_at,
        ago: ago(r.closed_at ?? r.created_at),
        iCreated,
      };
    })
    .filter((h) => h !== null);

  // Celebración tras aceptar desde aquí
  const justDone = hecho ? history.find((h) => h.code === hecho && !h.iCreated) : undefined;
  const celebrate = justDone
    ? { card: justDone.got, partner: justDone.partner, left: cards.filter((c) => !qty.has(c.id)).length }
    : null;

  const dupeCount = [...qty.values()].reduce((n, q) => n + Math.max(0, q - 1), 0);

  return (
    <TradesWorkspace
      stats={{ dupes: dupeCount, missing: missing.length, open: myOpen.length }}
      error={errorText(t, error)}
      matches={matches}
      board={board}
      dupes={dupes}
      missing={missing}
      myOpen={myOpen}
      history={history}
      notices={history.filter((h) => h.iCreated).slice(0, 5)}
      celebrate={celebrate}
      preset={{ give: Number(dar) || null, want: Number(busco) || null }}
      site={siteUrl()}
      total={cards.length}
    />
  );
}
