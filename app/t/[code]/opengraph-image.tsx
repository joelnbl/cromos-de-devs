import { ImageResponse } from "next/og";
import { cardById } from "@/lib/data";
import { MiniCardOg, OG_SIZE } from "@/lib/og";
import { createClient } from "@/lib/supabase/server";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Cambio de cromos · Card trade";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: trade } = supabase
    ? await supabase.from("trades").select("offer_card_id, want_card_id, status").eq("code", code).maybeSingle()
    : { data: null };
  const [offer, want] = trade
    ? await Promise.all([cardById(trade.offer_card_id), trade.want_card_id === null ? Promise.resolve(null) : cardById(trade.want_card_id)])
    : [null, null];

  const gift = trade ? trade.want_card_id === null : false;
  const [es, en] = !trade
    ? ["Cambio de cromos", "Card trade"]
    : trade.status !== "abierto"
      ? ["¡Cambio hecho!", "Trade done!"]
      : gift
        ? ["Un cromo de regalo", "A gift card"]
        : ["¿Me lo cambias?", "Trade with me?"];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30, background: "#FFC72C", border: "12px solid #111111", color: "#111111" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          {offer && <MiniCardOg card={offer} w={260} />}
          {offer && want && <span style={{ display: "flex", fontSize: 110, fontWeight: 900 }}>x</span>}
          {want && <MiniCardOg card={want} w={260} />}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ display: "flex", fontSize: 64, fontWeight: 900, letterSpacing: -2, textTransform: "uppercase" }}>{es}</span>
          <span style={{ display: "flex", fontSize: 28, fontWeight: 700, opacity: 0.75 }}>{en}</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
