"use client";

import { useEffect, useState } from "react";

/** Hora actual en ms, actualizada cada segundo (null hasta montar, para no desajustar la hidratación). */
export function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  return now;
}

/** Milisegundos a [horas, minutos, segundos] con dos cifras. */
export function clockParts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0"));
}

export function Countdown({ to }: { to: string }) {
  const now = useNow();
  return <time dateTime={to}>{now === null ? "--:--:--" : clockParts(new Date(to).getTime() - now).join(":")}</time>;
}
