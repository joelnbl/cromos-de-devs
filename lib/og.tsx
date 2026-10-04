import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { RARITIES, cardNumber, formatCount, langStyle, type Card } from "@/lib/cards";

export const OG_SIZE = { width: 1200, height: 630 };

const LOOK: Record<Card["rarity"], { ring: string; bg: string; ink: string; soft: string; line: string; glow: string }> = {
  comun: { ring: "linear-gradient(135deg, #6B4A2B, #E3B486 45%, #7A5230 75%, #B9824F)", bg: "linear-gradient(180deg, #1C1814, #110F0C)", ink: "#F3E9DD", soft: "#B9A894", line: "rgba(255,255,255,0.12)", glow: "rgba(0,0,0,0)" },
  rara: { ring: "linear-gradient(135deg, #7D868F, #FFFFFF 45%, #8E98A2 75%, #DDE3E8)", bg: "linear-gradient(180deg, #151A20, #0D1015)", ink: "#EEF4FA", soft: "#9FB0C2", line: "rgba(255,255,255,0.12)", glow: "rgba(120,190,255,0.35)" },
  epica: { ring: "linear-gradient(135deg, #8A6A12, #FFF3C0 45%, #B8860B 75%, #F2D36B)", bg: "linear-gradient(180deg, #1D1426, #110C17)", ink: "#FFF6DE", soft: "#C9B8D9", line: "rgba(255,255,255,0.12)", glow: "rgba(160,100,255,0.5)" },
  icono: { ring: "linear-gradient(135deg, #FF6EC7, #FFD86E 25%, #7DFFB0 50%, #6EC8FF 75%, #B18CFF)", bg: "linear-gradient(180deg, #2A1650, #07040F)", ink: "#FFFFFF", soft: "#CBBCFF", line: "rgba(255,255,255,0.18)", glow: "rgba(177,140,255,0.8)" },
  legendaria: { ring: "linear-gradient(135deg, #8A6A12, #FFFFFF 40%, #E8BE45 65%, #9C7414)", bg: "linear-gradient(170deg, #FFE9A3, #E8BE45 45%, #FFF3C0 60%, #C99A1C)", ink: "#2A1C00", soft: "#5C4610", line: "rgba(0,0,0,0.15)", glow: "rgba(255,216,77,0.7)" },
};

/** Las fotos de ejemplo viven en /public: se incrustan para no depender de la red. */
function avatarSrc(url: string | null | undefined) {
  if (!url) return null;
  if (!url.startsWith("/")) return url;
  try {
    const svg = readFileSync(join(process.cwd(), "public", url));
    return `data:image/svg+xml;base64,${svg.toString("base64")}`;
  } catch {
    return null;
  }
}

export function cardOgImage(card: Card | null) {
  const avatar = avatarSrc(card?.avatar_url);
  const rarity = card?.rarity ?? "epica";
  const look = LOOK[rarity];
  const name = card ? card.name ?? card.login : "Tu nombre";
  const lang = langStyle(card?.top_language ?? null);
  const initials = name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const mono = { fontFamily: "monospace" };
  const chip = { display: "flex", alignItems: "center", gap: 8, padding: "4px 12px", border: `1px solid ${look.line}`, borderRadius: 999 };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 80,
          padding: "0 90px",
          background: "#FFC72C",
          border: "12px solid #111111",
          color: "#111111",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 330,
            height: 461,
            padding: 8,
            borderRadius: 26,
            background: look.ring,
            boxShadow: `14px 14px 0 #111111, 0 0 60px ${look.glow}`,
            transform: "rotate(-4deg)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              height: "100%",
              borderRadius: 18,
              background: look.bg,
              color: look.ink,
              padding: 22,
              gap: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: look.soft, ...mono }}>
              <span>CROMO #{card ? cardNumber(card.id) : "000"}</span>
              <span>{RARITIES[rarity].label.toUpperCase()}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 170, border: `1px solid ${look.line}`, borderRadius: 14 }}>
              {avatar ? (
                <img alt="" src={avatar} width={118} height={118} style={{ borderRadius: 22, background: lang.color }} />
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 118,
                    height: 118,
                    borderRadius: 22,
                    background: lang.color,
                    color: "#FFFFFF",
                    fontSize: 44,
                    fontWeight: 700,
                  }}
                >
                  {initials}
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>{name.length > 16 ? name.slice(0, 15) + "…" : name}</span>
              <span style={{ fontSize: 17, color: look.soft, ...mono }}>@{card?.login ?? "tu-usuario"}</span>
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 16 }}>
              <span style={chip}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: lang.color }} />
                {lang.name}
              </span>
              {card?.country && <span style={{ ...chip, color: look.soft, ...mono }}>{card.country}</span>}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid ${look.line}`, ...mono }}>
              {[
                ["ESTRELLAS", formatCount(card?.stars ?? 0)],
                ["FANS", formatCount(card?.followers ?? 0)],
                ["COMMITS", formatCount(card?.commits ?? 0)],
              ].map(([l, v]) => (
                <div key={l} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 12, color: look.soft }}>{l}</span>
                  <span style={{ fontSize: 24 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 104, fontWeight: 900, lineHeight: 0.9, letterSpacing: -3, textTransform: "uppercase" }}>
            <span>¿Quién</span>
            <span>me tiene?</span>
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, marginTop: -8, opacity: 0.75 }}>Who has my card?</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <span style={{ fontSize: 72, fontWeight: 900 }}>{card?.owners ?? 0}</span>
            <span style={{ fontSize: 30, fontWeight: 700 }}>{card?.owners === 1 ? "persona tiene mi cromo" : "personas tienen mi cromo"}</span>
          </div>
          <div style={{ display: "flex", alignSelf: "flex-start", padding: "10px 22px", borderRadius: 999, background: "#111111", color: "#FFC72C", fontSize: 26, fontWeight: 700 }}>
            Cromos de devs
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
