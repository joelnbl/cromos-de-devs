"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Cromo } from "./Cromo";
import { PACK_ODDS, RARITIES, RARITY_ORDER, cardNumber, countryName, type Card, type Rarity } from "@/lib/cards";
import { useLocale, useT } from "@/lib/i18n/client";

export type PackInfo = {
  dateLabel: string;
  streak: number;
  week: { label: string; done: boolean; today: boolean }[];
  owned: Record<number, number>;
  countryOf: Record<number, string>;
  total: number;
  offers: { offer: number; want: number }[];
  todayCards: Card[];
  site: string;
};

type Pull = { card: Card; isNew: boolean };

const ODDS_BAR: Record<Rarity, string> = {
  comun: "#c48a5a",
  rara: "#b8c2cc",
  epica: "#e2b33a",
  legendaria: "#fff3b0",
  icono: "linear-gradient(90deg,#ff6ec7,#ffd86e,#7dffb0,#6ec8ff,#b18cff)",
};
const RING: Record<Rarity, string> = { comun: "#c48a5a", rara: "#b8c2cc", epica: "#e2b33a", legendaria: "#fff3b0", icono: "#b18cff" };

/* ---------- Cálculos sobre la colección ---------- */

export function withPulls(owned: Record<number, number>, pulls: Pull[]) {
  const next = { ...owned };
  for (const p of pulls) next[p.card.id] = (next[p.card.id] ?? 0) + 1;
  return next;
}

function albumStats(info: PackInfo, owned: Record<number, number>) {
  const have = Object.keys(owned).length;
  const dupes = Object.values(owned).reduce((n, q) => n + Math.max(0, q - 1), 0);
  const perfect = info.offers.filter((o) => !owned[o.offer] && (owned[o.want] ?? 0) >= 2).length;
  // La selección más cerca de completarse (y aún sin completar)
  const by = new Map<string, { have: number; total: number }>();
  for (const [id, code] of Object.entries(info.countryOf)) {
    const s = by.get(code) ?? { have: 0, total: 0 };
    s.total++;
    if (owned[Number(id)]) s.have++;
    by.set(code, s);
  }
  const selection =
    [...by.entries()]
      .filter(([, s]) => s.have > 0 && s.have < s.total && s.total >= 2)
      .sort(([, a], [, b]) => b.have / b.total - a.have / a.total || a.total - a.have - (b.total - b.have))
      .map(([code, s]) => ({ code, ...s }))[0] ?? null;
  return { have, dupes, perfect, selection };
}

/* ---------- Antes de abrir ---------- */

export function StreakPanel({ info }: { info: PackInfo }) {
  const t = useT();
  const { have } = albumStats(info, info.owned);
  return (
    <aside aria-label={t.pack.streakAria} className="flex flex-col gap-4 rounded-3xl border-2 border-white/20 bg-black/35 p-5 text-white">
      <p className="flex items-baseline gap-2.5">
        <span className="font-mono text-5xl font-extrabold leading-none text-sun">{info.streak}</span>
        <span className="text-xl font-black">{t.pack.streakDays(info.streak)}</span>
      </p>
      <p className="font-semibold leading-snug text-white/80">{t.pack.streakBody}</p>
      <ol aria-label={t.pack.streakWeek} className="grid grid-cols-7 gap-1.5">
        {info.week.map((d, i) => (
          <li key={i} className="flex flex-col items-center gap-1.5">
            <span
              className={`grid h-8 w-8 place-items-center rounded-full text-sm font-black ${
                d.done ? "bg-sun text-ink" : d.today ? "border-2 border-dashed border-sun text-sun" : "bg-white/10"
              }`}
            >
              {d.done ? "✓" : d.today ? "?" : ""}
            </span>
            <span className="font-mono text-[11px] font-extrabold uppercase text-white/70">{d.label}</span>
          </li>
        ))}
      </ol>
      <div className="h-0.5 bg-white/10" />
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-extrabold text-white/80">{t.pack.yourAlbum}</span>
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 grow overflow-hidden rounded-full bg-white/15">
            <span className="block h-full bg-sun" style={{ width: `${info.total ? (have / info.total) * 100 : 0}%` }} />
          </span>
          <span className="font-mono text-sm font-extrabold">
            {have} / {info.total}
          </span>
        </div>
      </div>
    </aside>
  );
}

