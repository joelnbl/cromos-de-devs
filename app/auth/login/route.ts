import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/site";

/** Inicia el login con GitHub. Es un enlace normal: funciona aunque falle el JavaScript. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get("next"));
  const fail = (msg: string) => NextResponse.redirect(`${origin}/?error=${encodeURIComponent(msg)}`);

  const supabase = await createClient();
  if (!supabase) return fail("La web está en modo demo: faltan las variables de Supabase en Vercel.");

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        scopes: "read:user",
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) {
      console.error("login: signInWithOAuth falló", error?.message);
      return fail(`No se pudo abrir GitHub: ${error?.message ?? "sin URL"}`);
    }
    return NextResponse.redirect(data.url);
  } catch (e) {
    console.error("login: error inesperado", e instanceof Error ? e.message : e);
    return fail("No se pudo abrir GitHub. Revisa NEXT_PUBLIC_SUPABASE_URL en Vercel.");
  }
}
