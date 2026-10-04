import { SignInLink } from "@/components/SignInLink";
import Link from "next/link";
import { Cromo } from "@/components/Cromo";
import { HeroFan } from "@/components/HeroFan";
import { featuredCards } from "@/lib/data";
import { DEMO_CARDS } from "@/lib/demo";
import { RARITIES, RARITY_ORDER } from "@/lib/cards";
import { getUser } from "@/lib/supabase/server";

const STEPS = [
  { n: "1", title: "Tu cromo", body: "Entras con GitHub y se crea tu carta con tu foto, tu lenguaje y tus repos como ataques." },
  { n: "2", title: "Un sobre al día", body: "Cada día abres un sobre gratis con 5 cromos de otros devs. Algunos brillan." },
  { n: "3", title: "Cambia repetidos", body: "Creas un cambio, mandas el enlace y completáis el álbum entre amigos." },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const [{ user }, hero] = await Promise.all([getUser(), featuredCards(3)]);
  const byRarity = RARITY_ORDER.map((r) => DEMO_CARDS.find((c) => c.rarity === r)!);

  const cta = user ? (
    <Link href="/sobre" className="btn btn-dark min-h-14 px-7 text-lg">
      Abrir el sobre de hoy
    </Link>
  ) : (
    <SignInLink className="btn btn-dark min-h-14 px-7 text-lg">Consigue tu cromo</SignInLink>
  );

  return (
    <main className="pb-20 md:pb-0">
      <section className="relative overflow-hidden border-b-[3px] border-ink bg-sun">
        <div className="halftone pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 md:grid-cols-2 md:pb-24 md:pt-16">
          <div>
            {error && (
              <p role="alert" className="mb-5 rounded-xl border-2 border-ink bg-white px-4 py-3 font-bold">
                {error}
              </p>
            )}
            <span className="inline-flex items-center rounded-full border-2 border-ink px-3 py-1 font-mono text-sm font-bold uppercase">
              Temporada 1 · Gratis
            </span>
            <h1 className="display mt-5 text-[clamp(2.5rem,8.4vw,5.4rem)]">
              Colecciona devs.
              <br />
              Que te coleccionen.
            </h1>
            <p className="mt-6 max-w-[34ch] text-xl font-medium leading-snug">
              Entra con GitHub y recibe tu cromo. Abre un sobre gratis cada día, cambia los repetidos y completa el
              álbum.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {cta}
              <Link href="#como" className="btn btn-ghost min-h-14 px-7 text-lg">
                Cómo funciona
              </Link>
            </div>
          </div>
          <HeroFan cards={hero} />
        </div>
      </section>

      <section className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-10 px-4 py-16">
          <div className="max-w-xl">
            <p className="font-mono text-sm font-bold uppercase text-sun">El marcador que importa</p>
            <h2 className="display mt-3 text-6xl">¿Quién te tiene?</h2>
            <p className="mt-4 text-lg leading-relaxed text-white/85">
              Tu cromo cuenta cuántas personas lo tienen en su álbum. Compártelo, que te cambien y sube el número.
            </p>
          </div>
          <div className="flex items-baseline gap-4 rounded-2xl border-2 border-sun px-7 py-6">
            <span className="font-mono text-7xl font-bold leading-none text-sun">∞</span>
            <span className="text-xl font-bold leading-tight">
              personas pueden
              <br />
              tener tu cromo
            </span>
          </div>
        </div>
      </section>

      <section id="como" className="cv-auto mx-auto max-w-6xl scroll-mt-24 px-4 py-20">
        <h2 className="display text-6xl">Cómo funciona</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border-2 border-ink bg-white p-7 shadow-[6px_6px_0_#FFC72C]">
              <div className="grid h-13 w-13 place-items-center rounded-full bg-ink font-mono text-2xl font-bold text-sun">
                {s.n}
              </div>
              <h3 className="display mt-5 text-3xl">{s.title}</h3>
              <p className="mt-2 text-lg leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cv-auto border-y-[3px] border-ink bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="display text-6xl">Cuatro rarezas</h2>
          <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
            La rareza sale de tus datos públicos de GitHub. Nadie la compra. Pasa el dedo o el ratón por encima: el
            metal brilla y cuanto más rara, más luz.
          </p>
          <div className="mt-12 grid grid-cols-2 justify-items-center gap-x-4 gap-y-10 lg:grid-cols-4">
            {byRarity.map((card) => (
              <div key={card.rarity} className="flex flex-col items-center gap-4">
                <Cromo card={card} width={220} className="max-sm:[--w:160px]!" />
                <div className="text-center">
                  <div className="display text-2xl">
                    {RARITIES[card.rarity].symbol} {RARITIES[card.rarity].label}
                  </div>
                  <div className="text-sm font-semibold text-ink-soft">{RARITIES[card.rarity].finish}</div>
                  <div className="text-sm text-ink-soft">{RARITIES[card.rarity].rule}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-sun">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-16">
          <h2 className="display text-6xl">Tu cromo te espera.</h2>
          {cta}
        </div>
        <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 border-t-2 border-ink px-4 py-6 text-sm font-semibold">
          <span>
            Hecho por{" "}
            <a href="https://github.com/joelnbl" className="underline underline-offset-2">
              @joelnbl
            </a>
          </span>
          <span>Solo tienen cromo quienes se registran. Nadie aparece sin pedirlo.</span>
        </footer>
      </section>
    </main>
  );
}
