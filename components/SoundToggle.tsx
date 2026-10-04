"use client";

import { useEffect, useState } from "react";
import { isSoundOn, onSoundChange, setSoundOn, sfx } from "@/lib/sound";

export function SoundToggle({ className = "" }: { className?: string }) {
  const [on, setOn] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setOn(isSoundOn()), 0);
    const off = onSoundChange(setOn);
    return () => {
      clearTimeout(t);
      off();
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        setSoundOn(!on);
        if (!on) sfx.pop();
      }}
      aria-pressed={on}
      aria-label={on ? "Silenciar sonidos" : "Activar sonidos"}
      className={`grid h-11 w-11 place-items-center rounded-full border-2 border-white/40 text-white hover:bg-white/10 ${className}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H2v6h4l5 4V5z" />
        {on ? (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M19 5a10 10 0 0 1 0 14" />
          </>
        ) : (
          <path d="m22 9-6 6M16 9l6 6" />
        )}
      </svg>
    </button>
  );
}
