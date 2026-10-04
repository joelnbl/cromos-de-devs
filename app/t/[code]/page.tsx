import { SignInLink } from "@/components/SignInLink";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cromo } from "@/components/Cromo";
import { ShareButtons } from "@/components/ShareButtons";
import { acceptTrade } from "@/app/actions";
import { cardById } from "@/lib/data";
import { getUser } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";
import { getT } from "@/lib/i18n/server";
import { errorText } from "@/lib/i18n/dict";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.trade.title };
}

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
  const [{ supabase, user }, { t }] = await Promise.all([getUser(), getT()]);
  if (!supabase) notFound();
  const message = errorText(t, error);

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
        <p className="font-mono text-sm font-bold uppercase text-sun">{t.trade.title}</p>
        <h1 className="display mt-2 text-5xl md:text-6xl">
          {hecho ? t.trade.done : trade.status === "abierto" ? t.trade.ask : t.trade.closed}
        </h1>
        {message && (
          <p role="alert" className="mx-auto mt-4 max-w-md rounded-xl bg-white px-4 py-3 font-bold text-ink">
            {message}
          </p>
        )}

        <div className="mt-10 flex flex-col items-center justify-center gap-6 md:flex-row md:gap-10">
          <div className="flex flex-col items-center gap-3">
            <span className="font-bold">{mine ? t.trade.youGive : t.trade.youGet}</span>
            <Cromo card={offer} className="[--w:200px] md:[--w:240px]" />
          </div>
          <span className="display text-6xl text-sun" aria-hidden="true">⇄</span>
          <div className="flex flex-col items-center gap-3">
            <span className="font-bold">{mine ? t.trade.youAsk : t.trade.youHandOver}</span>
            <Cromo card={want} className="[--w:200px] md:[--w:240px]" />
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4">
          {trade.status !== "abierto" ? (
            <Link href="/album" className="btn btn-sun">
              {t.pack.seeAlbum}
            </Link>
          ) : mine ? (
            <>
              {nuevo && <p className="text-lg font-bold">{t.trade.shareHint}</p>}
              <ShareButtons
                url={`${siteUrl()}/t/${code}`}
                text={t.trade.shareText(offer.name ?? offer.login, want.name ?? want.login)}
              />
            </>
          ) : !user ? (
            <SignInLink next={`/t/${code}`} className="btn btn-sun">
              {t.trade.signToAccept}
            </SignInLink>
          ) : hasWanted ? (
            <form action={acceptTrade}>
              <input type="hidden" name="code" value={code} />
              <button type="submit" className="btn btn-sun">
                {t.trade.accept}
              </button>
            </form>
          ) : (
            <p className="max-w-md text-lg">
              {t.trade.missingWanted(want.name ?? want.login)}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
