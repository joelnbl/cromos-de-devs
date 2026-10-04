"use client";

import { useCallback, useRef, type CSSProperties, type PointerEvent } from "react";
import {
  RARITIES,
  cardNumber,
  computeXp,
  formatCount,
  langStyle,
  yearsOnGithub,
  type Card,
} from "@/lib/cards";

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

export function Cromo({ card, width, interactive = true, faceDown = false, className, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  const lang = langStyle(card.top_language);
  const rarity = RARITIES[card.rarity];
  const xp = computeXp(card);
  const level = yearsOnGithub(card.github_created_at);
  const displayName = card.name?.trim() || card.login;
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const attacks = card.top_repos.length
    ? card.top_repos.slice(0, 2)
    : [{ name: "Hola mundo", description: "Su primer commit.", stars: 10, language: null }];
  const retreat = clamp(Math.ceil(card.public_repos / 25), 1, 4);

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
        el.style.setProperty("--ry", `${(px - 0.5) * 26}deg`);
        el.style.setProperty("--rx", `${(0.5 - py) * 26}deg`);
        el.style.setProperty("--o", "1");
        el.style.setProperty(
          "--hyp",
          `${clamp(Math.hypot(px - 0.5, py - 0.5) * 2, 0, 1)}`,
        );
      });
    },
    [interactive],
  );

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    el.dataset.active = "false";
    for (const p of ["--mx", "--my", "--lx", "--ly", "--rx", "--ry", "--o", "--hyp"]) {
      el.style.removeProperty(p);
    }
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
          <div className="cromo-frame">
            <div className="cromo-body">
              <header className="cromo-head">
                <span className="cromo-stage">DEV</span>
                <span className="cromo-name">{displayName}</span>
                <span className="cromo-xp">
                  <small>XP</small>
                  {xp}
                </span>
                <span className="cromo-energy">{lang.short}</span>
              </header>

              <div className="cromo-art">
                <div className="cromo-art-bg" />
                {card.avatar_url ? (
                  <img className="cromo-avatar" src={card.avatar_url} alt="" draggable={false} />
                ) : (
                  <div className="cromo-avatar cromo-avatar-initials">{initials}</div>
                )}
                {card.rarity === "rara" && <div className="cromo-holo cromo-holo-art" />}
              </div>

              <div className="cromo-strip">
                Dev de {lang.name} · Nivel {level}
                {card.country ? ` · ${card.country}` : ""}
              </div>

              <div className="cromo-attacks">
                {attacks.map((a) => {
                  const cost = a.stars >= 100 ? 3 : a.stars >= 10 ? 2 : 1;
                  return (
                    <div className="cromo-attack" key={a.name}>
                      <span className="cromo-cost">
                        {Array.from({ length: cost }, (_, i) => (
                          <i key={i} />
                        ))}
                      </span>
                      <span className="cromo-attack-text">
                        <b>{a.name}</b>
                        {a.description && <span>{a.description}</span>}
                      </span>
                      <span className="cromo-damage">{formatCount(a.stars)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="cromo-meta">
                <span>
                  <small>debilidad</small>
                  {lang.weakness} ×2
                </span>
                <span>
                  <small>resistencia</small>
                  {lang.resistance} −20
                </span>
                <span>
                  <small>retirada</small>
                  <span className="cromo-retreat">
                    {Array.from({ length: retreat }, (_, i) => (
                      <i key={i} />
                    ))}
                  </span>
                </span>
              </div>

              <p className="cromo-flavor">{lang.flavor}</p>

              <footer className="cromo-foot">
                <span>
                  {formatCount(card.followers)} fans · {formatCount(card.commits)} commits
                </span>
                <span>
                  #{cardNumber(card.id)} {rarity.symbol}
                </span>
              </footer>
            </div>
          </div>
          {(card.rarity === "epica" || card.rarity === "legendaria") && <div className="cromo-relief" />}
          {(card.rarity === "epica" || card.rarity === "legendaria") && <div className="cromo-holo" />}
          <div className="cromo-glare" />
        </div>

        <div className="cromo-face cromo-back" aria-hidden="true">
          <div className="cromo-back-inner">
            <div className="cromo-back-logo">
              <span>{"{ }"}</span>
            </div>
            <div className="cromo-back-title">
              Cromos
              <br />
              de devs
            </div>
          </div>
          <div className="cromo-glare" />
        </div>
      </div>
    </div>
  );
}
