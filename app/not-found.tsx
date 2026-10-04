import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center gap-5 px-4 text-center">
      <p className="font-mono text-sm font-bold">#404</p>
      <h1 className="display text-6xl">Este cromo no existe</h1>
      <p className="text-lg">Puede que esa persona aún no se haya registrado.</p>
      <Link href="/" className="btn btn-dark">
        Volver a la portada
      </Link>
    </main>
  );
}
