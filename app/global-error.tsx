"use client";

/** Último recurso: sin proveedores ni diccionario, textos en español e inglés. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 16,
          textAlign: "center",
          background: "#ffc72c",
          color: "#111",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 44, fontWeight: 900, textTransform: "uppercase" }}>Algo ha fallado · Something broke</h1>
        <p style={{ margin: 0, fontSize: 18 }}>Prueba otra vez. / Please try again.</p>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{ minHeight: 48, padding: "0 24px", border: "2px solid #111", borderRadius: 999, background: "#111", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer" }}
          >
            Reintentar / Try again
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" style={{ color: "#111", fontWeight: 700 }}>
            Portada / Home
          </a>
        </div>
      </body>
    </html>
  );
}
