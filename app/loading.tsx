/** Se ve al instante mientras el servidor prepara la página siguiente. */
export default function Loading() {
  return (
    <main className="grid min-h-[60dvh] place-items-center bg-paper pb-20 md:pb-0" aria-busy="true">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-[140px] w-[100px] animate-pulse rounded-xl border-[5px] border-sun shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
          style={{ background: "radial-gradient(circle at 50% 40%, #3a2a06, #0d0b08 70%)" }}
        >
          <div className="grid h-full place-items-center font-mono text-2xl font-bold text-sun">{"{}"}</div>
        </div>
        <p className="font-mono text-sm font-bold text-ink-soft">Cargando…</p>
      </div>
    </main>
  );
}
