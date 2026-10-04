export type Rarity = "comun" | "rara" | "epica" | "legendaria" | "icono";

export type TopRepo = {
  name: string;
  description: string | null;
  stars: number;
  language: string | null;
};

export type Card = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  top_language: string | null;
  stars: number;
  followers: number;
  public_repos: number;
  commits: number;
  top_repos: TopRepo[];
  github_created_at: string | null;
  rarity: Rarity;
  owners: number;
};

export const CARD_COLUMNS =
  "id, login, name, avatar_url, bio, country, top_language, stars, followers, public_repos, commits, top_repos, github_created_at, rarity, owners";

export const RARITIES: Record<
  Rarity,
  { label: string; symbol: string; finish: string; rule: string }
> = {
  comun: { label: "Común", symbol: "●", finish: "Marco de bronce", rule: "Cualquiera que se registre." },
  rara: { label: "Rara", symbol: "◆", finish: "Marco de plata, rayos fríos", rule: "50+ estrellas o 30+ seguidores." },
  epica: { label: "Épica", symbol: "★", finish: "Marco de oro y destellos", rule: "500+ estrellas o 200+ seguidores." },
  legendaria: { label: "Legendaria", symbol: "✦", finish: "Oro macizo y arcoíris", rule: "5.000+ estrellas o 1.000+ seguidores." },
  icono: { label: "Icono", symbol: "♛", finish: "Holograma vivo y aura", rule: "5.000+ seguidores o 20.000+ estrellas." },
};

export const RARITY_ORDER: Rarity[] = ["comun", "rara", "epica", "legendaria", "icono"];

/** Rarezas con suspense, relieve y destellos. */
export const isTopRarity = (r: Rarity) => r === "legendaria" || r === "icono";

/** Probabilidad (%) de cada rareza por cromo del sobre. Igual que open_daily_pack en la base de datos. */
export const PACK_ODDS: Record<Rarity, number> = { comun: 67.5, rara: 22, epica: 8, legendaria: 2, icono: 0.5 };

/**
 * Referentes de la comunidad que reciben la Icono sí o sí. Su cromo NO existe
 * hasta que ellos mismos entran con GitHub: esta lista solo decide la rareza.
 */
export const ICONO_LOGINS = new Set(["joelnbl", "midudev", "mouredev", "freddier", "rauchg"]);

export function computeRarity(stars: number, followers: number, login = ""): Rarity {
  if (ICONO_LOGINS.has(login.toLowerCase())) return "icono";
  if (stars >= 20000 || followers >= 5000) return "icono";
  if (stars >= 5000 || followers >= 1000) return "legendaria";
  if (stars >= 500 || followers >= 200) return "epica";
  if (stars >= 50 || followers >= 30) return "rara";
  return "comun";
}

/** "PS" de la carta: crece despacio con estrellas y seguidores, en saltos de 10. */
export function computeXp(card: Pick<Card, "stars" | "followers">): number {
  const raw = Math.log2(1 + card.stars + card.followers * 2);
  return Math.min(340, Math.max(40, 40 + Math.floor(raw * 2) * 10));
}

