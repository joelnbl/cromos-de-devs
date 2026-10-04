import { cardNumber, RARITIES, type Rarity } from "@/lib/cards";

type MiniCardData = { id: number; login: string; name: string | null; rarity: Rarity };

/** Ficha compacta para listas de cambios. */
export function MiniCard({ card }: { card: MiniCardData }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="grid h-10 w-8 shrink-0 place-items-center rounded-md border-2 border-ink bg-sun font-mono text-[10px] font-bold">
        {RARITIES[card.rarity].symbol}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-extrabold">{card.name ?? card.login}</span>
        <span className="block truncate font-mono text-xs text-ink-soft">
          #{cardNumber(card.id)} · @{card.login}
        </span>
      </span>
    </span>
  );
}
