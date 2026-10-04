"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Cromo } from "./Cromo";
import { ChevronIcon, CloseIcon } from "./icons";
import { DevWorldButton } from "./DevWorldButton";
import { cardName, cardNumber, RARITIES, type Card } from "@/lib/cards";
import { sfx } from "@/lib/sound";
import { useT } from "@/lib/i18n/client";

export type Sheet = { page: number; cards: Card[] };
type PageLink = { href: string; label: string } | null;

/** Giro pequeño y estable por cromo, como una pegatina pegada a mano. */
const tilt = (id: number) => (((id * 37) % 7) - 3) * 0.5;

export function AlbumBook({
  title,
  sheets,
  owned,
  prev,
  next,
  spreadCount,
  spreadIndex,
}: {
  title: string;
  sheets: Sheet[];
  owned: Record<number, number>;
  prev: PageLink;
  next: PageLink;
  spreadCount: number;
  spreadIndex: number;
}) {
  const t = useT();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<Card | null>(null);
  const [copied, setCopied] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const cards = sheets.flatMap((s) => s.cards);
  const mine = cards.filter((c) => owned[c.id]);
  const missing = cards.filter((c) => !owned[c.id]);

  const show = (card: Card) => {
    setOpen(card);
    sfx.flip();
    sfx.reveal(card.rarity);
  };
  const step = (dir: 1 | -1) => {
    if (!open || mine.length < 2) return;
    const i = mine.findIndex((c) => c.id === open.id);
    setOpen(mine[(i + dir + mine.length) % mine.length]);
    sfx.flip();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Deslizar a los lados: pasa la página del álbum, o el cromo si hay uno abierto
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent, inModal = false) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (inModal) return step(dx < 0 ? 1 : -1);
    const target = dx < 0 ? next : prev;
    if (target) {
      sfx.page();
      router.push(target.href, { scroll: false });
    }
  };

  const askMissing = async () => {
    const nums = missing.map((c) => `#${cardNumber(c.id)}`).join(", ");
    const text = t.album.askText(title, nums);
    const url = `${window.location.origin}/cambios`;
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // la persona canceló
    }
  };

  return (
    <>
      <section
        aria-label={t.album.spreadAria(title, sheets[0]?.page ?? 1, (sheets[0]?.page ?? 1) + 1)}
        onTouchStart={onTouchStart}
        onTouchEnd={(e) => onTouchEnd(e)}
        className="relative grid overflow-hidden rounded-[22px] border-[3px] border-ink bg-[#fbfaf5] shadow-[5px_5px_0_#111] md:grid-cols-2 md:shadow-[8px_8px_0_#111]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-1/2 z-[1] hidden w-11 -translate-x-1/2 md:block"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.12) 45%, rgba(0,0,0,0.22) 50%, rgba(0,0,0,0.12) 55%, rgba(0,0,0,0) 100%)",
          }}
        />
        {sheets.map((sheet, si) => (
          <div
            key={sheet.page}
            className={`album-paper flex flex-col gap-5 px-3.5 py-5 sm:px-6 md:px-9 md:py-8 ${si === 1 ? "border-t-2 border-dashed border-ink/15 md:border-t-0" : ""}`}
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              {si === 0 ? (
                <div>
                  <p className="font-mono text-[11px] font-extrabold uppercase tracking-wider text-ink-soft md:text-xs">{t.album.sheet(sheet.page)}</p>
                  <h2 className="display mt-1.5 text-[clamp(1.9rem,6vw,3rem)] [overflow-wrap:anywhere]">{title}</h2>
                </div>
              ) : (
                <p className="font-mono text-[11px] font-extrabold uppercase tracking-wider text-ink-soft md:text-xs">
                  {t.album.sheet(sheet.page)} · {title}
                </p>
              )}
              {si === 0 ? (
                <span className="rounded-full border-2 border-ink bg-white px-3 py-1 font-mono text-sm font-extrabold">
                  {mine.length} / {cards.length}
                </span>
              ) : missing.length > 0 ? (
                <button
                  type="button"
                  onClick={askMissing}
                  className="inline-flex min-h-11 items-center rounded-full border-2 border-ink bg-white px-4 text-sm font-extrabold hover:bg-sun"
                >
                  {copied ? t.album.copied : t.album.askMissing(missing.length)}
                </button>
              ) : null}
            </div>

            <ul className="grid grid-cols-2 justify-items-center gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4">
              {sheet.cards.map((card, i) => {
                const qty = owned[card.id] ?? 0;
                const r = RARITIES[card.rarity];
                return (
                  <motion.li
                    key={card.id}
                    className="relative"
                    initial={reduce || si * 6 + i >= 6 ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (si * 6 + i) * 0.035 }}
                  >
                    {qty > 0 ? (
                      <button
                        type="button"
                        onClick={() => show(card)}
                        onPointerEnter={(e) => e.pointerType === "mouse" && sfx.brush()}
                        className="block cursor-zoom-in border-0 bg-transparent p-0 transition-transform hover:-translate-y-1"
                        style={{ rotate: `${tilt(card.id)}deg` }}
                        aria-label={t.album.seeAria(cardName(card))}
                      >
                        <Cromo card={card} interactive={false} eager={si === 0} className="album-slot" />
                        {qty > 1 && (
                          <span className="absolute -right-2 -top-2 z-[2] rounded-full border-2 border-ink bg-sun px-2 py-0.5 font-mono text-[13px] font-extrabold">
                            ×{qty}
                          </span>
                        )}
                      </button>
                    ) : (
                      <Link
                        href={`/cambios?busco=${card.id}`}
                        aria-label={t.album.findAria(cardNumber(card.id))}
                        className="album-slot album-missing flex flex-col items-center justify-center gap-2 rounded-[14px] border-[2.5px] border-dashed border-ink/35 bg-ink/[0.035] text-ink no-underline hover:border-ink/60 hover:bg-ink/[0.06]"
                      >
                        <span className="font-mono text-3xl font-extrabold text-ink/35">{cardNumber(card.id)}</span>
                        <span className="h-14 w-14 rounded-[14px] bg-ink/[0.13]" aria-hidden="true" />
                        <span className="text-[13px] font-extrabold text-ink/65">
                          {t.rarity[card.rarity].label} {r.symbol}
                        </span>
                      </Link>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <nav aria-label={t.album.albumsAria} className="flex flex-wrap items-center justify-between gap-3 pb-6 pt-2">
        {prev ? (
          <Link href={prev.href} scroll={false} onClick={() => sfx.page()} aria-label={t.album.prevAria} className="btn btn-ghost border-2 border-ink bg-white">
            <ChevronIcon dir="left" />
            <span className="hidden sm:inline">{prev.label}</span>
          </Link>
        ) : (
          <span />
        )}
        <p className="flex items-center gap-2 text-sm font-bold text-ink-soft">
          {spreadCount <= 12 ? (
            Array.from({ length: spreadCount }, (_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={`h-2.5 rounded-full ${i === spreadIndex ? "w-7 bg-ink" : "w-2.5 bg-ink/20"}`}
              />
            ))
          ) : (
            <span className="font-mono">
              {spreadIndex + 1} / {spreadCount}
            </span>
          )}
          <span className="sr-only">
            {spreadIndex + 1} / {spreadCount}
          </span>
        </p>
        {next ? (
          <Link href={next.href} scroll={false} onClick={() => sfx.page()} aria-label={t.album.nextAria} className="btn btn-dark">
            <span className="hidden sm:inline">{next.label}</span>
            <ChevronIcon dir="right" />
          </Link>
        ) : (
          <span />
        )}
        {(prev || next) && <p className="w-full text-center text-sm font-semibold text-ink-soft md:hidden">{t.album.swipe}</p>}
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-y-auto p-4"
            style={{ background: "radial-gradient(circle at 50% 32%, rgba(58,42,16,0.97), rgba(17,17,17,0.97) 62%)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
            onTouchStart={onTouchStart}
            onTouchEnd={(e) => onTouchEnd(e, true)}
            role="dialog"
            aria-modal="true"
            aria-label={t.album.cardAria(cardName(open))}
          >
            <button
              type="button"
              autoFocus
              onClick={() => setOpen(null)}
              aria-label={t.album.close}
              className="absolute right-4 top-4 grid h-12 w-12 place-items-center rounded-full border-2 border-white/50 text-white hover:bg-white/10"
            >
              <CloseIcon size={20} />
            </button>

            <div className="flex items-center gap-2 sm:gap-6" onClick={(e) => e.stopPropagation()}>
              {mine.length > 1 && (
                <button type="button" onClick={() => step(-1)} aria-label={t.album.prevCard} className="hidden h-12 w-12 place-items-center rounded-full border-2 border-white/50 text-white hover:bg-white/10 sm:grid">
                  <ChevronIcon dir="left" />
                </button>
              )}
              <motion.div
                key={open.id}
                initial={reduce ? false : { scale: 0.6, rotateY: -90 }}
                animate={{ scale: 1, rotateY: 0 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 20 }}
              >
                <Cromo card={open} eager className="[--w:min(72vw,320px)]" />
              </motion.div>
              {mine.length > 1 && (
                <button type="button" onClick={() => step(1)} aria-label={t.album.nextCard} className="hidden h-12 w-12 place-items-center rounded-full border-2 border-white/50 text-white hover:bg-white/10 sm:grid">
                  <ChevronIcon dir="right" />
                </button>
              )}
            </div>

            <div className="flex w-full max-w-sm flex-col gap-3 text-white" onClick={(e) => e.stopPropagation()}>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border-2 border-white/25 px-4 py-3">
                  <p className="font-mono text-2xl font-extrabold text-sun">×{owned[open.id] ?? 1}</p>
                  <p className="text-sm font-bold text-white/85">{(owned[open.id] ?? 1) > 1 ? t.album.youHaveDup : t.album.youHaveOne}</p>
                </div>
                <div className="rounded-2xl border-2 border-white/25 px-4 py-3">
                  <p className="font-mono text-2xl font-extrabold">{open.owners}</p>
                  <p className="text-sm font-bold text-white/85">{t.album.owners(open.owners)}</p>
                </div>
              </div>
              {(owned[open.id] ?? 1) > 1 && (
                <Link href={`/cambios?dar=${open.id}`} className="btn btn-sun w-full justify-center">
                  {t.album.tradeDup}
                </Link>
              )}
              <Link href={`/c/${open.login}`} className="btn btn-ghost w-full justify-center border-2 border-white/70 text-white hover:bg-white/10">
                {t.album.seePage}
              </Link>
              <DevWorldButton card={open} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