export function yearsOnGithub(createdAt: string | null): number {
  if (!createdAt) return 1;
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.max(1, Math.floor(ms / (365.25 * 24 * 3600 * 1000)));
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "").replace(".", ",")}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "").replace(".", ",")}k`;
  return String(n);
}

export function cardNumber(id: number): string {
  return String(id).padStart(3, "0");
}

type LangStyle = {
  color: string;
  short: string;
  weakness: string;
  resistance: string;
  flavor: string;
};

const LANGS: Record<string, LangStyle> = {
  TypeScript: { color: "#3178C6", short: "TS", weakness: "any", resistance: "undefined", flavor: "Prefiere un error en el editor que tres en producción." },
  JavaScript: { color: "#D4B106", short: "JS", weakness: "undefined", resistance: "NaN", flavor: "Funciona en su navegador. En el tuyo, quién sabe." },
  Python: { color: "#3A75A8", short: "PY", weakness: "Tabulador", resistance: "Pandas", flavor: "Lo escribe en una línea y lo explica en veinte." },
  Rust: { color: "#B7410E", short: "RS", weakness: "Borrow checker", resistance: "Segfault", flavor: "Compiló a la primera. Nadie le cree." },
  Go: { color: "#00A3CC", short: "GO", weakness: "if err != nil", resistance: "Genéricos", flavor: "Simple por fuera, goroutines por dentro." },
  Java: { color: "#E76F00", short: "JV", weakness: "FactoryFactory", resistance: "Memoria", flavor: "Su clase favorita tiene 400 líneas y un getter." },
  Kotlin: { color: "#7F52FF", short: "KT", weakness: "Gradle", resistance: "Null", flavor: "Huyó de Java y se llevó la JVM." },
  Ruby: { color: "#CC342D", short: "RB", weakness: "Magia", resistance: "Plazos", flavor: "Escribe código que parece poesía y a veces lo es." },
  PHP: { color: "#777BB4", short: "PHP", weakness: "Memes", resistance: "Críticas", flavor: "Mueve medio internet y nadie se lo agradece." },
  "C++": { color: "#00599C", short: "C++", weakness: "Segfault", resistance: "Lentitud", flavor: "Lee los mensajes de error como quien lee un libro." },
  C: { color: "#5C6B7A", short: "C", weakness: "Punteros", resistance: "Abstracción", flavor: "Gestiona la memoria a mano y no se queja." },
  "C#": { color: "#68217A", short: "C#", weakness: "Licencias", resistance: "Tipos", flavor: "Tiene una solución con quince proyectos." },
  Swift: { color: "#F05138", short: "SW", weakness: "Xcode", resistance: "Opcionales", flavor: "Rompe la API cada año y lo llama evolución." },
  Dart: { color: "#0175C2", short: "DT", weakness: "Anidación", resistance: "Plataformas", flavor: "Un widget dentro de otro widget dentro de otro." },
  HTML: { color: "#E34F26", short: "HT", weakness: "Debates", resistance: "Lógica", flavor: "Sí es un lenguaje. No vamos a discutirlo." },
  CSS: { color: "#663399", short: "CSS", weakness: "Centrar un div", resistance: "z-index", flavor: "Centró un div al primer intento. Una vez." },
  Shell: { color: "#3E8E2E", short: "SH", weakness: "rm -rf", resistance: "Ratón", flavor: "Lo automatiza todo con un script de una línea." },
  Vue: { color: "#2F9E6F", short: "VU", weakness: "Migraciones", resistance: "Boilerplate", flavor: "Una plantilla, un script y cero dramas." },
  Elixir: { color: "#4B275F", short: "EX", weakness: "Explicarlo", resistance: "Caídas", flavor: "Si algo falla, lo deja caer y vuelve a empezar." },
  Haskell: { color: "#5E5086", short: "HS", weakness: "Producción", resistance: "Efectos", flavor: "Una mónada es un monoide en la categoría de los endofuntores." },
};

const DEFAULT_LANG: LangStyle = {
  color: "#5B6672",
  short: "</>",
  weakness: "Viernes en producción",
  resistance: "Reuniones",
  flavor: "Programa de todo un poco y lo arregla todo un poco.",
};

export function langStyle(lang: string | null): LangStyle & { name: string } {
  if (lang && LANGS[lang]) return { ...LANGS[lang], name: lang };
  return { ...DEFAULT_LANG, name: lang ?? "Políglota" };
}

export const COUNTRIES: Record<string, string> = {
  AR: "Argentina", BO: "Bolivia", BR: "Brasil", CL: "Chile", CO: "Colombia", CR: "Costa Rica",
  CU: "Cuba", DO: "República Dominicana", EC: "Ecuador", ES: "España", GT: "Guatemala",
  HN: "Honduras", MX: "México", NI: "Nicaragua", PA: "Panamá", PE: "Perú", PR: "Puerto Rico",
  PY: "Paraguay", SV: "El Salvador", UY: "Uruguay", US: "Estados Unidos", VE: "Venezuela",
  GB: "Reino Unido", FR: "Francia", DE: "Alemania", IT: "Italia", PT: "Portugal", IN: "India",
  CA: "Canadá", OT: "Otro",
};

/** Nombre del país en el idioma de la página («VE» → «Venezuela» / «Venezuela»). */
export function countryName(code: string, locale: string, other = "Otro"): string {
  if (code === "OT") return other;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? COUNTRIES[code] ?? code;
  } catch {
    return COUNTRIES[code] ?? code;
  }
}