export function OddsPanel() {
  const t = useT();
  return (
    <aside aria-labelledby="odds-title" className="flex flex-col gap-3.5 rounded-3xl border-2 border-white/20 bg-black/35 p-5 text-white">
      <h2 id="odds-title" className="text-xl font-black">
        {t.pack.oddsTitle}
      </h2>
      <p className="text-sm font-semibold leading-snug text-white/80">{t.pack.oddsBody}</p>
      <ul className="flex flex-col gap-2.5">
        {RARITY_ORDER.map((r) => (
          <li key={r} className="grid grid-cols-[7.5rem_minmax(0,1fr)_3.5rem] items-center gap-2.5">
            <span className="font-extrabold">
              {RARITIES[r].symbol} {t.rarity[r].label}
            </span>
            <span className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <span className="block h-full min-w-1" style={{ width: `${PACK_ODDS[r]}%`, background: ODDS_BAR[r] }} />
            </span>
            <span className="text-right font-mono text-sm font-extrabold">{String(PACK_ODDS[r]).replace(".", ",")} %</span>
          </li>
        ))}
      </ul>
      <p className="text-[13px] font-semibold leading-snug text-white/70">{t.pack.oddsNote}</p>
    </aside>
  );
}

/* ---------- Resumen tras abrir ---------- */

