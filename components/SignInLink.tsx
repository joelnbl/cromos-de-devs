"use client";

import { useState, type ReactNode } from "react";
import { GithubIcon } from "./icons";

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
  const href = `/auth/login${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  return (
    <a href={href} className={className} onClick={() => setPending(true)} aria-busy={pending}>
      <GithubIcon />
      {pending ? "Abriendo GitHub…" : children}
    </a>
  );
}
