"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Card } from "@/lib/cards";
import { sfx } from "@/lib/sound";
import { useT } from "@/lib/i18n/client";

const DevWorld = dynamic(() => import("@/components/three/DevWorld"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#05060f]" aria-hidden="true" />,
});

/** Botón «Entrar en su mundo» + diálogo a pantalla completa con el mundo 3D. */
export function DevWorldButton({ card, className = "btn btn-sun" }: { card: Card; className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    opener.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("keydown", onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={opener}
        type="button"
        className={`${className} w-full justify-center`}
        onClick={(e) => {
          e.stopPropagation();
          sfx.whoosh();
          setOpen(true);
        }}
      >
        <span aria-hidden="true">✦</span> {t.world.enter}
      </button>
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${t.world.title}: ${card.name?.trim() || card.login}`}
            className="fixed inset-0 z-[300]"
            onClick={(e) => e.stopPropagation()}
          >
            <DevWorld card={card} onClose={close} />
          </div>,
          document.body,
        )}
    </>
  );
}
