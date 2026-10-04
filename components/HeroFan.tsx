"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion, useAnimate, useReducedMotion } from "motion/react";
import { Cromo } from "./Cromo";
import { SoundToggle } from "./SoundToggle";
import type { Card } from "@/lib/cards";
import { sfx } from "@/lib/sound";
import { useT } from "@/lib/i18n/client";

const POSE = [
  { rotate: -12, x: 70, y: 26 },
  { rotate: 0, x: 0, y: -10 },
  { rotate: 12, x: -70, y: 26 },
];

export function HeroFan({ cards }: { cards: Card[] }) {
  const reduce = useReducedMotion();
  const t = useT();
  const [scope, animate] = useAnimate();
  const busy = useRef(false);
  const examples = cards.every((c) => c.avatar_url?.startsWith("/demo/"));

  // Las cartas se juntan en el centro, se cruzan y vuelven a abrirse en abanico.
  const shuffle = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    sfx.shuffle();
    if (reduce || !scope.current) {
      busy.current = false;
      return;
    }
    const runs = POSE.map((_, i) => {
      const side = i === 1 ? 0 : i === 0 ? 1 : -1;
      return animate(
        `[data-fan="${i}"]`,
        {
          x: [0, side * 64, -side * 26, side * 10, 0],
          y: [0, -14 - i * 4, 6, -4, 0],
          rotate: [0, side * 10, -side * 6, side * 2, 0],
        },
        { duration: 0.85, delay: i * 0.05, ease: "easeInOut" },
      );
    });
    Promise.all(runs).finally(() => {
      busy.current = false;
    });
  }, [animate, reduce, scope]);

  // El navegador no deja sonar nada hasta el primer toque: ese toque baraja.
  useEffect(() => {
    const first = (e: Event) => {
      if (e instanceof KeyboardEvent && (e.ctrlKey || e.metaKey || e.altKey || e.key === "Tab")) return;
      window.removeEventListener("pointerdown", first, true);
      window.removeEventListener("keydown", first, true);
      if ((e.target as Element | null)?.closest?.("[data-sound-toggle], [data-fan-deck]")) return;
      shuffle();
    };
    window.addEventListener("pointerdown", first, true);
    window.addEventListener("keydown", first, true);
    return () => {
      window.removeEventListener("pointerdown", first, true);
      window.removeEventListener("keydown", first, true);
    };
  }, [shuffle]);

  return (
    <figure className="relative m-0 flex flex-col items-center">
      <SoundToggle tone="dark" className="absolute right-0 top-2 z-10" />
      <button
        type="button"
        data-fan-deck
        ref={scope}
        onClick={shuffle}
        aria-label={`${t.home.examplesAria} · ${t.home.shuffle}`}
        title={t.home.shuffle}
        className="flex h-[400px] cursor-pointer items-center justify-center rounded-3xl bg-transparent p-0 md:h-[460px]"
      >
        {cards.slice(0, 3).map((card, i) => (
          <motion.div
            key={card.id}
            style={{ zIndex: i === 1 ? 2 : 1 }}
            initial={reduce ? false : { y: 220, rotate: 0, x: 0, opacity: 0 }}
            animate={{ ...POSE[i], opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.12, type: "spring", stiffness: 140, damping: 16 }}
            whileHover={reduce ? undefined : { y: POSE[i].y - 18, scale: 1.04, zIndex: 3 }}
            onPointerEnter={(e) => e.pointerType === "mouse" && sfx.brush()}
          >
            <div data-fan={i}>
              <Cromo card={card} width={i === 1 ? 250 : 220} className="max-sm:[--w:150px]!" />
            </div>
          </motion.div>
        ))}
      </button>
      {examples && (
        <figcaption className="font-mono text-xs font-bold text-ink/70">{t.home.examplesCaption}</figcaption>
      )}
    </figure>
  );
}
