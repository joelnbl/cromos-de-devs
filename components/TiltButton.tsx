"use client";

import { enableTilt, useTiltStatus } from "@/lib/useTilt";
import { useT } from "@/lib/i18n/client";

/** Solo aparece en táctiles donde hace falta permiso (iOS) y aún no se ha dado. */
export function TiltButton({ tone = "light", className = "" }: { tone?: "light" | "dark"; className?: string }) {
  const status = useTiltStatus();
  const t = useT();
  if (status !== "ask" && status !== "listening") return null;
  const colors = tone === "dark" ? "border-white/40 text-white" : "border-ink/30 text-ink";
  return (
    <button
      type="button"
      data-tilt-button
      onClick={() => void enableTilt()}
      className={`inline-flex min-h-[44px] items-center justify-center rounded-full border-2 bg-transparent px-4 font-mono text-xs font-bold ${colors} ${className}`}
    >
      {t.tilt.button}
    </button>
  );
}
