/** Esqueleto ligero mientras carga la página. */
export default function Loading() {
  return (
    <main className="min-h-[60dvh] bg-sun pb-20 md:pb-0" aria-busy="true">
      <div className="mx-auto max-w-6xl animate-pulse px-4 py-10">
        <div className="h-9 w-2/3 max-w-sm rounded-xl border-[3px] border-ink bg-white/60" />
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="aspect-[5/7] rounded-2xl border-[3px] border-ink bg-white/50" />
          ))}
        </div>
      </div>
    </main>
  );
}
