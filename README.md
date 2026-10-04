# Cromos de devs

Álbum de cromos de programadores, inspirado en las cartas coleccionables.
Entras con GitHub, recibes tu cromo, abres un sobre gratis al día y cambias repetidos.

- **Tu cromo**: foto, lenguaje principal (el «tipo» de la carta), tus repos con más estrellas como
  «ataques», nivel según los años en GitHub, debilidad y frase según el lenguaje.
- **Rarezas** (salen de tus datos públicos, nadie las compra):
  común (mate), rara (holo en la ilustración), épica (relieve + purpurina) y legendaria
  (marco dorado, relieve y arcoíris). Las cartas se inclinan en 3D y el brillo sigue al puntero.
- **Sobre del día**: 5 cromos al azar ponderados por rareza, animación de rasgado y volteo,
  explosión de brillos en épicas y legendarias.
- **Álbum**: por país («Selección Venezuela») y por lenguaje («Colección Rust»).
- **Cambios**: ofreces un repetido y pides otro; se crea un enlace y un tablón público.
- **¿Quién me tiene?**: cada cromo cuenta en cuántos álbumes está, con imagen para X y LinkedIn.

Coste: 0 €. Vercel (plan gratuito) + Supabase (plan gratuito) + API de GitHub. Sin IA de pago.

## Modo demo

Sin variables de entorno la web arranca en modo demo con cromos de ejemplo (personas inventadas).
Sirve para ver el diseño y desplegar en Vercel antes de configurar nada.

```sh
pnpm install
pnpm dev
```

## Ponerlo en marcha de verdad

1. **Supabase**: crea un proyecto en [supabase.com](https://supabase.com).
2. **Base de datos**: aplica la migración `supabase/migrations/20261004180000_init.sql`
   (`supabase link` + `supabase db push`, o pégala en el SQL Editor).
3. **App OAuth de GitHub**: en GitHub › Settings › Developer settings › OAuth Apps › New.
   - Homepage URL: la URL de tu web.
   - Authorization callback URL: `https://<tu-proyecto>.supabase.co/auth/v1/callback`.
4. **Supabase › Authentication › Providers › GitHub**: activa y pega el Client ID y el Secret.
5. **Supabase › Authentication › URL Configuration**: añade `https://<tu-web>/auth/callback`
   (y `http://localhost:3000/auth/callback` para desarrollo) a las Redirect URLs.
6. **Variables de entorno** (en Vercel y en `.env.local`), ver `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (o `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
   - `SUPABASE_SERVICE_ROLE_KEY` (solo servidor; se usa para crear tu cromo al entrar)
   - `NEXT_PUBLIC_SITE_URL` (opcional, para los enlaces de compartir)
7. Despliega en Vercel importando el repo. Si añades o cambias variables después, vuelve a desplegar:
   las `NEXT_PUBLIC_*` se fijan al compilar.

## Cómo está hecho

- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4.
- Barajita foil: marco de metal (bronce, plata, oro y oro macizo según la rareza) y rayos de luz
  detrás de la foto. En plano es CSS (`app/globals.css`, sección «El cromo»); en 3D se dibuja
  en un canvas y se monta en Three.js (`lib/three/foilCard.ts`) con marco de metal real.
- Three.js (solo se descarga en «Sobre» y «Mi cromo»):
  - `components/three/PackScene.tsx`: sobre de aluminio en 3D que se rasga deslizando el dedo,
    con chispas, destello y suspense dorado cuando trae una legendaria.
  - `components/three/Reveal3D.tsx`: las cartas salen en abanico, se apilan y cada una se
    acerca y se da la vuelta (las legendarias tiemblan antes).
  - `components/three/Showcase.tsx`: vitrina 3D de tu cromo y grabación de un vídeo de 5 s
    (MediaRecorder) para compartir.
  - Sin WebGL o con animaciones reducidas, se usa la versión CSS.
- Sonidos sintetizados con Web Audio (`lib/sound.ts`), sin archivos, con botón de silencio y
  vibración en el móvil.
- `motion` para el resto de animaciones.
- Supabase: Auth con GitHub, Postgres con RLS en todas las tablas.
  - Las acciones del juego (`open_daily_pack`, `create_trade`, `accept_trade`, `cancel_trade`)
    son funciones de Postgres que comprueban `auth.uid()`; solo las puede llamar alguien con sesión.
  - Nadie puede escribir directamente en su colección ni cambiar las estadísticas de su carta;
    solo puede cambiar su país.
  - Un sobre por persona y día (UTC), garantizado por la base de datos.
- Privacidad: solo tienen cromo quienes se registran. Se usan datos públicos de GitHub.

Comandos: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`.
