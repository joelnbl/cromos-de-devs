import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlbumBook, type Sheet } from "@/components/AlbumBook";
import { CARD_COLUMNS, RARITY_ORDER, countryName, type Card, type Rarity } from "@/lib/cards";
import { getT } from "@/lib/i18n/server";
import { DEMO_CARDS } from "@/lib/demo";
import { getUser } from "@/lib/supabase/server";
import { hasOpenedPack } from "@/lib/first-steps";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.album.title, robots: { index: false } };
}

type Search = { lenguaje?: string; pais?: string; ver?: string; q?: string; hoja?: string };
type View = "todas" | "tengo" | "faltan" | "repes";

/** Cromos por página del álbum; una doble página son dos. */
const PER_SHEET = 6;
const PER_SPREAD = PER_SHEET * 2;

const BAR: Record<Rarity, string> = {
  comun: "#a8693c",
  rara: "#8b95a1",
  epica: "#c98f0a",
  legendaria: "#111111",
  icono: "linear-gradient(90deg,#ff6ec7,#ffd86e,#7dffb0,#6ec8ff,#b18cff)",
};

export default async function AlbumPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const { lenguaje, pais } = params;
  const view: View = (["tengo", "faltan", "repes"] as const).find((v) => v === params.ver) ?? "todas";
  const q = (params.q ?? "").trim().toLowerCase().replace(/^#/, "");
  const [{ supabase, user }, { t, locale }] = await Promise.all([getUser(), getT()]);
  if (supabase && !user) redirect("/?error=needLogin");
  const country = (c: string | null) => (c ? countryName(c, locale, t.myCard.otherCountry) : t.myCard.otherCountry);

  const packNudge = supabase && user ? !(await hasOpenedPack(supabase, user.id)) : false;
  let all: Card[] = [];
  let owned = new Map<number, number>();
  if (!supabase || !user) {
    all = DEMO_CARDS;
    owned = new Map(DEMO_CARDS.filter((_, i) => i % 3 !== 1).map((c) => [c.id, c.id === 42 ? 2 : 1]));
  } else {
    const [{ data: c }, { data: mine }] = await Promise.all([
      supabase.from("cards").select(CARD_COLUMNS).order("id").limit(600),
      supabase.from("collection").select("card_id, quantity").eq("user_id", user.id),
    ]);
    all = (c ?? []) as Card[];
    owned = new Map((mine ?? []).map((m) => [m.card_id as number, m.quantity as number]));
  }

  // Marcador general: siempre sobre el álbum entero
  const have = all.filter((c) => owned.has(c.id));
  const dupes = have.reduce((n, c) => n + Math.max(0, (owned.get(c.id) ?? 0) - 1), 0);
  const byRarity = RARITY_ORDER.map((r) => ({ r, n: have.filter((c) => c.rarity === r).length }));
  const pct = all.length ? Math.round((have.length / all.length) * 100) : 0;

  // Índice: países y lenguajes, cada uno con su progreso
  const progress = (list: Card[]) => ({ a: list.filter((c) => owned.has(c.id)).length, b: list.length });
  const countries = [...new Set(all.map((c) => c.country ?? ""))]
    .filter(Boolean)
    .sort((a, b) => country(a).localeCompare(country(b), locale));
  const languages = [...new Set(all.map((c) => c.top_language ?? ""))].filter(Boolean).sort();

  const href = (patch: Partial<Search>) => {
    const next: Search = { lenguaje, pais, ver: view === "todas" ? undefined : view, q: params.q, ...patch };
    const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
    return qs ? `/album?${qs}` : "/album";
  };

  // Filtro activo
  let list = all;
  if (pais) list = list.filter((c) => c.country === pais);
  if (lenguaje) list = list.filter((c) => c.top_language === lenguaje);
  if (view === "tengo") list = list.filter((c) => owned.has(c.id));
  if (view === "faltan") list = list.filter((c) => !owned.has(c.id));
  if (view === "repes") list = list.filter((c) => (owned.get(c.id) ?? 0) > 1);
  if (q) {
    const num = q.replace(/^0+/, "");
    list = list.filter((c) => c.login.toLowerCase().includes(q) || (c.name ?? "").toLowerCase().includes(q) || String(c.id) === num);
  }

  // Páginas seguidas, ordenadas por país; el título dice qué países salen en cada doble página
  const sorted = pais || lenguaje
    ? list
    : [...list].sort((a, b) =>
        a.country === b.country
          ? a.id - b.id
          : !a.country ? 1 : !b.country ? -1 : country(a.country).localeCompare(country(b.country), locale),
      );
  const spreads: { title: string; cards: Card[] }[] = [];
  for (let i = 0; i < sorted.length; i += PER_SPREAD) {
    const cards = sorted.slice(i, i + PER_SPREAD);
    let title = pais ? country(pais) : lenguaje ?? "";
    if (!pais && !lenguaje) {
      const names = [...new Set(cards.map((c) => country(c.country)))];
      title = names.length > 3 ? `${names.slice(0, 3).join(" · ")}…` : names.join(" · ");
    }
    spreads.push({ title, cards });
  }

  const index = Math.min(Math.max(1, Number(params.hoja) || 1), Math.max(1, spreads.length)) - 1;
  const spread = spreads[index];
  const firstPage = index * 2 + 1;
  const sheets: Sheet[] = spread
    ? [spread.cards.slice(0, PER_SHEET), spread.cards.slice(PER_SHEET)]
        .filter((s) => s.length)
        .map((cards, i) => ({ page: firstPage + i, cards }))
    : [];
  const prev =
    index > 0 ? { href: href({ hoja: String(index) }), label: t.album.pager(index * 2 - 1, index * 2, spreads[index - 1].title) } : null;
  const next =
    index < spreads.length - 1
      ? { href: href({ hoja: String(index + 2) }), label: t.album.pager(index * 2 + 3, index * 2 + 4, spreads[index + 1].title) }
      : null;

  const scope = pais ? t.album.selection(country(pais)) : lenguaje ? t.album.collection(lenguaje) : t.album.complete;
  const views: { v: View; label: string }[] = [
    { v: "todas", label: t.album.filterAll },
    { v: "tengo", label: t.album.filterHave },
    { v: "faltan", label: t.album.filterMissing },
    { v: "repes", label: t.album.filterDupes(dupes) },
  ];

  return (
    <main className="min-h-dvh bg-paper pb-44 md:pb-12">
      <header className="border-b-[3px] border-ink bg-sun">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-6 pt-8 md:pt-10">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
              <p className="font-mono text-xs font-extrabold uppercase tracking-wider md:text-sm">{t.album.kicker(scope)}</p>
              <h1 className="display mt-2 text-6xl md:text-8xl">{t.album.title}</h1>
            </div>
            <p className="font-mono font-extrabold leading-none">
              <span className="text-5xl md:text-7xl">{have.length}</span>
              <span className="text-xl md:text-3xl"> / {all.length}</span>
            </p>
          </div>

          {packNudge && (
            <p className="flex flex-wrap items-center gap-3 self-start rounded-xl border-2 border-ink bg-white px-4 py-2 font-bold">
              {t.firstSteps.albumNudge}
              <Link href="/sobre" className="btn btn-dark">
                {t.firstSteps.albumNudgeCta}
              </Link>
            </p>
          )}

          <div
            className="flex h-4 overflow-hidden rounded-full border-2 border-ink bg-white md:h-5"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t.album.progressAria}
          >
            {byRarity.map(({ r, n }) =>
              n ? (
                <div
                  key={r}
                  title={`${t.rarity[r].label}: ${n}`}
                  className="h-full border-r-2 border-ink"
                  style={{ width: `${(n / Math.max(1, all.length)) * 100}%`, background: BAR[r] }}
                />
              ) : null,
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold md:text-[15px]">
              {byRarity.map(({ r, n }) => (
                <li key={r} className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-[3px] border-[1.5px] border-ink" style={{ background: BAR[r] }} aria-hidden="true" />
                  {t.rarity[r].label} {n}
                </li>
              ))}
            </ul>
            <div className="grow" />
            {dupes > 0 && (
              <Link href="/cambios" className="btn btn-dark hidden shadow-[4px_4px_0_#fff] md:inline-flex">
                <SwapIcon />
                {t.album.tradeDupes(dupes)}
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-5">
        <nav aria-label={t.album.albumsAria} className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
          <IndexChip href="/album" name={t.album.wholeAlbum} {...progress(all)} active={!pais && !lenguaje} />
          {countries.map((c) => (
            <IndexChip key={c} href={`/album?pais=${c}`} name={country(c)} {...progress(all.filter((x) => x.country === c))} active={pais === c} />
          ))}
          {languages.map((l) => (
            <IndexChip
              key={l}
              href={`/album?lenguaje=${encodeURIComponent(l)}`}
              name={l}
              {...progress(all.filter((x) => x.top_language === l))}
              active={lenguaje === l}
            />
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-3">
          <nav aria-label={t.album.show} className="flex max-w-full gap-1 overflow-x-auto rounded-full border-2 border-ink bg-white p-1">
            {views.map(({ v, label }) => (
              <Link
                key={v}
                href={href({ ver: v === "todas" ? undefined : v, hoja: undefined })}
                aria-current={view === v ? "page" : undefined}
                className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-[15px] font-extrabold no-underline ${
                  view === v ? "bg-ink text-white" : "text-ink hover:bg-black/5"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="grow" />
          <form
            action="/album"
            role="search"
            className="flex min-h-13 w-full items-center gap-2 rounded-full border-2 border-ink bg-white pl-4 pr-1 sm:w-auto sm:min-w-80"
          >
            {pais && <input type="hidden" name="pais" value={pais} />}
            {lenguaje && <input type="hidden" name="lenguaje" value={lenguaje} />}
            {view !== "todas" && <input type="hidden" name="ver" value={view} />}
            <label htmlFor="album-q" className="sr-only">
              {t.album.searchLabel}
            </label>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              id="album-q"
              name="q"
              type="search"
              defaultValue={params.q}
              placeholder={t.album.searchPlaceholder}
              className="min-w-0 grow bg-transparent text-base font-semibold outline-none"
            />
            <button type="submit" className="min-h-11 rounded-full bg-ink px-4 text-sm font-extrabold text-white">
              {t.album.searchGo}
            </button>
          </form>
        </div>

        {spread ? (
          <AlbumBook
            key={href({ hoja: String(index + 1) })}
            title={spread.title}
            sheets={sheets}
            owned={Object.fromEntries(owned)}
            prev={prev}
            next={next}
            spreadCount={spreads.length}
            spreadIndex={index}
          />
        ) : (
          <div className="panel my-6 flex flex-col items-center gap-4 p-8 text-center">
            <p className="text-lg font-bold">{all.length ? t.album.noResults : t.album.empty}</p>
            {all.length ? (
              <Link href="/album" className="btn btn-sun">
                {t.album.clearFilters}
              </Link>
            ) : (
              <p className="text-ink-soft">{t.album.emptyBody}</p>
            )}
          </div>
        )}
      </div>

      {dupes > 0 && (
        <div className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 rounded-full border-2 border-ink bg-ink py-2 pl-5 pr-2 text-white shadow-[4px_4px_0_var(--color-sun)] md:hidden">
          <p className="grow text-[15px] font-extrabold leading-tight">
            {t.album.dupesShort(dupes)}
            <span className="block text-[13px] font-semibold text-white/80">{t.album.missingShort(all.length - have.length)}</span>
          </p>
          <Link href="/cambios" className="inline-flex min-h-12 items-center rounded-full bg-sun px-5 font-black text-ink no-underline">
            {t.album.tradeThem}
          </Link>
        </div>
      )}
    </main>
  );
}

function IndexChip({ href, name, a, b, active }: { href: string; name: string; a: number; b: number; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-w-32 shrink-0 flex-col gap-1.5 rounded-2xl border-2 border-ink px-3.5 py-2.5 no-underline ${
        active ? "bg-ink text-white" : "bg-white text-ink hover:bg-sun/30"
      }`}
    >
      <span className="whitespace-nowrap text-[15px] font-extrabold">{name}</span>
      <span className="flex items-center gap-2">
        <span className={`h-1.5 grow overflow-hidden rounded-full ${active ? "bg-white/25" : "bg-ink/15"}`}>
          <span className={`block h-full ${active ? "bg-sun" : "bg-ink"}`} style={{ width: `${b ? (a / b) * 100 : 0}%` }} />
        </span>
        <span className="font-mono text-xs font-extrabold">
          {a}/{b}
        </span>
      </span>
    </Link>
  );
}

function SwapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 7h11l-3-3" />
      <path d="M17 17H6l3 3" />
    </svg>
  );
}
