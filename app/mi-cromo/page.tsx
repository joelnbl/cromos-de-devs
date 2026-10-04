import { SignInLink } from "@/components/SignInLink";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShowcaseLoader } from "@/components/ShowcaseLoader";
import { ShareButtons } from "@/components/ShareButtons";
import { setCountry } from "@/app/actions";
import { CARD_COLUMNS, COUNTRIES, RARITIES, type Card } from "@/lib/cards";
import { DEMO_CARDS } from "@/lib/demo";
import { getUser } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Mi cromo" };

type Search = { bienvenida?: string; guardado?: string; error?: string };

export default async function MiCromoPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { bienvenida, guardado, error } = await searchParams;
  const { supabase, user } = await getUser();
  if (supabase && !user) redirect("/?error=" + encodeURIComponent("Entra con GitHub para ver tu cromo."));

  let card: Card | null = DEMO_CARDS[1];
  if (supabase && user) {
    const { data } = await supabase.from("cards").select(CARD_COLUMNS).eq("user_id", user.id).maybeSingle();
    card = data as Card | null;
  }

  if (!card) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="display text-5xl">Aún no tienes cromo</h1>
        <p className="mt-4 text-lg">Vuelve a entrar con GitHub para crearlo.</p>
        <div className="mt-8">
          <SignInLink next="/mi-cromo">Crear mi cromo</SignInLink>
        </div>
      </main>
    );
  }

  const url = `${siteUrl()}/c/${card.login}`;
  const owners = card.owners;

  return (
    <main className="min-h-dvh bg-paper pb-24 md:pb-12">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 md:grid-cols-[auto_1fr]">
        <div className="flex justify-center">
          <ShowcaseLoader card={card} />
        </div>
        <div>
          {bienvenida && (
            <p className="mb-6 inline-block rounded-xl border-2 border-ink bg-sun px-4 py-3 text-lg font-bold">
              ¡Tu cromo está listo! Ya está en tu álbum.
            </p>
          )}
          {error && (
            <p role="alert" className="mb-6 rounded-xl border-2 border-ink bg-white px-4 py-3 font-bold">
              {error}
            </p>
          )}
          <p className="font-mono text-sm font-bold uppercase">
            {RARITIES[card.rarity].symbol} Cromo {RARITIES[card.rarity].label.toLowerCase()}
          </p>
          <h1 className="display mt-2 text-6xl">¿Quién me tiene?</h1>
          <p className="mt-5 flex items-baseline gap-3">
            <span className="font-mono text-7xl font-bold leading-none">{owners}</span>
            <span className="text-xl font-bold">{owners === 1 ? "persona tiene" : "personas tienen"} tu cromo</span>
          </p>
          <p className="mt-4 max-w-[46ch] text-lg text-ink-soft">
            Cada vez que alguien abre un sobre puede tocarle tu cromo. Compártelo para que entre más gente y suba el
            número.
          </p>
          <div className="mt-6">
            <ShareButtons url={url} text={`¿Quién me tiene? Este es mi cromo de dev. Consigue el tuyo:`} />
          </div>

          <form action={setCountry} className="panel mt-10 flex flex-wrap items-end gap-3 p-5">
            <label className="flex min-w-56 flex-1 flex-col gap-2 font-bold">
              Tu país (para las selecciones)
              <select
                name="country"
                defaultValue={card.country ?? ""}
                className="min-h-12 rounded-xl border-2 border-ink bg-white px-3 text-base font-semibold"
              >
                <option value="">Sin país</option>
                {Object.entries(COUNTRIES)
                  .sort((a, b) => a[1].localeCompare(b[1], "es"))
                  .map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
              </select>
            </label>
            <button type="submit" className="btn btn-dark" disabled={!supabase}>
              Guardar
            </button>
            {guardado && <span className="w-full font-bold">Guardado.</span>}
          </form>

          {supabase && (
            <div className="mt-4">
              <SignInLink next="/mi-cromo" className="inline-flex items-center gap-2 font-bold underline underline-offset-4">
                Actualizar mis datos de GitHub
              </SignInLink>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
