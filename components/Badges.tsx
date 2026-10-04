import type { Badge, BadgeKey } from "@/lib/badges";
import type { Dict } from "@/lib/i18n/dict";

const PATHS: Record<BadgeKey, string> = {
  streak3: "M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z",
  streak7: "M12 2l2.5 6 6.5.5-5 4.2 1.6 6.3L12 15.600 6.400 19l1.600-6.300-5-4.200 6.500-.5z",
  packs10: "M4 6h16v13H4zM4 10h16M9 6V3h6v3",
  firstTrade: "M4 8h14l-4-4M20 16H6l4 4",
  trades5: "M4 8h14l-4-4M20 16H6l4 4M9 12h6",
  firstGift: "M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-3 0-4-4-1-4 2 0 1 4 1 4zm0 0c3 0 4-4 1-4-2 0-1 4-1 4z",
  album25: "M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM8 8h6",
  epic: "M12 3l2.600 5.500 6 .8-4.400 4.200 1.100 6L12 16.600 6.700 19.500l1.100-6L3.400 9.300l6-.8z",
  legend: "M3 18l2-11 4 4 3-6 3 6 4-4 2 11zM5 21h14",
  owners5: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3 3-5 6-5s6 2 6 5M17 11a2.500 2.500 0 1 0 0-5M18 15c2 .5 3 2.500 3 5",
  team: "M4 21V4M4 4h13l-2 4 2 4H4",
};

/** Rejilla de insignias: ganadas en color, el resto atenuadas con su progreso. */
export function Badges({ badges, t }: { badges: Badge[]; t: Dict["badges"] }) {
  const won = badges.filter((b) => b.earned).length;
  return (
    <section aria-labelledby="badges-title">
      <h2 id="badges-title" className="display text-3xl">
        {t.title}
      </h2>
      <p className="mt-1 font-mono text-xs font-extrabold uppercase tracking-wider">{t.count(won, badges.length)}</p>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {badges.map((b) => {
          const item = t.items[b.key];
          return (
            <li
              key={b.key}
              className={`flex min-w-0 flex-col gap-2 rounded-xl border-2 border-ink p-3 ${
                b.earned ? "bg-sun shadow-[3px_3px_0_#111]" : "bg-white opacity-60"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-8 w-8 shrink-0 fill-none stroke-ink"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={PATHS[b.key]} />
              </svg>
              <h3 className="text-sm font-extrabold leading-tight">{item.title}</h3>
              <p className="text-xs leading-snug text-ink-soft">{item.body}</p>
              <p className="mt-auto font-mono text-xs font-extrabold">{b.earned ? t.earned : b.progress}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
