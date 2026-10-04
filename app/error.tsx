"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center gap-5 px-4 text-center">
      <h1 className="display text-5xl md:text-6xl">{t.errorPage.title}</h1>
      <p className="text-lg">{t.errorPage.body}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => reset()} className="btn btn-dark">
          {t.errorPage.retry}
        </button>
        <Link href="/" className="font-bold underline underline-offset-4 self-center">
          {t.errorPage.home}
        </Link>
      </div>
    </main>
  );
}
