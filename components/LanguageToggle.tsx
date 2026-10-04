"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/dict";
import { useLocale, useT } from "@/lib/i18n/client";

function saveLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageToggle() {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();

  const choose = (next: Locale) => {
    if (next === locale) return;
    saveLocale(next);
    start(() => router.refresh());
  };

  return (
    <div role="group" aria-label={t.common.language} className="flex rounded-full border-2 border-ink bg-white p-0.5" aria-busy={pending}>
      {(["es", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          onClick={() => choose(l)}
          aria-pressed={locale === l}
          className={`min-h-11 min-w-11 rounded-full px-2 font-mono text-xs font-bold ${locale === l ? "bg-ink text-white" : "text-ink"}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
