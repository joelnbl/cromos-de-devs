"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Cromo } from "./Cromo";
import { Countdown } from "./Countdown";
import { RARITIES, type Card } from "@/lib/cards";
import { demoPack } from "@/lib/demo";
import type { PackResult } from "@/app/actions";

type Pull = { card: Card; isNew: boolean };
type Phase = "idle" | "tearing" | "reveal" | "summary" | "empty" | "done-today";

type Props = {
  demo: boolean;
  openedToday: boolean;
  nextAt: string;
  open?: () => Promise<PackResult>;
};

export function PackOpener({ demo, openedToday, nextAt, open }: Props) {
  const [phase, setPhase] = useState<Phase>(openedToday ? "done-today" : "idle");
  const [pulls, setPulls] = useState<Pull[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const reduce = useReducedMotion();

  const tear = () => {
    if (phase !== "idle" || pending) return;
    setError(null);
    setPhase("tearing");
    const started = Date.now();
    startTransition(async () => {
      let result: PackResult;
      if (demo || !open) {
        result = { ok: true, cards: demoPack() };
      } else {
        try {
          result = await open();
        } catch {
          result = { ok: false, error: "No se pudo abrir el sobre. Inténtalo de nuevo." };
        }
      }
      // Deja que termine la animación de rasgado.
      const wait = Math.max(0, (reduce ? 200 : 1300) - (Date.now() - started));
      await new Promise((r) => setTimeout(r, wait));
      if (!result.ok) {
        setError(result.error);
        setPhase(result.error.includes("Ya abriste") ? "done-today" : "idle");
        return;
      }
      if (!result.cards.length) {
        setPhase("empty");
        return;
      }
      setPulls(result.cards);
      setIndex(0);
      setPhase("reveal");
    });
  };

  const next = () => {
    if (index + 1 >= pulls.length) setPhase("summary");
    else setIndex((i) => i + 1);
  };

  const newCount = pulls.filter((p) => p.isNew).length;

  return (
    <div className="relative flex min-h-[640px] flex-col items-center justify-center overflow-hidden px-4 py-10">
      <Spotlight />

      {error && (
        <p role="alert" className="relative z-10 mb-6 rounded-xl bg-white px-4 py-3 font-bold text-ink">
          {error}
        </p>
      )}

      {(phase === "idle" || phase === "tearing") && (
        <div className="relative z-10 flex flex-col items-center gap-8">
          <Pack tearing={phase === "tearing"} onOpen={tear} reduce={Boolean(reduce)} />
          <p className="text-lg font-bold text-white" aria-live="polite">
            {phase === "tearing" ? "Abriendo…" : "Toca el sobre para abrirlo"}
          </p>
        </div>
      )}

      {phase === "reveal" && pulls[index] && (
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="font-mono text-sm font-bold text-sun">
            {index + 1} / {pulls.length}
          </div>
          <div className="relative grid place-items-center" style={{ width: 300, height: 420 }}>
            {/* Pila de cartas que quedan */}
            {pulls.slice(index + 1).map((p, i) => (
              <div
                key={`stack-${index + 1 + i}`}
                className="absolute"
                style={{ transform: `translate(${(i + 1) * 4}px, ${(i + 1) * 4}px)`, zIndex: -i - 1 }}
              >
                <Cromo card={p.card} width={280} faceDown interactive={false} />
              </div>
            ))}
            <AnimatePresence mode="popLayout">
              <RevealCard key={index} pull={pulls[index]} onNext={next} reduce={Boolean(reduce)} />
            </AnimatePresence>
          </div>
          <button type="button" onClick={next} className="btn btn-sun">
            {index + 1 >= pulls.length ? "Ver resumen" : "Siguiente cromo"}
          </button>
        </div>
      )}

      {phase === "summary" && (
        <motion.div
          className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="display text-center text-5xl text-white md:text-6xl">
            {newCount === 0 ? "Todos repetidos" : newCount === 1 ? "¡1 nuevo!" : `¡${newCount} nuevos!`}
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {pulls.map((p, i) => (
              <motion.div
                key={i}
                className="flex flex-col items-center gap-2"
                initial={{ opacity: 0, y: 40, rotate: (i - 2) * 4 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 200, damping: 18 }}
              >
                <Cromo card={p.card} width={170} />
                <Tag isNew={p.isNew} />
              </motion.div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/album" className="btn btn-sun">
              Ver mi álbum
            </Link>
            {newCount < pulls.length && (
              <Link href="/cambios" className="btn btn-ghost border-white text-white">
                Cambiar repetidos
              </Link>
            )}
          </div>
          {!demo && (
            <p className="font-mono text-sm text-white/80">
              Próximo sobre en <Countdown to={nextAt} />
            </p>
          )}
          {demo && (
            <button
              type="button"
              className="font-bold text-sun underline underline-offset-4"
              onClick={() => {
                setPhase("idle");
                setPulls([]);
              }}
            >
              Abrir otro (solo en modo demo)
            </button>
          )}
        </motion.div>
      )}

      {phase === "done-today" && (
        <div className="relative z-10 flex flex-col items-center gap-6 text-center text-white">
          <div className="sobre opacity-40 grayscale" style={{ "--pw": "180px" } as React.CSSProperties}>
            <div className="sobre-top" />
            <div className="sobre-body" />
          </div>
          <h2 className="display text-5xl">Sobre abierto</h2>
          <p className="max-w-sm text-lg">
            Ya abriste el sobre de hoy. El siguiente llega en{" "}
            <span className="font-mono font-bold text-sun">
              <Countdown to={nextAt} />
            </span>
            .
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/album" className="btn btn-sun">
              Ver mi álbum
            </Link>
            <Link href="/mi-cromo" className="btn btn-ghost border-white text-white">
              Compartir mi cromo
            </Link>
          </div>
        </div>
      )}

      {phase === "empty" && (
        <div className="relative z-10 flex max-w-md flex-col items-center gap-5 text-center text-white">
          <h2 className="display text-5xl">Aún no hay más devs</h2>
          <p className="text-lg">
            Eres de los primeros. Comparte tu cromo para que entre más gente y tus sobres traigan cromos.
          </p>
          <Link href="/mi-cromo" className="btn btn-sun">
            Compartir mi cromo
          </Link>
        </div>
      )}
    </div>
  );
}

function Tag({ isNew }: { isNew: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 font-mono text-xs font-bold ${isNew ? "bg-sun text-ink" : "bg-white/15 text-white"}`}
    >
      {isNew ? "NUEVO" : "REPETIDO"}
    </span>
  );
}

function Spotlight() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(circle at 50% 45%, rgba(255,199,44,0.25), transparent 55%), repeating-conic-gradient(from 0deg at 50% 45%, rgba(255,255,255,0.04) 0deg 6deg, transparent 6deg 12deg)",
      }}
    />
  );
}

function Pack({ tearing, onOpen, reduce }: { tearing: boolean; onOpen: () => void; reduce: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={onOpen}
      disabled={tearing}
      aria-label="Abrir el sobre del día"
      className="relative cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-4 focus-visible:outline-offset-8 focus-visible:outline-sun"
      style={{ perspective: 800 }}
      onPointerMove={(e) => {
        if (reduce || tearing) return;
        const r = e.currentTarget.getBoundingClientRect();
        setTilt({
          x: ((e.clientY - r.top) / r.height - 0.5) * -18,
          y: ((e.clientX - r.left) / r.width - 0.5) * 18,
        });
      }}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      animate={
        tearing
          ? { rotate: [0, -3, 3, -4, 4, -2, 0], scale: [1, 1.04, 1.04, 1.06, 1.06, 1.02, 1] }
          : reduce
            ? {}
            : { y: [0, -10, 0] }
      }
      transition={
        tearing
          ? { duration: 0.6, ease: "easeInOut" }
          : { duration: 3, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <div
        className="sobre"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: "transform 0.15s ease-out",
          "--pw": "240px",
        } as React.CSSProperties}
      >
        <motion.div
          className="sobre-top"
          animate={tearing ? { y: -160, x: 60, rotate: 28, opacity: 0 } : { y: 0, x: 0, rotate: 0, opacity: 1 }}
          transition={{ delay: tearing ? 0.55 : 0, duration: 0.5, ease: "easeOut" }}
        />
        <motion.div
          className="sobre-body"
          animate={tearing ? { y: 260, opacity: 0 } : { y: 0, opacity: 1 }}
          transition={{ delay: tearing ? 0.9 : 0, duration: 0.45, ease: "easeIn" }}
        >
          <span className="display text-center text-[2.6em]">
            Cromos
            <br />
            de devs
          </span>
          <span className="rounded-full bg-ink px-3 py-1 font-mono text-[0.8em] font-bold text-sun">
            5 CROMOS · T1
          </span>
        </motion.div>
      </div>
      <AnimatePresence>
        {tearing && (
          <motion.div
            key="flash"
            className="pointer-events-none absolute inset-0 rounded-full"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0], scale: [0.4, 1.8, 2.4] }}
            transition={{ delay: 0.5, duration: 0.8 }}
            style={{ background: "radial-gradient(circle, rgba(255,240,180,0.95), transparent 65%)" }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function RevealCard({ pull, onNext, reduce }: { pull: Pull; onNext: () => void; reduce: boolean }) {
  const [flipped, setFlipped] = useState(false);
  const special = pull.card.rarity === "epica" || pull.card.rarity === "legendaria";

  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), reduce ? 0 : 450);
    return () => clearTimeout(t);
  }, [reduce]);

  return (
    <motion.div
      className="absolute"
      initial={{ y: 40, scale: 0.9, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      exit={{ x: -420, y: -40, rotate: -24, opacity: 0, transition: { duration: 0.4, ease: "easeIn" } }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      {special && flipped && <Burst legendary={pull.card.rarity === "legendaria"} reduce={reduce} />}
      <button
        type="button"
        onClick={onNext}
        className="relative block cursor-pointer border-0 bg-transparent p-0"
        aria-label={`${pull.card.name ?? pull.card.login}, ${RARITIES[pull.card.rarity].label}. Siguiente cromo`}
      >
        <Cromo card={pull.card} width={280} faceDown={!flipped} />
      </button>
      <AnimatePresence>
        {flipped && (
          <motion.div
            className="absolute -top-5 left-0 right-0 z-20 flex justify-center"
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: -6 }}
            transition={{ delay: 0.35, type: "spring", stiffness: 400, damping: 14 }}
          >
            <span
              className={`block rounded-full border-2 border-ink px-4 py-1.5 font-mono text-sm font-bold shadow-[3px_3px_0_#111] ${pull.isNew ? "bg-sun text-ink" : "bg-white text-ink"}`}
            >
              {pull.isNew ? "¡NUEVO!" : "REPETIDO"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      {flipped && special && (
        <motion.p
          className="absolute -bottom-12 left-0 right-0 text-center font-mono text-sm font-bold text-sun"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {RARITIES[pull.card.rarity].symbol} {RARITIES[pull.card.rarity].label.toUpperCase()}
        </motion.p>
      )}
    </motion.div>
  );
}

function rand(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function Burst({ legendary, reduce }: { legendary: boolean; reduce: boolean }) {
  const sparks = useMemo(
    () =>
      // Pseudoaleatorio estable por índice: la explosión no cambia entre renders.
      Array.from({ length: legendary ? 28 : 16 }, (_, i) => {
        const angle = (i / (legendary ? 28 : 16)) * Math.PI * 2 + rand(i, 1) * 0.4;
        const dist = 180 + rand(i, 2) * 140;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          size: 6 + rand(i, 3) * 10,
          delay: rand(i, 4) * 0.15,
          color: legendary
            ? ["#FFD84D", "#FFF3C0", "#F5B700", "#FFFFFF"][i % 4]
            : ["#B794FF", "#7FE7FF", "#FFFFFF"][i % 3],
        };
      }),
    [legendary],
  );
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden="true">
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 520,
          height: 520,
          left: -260,
          top: -260,
          background: legendary
            ? "repeating-conic-gradient(rgba(255,216,77,0.35) 0deg 10deg, transparent 10deg 20deg)"
            : "repeating-conic-gradient(rgba(183,148,255,0.3) 0deg 10deg, transparent 10deg 20deg)",
          maskImage: "radial-gradient(circle, #000 20%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(circle, #000 20%, transparent 70%)",
        }}
        initial={{ scale: 0.2, opacity: 0, rotate: 0 }}
        animate={{ scale: 1, opacity: 1, rotate: 90 }}
        transition={{ duration: 6, ease: "linear", opacity: { duration: 0.4 }, scale: { duration: 0.5 } }}
      />
      {sparks.map((s, i) => (
        <motion.span
          key={i}
          className="absolute block rotate-45"
          style={{ width: s.size, height: s.size, background: s.color, borderRadius: 2 }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: s.x, y: s.y, opacity: 0, scale: 0.3 }}
          transition={{ duration: 1.1, delay: s.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