export function PackSummary({ pulls, info, demo, nextAt, onDemoAgain }: {
  pulls: Pull[];
  info: PackInfo;
  demo: boolean;
  nextAt: string;
  onDemoAgain: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const before = albumStats(info, info.owned);
  const after = albumStats(info, withPulls(info.owned, pulls));
  const newCount = pulls.filter((p) => p.isNew).length;
  const repeated = pulls.length - newCount;
  const best = [...pulls].sort((a, b) => RARITY_ORDER.indexOf(b.card.rarity) - RARITY_ORDER.indexOf(a.card.rarity))[0];
  const bragText = best ? t.pack.bragText(best.card.name ?? best.card.login, t.rarity[best.card.rarity].label) : "";
  const enc = encodeURIComponent;
  const shareUrl = `${info.site}/s?c=${pulls.map((p) => p.card.id).join(",")}`;
  const pct = (n: number) => (info.total ? (n / info.total) * 100 : 0);

  return (
    <motion.div
      className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-6 text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="font-mono text-xs font-extrabold uppercase tracking-wider text-sun">{t.pack.openedKicker(info.dateLabel)}</p>
        <h2 className="display text-6xl text-sun md:text-7xl">{newCount === 0 ? t.pack.allRepeated : t.pack.nNew(newCount)}</h2>
      </div>

      <ul className="grid grid-cols-3 justify-items-center gap-x-2.5 gap-y-6 sm:flex sm:flex-wrap sm:justify-center sm:gap-4">
        {pulls.map((p, i) => (
          <motion.li
            key={i}
            className="relative"
            initial={{ opacity: 0, y: 40, rotate: (i - 2) * 4 }}
            animate={{ opacity: p.isNew ? 1 : 0.75, y: 0, rotate: [-3, 2, -1, 3, -2][i % 5] }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 200, damping: 18 }}
          >
            <Cromo card={p.card} className="[--w:min(29vw,108px)] sm:[--w:160px]" />
            <span
              className={`absolute -bottom-3 left-1/2 z-[3] -translate-x-1/2 -rotate-6 whitespace-nowrap rounded-md border-2 border-ink px-2 py-0.5 text-xs font-black ${
                p.isNew ? "bg-[#ff4d3d] text-white" : "bg-white text-ink"
              }`}
            >
              {p.isNew ? t.pack.newShort : t.pack.repeatedTag}
            </span>
          </motion.li>
        ))}
      </ul>

      <div className="flex w-full max-w-md flex-col gap-2 rounded-2xl border-2 border-white/20 p-4">
        <div className="flex items-baseline justify-between">
          <span className="font-black">{t.pack.yourAlbum}</span>
          <span className="font-mono font-extrabold">
            {newCount > 0 && <span className="text-sun">+{newCount} · </span>}
            {after.have} / {info.total}
          </span>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-white/15">
          <span className="absolute inset-y-0 left-0 bg-white" style={{ width: `${pct(before.have)}%` }} />
          <motion.span
            className="absolute inset-y-0 bg-sun"
            style={{ left: `${pct(before.have)}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${pct(after.have - before.have)}%` }}
            transition={{ delay: 0.6, duration: 0.8 }}
          />
        </div>
        {after.selection && (
          <p className="text-sm font-semibold text-white/80">
            {t.pack.selectionLeft(
              countryName(after.selection.code, locale, t.myCard.otherCountry),
              after.selection.have,
              after.selection.total,
            )}
          </p>
        )}
      </div>

      {repeated > 0 && (
        <div className="flex w-full max-w-md flex-col gap-3 rounded-2xl bg-sun p-4 text-ink">
          <p className="font-extrabold leading-snug">
            {t.pack.dupesPulled(repeated)} {after.perfect > 0 && t.pack.perfectWaiting(after.perfect)}
          </p>
          <Link href="/cambios" className="btn btn-dark w-full justify-center shadow-none">
            {after.perfect > 0 ? t.pack.seeTrade : t.pack.tradeDupes}
          </Link>
        </div>
      )}

      {!demo && best && (
        <div className="flex w-full max-w-md flex-col gap-2.5">
          <p className="text-center font-extrabold text-white/80">{t.pack.brag}</p>
          <div className="grid grid-cols-2 gap-2.5">
            <a
              href={`https://x.com/intent/post?text=${enc(bragText)}&url=${enc(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-13 items-center justify-center rounded-full bg-white font-black text-ink no-underline"
            >
              {t.pack.postX}
            </a>
            <a
              href={`https://wa.me/?text=${enc(`${bragText} ${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-13 items-center justify-center rounded-full bg-[#25d366] font-black text-[#0b2e17] no-underline"
            >
              WhatsApp
            </a>
          </div>
        </div>
      )}

      <Link href="/album" className="btn btn-ghost w-full max-w-md justify-center border-2 border-white/70 text-white hover:bg-white/10">
        {t.pack.seeAlbum}
      </Link>

      {demo ? (
        <button type="button" className="font-bold text-sun underline underline-offset-4" onClick={onDemoAgain}>
          {t.pack.demoAgain}
        </button>
      ) : (
        <p className="font-mono text-sm text-white/80">
          {t.pack.nextPackIn} <CountdownText to={nextAt} />
        </p>
      )}
    </motion.div>
  );
}

/* ---------- Ya abierto: vuelve mañana ---------- */

export function DoneToday({ info, nextAt }: { info: PackInfo; nextAt: string }) {
  const t = useT();
  const locale = useLocale();
  const { dupes, perfect, selection } = albumStats(info, info.owned);
  const [copied, setCopied] = useState(false);

  const invite = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: t.trades.inviteText, url: info.site });
        return;
      }
      await navigator.clipboard.writeText(`${t.trades.inviteText} ${info.site}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // cancelado
    }
  };

  return (
    <div className="relative z-10 flex w-full max-w-xl flex-col gap-6 text-white">
      <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-sun/35 px-4 pb-6 pt-5 text-center" style={{ background: "radial-gradient(circle at 50% 30%, #3a2a10, #1a1408 70%)" }}>
        <p className="font-mono text-xs font-extrabold uppercase tracking-wider text-sun">{t.pack.alreadyKicker}</p>
        <h2 className="display text-4xl md:text-5xl">{t.pack.nextArrives}</h2>
        <BigCountdown to={nextAt} />
        {info.streak > 0 && (
          <p className="mt-1 rounded-2xl bg-white/10 px-4 py-2 font-extrabold leading-snug">{t.pack.keepStreak(info.streak)}</p>
        )}
      </div>

      {info.todayCards.length > 0 && (
        <section aria-labelledby="hoy" className="flex flex-col gap-2.5">
          <h3 id="hoy" className="text-lg font-black">
            {t.pack.todayPulled}
          </h3>
          <ul className="flex gap-2">
            {info.todayCards.map((c, i) => (
              <li key={`${c.id}-${i}`} className="flex-1">
                <Link href={`/c/${c.login}`} className="flex flex-col items-center gap-1 no-underline" aria-label={`#${cardNumber(c.id)} ${c.name ?? c.login}`}>
                  <img
                    src={c.avatar_url ?? ""}
                    alt=""
                    width={58}
                    height={58}
                    loading="lazy"
                    decoding="async"
                    className="h-14 w-14 rounded-2xl border-[3px] bg-[#e9eef5] object-cover"
                    style={{ borderColor: RING[c.rarity] }}
                  />
                  <span className="font-mono text-[11px] font-extrabold text-white/75">#{cardNumber(c.id)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="mientras" className="flex flex-col gap-2.5">
        <h3 id="mientras" className="text-lg font-black">
          {t.pack.meanwhile}
        </h3>
        <Tile href="/cambios" strong icon={<SwapIcon />} title={dupes > 0 ? t.pack.tradeTile(dupes) : t.pack.tradeTileNone} sub={perfect > 0 ? t.pack.perfectShort(perfect) : t.pack.tradeTileSub} />
        <button type="button" onClick={invite} className="flex items-center gap-3.5 rounded-2xl border-2 border-white/25 p-4 text-left hover:bg-white/5">
          <ShareIcon />
          <span className="flex grow flex-col gap-0.5">
            <span className="text-[17px] font-black">{copied ? t.pack.copied : t.pack.inviteTile}</span>
            <span className="text-sm font-semibold text-white/75">{t.pack.inviteTileSub}</span>
          </span>
          <Chevron />
        </button>
        {selection && (
          <Tile
            href={`/album?pais=${selection.code}`}
            icon={<span className="w-7 text-center font-mono text-sm font-extrabold text-sun">{selection.have}/{selection.total}</span>}
            title={t.pack.selectionTile(countryName(selection.code, locale, t.myCard.otherCountry))}
            sub={t.pack.selectionTileSub(selection.total - selection.have)}
          />
        )}
      </section>
    </div>
  );
}

