import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchCardStats } from "@/lib/github";
import { safeNext } from "@/lib/site";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const fail = (msg: string) => NextResponse.redirect(`${origin}/?error=${encodeURIComponent(msg)}`);

  const supabase = await createClient();
  if (!supabase || !code) return fail("No se pudo iniciar sesión.");

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) return fail("No se pudo iniciar sesión con GitHub.");

  const token = data.session.provider_token;
  const admin = createAdminClient();
  if (!token || !admin) return fail("Falta configurar el servidor (clave de servicio de Supabase).");

  try {
    const stats = await fetchCardStats(token);
    const userId = data.session.user.id;

    const { data: existing } = await admin
      .from("cards")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await admin
        .from("cards")
        .update({ ...stats, refreshed_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      const { data: created, error: insertError } = await admin
        .from("cards")
        .insert({ ...stats, user_id: userId, owners: 1 })
        .select("id")
        .single();
      if (insertError || !created) throw insertError ?? new Error("No se creó el cromo");
      // Tu propio cromo es el primero de tu álbum.
      await admin.from("collection").insert({ user_id: userId, card_id: created.id, quantity: 1 });
      return NextResponse.redirect(`${origin}/mi-cromo?bienvenida=1`);
    }
  } catch (e) {
    console.error("callback: no se pudo crear o actualizar el cromo", e instanceof Error ? e.message : e);
    return fail("Entraste, pero no pudimos leer tu GitHub. Inténtalo de nuevo.");
  }

  return NextResponse.redirect(`${origin}${next}`);
}
