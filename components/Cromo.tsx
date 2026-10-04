"use client";

import { useCallback, useRef, type CSSProperties, type PointerEvent } from "react";
import { RARITIES, cardNumber, formatCount, langStyle, yearsOnGithub, type Card } from "@/lib/cards";

type Props = {
  card: Card;
  /** Ancho de la carta en px. Todo lo demás escala con él. */
  width?: number;
  /** Inclinación 3D y brillo que sigue al puntero. */
  interactive?: boolean;
  /** Muestra el reverso (para el sobre). */
  faceDown?: boolean;
  className?: string;
  style?: CSSProperties;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Cromo({ card, width, interactive = true, faceDown = false, className, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  const lang = langStyle(card.top_language);
  const rarity = RARITIES[card.rarity];
  const level = yearsOnGithub(card.github_created_at);
  const displayName = card.name?.trim() || card.login;
  const topRepo = card.top_repos[0];

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
      onPointerLeave={onLeave}
      style={{ ...(width ? { "--w": `${width}px` } : {}), "--type": lang.color, ...style } as CSSProperties}
      role="img"
      aria-label={`Cromo ${rarity.label.toLowerCase()} de ${displayName} (@${card.login}), ${lang.name}`}
    >
      <div className="cromo-tilt">
        <div className="cromo-face cromo-front" aria-hidden="true">
          <div className="cromo-body">
            <div className="cromo-art">
              <div className="cromo-rays" />
              <div className="cromo-sparks" />
              {card.avatar_url ? (
                <img className="cromo-avatar" src={card.avatar_url} alt="" draggable={false} crossOrigin="anonymous" />
              ) : (
                <div className="cromo-avatar cromo-avatar-initials">{initialsOf(displayName)}</div>
              )}
              <span className="cromo-num cromo-mono">#{cardNumber(card.id)}</span>
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
                    {lang.name}
                  </span>
                  <span className="cromo-right">
                    NV {level}
                    {card.country ? ` · ${card.country}` : ""}
                  </span>
                </div>
              </div>
              <div className="cromo-stats">
                <div className="cromo-stat">
                  <span className="cromo-stat-value">{formatCount(card.stars)}</span>
                  <span className="cromo-stat-label cromo-mono">ESTRELLAS</span>
                </div>
                <div className="cromo-stat">
                  <span className="cromo-stat-value">{formatCount(card.followers)}</span>
                  <span className="cromo-stat-label cromo-mono">FANS</span>
                </div>
                <div className="cromo-stat">
                  <span className="cromo-stat-value">{formatCount(card.commits)}</span>
                  <span className="cromo-stat-label cromo-mono">COMMITS</span>
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
            {card.rarity === "legendaria" && <div className="cromo-holo" />}
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
