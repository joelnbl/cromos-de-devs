import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cromo } from "@/components/Cromo";
import { ShareButtons } from "@/components/ShareButtons";
import { acceptTrade, signInWithGithub } from "@/app/actions";
import { cardById } from "@/lib/data";
import { getUser } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Cambio de cromos" };

type Params = { code: string };
type Search = { nuevo?: string; hecho?: string; error?: string };

export default async function TradePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const [{ code }, { nuevo, hecho, error }] = await Promise.all([params, searchParams]);
  const { supabase, user } = await getUser();
  if (!supabase) notFound();

  const { data: trade } = await supabase
    .from("trades")
    .select("code, from_user, offer_card_id, want_card_id, status")
    .eq("code", code)
    .maybeSingle();
  if (!trade) notFound();

  const [offer, want] = await Promise.all([cardById(trade.offer_card_id), cardById(trade.want_card_id)]);
  if (!offer || !want) notFound();

  const mine = user?.id === trade.from_user;
  let hasWanted = false;
  if (user && !mine) {
    const { data } = await supabase
      .from("collection")
      .select("quantity")
      .eq("user_id", user.id)
      .eq("card_id", want.id)
      .maybeSingle();
    hasWanted = Boolean(data);
  }

  return (
    <main className="min-h-dvh bg-ink pb-24 text-white md:pb-12">
      <div className="mx-auto max-w-5xl px-4 py-12 text-center">
        <p className="font-mono text-sm font-bold uppercase text-sun">Cambio de cromos</p>
        <h1 className="display mt-2 text-5xl md:text-6xl">
          {hecho ? "¡Cambio hecho!" : trade.status === "abierto" ? "¿Hacemos un cambio?" : "Este cambio ya se cerró"}
        </h1>
        {error && (
          <p role="alert" className="mx-auto mt-4 max-w-md rounded-xl bg-white px-4 py-3 font-bold text-ink">
            {error}
          </p>
        )}

        <div className="mt-10 flex flex-col items-center justify-center gap-6 md:flex-row md:gap-10">
          <div className="flex flex-col items-center gap-3">
            <span className="font-bold">{mine ? "Das" : "Recibes"}</span>
            <Cromo card={offer} className="[--w:200px] md:[--w:240px]" />
          </div>
          <span className="display text-6xl text-sun" aria-hidden="true">⇄</span>
          <div className="flex flex-col items-center gap-3">
            <span className="font-bold">{mine ? "Pides" : "Entregas"}</span>
            <Cromo card={want} className="[--w:200px] md:[--w:240px]" />
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4">
          {trade.status !== "abierto" ? (
            <Link href="/album" className="btn btn-sun">
              Ver mi álbum
            </Link>
          ) : mine ? (
            <>
              {nuevo && <p className="text-lg font-bold">Comparte este enlace con quien tenga el cromo que buscas.</p>}
              <ShareButtons
                url={`${siteUrl()}/t/${code}`}
                text={`Cambio mi cromo de ${offer.name ?? offer.login} por el de ${want.name ?? want.login}. ¿Lo tienes?`}
              />
            </>
          ) : !user ? (
            <form action={signInWithGithub}>
              <input type="hidden" name="next" value={`/t/${code}`} />
              <button type="submit" className="btn btn-sun">
                Entra con GitHub para aceptar
              </button>
            </form>
          ) : hasWanted ? (
            <form action={acceptTrade}>
              <input type="hidden" name="code" value={code} />
              <button type="submit" className="btn btn-sun">
                Aceptar el cambio
              </button>
            </form>
          ) : (
            <p className="max-w-md text-lg">
              No tienes el cromo de {want.name ?? want.login}. Sigue abriendo sobres y vuelve.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
