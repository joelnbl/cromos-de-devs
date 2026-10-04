"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlbumIcon, CromoIcon, PackIcon, SwapIcon } from "./icons";
import { useT } from "@/lib/i18n/client";

const LINKS = [
  { href: "/sobre", key: "pack", Icon: PackIcon },
  { href: "/album", key: "album", Icon: AlbumIcon },
  { href: "/cambios", key: "trades", Icon: SwapIcon },
  { href: "/mi-cromo", key: "myCard", Icon: CromoIcon },
] as const;

export function NavLinks({ variant }: { variant: "top" | "bottom" }) {
  const pathname = usePathname();
  const t = useT();

  if (variant === "top") {
    return (
      <nav aria-label={t.common.navMain} className="hidden items-center gap-1 md:flex">
        {LINKS.map(({ href, key }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-4 py-2.5 font-bold no-underline ${active ? "bg-ink text-white" : "text-ink hover:bg-black/5"}`}
            >
              {t.nav[key]}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      aria-label={t.common.navSections}
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t-2 border-ink bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {LINKS.map(({ href, key, Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-extrabold no-underline ${active ? "bg-sun text-ink" : "text-ink"}`}
          >
            <Icon />
            {t.nav[key]}
          </Link>
        );
      })}
    </nav>
  );
}
