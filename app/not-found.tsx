import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center gap-5 px-4 text-center">
      <p className="font-mono text-sm font-bold">#404</p>
      <h1 className="display text-6xl">{t.notFound.title}</h1>
      <p className="text-lg">{t.notFound.body}</p>
      <Link href="/" className="btn btn-dark">
        {t.notFound.back}
      </Link>
    </main>
  );
}
