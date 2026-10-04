"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { acceptTrade, cancelTrade, createTrade } from "@/app/actions";
import { Cromo } from "./Cromo";
import { cardNumber, RARITIES, type Card } from "@/lib/cards";
import { sfx } from "@/lib/sound";
import { useT } from "@/lib/i18n/client";

export type Who = { login: string; avatar: string | null };
export type TradeView = { code: string; from: Who | null; offer: Card; want: Card; ago: string };
type Match = TradeView & { myQty: number };
type BoardItem = Match & { kind: "can" | "want" | "other" };
type HistoryItem = { code: string; partner: Who | null; gave: Card; got: Card; at: string; ago: string; iCreated: boolean };

const SEEN_KEY = "cromos.trades.seen";
const label = (c: Card) => `#${cardNumber(c.id)} ${c.name ?? c.login}`;

export function TradesWorkspace(props: {
  stats: { dupes: number; missing: number; open: number };
  error: string | null;
  matches: Match[];
  board: BoardItem[];
  dupes: { card: Card; qty: number }[];
  missing: { card: Card; offered: number }[];
  myOpen: TradeView[];
  history: HistoryItem[];
  notices: HistoryItem[];
  celebrate: { card: Card; partner: Who | null; left: number } | null;
  preset: { give: number | null; want: number | null };
  site: string;
  total: number;
}) {
  const t = useT();
  const { stats } = props;

  return (
    <main className="min-h-dvh bg-paper pb-28 md:pb-12">
      <header className="border-b-[3px] border-ink bg-sun">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-4 pb-7 pt-8 md:pt-10">
          <div className="max-w-xl">
            <h1 className="display text-6xl md:text-8xl">{t.trades.title}</h1>
            <p className="mt-3 text-lg font-semibold leading-snug">{t.trades.lead}</p>
          </div>
          <dl className="grid grid-cols-3 gap-2.5">
            <Stat n={stats.dupes} label={t.trades.statDupes} />
            <Stat n={stats.missing} label={t.trades.statMissing} />
            <Stat n={stats.open} label={t.trades.statOpen} dark />
          </dl>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-7 px-4 pt-6">
        {props.error && (
          <p role="alert" className="rounded-2xl border-2 border-ink bg-white px-4 py-3 text-lg font-bold shadow-[4px_4px_0_#111]">
            {props.error}
          </p>
        )}
        <AcceptedNotice notices={props.notices} />
        {props.matches.length > 0 && <ForYou matches={props.matches} />}

        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <NewTrade dupes={props.dupes} missing={props.missing} preset={props.preset} total={props.total} site={props.site} />
          <MyTrades open={props.myOpen} history={props.history} site={props.site} />
        </div>

        <Board items={props.board} />
      </div>

      <AnimatePresence>{props.celebrate && <Celebration {...props.celebrate} />}</AnimatePresence>
    </main>
  );
}

function Stat({ n, label, dark }: { n: number; label: string; dark?: boolean }) {
  return (
    <div className={`min-w-24 rounded-2xl border-2 border-ink px-4 py-3 ${dark ? "bg-ink text-white" : "bg-white"}`}>
      <dd className={`font-mono text-3xl font-extrabold ${dark ? "text-sun" : ""}`}>{n}</dd>
      <dt className="text-sm font-bold">{label}</dt>
    </div>
  );
}

function Avatar({ src, size = 40, dashed }: { src: string | null | undefined; size?: number; dashed?: boolean }) {
  return src ? (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={`shrink-0 rounded-[10px] border-2 border-ink bg-[#e9eef5] object-cover ${dashed ? "border-dashed" : ""}`}
      style={{ width: size, height: size }}
    />
  ) : (
    <span className="shrink-0 rounded-[10px] border-2 border-ink bg-ink/10" style={{ width: size, height: size }} aria-hidden="true" />
  );
}

function Submit({ children, className, pendingLabel }: { children: ReactNode; className: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? (pendingLabel ?? "…") : children}
    </button>
  );
}

/* ---------- Aviso: alguien aceptó tu cambio ---------- */

