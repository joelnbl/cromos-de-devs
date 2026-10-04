import { ImageResponse } from "next/og";
import { RARITIES, cardNumber, formatCount, langStyle, type Card } from "@/lib/cards";

export const OG_SIZE = { width: 1200, height: 630 };

const LOOK: Record<Card["rarity"], { ring: string; bg: string; ink: string; soft: string; line: string; glow: string }> = {
  comun: { ring: "linear-gradient(160deg, #3A3A3A, #1C1C1C 50%, #2A2A2A)", bg: "#0A0A0A", ink: "#EDEDED", soft: "#A1A1A1", line: "#262626", glow: "rgba(0,0,0,0)" },
  rara: { ring: "linear-gradient(140deg, #3291FF, #1A1A1A 38%, #1A1A1A 62%, #79FFE1)", bg: "#0A0A0A", ink: "#EDEDED", soft: "#A1A1A1", line: "#262626", glow: "rgba(50,145,255,0.35)" },
  epica: { ring: "linear-gradient(135deg, #FF4D8D, #7928CA 35%, #0070F3 70%, #50E3C2)", bg: "#0A0A0A", ink: "#EDEDED", soft: "#A1A1A1", line: "#2A2A2A", glow: "rgba(121,40,202,0.45)" },
  legendaria: { ring: "linear-gradient(135deg, #FFFFFF, #FFD1F0 30%, #C6F0FF 60%, #FFF6C9)", bg: "linear-gradient(160deg, #FFFFFF, #DADADA 40%, #F7F7F7 52%, #C4C4C4)", ink: "#0A0A0A", soft: "#4D4D4D", line: "rgba(0,0,0,0.14)", glow: "rgba(255,255,255,0.35)" },
};

export function cardOgImage(card: Card | null) {
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
            padding: 2,
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
              borderRadius: 24,
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
              {card?.avatar_url ? (
                <img alt="" src={card.avatar_url} width={118} height={118} style={{ borderRadius: 22 }} />
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
