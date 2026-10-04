import type { Card } from "./cards";

/**
 * Cromos de ejemplo para el modo demo y la portada. Personas inventadas:
 * nunca se muestran datos de alguien que no se haya registrado.
 */
export const DEMO_CARDS: Card[] = [
  {
    id: 1, login: "anaruiz", name: "Ana Ruiz", avatar_url: null, bio: null, country: "ES",
    top_language: "TypeScript", stars: 12400, followers: 2300, public_repos: 64, commits: 3100,
    top_repos: [
      { name: "ui-kit", description: "Componentes accesibles", stars: 9800, language: "TypeScript" },
      { name: "dotfiles", description: null, stars: 1200, language: "Shell" },
    ],
    github_created_at: "2012-03-01T00:00:00Z", rarity: "legendaria", owners: 0,
  },
  {
    id: 42, login: "dparedes", name: "Diego Paredes", avatar_url: null, bio: null, country: "VE",
    top_language: "Rust", stars: 840, followers: 310, public_repos: 38, commits: 1900,
    top_repos: [
      { name: "fast-csv", description: "Lector de CSV muy rápido", stars: 610, language: "Rust" },
      { name: "arepa-cli", description: "Pide arepas desde la terminal", stars: 140, language: "Rust" },
    ],
    github_created_at: "2016-06-01T00:00:00Z", rarity: "epica", owners: 0,
  },
  {
    id: 217, login: "luciamora", name: "Lucía Mora", avatar_url: null, bio: null, country: "MX",
    top_language: "Python", stars: 96, followers: 54, public_repos: 22, commits: 1200,
    top_repos: [
      { name: "tacos-ml", description: "Clasifica tacos con visión", stars: 71, language: "Python" },
      { name: "notas", description: null, stars: 12, language: "Python" },
    ],
    github_created_at: "2019-01-01T00:00:00Z", rarity: "rara", owners: 0,
  },
  {
    id: 388, login: "tomasgil", name: "Tomás Gil", avatar_url: null, bio: null, country: "AR",
    top_language: "Go", stars: 12, followers: 9, public_repos: 11, commits: 640,
    top_repos: [{ name: "mate-timer", description: "Avisa cuando toca cebar", stars: 8, language: "Go" }],
    github_created_at: "2021-09-01T00:00:00Z", rarity: "comun", owners: 0,
  },
  {
    id: 120, login: "vrios", name: "Valentina Ríos", avatar_url: null, bio: null, country: "CO",
    top_language: "Kotlin", stars: 61, followers: 41, public_repos: 17, commits: 880,
    top_repos: [{ name: "bus-bogota", description: "Horarios del bus offline", stars: 52, language: "Kotlin" }],
    github_created_at: "2018-02-01T00:00:00Z", rarity: "rara", owners: 0,
  },
  {
    id: 77, login: "rmata", name: "Rafael Mata", avatar_url: null, bio: null, country: "VE",
    top_language: "JavaScript", stars: 530, followers: 140, public_repos: 45, commits: 2300,
    top_repos: [{ name: "pixel-arepa", description: "Editor de pixel art", stars: 410, language: "JavaScript" }],
    github_created_at: "2014-02-01T00:00:00Z", rarity: "epica", owners: 0,
  },
  {
    id: 301, login: "csilva", name: "Carla Silva", avatar_url: null, bio: null, country: "CL",
    top_language: "CSS", stars: 22, followers: 15, public_repos: 30, commits: 950,
    top_repos: [{ name: "centrar-div", description: "Por fin", stars: 20, language: "CSS" }],
    github_created_at: "2020-02-01T00:00:00Z", rarity: "comun", owners: 0,
  },
  {
    id: 15, login: "jperez", name: "Jorge Pérez", avatar_url: null, bio: null, country: "PE",
    top_language: "Java", stars: 33, followers: 18, public_repos: 21, commits: 700,
    top_repos: [{ name: "ceviche-api", description: "Recetas en JSON", stars: 30, language: "Java" }],
    github_created_at: "2017-02-01T00:00:00Z", rarity: "comun", owners: 0,
  },
];

export function demoPack(): { card: Card; isNew: boolean }[] {
  const pool = [...DEMO_CARDS];
  const out: { card: Card; isNew: boolean }[] = [];
  for (let i = 0; i < 5; i++) {
    const roll = Math.random();
    const target = roll < 0.12 ? "legendaria" : roll < 0.3 ? "epica" : roll < 0.6 ? "rara" : "comun";
    const options = pool.filter((c) => c.rarity === target);
    const list = options.length ? options : pool;
    const card = list[Math.floor(Math.random() * list.length)];
    out.push({ card, isNew: !out.some((o) => o.card.id === card.id) && Math.random() > 0.3 });
  }
  return out;
}
