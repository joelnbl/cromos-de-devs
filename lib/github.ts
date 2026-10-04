import { computeRarity, type TopRepo } from "./cards";

type GithubUser = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  followers: number;
  public_repos: number;
  created_at: string;
};

type GithubRepo = {
  name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  fork: boolean;
};

async function gh<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GitHub ${path} respondió ${res.status}`);
  return res.json() as Promise<T>;
}

/** Lee los datos públicos de la persona que acaba de entrar y calcula su carta. */
export async function fetchCardStats(token: string) {
  const user = await gh<GithubUser>("/user", token);

  const repos = await gh<GithubRepo[]>(
    "/user/repos?per_page=100&affiliation=owner&visibility=public&sort=pushed",
    token,
  ).catch(() => [] as GithubRepo[]);
  const own = repos.filter((r) => !r.fork);

  const stars = own.reduce((sum, r) => sum + r.stargazers_count, 0);

  const langCount = new Map<string, number>();
  for (const r of own) {
    if (r.language) langCount.set(r.language, (langCount.get(r.language) ?? 0) + 1);
  }
  const topLanguage = [...langCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const topRepos: TopRepo[] = [...own]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 2)
    .map((r) => ({
      name: r.name,
      description: r.description ? r.description.slice(0, 90) : null,
      stars: r.stargazers_count,
      language: r.language,
    }));

  const commits = await gh<{ total_count: number }>(
    `/search/commits?q=author:${encodeURIComponent(user.login)}&per_page=1`,
    token,
  )
    .then((r) => r.total_count)
    .catch(() => 0);

  return {
    github_id: user.id,
    login: user.login,
    name: user.name,
    avatar_url: user.avatar_url,
    bio: user.bio ? user.bio.slice(0, 160) : null,
    top_language: topLanguage,
    stars,
    followers: user.followers,
    public_repos: user.public_repos,
    commits,
    top_repos: topRepos,
    github_created_at: user.created_at,
    rarity: computeRarity(stars, user.followers, user.login),
  };
}
