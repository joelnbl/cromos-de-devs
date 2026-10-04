import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { CARD_COLUMNS, type Card } from "@/lib/cards";
import { DEMO_CARDS } from "@/lib/demo";

/** Cromos destacados para la portada: los más coleccionados, o los de ejemplo. */
export async function featuredCards(limit = 3): Promise<Card[]> {
  const supabase = await createClient();
  if (!supabase) return DEMO_CARDS.slice(0, limit);
  const { data } = await supabase
    .from("cards")
    .select(CARD_COLUMNS)
    .order("owners", { ascending: false })
    .limit(limit);
  const cards = (data ?? []) as Card[];
  return cards.length >= limit ? cards : DEMO_CARDS.slice(0, limit);
}

export async function cardByLogin(login: string): Promise<Card | null> {
  const supabase = await createClient();
  if (!supabase) return DEMO_CARDS.find((c) => c.login === login) ?? null;
  // Logins de GitHub: letras, números y guiones. Así % y _ nunca actúan como comodines.
  if (!/^[A-Za-z0-9-]{1,39}$/.test(login)) return null;
  const { data } = await supabase.from("cards").select(CARD_COLUMNS).ilike("login", login).maybeSingle();
  return (data as Card | null) ?? null;
}

export async function cardById(id: number): Promise<Card | null> {
  const supabase = await createClient();
  if (!supabase) return DEMO_CARDS.find((c) => c.id === id) ?? null;
  const { data } = await supabase.from("cards").select(CARD_COLUMNS).eq("id", id).maybeSingle();
  return (data as Card | null) ?? null;
}

export async function totalCards(): Promise<number> {
  const supabase = await createClient();
  if (!supabase) return DEMO_CARDS.length;
  const { count } = await supabase.from("cards").select("id", { count: "exact", head: true });
  return count ?? 0;
}

export type HomeStats = { devs: number; tradesDone: number; top: Card[] };

/** Actividad real para la portada. null si no hay Supabase o la lectura falla. */
export const homeStats = cache(async (): Promise<HomeStats | null> => {
  try {
    const supabase = await createClient();
    if (!supabase) return null;
    const [devs, trades, top] = await Promise.all([
      supabase.from("cards").select("id", { count: "exact", head: true }),
      supabase.from("trades").select("id", { count: "exact", head: true }).eq("status", "hecho"),
      supabase.from("cards").select(CARD_COLUMNS).gt("owners", 0).order("owners", { ascending: false }).limit(6),
    ]);
    if (devs.error) return null;
    return {
      devs: devs.count ?? 0,
      tradesDone: trades.error ? 0 : (trades.count ?? 0),
      top: top.error ? [] : ((top.data ?? []) as unknown as Card[]),
    };
  } catch {
    return null;
  }
});
