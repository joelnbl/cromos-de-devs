"use client";

import { useCallback, useRef, type CSSProperties, type PointerEvent } from "react";
import { RARITIES, cardNumber, formatCount, isCreator, langStyle, yearsOnGithub, type Card } from "@/lib/cards";
import { useT } from "@/lib/i18n/client";

type Props = {
  card: Card;
  /** Ancho de la carta en px. Todo lo demás escala con él. */
  width?: number;
  /** Inclinación 3D y brillo que sigue al puntero. */
  interactive?: boolean;
  /** Muestra el reverso (para el sobre). */
  faceDown?: boolean;
  /** Carga el avatar sin esperar (cartas de la primera pantalla). */
  eager?: boolean;
  className?: string;
  style?: CSSProperties;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Pide a GitHub un avatar del tamaño que se ve (el avatar mide ~43% del ancho de la carta, x2 por pantallas retina). */
function avatarSrc(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("githubusercontent.com") && !u.searchParams.has("s")) u.searchParams.set("s", "280");
    return u.toString();
  } catch {
    return url;
  }
}

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Cromo({ card, width, interactive = true, faceDown = false, eager = false, className, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  const t = useT();
  const lang = langStyle(card.top_language);
  const langName = card.top_language ?? t.card.polyglot;
  const rarity = { ...RARITIES[card.rarity], label: t.rarity[card.rarity].label };
  const level = yearsOnGithub(card.github_created_at);
  const displayName = card.name?.trim() || card.login;
  const topRepo = card.top_repos?.[0];

  const onMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!interactive || !ref.current) return;
      const el = ref.current;
      const rect = el.getBoundingClientRect();
      const px = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const py = clamp((e.clientY - rect.top) / rect.height, 0, 1);
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        el.dataset.active = "true";
        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
        el.style.setProperty("--lx", `${(px - 0.5) * 2}`);
        el.style.setProperty("--ly", `${(py - 0.5) * 2}`);
        el.style.setProperty("--ry", `${(px - 0.5) * 24}deg`);
        el.style.setProperty("--rx", `${(0.5 - py) * 24}deg`);
        el.style.setProperty("--o", "1");
      });
    },
    [interactive],
  );

  const onDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!interactive || !el) return;
      onMove(e);
      delete el.dataset.burst;
      void el.offsetWidth;
      el.dataset.burst = "true";
    },
    [interactive, onMove],
  );

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    el.dataset.active = "false";
    for (const p of ["--mx", "--my", "--lx", "--ly", "--rx", "--ry", "--o"]) el.style.removeProperty(p);
  }, []);

  return (
    <div
      ref={ref}
      className={`cromo ${className ?? ""}`}
      data-rarity={card.rarity}
      data-interactive={interactive}
      data-facedown={faceDown}
      onPointerMove={onMove}
      onPointerDown={onDown}
      onPointerLeave={onLeave}
      onPointerCancel={onLeave}
      onAnimationEnd={(e) => {
        if (e.animationName === "cromo-burst") delete e.currentTarget.dataset.burst;
      }}
      style={{ ...(width ? { "--w": `${width}px` } : {}), "--type": lang.color, ...style } as CSSProperties}
      role="img"
      aria-label={t.card.aria(rarity.label, displayName, card.login, langName)}
    >
      <div className="cromo-tilt">
        <div className="cromo-face cromo-front" aria-hidden="true">
          <div className="cromo-body">
            <div className="cromo-art">
              <div className="cromo-rays" />
              <div className="cromo-sparks" />
              <span className="cromo-halo" />
              {card.avatar_url ? (
                <img
                  className="cromo-avatar"
                  src={avatarSrc(card.avatar_url)}
                  alt=""
                  width={140}
                  height={140}
                  loading={eager ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="cromo-avatar cromo-avatar-initials">{initialsOf(displayName)}</div>
              )}
              <span className="cromo-num cromo-mono">#{cardNumber(card.id)}</span>
              {isCreator(card.login) && <span className="cromo-creator cromo-mono">★ {t.card.creator}</span>}
              <span className="cromo-rarity cromo-mono">
                {rarity.symbol} {rarity.label.toUpperCase()}
              </span>
            </div>
            <div className="cromo-seam" />
            <div className="cromo-info">
              <div>
                <div className="cromo-name">{displayName}</div>
                <div className="cromo-meta cromo-mono">
                  <span>@{card.login}</span>
                  <span className="cromo-sep" />
                  <span className="cromo-lang">
                    <span className="cromo-dot" />
                    {langName}
                  </span>
                  <span className="cromo-right">
                    {t.card.level} {level}
                    {card.country ? ` · ${card.country}` : ""}
                  </span>
                </div>
              </div>
              <div className="cromo-stats">
                <div className="cromo-stat">
                  <span className="cromo-stat-value">{formatCount(card.stars)}</span>
                  <span className="cromo-stat-label cromo-mono">{t.card.stars}</span>
                </div>
                <div className="cromo-stat">
                  <span className="cromo-stat-value">{formatCount(card.followers)}</span>
                  <span className="cromo-stat-label cromo-mono">{t.card.fans}</span>
                </div>
                <div className="cromo-stat">
                  <span className="cromo-stat-value">{formatCount(card.commits)}</span>
                  <span className="cromo-stat-label cromo-mono">{t.card.commits}</span>
                </div>
              </div>
              <div className="cromo-repo cromo-mono">
                <span>▸ {topRepo?.name ?? "hola-mundo"}</span>
                <span>★ {formatCount(topRepo?.stars ?? 0)}</span>
              </div>
              <div className="cromo-foot cromo-mono">
                <span>CROMOS DE DEVS</span>
                <span>{"{ }"} T1</span>
              </div>
            </div>
            <div className="cromo-sweep" />
            <div className="cromo-holo" />
            <div className="cromo-glare" />
          </div>
        </div>

        <div className="cromo-face cromo-back" aria-hidden="true">
          <div className="cromo-body">
            <div className="cromo-back-logo cromo-mono">
              <span>{"{}"}</span>
            </div>
            <div className="cromo-back-title">
              Cromos
              <br />
              de devs
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
