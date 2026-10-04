import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/env";

export async function proxy(request: NextRequest) {
  // Si Supabase devuelve el código de login a otra ruta (p. ej. la portada, cuando la
  // URL de vuelta no está permitida y usa la Site URL), lo llevamos al callback.
  const { pathname, searchParams } = request.nextUrl;
  if (searchParams.has("code") && pathname !== "/auth/callback") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refresca la sesión si ha caducado (getClaims verifica el token sin ir siempre al servidor).
  const { data: claims } = await supabase.auth.getClaims();

  // Invitación: si alguien sin sesión llega con ?ref=<login>, lo recordamos 30 días.
  const ref = searchParams.get("ref");
  if (!claims?.claims && ref && /^[a-z0-9](?:[a-z0-9-]{0,38})$/i.test(ref)) {
    response.cookies.set("ref", ref.toLowerCase(), { maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax" });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
