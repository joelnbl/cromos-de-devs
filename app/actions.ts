"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { CARD_COLUMNS, COUNTRIES, type Card } from "@/lib/cards";
import { errorCodeOf, type ErrorCode } from "@/lib/i18n/dict";

/** Los errores viajan como código y cada página los muestra en su idioma. */
function codeOf(error: { message?: string } | null | undefined): ErrorCode {
  return errorCodeOf(error?.message);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/");
}

export type PackResult =
  | { ok: true; cards: { card: Card; isNew: boolean }[] }
  | { ok: false; code: ErrorCode };

export async function openPack(): Promise<PackResult> {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return { ok: false, code: "needLogin" };

  const { data, error } = await supabase.rpc("open_daily_pack");
  if (error) return { ok: false, code: codeOf(error) };

  const pulls = (data ?? []) as { card_id: number; is_new: boolean }[];
  if (!pulls.length) return { ok: true, cards: [] };

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select(CARD_COLUMNS)
    .in("id", pulls.map((p) => p.card_id));
  if (cardsError) return { ok: false, code: codeOf(cardsError) };

  const byId = new Map((cards as Card[]).map((c) => [c.id, c]));
  revalidatePath("/album");
  return {
    ok: true,
    cards: pulls
      .map((p) => ({ card: byId.get(p.card_id)!, isNew: p.is_new }))
      .filter((p) => p.card),
  };
}

export async function createTrade(formData: FormData) {
  const { supabase, user } = await getUser();
  if (!supabase || !user) redirect("/cambios");
  const offer = Number(formData.get("offer"));
  const want = Number(formData.get("want"));
  if (!offer || !want) redirect("/cambios?error=pickBoth");

  const { data, error } = await supabase.rpc("create_trade", { p_offer: offer, p_want: want });
  if (error) redirect(`/cambios?error=${codeOf(error)}`);
  revalidatePath("/cambios");
  redirect(`/t/${data as string}?nuevo=1`);
}

export async function acceptTrade(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { supabase, user } = await getUser();
  if (!supabase || !user) redirect(`/t/${code}`);

  const { error } = await supabase.rpc("accept_trade", { p_code: code });
  if (error) redirect(`/t/${code}?error=${codeOf(error)}`);
  revalidatePath("/album");
  redirect(`/t/${code}?hecho=1`);
}

export async function cancelTrade(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { supabase, user } = await getUser();
  if (!supabase || !user) redirect("/cambios");
  await supabase.rpc("cancel_trade", { p_code: code });
  revalidatePath("/cambios");
  redirect("/cambios");
}

export async function setCountry(formData: FormData) {
  const country = String(formData.get("country") ?? "");
  const { supabase, user } = await getUser();
  if (!supabase || !user) redirect("/mi-cromo");
  const value = country && COUNTRIES[country] ? country : null;
  const { error } = await supabase.from("cards").update({ country: value }).eq("user_id", user.id);
  if (error) redirect(`/mi-cromo?error=${codeOf(error)}`);
  revalidatePath("/mi-cromo");
  redirect("/mi-cromo?guardado=1");
}
