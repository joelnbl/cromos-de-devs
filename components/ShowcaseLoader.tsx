"use client";

import dynamic from "next/dynamic";
import { Cromo } from "./Cromo";
import type { Card } from "@/lib/cards";

const Showcase = dynamic(() => import("./three/Showcase"), {
  ssr: false,
  loading: () => null,
});

/** Vitrina 3D de tu cromo (Three.js se descarga solo aquí). */
export function ShowcaseLoader({ card }: { card: Card }) {
  return (
    <div className="relative">
      <noscript>
        <Cromo card={card} width={300} />
      </noscript>
      <Showcase card={card} />
    </div>
  );
}
