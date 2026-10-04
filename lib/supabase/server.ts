import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

export async function createClient() {
  if (!isSupabaseConfigured) return null;
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: el proxy refresca la sesión.
        }
      },
    },
  });
}

/**
 * Quién ha iniciado sesión. `getClaims()` verifica el token (con las claves de firma
 * del proyecto, sin ir al servidor de Auth cuando son asimétricas) y `cache` hace que
 * la cabecera y la página compartan una sola comprobación por petición.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null };
  const { data, error } = await supabase.auth.getClaims();
  const sub = !error ? data?.claims?.sub : undefined;
  return { supabase, user: sub ? { id: sub } : null };
});
