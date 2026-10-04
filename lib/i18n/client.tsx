"use client";

import { createContext, useContext, type ReactNode } from "react";
import { dictionaries, type Locale } from "./dict";

const LocaleContext = createContext<Locale>("es");

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useT() {
  return dictionaries[useContext(LocaleContext)];
}