function AcceptedNotice({ notices }: { notices: HistoryItem[] }) {
  const t = useT();
  const [item, setItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    let seen = "";
    try {
      seen = localStorage.getItem(SEEN_KEY) ?? "";
    } catch {
      // sin almacenamiento
    }
    // Primera visita: solo avisos de los últimos 3 días
    const floor = seen || new Date(Date.now() - 3 * 86_400_000).toISOString();
    const fresh = notices.find((n) => n.at > floor) ?? null;
    const id = setTimeout(() => setItem(fresh), 0);
    return () => clearTimeout(id);
  }, [notices]);

  if (!item) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(SEEN_KEY, notices[0]?.at ?? new Date().toISOString());
    } catch {
      // sin almacenamiento
    }
    setItem(null);
  };

  return (
    <div role="status" className="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-ink bg-white p-3.5 shadow-[4px_4px_0_#111]">
      <Avatar src={item.partner?.avatar} size={52} />
      <p className="min-w-60 flex-1 text-[17px] font-bold leading-snug">
        {t.trades.noticeAccepted(item.partner?.login ?? t.trades.someone, label(item.got))}
      </p>
      <Link href="/album" onClick={dismiss} className="btn btn-sun">
        {t.trades.seeInAlbum}
      </Link>
      <button type="button" onClick={dismiss} aria-label={t.trades.dismiss} className="grid h-11 w-11 place-items-center rounded-full hover:bg-black/5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}

/* ---------- Para ti ---------- */

function ForYou({ matches }: { matches: Match[] }) {
  const t = useT();
  return (
    <section aria-labelledby="para-ti" className="flex flex-col gap-5 rounded-3xl bg-ink p-5 text-white md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-extrabold uppercase tracking-wider text-sun md:text-sm">{t.trades.forYouKicker(matches.length)}</p>
          <h2 id="para-ti" className="display mt-2 text-5xl">
            {t.trades.forYou}
          </h2>
        </div>
        <p className="max-w-md font-semibold leading-snug text-white/80">{t.trades.forYouBody}</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map((m) => (
          <li key={m.code} className="flex flex-col gap-3.5 rounded-2xl border-2 border-white/20 bg-[#1c1c1a] p-4">
            <div className="flex items-center gap-2.5">
              <Avatar src={m.from?.avatar} size={36} />
              <span className="truncate font-extrabold">@{m.from?.login ?? t.trades.someone}</span>
              <span className="grow" />
              <span className="font-mono text-xs font-bold text-white/60">{m.ago}</span>
            </div>
            <div className="flex items-end justify-center gap-3">
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-xs font-extrabold uppercase text-sun">{t.trades.givesYou}</span>
                <Cromo card={m.offer} width={112} interactive={false} />
              </div>
              <svg className="mb-16 shrink-0" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffc72c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 7h11l-3-3" />
                <path d="M17 17H6l3 3" />
              </svg>
              <div className="relative flex flex-col items-center gap-1.5">
                <span className="text-xs font-extrabold uppercase text-white/80">{t.trades.youGiveThem}</span>
                <Cromo card={m.want} width={112} interactive={false} />
                <span className="absolute -right-2 top-4 rounded-full border-2 border-ink bg-sun px-2 font-mono text-xs font-extrabold text-ink">×{m.myQty}</span>
              </div>
            </div>
            <form action={acceptTrade}>
              <input type="hidden" name="code" value={m.code} />
              <input type="hidden" name="from" value="cambios" />
              <Submit className="min-h-13 w-full rounded-full bg-sun text-base font-black text-ink disabled:opacity-60">{t.trades.tradeNow}</Submit>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Nuevo cambio ---------- */

function NewTrade({
  dupes,
  missing,
  preset,
  total,
  site,
}: {
  dupes: { card: Card; qty: number }[];
  missing: { card: Card; offered: number }[];
  preset: { give: number | null; want: number | null };
  total: number;
  site: string;
}) {
  const t = useT();
  const [give, setGive] = useState<number | null>(
    dupes.some((d) => d.card.id === preset.give) ? preset.give : (dupes[0]?.card.id ?? null),
  );
  const [want, setWant] = useState<number | null>(missing.some((m) => m.card.id === preset.want) ? preset.want : null);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(16);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/^#/, "");
    const num = s.replace(/^0+/, "");
    const found = s
      ? missing.filter(
          ({ card: c }) => c.login.toLowerCase().includes(s) || (c.name ?? "").toLowerCase().includes(s) || String(c.id) === num,
        )
      : missing;
    // El que viene del álbum va primero
    const pinned = found.find((m) => m.card.id === preset.want);
    return pinned ? [pinned, ...found.filter((m) => m !== pinned)] : found;
  }, [missing, q, preset.want]);

  const giveCard = dupes.find((d) => d.card.id === give)?.card;
  const wantCard = missing.find((m) => m.card.id === want)?.card;

  return (
    <section id="nuevo" aria-labelledby="nuevo-titulo" className="panel flex min-w-0 scroll-mt-24 flex-col gap-6 p-5 md:p-6">
      <h2 id="nuevo-titulo" className="display text-4xl">
        {t.trades.newTrade}
      </h2>

      {dupes.length === 0 ? (
        <p className="text-lg">
          {t.trades.noDupes}{" "}
          <Link href="/sobre" className="font-bold underline">
            {t.trades.openToday}
          </Link>
        </p>
      ) : missing.length === 0 ? (
        <AllCards dupes={dupes} total={total} site={site} />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <StepTitle n={1}>{t.trades.step1}</StepTitle>
            <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 pt-2">
              {dupes.map(({ card, qty }) => {
                const on = card.id === give;
                return (
                  <li key={card.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setGive(card.id);
                        sfx.flip();
                      }}
                      aria-pressed={on}
                      aria-label={`${label(card)} · ${t.trades.youHave(qty)}`}
                      className={`relative block rounded-2xl border-[3px] p-1 transition-transform ${
                        on ? "-translate-y-1 border-ink shadow-[0_0_0_4px_var(--color-sun)]" : "border-transparent hover:-translate-y-0.5"
                      }`}
                    >
                      <Cromo card={card} width={104} interactive={false} />
                      <span className="absolute -right-1 -top-1 rounded-full border-2 border-ink bg-sun px-2 font-mono text-xs font-extrabold">
                        ×{qty}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StepTitle n={2}>{t.trades.step2}</StepTitle>
              <label className="flex min-h-12 w-full items-center gap-2 rounded-full border-2 border-ink px-4 sm:w-auto">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <span className="sr-only">{t.trades.searchMissing}</span>
                <input
                  type="search"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setLimit(16);
                  }}
                  placeholder={t.trades.searchMissing}
                  className="min-w-0 grow bg-transparent text-base font-semibold outline-none sm:w-64"
                />
              </label>
            </div>
            {list.length === 0 ? (
              <p className="font-semibold text-ink-soft">{t.trades.noSearch}</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                {list.slice(0, limit).map(({ card, offered }) => {
                  const on = card.id === want;
                  return (
                    <li key={card.id}>
                      <button
                        type="button"
                        onClick={() => setWant(card.id)}
                        aria-pressed={on}
                        className={`flex h-full min-h-26 w-full flex-col items-start gap-1 rounded-2xl p-3 text-left ${
                          on ? "border-[3px] border-ink bg-[#fff4cf]" : "border-2 border-dashed border-ink/35 bg-[#fafaf7] hover:border-ink/70"
                        }`}
                      >
                        <span className="font-mono text-[13px] font-extrabold">#{cardNumber(card.id)}</span>
                        <span className="line-clamp-2 font-extrabold leading-tight">{card.name ?? card.login}</span>
                        <span className="text-xs font-bold text-ink-soft">
                          {t.rarity[card.rarity].label} {RARITIES[card.rarity].symbol}
                        </span>
                        {offered > 0 && (
                          <span className="mt-auto rounded-full bg-ink px-2 py-0.5 text-[11px] font-extrabold text-sun">{t.trades.offeredBy(offered)}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {list.length > limit && (
              <button type="button" onClick={() => setLimit((l) => l + 24)} className="btn btn-ghost self-center border-2 border-ink">
                {t.trades.showMore}
              </button>
            )}
          </div>

          <form action={createTrade} className="flex flex-wrap items-center gap-3.5 rounded-2xl border-2 border-ink bg-[#fff4cf] p-4">
            <input type="hidden" name="offer" value={give ?? ""} />
            <input type="hidden" name="want" value={want ?? ""} />
            <p className="min-w-60 flex-1 font-bold leading-snug" aria-live="polite">
              {giveCard && wantCard ? t.trades.summary(label(giveCard), label(wantCard)) : t.trades.pickWantFirst}
            </p>
            {giveCard && wantCard ? (
              <Submit className="btn btn-dark disabled:opacity-60">{t.trades.createShare}</Submit>
            ) : (
              <button type="button" disabled className="btn btn-dark">
                {t.trades.createShare}
              </button>
            )}
          </form>
        </>
      )}
    </section>
  );
}

/** Tienes todos los cromos que existen: no hay nada que pedir todavía. */
function AllCards({ dupes, total, site }: { dupes: { card: Card; qty: number }[]; total: number; site: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const text = t.trades.inviteText;
  return (
    <div role="status" className="flex flex-col gap-4 rounded-2xl border-2 border-ink bg-[#fff4cf] p-4">
      <p className="text-xl font-black leading-tight">{t.trades.allCardsTitle}</p>
      <p className="font-semibold leading-snug">{t.trades.allCardsBody(total)}</p>
      <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 pt-2" aria-label={t.trades.statDupes}>
        {dupes.map(({ card, qty }) => (
          <li key={card.id} className="relative shrink-0">
            <Cromo card={card} width={92} interactive={false} />
            <span className="absolute -right-1 -top-1 rounded-full border-2 border-ink bg-sun px-2 font-mono text-xs font-extrabold">×{qty}</span>
          </li>
        ))}
      </ul>
      <p className="font-extrabold">{t.trades.invite}</p>
      <div className="flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${enc(`${text} ${site}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center rounded-full bg-[#25d366] px-4 font-black text-[#0b2e17] no-underline"
        >
          WhatsApp
        </a>
        <a
          href={`https://x.com/intent/post?text=${enc(text)}&url=${enc(site)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center rounded-full bg-ink px-4 font-black text-white no-underline"
        >
          {t.trades.postX}
        </a>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(site);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // sin portapapeles
            }
          }}
          className="inline-flex min-h-12 items-center rounded-full border-2 border-ink bg-white px-4 font-extrabold"
        >
          {copied ? t.trades.copied : t.trades.copy}
        </button>
      </div>
    </div>
  );
}

function StepTitle({ n, children }: { n: number; children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2.5 text-lg font-extrabold">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-ink font-mono text-sm text-white">{n}</span>
      {children}
    </h3>
  );
}

/* ---------- Mis cambios ---------- */

function MyTrades({ open, history, site }: { open: TradeView[]; history: HistoryItem[]; site: string }) {
  const t = useT();
  const [tab, setTab] = useState<"open" | "done">("open");
  const [copied, setCopied] = useState<string | null>(null);
  const enc = encodeURIComponent;

  const copy = async (url: string, code: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // sin portapapeles
    }
  };

  const tabClass = (on: boolean) =>
    `inline-flex min-h-11 items-center rounded-full px-4 text-[15px] font-extrabold ${on ? "bg-ink text-white" : "text-ink hover:bg-black/5"}`;

  return (
    <section aria-labelledby="mios" className="panel flex flex-col gap-4 p-5 md:p-6">
      <h2 id="mios" className="display text-4xl">
        {t.trades.mine}
      </h2>
      <div role="tablist" aria-label={t.trades.mine} className="flex gap-1 self-start rounded-full border-2 border-ink p-1">
        <button type="button" role="tab" aria-selected={tab === "open"} onClick={() => setTab("open")} className={tabClass(tab === "open")}>
          {t.trades.tabOpen(open.length)}
        </button>
        <button type="button" role="tab" aria-selected={tab === "done"} onClick={() => setTab("done")} className={tabClass(tab === "done")}>
          {t.trades.tabDone(history.length)}
        </button>
      </div>

      {tab === "open" ? (
        open.length === 0 ? (
          <p className="font-semibold text-ink-soft">{t.trades.mineEmpty}</p>
        ) : (
          <ul role="tabpanel" className="flex flex-col gap-3">
            {open.map((tr) => {
              const url = `${site}/t/${tr.code}`;
              const text = t.trade.shareText(tr.offer.name ?? tr.offer.login, tr.want.name ?? tr.want.login);
              return (
                <li key={tr.code} className="flex flex-col gap-3 rounded-2xl border-2 border-ink p-3.5">
                  <Link href={`/t/${tr.code}`} className="flex items-center gap-2.5 font-extrabold no-underline">
                    <Avatar src={tr.offer.avatar_url} />
                    <span>#{cardNumber(tr.offer.id)}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M7 7h11l-3-3" />
                      <path d="M17 17H6l3 3" />
                    </svg>
                    <Avatar src={tr.want.avatar_url} dashed />
                    <span>#{cardNumber(tr.want.id)}</span>
                    <span className="grow" />
                    <span className="font-mono text-xs font-bold text-ink-soft">{tr.ago}</span>
                  </Link>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`https://wa.me/?text=${enc(`${text} ${url}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center rounded-full bg-[#25d366] px-3.5 text-sm font-black text-[#0b2e17] no-underline"
                    >
                      WhatsApp
                    </a>
                    <a
                      href={`https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center rounded-full bg-ink px-3.5 text-sm font-black text-white no-underline"
                    >
                      {t.trades.postX}
                    </a>
                    <button
                      type="button"
                      onClick={() => copy(url, tr.code)}
                      className="inline-flex min-h-11 items-center rounded-full border-2 border-ink px-3.5 text-sm font-extrabold"
                    >
                      {copied === tr.code ? t.trades.copied : t.trades.copy}
                    </button>
                    <form action={cancelTrade}>
                      <input type="hidden" name="code" value={tr.code} />
                      <Submit className="inline-flex min-h-11 items-center px-3 text-sm font-extrabold underline">{t.trades.cancel}</Submit>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : history.length === 0 ? (
        <p className="font-semibold text-ink-soft">{t.trades.doneEmpty}</p>
      ) : (
        <ul role="tabpanel" className="flex flex-col gap-2.5">
          {history.map((h) => (
            <li key={h.code} className="flex items-center gap-3 rounded-2xl border-2 border-ink/15 p-3">
              <Avatar src={h.partner?.avatar} />
              <p className="flex-1 text-[15px] font-bold leading-snug">
                {t.trades.history(h.partner?.login ?? t.trades.someone, label(h.gave), label(h.got))}
              </p>
              <span className="font-mono text-xs font-bold text-ink-soft">{h.ago}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- Tablón ---------- */

function Board({ items }: { items: BoardItem[] }) {
  const t = useT();
  const count = { can: items.filter((i) => i.kind === "can").length, want: items.filter((i) => i.kind === "want").length };
  const [filter, setFilter] = useState<"can" | "want" | "all">(count.can ? "can" : count.want ? "want" : "all");
  const shown = filter === "all" ? items : items.filter((i) => i.kind === filter);
  const filters = [
    { k: "can" as const, label: t.trades.filterCan(count.can) },
    { k: "want" as const, label: t.trades.filterWant(count.want) },
    { k: "all" as const, label: t.trades.filterAll(items.length) },
  ];

  return (
    <section aria-labelledby="tablon" className="flex flex-col gap-4 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="tablon" className="display text-5xl">
            {t.trades.board}
          </h2>
          <p className="mt-2 font-semibold text-ink-soft">{t.trades.boardBody}</p>
        </div>
        <div role="group" aria-label={t.trades.board} className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.k}
              type="button"
              aria-pressed={filter === f.k}
              onClick={() => setFilter(f.k)}
              className={`min-h-11 rounded-full border-2 border-ink px-4 text-[15px] font-extrabold ${filter === f.k ? "bg-ink text-white" : "bg-white"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="panel p-6 text-lg font-semibold">{t.trades.boardEmpty}</p>
      ) : (
        <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((b) => (
            <li
              key={b.code}
              className={`flex flex-col gap-3 rounded-2xl bg-white p-3.5 ${
                b.kind === "can" ? "border-2 border-ink shadow-[4px_4px_0_var(--color-sun)]" : "border-2 border-ink/20"
              }`}
            >
              <div className="flex items-center gap-2">
                <Avatar src={b.from?.avatar} size={30} />
                <span className="truncate text-sm font-extrabold">@{b.from?.login ?? t.trades.someone}</span>
                <span className="grow" />
                <span className="font-mono text-[11px] font-bold text-ink-soft">{b.ago}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm font-bold leading-tight">
                <div>
                  <span className="block text-[11px] font-extrabold uppercase text-ink-soft">{t.trades.gives}</span>
                  {label(b.offer)}
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 7h11l-3-3" />
                  <path d="M17 17H6l3 3" />
                </svg>
                <div>
                  <span className="block text-[11px] font-extrabold uppercase text-ink-soft">{t.trades.asks}</span>
                  {label(b.want)}
                </div>
              </div>
              <div className="mt-auto">
                {b.kind === "can" ? (
                  <AcceptFromBoard item={b} />
                ) : (
                  <Link
                    href={`/t/${b.code}`}
                    className={`inline-flex min-h-10 items-center rounded-full px-3 text-[13px] font-black no-underline ${
                      b.kind === "want" ? "border-2 border-ink bg-[#fff4cf]" : "border-2 border-ink/30"
                    }`}
                  >
                    {b.kind === "want" ? t.trades.tagWant : t.trades.seeTrade}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Si solo tienes una copia, pide confirmación antes de quedarte sin ella. */
function AcceptFromBoard({ item }: { item: BoardItem }) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const last = item.myQty < 2;

  return (
    <form action={acceptTrade} className="flex flex-col gap-2">
      <input type="hidden" name="code" value={item.code} />
      <input type="hidden" name="from" value="cambios" />
      {last && confirming && <p className="text-[13px] font-extrabold text-[#b3261e]">{t.trades.confirmLast(label(item.want))}</p>}
      {last && !confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="min-h-11 rounded-full bg-ink px-4 text-sm font-black text-sun"
        >
          {t.trades.youHaveIt} · {t.trades.accept}
        </button>
      ) : (
        <Submit className="min-h-11 rounded-full bg-ink px-4 text-sm font-black text-sun disabled:opacity-60">
          {last ? t.trades.confirmYes : `${t.trades.youHaveIt} · ${t.trades.accept}`}
        </Submit>
      )}
    </form>
  );
}

/* ---------- ¡Cambio hecho! ---------- */

function Celebration({ card, partner, left }: { card: Card; partner: Who | null; left: number }) {
  const t = useT();
  const router = useRouter();
  const reduce = useReducedMotion();
  const close = () => router.replace("/cambios", { scroll: false });

  useEffect(() => {
    sfx.reveal(card.rarity);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && router.replace("/cambios", { scroll: false });
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card.rarity, router]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 overflow-y-auto p-4 text-white"
      style={{ background: "radial-gradient(circle at 50% 38%, rgba(58,42,16,0.98), rgba(17,17,17,0.98) 64%)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hecho-titulo"
    >
      <p className="font-mono text-sm font-extrabold uppercase tracking-wider text-sun">{t.trades.tradeWith(partner?.login ?? t.trades.someone)}</p>
      <h2 id="hecho-titulo" className="display text-center text-6xl text-sun">
        {t.trade.done}
      </h2>
      <motion.div
        className="relative"
        initial={reduce ? false : { scale: 0.4, rotate: -20, y: 80 }}
        animate={{ scale: 1, rotate: 4, y: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 14 }}
      >
        <Cromo card={card} className="[--w:min(64vw,260px)]" />
        <span className="display absolute -right-3 -top-3 z-[3] rotate-[10deg] rounded-md border-2 border-ink bg-[#ff4d3d] px-2.5 py-1 text-lg text-white">
          {t.pack.newShort}
        </span>
      </motion.div>
      <p className="max-w-xs text-center text-lg font-semibold leading-snug text-white/90">
        {t.trades.nowInAlbum(label(card))} {t.trades.left(left)}
      </p>
      <div className="flex w-full max-w-sm flex-col gap-2.5">
        <Link href="/album" className="btn btn-sun w-full justify-center">
          {t.trades.seeMyAlbum}
        </Link>
        <button type="button" autoFocus onClick={close} className="btn btn-ghost w-full justify-center border-2 border-white/70 text-white hover:bg-white/10">
          {t.trades.another}
        </button>
      </div>
    </motion.div>
  );
}
