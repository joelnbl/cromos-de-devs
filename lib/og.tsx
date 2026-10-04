import { ImageResponse } from "next/og";
import { cardNumber, langStyle, RARITIES, type Card } from "@/lib/cards";

export const OG_SIZE = { width: 1200, height: 630 };

const PANEL: Record<Card["rarity"], string> = {
  comun: "#E8ECEF",
  rara: "#2459D8",
  epica: "#6A2FD6",
  legendaria: "linear-gradient(135deg, #F5B700, #FFE58A 45%, #E8A200)",
};

export function cardOgImage(card: Card | null) {
  const name = card ? card.name ?? card.login : "Tu nombre";
  const lang = langStyle(card?.top_language ?? null);
  const rarity = card?.rarity ?? "epica";
  const light = rarity === "comun" || rarity === "legendaria";
  const initials = name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 72,
          padding: "0 80px",
          background: "#FFC72C",
          border: "12px solid #111111",
          fontFamily: "sans-serif",
          color: "#111111",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 310,
            height: 432,
            padding: 12,
            background: "#FFFFFF",
            borderRadius: 20,
            boxShadow: "12px 12px 0 #111111",
            transform: "rotate(-5deg)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              height: "100%",
              borderRadius: 12,
              background: PANEL[rarity],
              color: light ? "#141414" : "#FFFFFF",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 18px 0", fontSize: 18, fontWeight: 700 }}>
              <span>#{card ? cardNumber(card.id) : "000"}</span>
              <span>{card?.country ?? ""}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
              {card?.avatar_url ? (
                <img
                  alt=""
                  src={card.avatar_url}
                  width={140}
                  height={140}
                  style={{ borderRadius: 26, border: "5px solid #FFFFFF" }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    width: 140,
                    height: 140,
                    borderRadius: 26,
                    border: "5px solid #FFFFFF",
                    background: lang.color,
                    color: "#FFFFFF",
                    fontSize: 56,
                    fontWeight: 900,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {initials}
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 18, fontSize: 32, fontWeight: 900, textTransform: "uppercase" }}>
              {name.length > 16 ? name.slice(0, 15) + "…" : name}
            </div>
            <div style={{ display: "flex", justifyContent: "center", fontSize: 18, marginTop: 6 }}>
              @{card?.login ?? "tu-usuario"}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "auto",
                padding: "12px 18px",
                background: "#111111",
                color: rarity === "legendaria" ? "#FFD84D" : "#FFFFFF",
                fontSize: 18,
                fontWeight: 800,
                textTransform: "uppercase",
              }}
            >
              <span>{lang.name}</span>
              <span>{RARITIES[rarity].label}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 104, fontWeight: 900, lineHeight: 0.9, textTransform: "uppercase", letterSpacing: -2 }}>
            <span>¿Quién</span>
            <span>me tiene?</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <span style={{ fontSize: 72, fontWeight: 900 }}>{card?.owners ?? 0}</span>
            <span style={{ fontSize: 30, fontWeight: 700 }}>
              {card?.owners === 1 ? "persona tiene mi cromo" : "personas tienen mi cromo"}
            </span>
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
