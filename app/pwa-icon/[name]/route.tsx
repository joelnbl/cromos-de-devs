import { ImageResponse } from "next/og";

const VARIANTS: Record<string, { size: number; maskable: boolean }> = {
  "192": { size: 192, maskable: false },
  "512": { size: 512, maskable: false },
  maskable: { size: 512, maskable: true },
};

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((name) => ({ name }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const v = VARIANTS[name];
  if (!v) return new Response("Not found", { status: 404 });

  // Maskable: logo dentro de la zona segura (~60%). Normal: algo más grande.
  const w = Math.round(v.size * (v.maskable ? 0.3 : 0.38));
  const h = Math.round(w * 1.25);
  const border = Math.max(3, Math.round(w * 0.08));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFC72C",
        }}
      >
        <div
          style={{
            width: w,
            height: h,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#111111",
            color: "#FFC72C",
            border: `${border}px solid #ffffff`,
            borderRadius: Math.round(w * 0.14),
            boxShadow: `0 0 0 ${Math.max(2, Math.round(border * 0.7))}px #111111`,
            transform: "rotate(-6deg)",
            fontSize: Math.round(w * 0.5),
            fontWeight: 700,
          }}
        >
          {"{}"}
        </div>
      </div>
    ),
    { width: v.size, height: v.size },
  );
}
