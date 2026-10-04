"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useT } from "@/lib/i18n/client";
import type { FirstStepsState } from "@/lib/first-steps";

const KEY = "cromos.firstSteps.hidden";
const EVENT = "cromos:first-steps";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function readHidden() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Tira de «Primeros pasos»: 3 pasos marcables, se puede ocultar. */
export function FirstSteps({ steps }: { steps: FirstStepsState }) {
  const t = useT().firstSteps;
  const hidden = useSyncExternalStore(subscribe, readHidden, () => false);
  const items = [
    { done: steps.card, label: t.cardReady, cta: t.cardCta, href: "/mi-cromo" },
    { done: steps.pack, label: t.openPack, cta: t.packCta, href: "/sobre" },
    { done: steps.trade, label: t.firstTrade, cta: t.tradeCta, href: "/cambios" },
  ];
  if (hidden || items.every((i) => i.done)) return null;
  const count = items.filter((i) => i.done).length;

  const hide = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* sin almacenamiento: se oculta solo hasta recargar */
    }
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    <section aria-labelledby="first-steps-title" className="panel bg-sun p-4 shadow-[4px_4px_0_#111] md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="first-steps-title" className="display text-2xl md:text-3xl">
          {t.title} <span className="font-mono text-base">{count}/3</span>
        </h2>
        <button
          type="button"
          onClick={hide}
          className="inline-flex min-h-11 items-center rounded-full border-2 border-ink bg-white px-4 text-sm font-extrabold"
        >
          {t.hide}
        </button>
      </div>
      <ol className="mt-3 grid gap-3 md:grid-cols-3">
        {items.map((i, n) => (
          <li key={n}>
            {i.done ? (
              <p className="flex min-h-11 items-center gap-3 rounded-xl border-2 border-ink bg-white/60 px-4 py-2 font-bold">
                <Mark done />
                <span>
                  {i.label}
                  <span className="sr-only"> — {t.done}</span>
                </span>
              </p>
            ) : (
              <Link
                href={i.href}
                className="flex min-h-11 items-center gap-3 rounded-xl border-2 border-ink bg-white px-4 py-2 font-extrabold text-ink no-underline shadow-[3px_3px_0_#111] hover:bg-sun-deep"
              >
                <Mark done={false} />
                <span>
                  {i.label}
                  <span className="block text-sm font-bold underline underline-offset-2">{i.cta}</span>
                </span>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Mark({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border-2 border-ink text-base font-black ${done ? "bg-ink text-white" : "bg-white"}`}
    >
      {done ? "✓" : ""}
    </span>
  );
}
