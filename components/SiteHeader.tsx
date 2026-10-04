import { SignInLink } from "@/components/SignInLink";
import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { signOut } from "@/app/actions";
import { NavLinks } from "./NavLinks";
import { LanguageToggle } from "./LanguageToggle";
import { getT } from "@/lib/i18n/server";

export async function SiteHeader() {
  const [{ user }, { t }] = await Promise.all([getUser(), getT()]);
  const inside = Boolean(user) || !isSupabaseConfigured;

  return (
    <>
      {!isSupabaseConfigured && (
        <div className="bg-ink px-4 py-2 text-center text-sm font-semibold text-white">
          {t.common.demoBanner}
        </div>
      )}
      <header className="sticky top-0 z-40 border-b-[3px] border-ink bg-sun">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <span className="flex h-10 w-8 -rotate-6 items-center justify-center rounded-md border-[3px] border-white bg-ink font-mono text-sm font-bold text-sun shadow-[0_0_0_2px_#111]">
              {"{}"}
            </span>
            <span className="display text-2xl max-[420px]:text-xl">{t.common.brand}</span>
          </Link>
          {inside ? (
            <div className="flex items-center gap-2">
              <NavLinks variant="top" />
              <LanguageToggle />
              {user && (
                <form action={signOut}>
                  <button type="submit" className="btn btn-ghost hidden min-h-11 px-4 text-base md:inline-flex">
                    {t.common.signOut}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <SignInLink className="btn btn-dark min-h-11 px-4 text-base">
                <span className="hidden sm:inline">{t.common.signIn}</span>
                <span className="sm:hidden">{t.common.signInShort}</span>
              </SignInLink>
            </div>
          )}
        </div>
      </header>
      {inside && <NavLinks variant="bottom" />}
    </>
  );
}
