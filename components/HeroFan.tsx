"use client";

import { motion, useReducedMotion } from "motion/react";
import { Cromo } from "./Cromo";
import type { Card } from "@/lib/cards";

const POSE = [
  { rotate: -12, x: 70, y: 26 },
  { rotate: 0, x: 0, y: -10 },
  { rotate: 12, x: -70, y: 26 },
];

export function HeroFan({ cards }: { cards: Card[] }) {
  const reduce = useReducedMotion();
  const examples = cards.every((c) => c.avatar_url?.startsWith("/demo/"));
  return (
    <figure className="m-0 flex flex-col items-center">
    <div className="flex h-[400px] items-center justify-center md:h-[460px]" aria-label="Cromos de ejemplo">
      {cards.slice(0, 3).map((card, i) => (
        <motion.div
          key={card.id}
          style={{ zIndex: i === 1 ? 2 : 1 }}
          initial={reduce ? false : { y: 220, rotate: 0, x: 0, opacity: 0 }}
          animate={{ ...POSE[i], opacity: 1 }}
          transition={{ delay: 0.15 + i * 0.12, type: "spring", stiffness: 140, damping: 16 }}
          whileHover={reduce ? undefined : { y: POSE[i].y - 18, scale: 1.04, zIndex: 3 }}
        >
          <Cromo card={card} width={i === 1 ? 250 : 220} className="max-sm:[--w:150px]!" />
        </motion.div>
      ))}
    </div>
    {examples && (
      <figcaption className="font-mono text-xs font-bold text-ink/70">Cromos de ejemplo · personas inventadas</figcaption>
    )}
    </figure>
  );
}
