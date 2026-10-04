/** Lee `?c=1,2,3`: solo enteros positivos, sin repetir, máximo 5. Lo inválido se descarta. */
export function parseCardIds(raw: string | string[] | undefined | null): number[] {
  const text = Array.isArray(raw) ? raw.join(",") : raw ?? "";
  const ids: number[] = [];
  for (const part of text.split(",")) {
    const p = part.trim();
    if (!/^\d{1,9}$/.test(p)) continue;
    const n = Number(p);
    if (n > 0 && !ids.includes(n)) ids.push(n);
    if (ids.length === 5) break;
  }
  return ids;
}
