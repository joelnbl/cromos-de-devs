import type { Metadata, Viewport } from "next";
import { Archivo, Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-mono-jb",
  display: "swap",
});

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Cromos de devs · Colecciona devs. Que te coleccionen.",
    template: "%s · Cromos de devs",
  },
  description:
    "Entra con GitHub y recibe tu cromo. Abre un sobre gratis cada día, cambia repetidos con tus amigos y completa el álbum.",
  openGraph: { type: "website", locale: "es_ES", siteName: "Cromos de devs" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#FFC72C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${archivo.variable} ${mono.variable} ${geist.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
