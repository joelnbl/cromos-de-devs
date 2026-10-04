import { ImageResponse } from "next/og";
import { cardById } from "@/lib/data";
import { MiniCardOg, OG_SIZE } from "@/lib/og";
import { parseCardIds } from "@/lib/share-ids";
import type { Card } from "@/lib/cards";

export async function GET(req: Request) {
  const ids = parseCardIds(new URL(req.url).searchParams.get("c"));
  const cards = (await Promise.all(ids.map((id) => cardById(id)))).filter((c): c is Card => c !== null);
  const w = cards.length > 3 ? 168 : 200;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36, background: "#FFC72C", border: "12px solid #111111", color: "#111111" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ display: "flex", fontSize: 76, fontWeight: 900, letterSpacing: -2, textTransform: "uppercase" }}>¿Quién te sale a ti?</span>
          <span style={{ display: "flex", fontSize: 30, fontWeight: 700, opacity: 0.75 }}>Who do you get?</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 22 }}>
          {cards.map((c, i) => (
            <div key={c.id} style={{ display: "flex", transform: `rotate(${(i % 2 ? 1 : -1) * 2}deg)` }}>
              <MiniCardOg card={c} w={w} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", padding: "6px 22px", borderRadius: 999, background: "#111111", color: "#FFC72C", fontSize: 24, fontWeight: 700 }}>Cromos de devs</div>
      </div>
    ),
    OG_SIZE,
  );
}
