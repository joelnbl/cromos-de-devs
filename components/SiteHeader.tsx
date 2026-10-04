import { SignInLink } from "@/components/SignInLink";
import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { signOut } from "@/app/actions";
import { NavLinks } from "./NavLinks";

export async function SiteHeader() {
  const { user } = await getUser();
  const inside = Boolean(user) || !isSupabaseConfigured;

  return (
    <>
      {!isSupabaseConfigured && (
        <div className="bg-ink px-4 py-2 text-center text-sm font-semibold text-white">
          Modo demo: los cromos son de ejemplo. Configura Supabase para jugar de verdad.
        </div>
      )}
      <header className="sticky top-0 z-40 border-b-[3px] border-ink bg-sun">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <span className="flex h-10 w-8 -rotate-6 items-center justify-center rounded-md border-[3px] border-white bg-ink font-mono text-sm font-bold text-sun shadow-[0_0_0_2px_#111]">
              {"{}"}
            </span>
            <span className="display text-2xl">Cromos de devs</span>
          </Link>
          {inside ? (
            <div className="flex items-center gap-2">
              <NavLinks variant="top" />
              {user && (
                <form action={signOut}>
                  <button type="submit" className="btn btn-ghost hidden min-h-11 px-4 text-base md:inline-flex">
                    Salir
                  </button>
                </form>
              )}
            </div>
          ) : (
            <SignInLink className="btn btn-dark min-h-11 px-4 text-base">
              <span className="hidden sm:inline">Entrar con GitHub</span>
              <span className="sm:hidden">Entrar</span>
            </SignInLink>
          )}
        </div>
      </header>
      {inside && <NavLinks variant="bottom" />}
    </>
  );
}
