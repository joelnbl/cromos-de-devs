"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Cromo } from "./Cromo";
import { cardNumber, RARITIES, type Card } from "@/lib/cards";
import { sfx } from "@/lib/sound";

export function AlbumGrid({ cards, owned }: { cards: Card[]; owned: Record<number, number> }) {
  const [open, setOpen] = useState<Card | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!cards.length) {
    return (
      <div className="panel my-8 p-8 text-center">
        <p className="text-lg font-bold">Este álbum aún está vacío.</p>
        <p className="mt-2 text-ink-soft">Cuando alguien de aquí se registre, su hueco aparecerá.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-3 gap-3 pb-8 sm:grid-cols-4 sm:gap-5 lg:grid-cols-6">
        {cards.map((card, i) => {
          const qty = owned[card.id] ?? 0;
          return (
            <motion.li
              key={card.id}
              className="relative flex justify-center"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 24) * 0.025 }}
            >
              {qty > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(card);
                    sfx.flip();
                    sfx.reveal(card.rarity);
                  }}
                  className="relative cursor-zoom-in border-0 bg-transparent p-0"
                  aria-label={`Ver a ${card.name ?? card.login}`}
                >
                  <Cromo card={card} className="[--w:104px] sm:[--w:150px]" interactive={false} />
                  {qty > 1 && (
                    <span className="absolute -right-2 -top-2 rounded-full border-2 border-ink bg-sun px-2 py-0.5 font-mono text-xs font-bold">
                      ×{qty}
                    </span>
                  )}
                </button>
              ) : (
                <div
                  className="relative flex aspect-[63/88] w-[104px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-ink/15 sm:w-[150px]"
                  style={{
                    background:
                      "repeating-linear-gradient(135deg, #dcdcd7 0 6px, #e4e4df 6px 12px)",
                  }}
                  aria-label={`Te falta el cromo número ${card.id}`}
                >
                  <span className="h-10 w-10 rounded-xl bg-ink/80 blur-[1.5px] sm:h-14 sm:w-14" aria-hidden="true" />
                  <span className="text-[11px] font-extrabold uppercase text-ink/60 sm:text-xs">¿Quién será?</span>
                  <span className="font-mono text-[10px] font-bold text-ink/50 sm:text-xs">
                    #{cardNumber(card.id)} {RARITIES[card.rarity].symbol}
                  </span>
                </div>
              )}
            </motion.li>
          );
        })}
      </ul>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-ink/85 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`Cromo de ${open.name ?? open.login}`}
          >
            <motion.div
              initial={{ scale: 0.5, rotateY: -90 }}
              animate={{ scale: 1, rotateY: 0 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Cromo card={open} className="[--w:min(86vw,340px)]" />
            </motion.div>
            <div className="flex flex-wrap justify-center gap-3" onClick={(e) => e.stopPropagation()}>
              <Link href={`/c/${open.login}`} className="btn btn-sun">
                Ver su página
              </Link>
              <button type="button" className="btn btn-ghost border-white text-white" onClick={() => setOpen(null)}>
                Cerrar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
