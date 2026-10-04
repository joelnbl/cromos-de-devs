"use client";

import { useState, type ReactNode } from "react";
import { GithubIcon } from "./icons";
import { useT } from "@/lib/i18n/client";

export function SignInLink({
  next,
  className = "btn btn-dark",
  children,
}: {
  next?: string;
  className?: string;
  children: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const t = useT();
  const href = `/auth/login${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  return (
    <a href={href} className={className} onClick={() => setPending(true)} aria-busy={pending}>
      <GithubIcon />
      {pending ? t.common.openingGithub : children}
    </a>
  );
}
