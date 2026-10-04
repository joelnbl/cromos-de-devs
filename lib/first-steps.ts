import type { SupabaseClient } from "@supabase/supabase-js";

export type FirstStepsState = { card: boolean; pack: boolean; trade: boolean };

/** Qué pasos de «Primeros pasos» ha hecho ya el usuario. Solo consultas reales. */
export async function getFirstSteps(supabase: SupabaseClient, userId: string, hasCard: boolean): Promise<FirstStepsState> {
  const [{ data: opened }, { data: trades }] = await Promise.all([
    supabase.from("pack_openings").select("opened_on").eq("user_id", userId).limit(1),
    supabase.from("trades").select("code").or(`from_user.eq.${userId},accepted_by.eq.${userId}`).limit(1),
  ]);
  return { card: hasCard, pack: !!opened?.length, trade: !!trades?.length };
}

/** Solo el paso del sobre (para el aviso del álbum). */
export async function hasOpenedPack(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from("pack_openings").select("opened_on").eq("user_id", userId).limit(1);
  return !!data?.length;
}
