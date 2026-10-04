import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { siteUrl } from "@/lib/site";
import { getT } from "@/lib/i18n/server";
import { LocaleProvider } from "@/lib/i18n/client";
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

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t.meta.title, template: "%s · Cromos de devs" },
    description: t.meta.description,
    openGraph: { type: "website", locale: t.meta.ogLocale, alternateLocale: ["es_ES", "en_US"], siteName: "Cromos de devs" },
    twitter: { card: "summary_large_image" },
    appleWebApp: { capable: true, title: "Cromos", statusBarStyle: "black-translucent" },
  };
}

export const viewport: Viewport = {
  themeColor: "#FFC72C",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getT();
  return (
    <html lang={locale} className={`${archivo.variable} ${mono.variable}`}>
      <body className="antialiased">
        <LocaleProvider locale={locale}>
          <SiteHeader />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
