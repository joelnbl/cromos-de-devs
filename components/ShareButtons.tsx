"use client";

import { useState } from "react";
import { ShareIcon } from "./icons";

export function ShareButtons({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ url, text });
        return;
      } catch {
        // cancelado: seguimos con copiar
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-wrap gap-3">
      <a
        className="btn btn-dark"
        href={`https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Compartir en X
      </a>
      <a
        className="btn btn-ghost"
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        LinkedIn
      </a>
      <button type="button" className="btn btn-ghost" onClick={share}>
        <ShareIcon />
        <span aria-live="polite">{copied ? "¡Enlace copiado!" : "Copiar enlace"}</span>
      </button>
    </div>
  );
}
