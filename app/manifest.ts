import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cromos de devs",
    short_name: "Cromos",
    description: "Colecciona cromos de devs y abre tu sobre cada día.",
    start_url: "/sobre",
    scope: "/",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#ffc72c",
    lang: "es",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