function Tile({ href, icon, title, sub, strong }: { href: string; icon: React.ReactNode; title: string; sub: string; strong?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3.5 rounded-2xl p-4 no-underline ${strong ? "bg-sun text-ink" : "border-2 border-white/25 text-white hover:bg-white/5"}`}
    >
      {icon}
      <span className="flex grow flex-col gap-0.5">
        <span className="text-[17px] font-black">{title}</span>
        <span className={`text-sm font-semibold ${strong ? "" : "text-white/75"}`}>{sub}</span>
      </span>
      <Chevron />
    </Link>
  );
}

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  return now;
}

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0"));
}

function CountdownText({ to }: { to: string }) {
  const now = useNow();
  return <time dateTime={to}>{now === null ? "--:--:--" : parts(new Date(to).getTime() - now).join(":")}</time>;
}

function BigCountdown({ to }: { to: string }) {
  const t = useT();
  const now = useNow();
  const [h, m, s] = now === null ? ["--", "--", "--"] : parts(new Date(to).getTime() - now);
  const box = "flex min-w-[4.5rem] flex-col items-center gap-1 rounded-2xl px-3 py-2.5";
  return (
    <time dateTime={to} className="mt-1 flex gap-2">
      <span className={`${box} bg-sun text-ink`}>
        <span className="font-mono text-4xl font-extrabold leading-none">{h}</span>
        <span className="text-xs font-extrabold">{t.pack.hours}</span>
      </span>
      <span className={`${box} bg-sun text-ink`}>
        <span className="font-mono text-4xl font-extrabold leading-none">{m}</span>
        <span className="text-xs font-extrabold">{t.pack.minutes}</span>
      </span>
      <span className={`${box} bg-white/10`}>
        <span className="font-mono text-4xl font-extrabold leading-none">{s}</span>
        <span className="text-xs font-extrabold">{t.pack.seconds}</span>
      </span>
    </time>
  );
}

function SwapIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 7h11l-3-3" />
      <path d="M17 17H6l3 3" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M16 6l-4-4-4 4" />
      <path d="M12 2v13" />
    </svg>
  );
}
function Chevron() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
