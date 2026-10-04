import { cookies, headers } from "next/headers";
import { cache } from "react";
import { LOCALES, LOCALE_COOKIE, dictionaries, pickLocale, type Locale } from "./dict";

/** Idioma de la petición: el elegido con el botón ES/EN o, si no, el del navegador. */
const getLocale = cache(async (): Promise<Locale> => {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value as Locale | undefined;
  if (chosen && LOCALES.includes(chosen)) return chosen;
  return pickLocale((await headers()).get("accept-language"));
});

export async function getT() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
