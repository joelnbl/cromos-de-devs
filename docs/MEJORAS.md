# Tickets de mejora · Cromos de devs

Bitácora del equipo. Cada ticket: qué, por qué, quién (agente y modelo) y estado.
Reglas: nada de datos inventados ni cromos de gente que no se ha registrado; textos en ES y EN;
`npx tsc --noEmit` + `pnpm lint` + `pnpm build` en verde antes de subir; las migraciones
nuevas van en `supabase/migrations/` y se prueban en local antes.

## Equipo

| Rol | Modelo | Qué hace |
|---|---|---|
| Coordinador y revisor | Opus (hilo principal) | Prioriza, revisa el código de los agentes, prueba en navegador, sube |
| Auditor | Haiku | Revisa la web entera y devuelve fallos concretos (barato, solo lectura) |
| Seguridad | Sonnet | Revisa permisos, RLS, acciones del servidor (solo lectura) |
| Desarrollador | Sonnet | Implementa tickets concretos en archivos acotados |

## Abiertos


## Esperan a poder aplicar migraciones (Supabase bloqueado desde este entorno)

- **T-10 Invitaciones con recompensa**: migración lista `20261005180000_invitaciones.sql` (tabla `referrals` + `reward_referral`; enlace `/c/<login>?ref=<login>`, cookie `ref` 30 días, máx. 50 recompensas por invitador). Sin aplicar, la web no muestra el contador y todo sigue igual.
- **T-13 Evento del día**: migración lista `20261005170000_eventos.sql` (tabla `pack_events` + `open_daily_pack` con eventos). Crear un evento: `insert into public.pack_events (day, kind, value) values (current_date, 'boost', null);` (kinds: `boost`, `country` con value ISO de 2 letras, `language` con value = lenguaje principal).
- **T-14 Avisos en la app** (tabla de notificaciones y disparadores al cerrar cambios).
- **T-11 Álbum público de otros devs**: requiere decidir si la colección deja de ser privada. No se hace sin el dueño.

## Pendiente de decidir

- **S-03 Cuentas múltiples**: alguien puede crear cuentas de GitHub nuevas para pasarse cartas. Opción: exigir antigüedad mínima de la cuenta de GitHub. Sin hacer por ahora (proyecto pequeño).
- **S-05 Datos públicos**: `cards.user_id` y `trades.from_user` se pueden leer sin sesión (son identificadores, no emails). Aceptado de momento.
- **CSP**: no se ha puesto política de contenido para no romper scripts de Next; el resto de cabeceras sí.

## Hechos

- **T-00a** Fondo del sobre cortado a media pantalla. ✔
- **T-00b** Sobres con el mismo cromo 5 veces: migración `20261005150000_sobre_variado.sql`. ✔
- **T-01** Rendimiento (Sonnet): avatares de GitHub a 280 px, carga diferida, esqueletos de carga por página, caché larga de /demo, motion optimizado. ✔
- **T-02** Auditoría (Haiku): plural en inglés y botones de idioma a 44 px. Los nombres propios («Cromos de devs», «WhatsApp») se quedan. ✔
- **T-03** Seguridad (Sonnet): sin críticos. Migración `20261005160000_seguridad.sql` (quien ofrece debe seguir teniendo la repetida; límite de cambios a prueba de peticiones simultáneas), login de /c/ validado, OG solo con avatares de GitHub o /demo, códigos de cambio validados, cabeceras de seguridad. ✔
- **T-04** Mi cromo rediseñado y sello CREADOR para @joelnbl (Sonnet). ✔
- **T-07** SEO (Sonnet): robots.txt, sitemap con cromos públicos, canonical, OG/Twitter en /c/, JSON-LD WebSite, páginas privadas con noindex. ✔
- **T-05** Portada «En vivo» con datos reales: devs, cambios hechos y los más coleccionados; oculta si hay pocos datos (Sonnet). ✔
- **T-08** Sello CREADOR también en la carta 3D y en la imagen OG (Sonnet). ✔
- **T-09** Mi cromo: compartir a ancho completo (Sonnet). ✔
- **T-06** Páginas de error con «Reintentar» (error y global-error) y lecturas a prueba de datos nulos (Sonnet). ✔
- **T-12** Compartir el sobre: página `/s?c=…` con los cromos e imagen OG propia; el resumen del sobre comparte ese enlace (Sonnet). ✔
- **T-18** Imagen OG de cada cambio y regalo en `/t/[código]` (Sonnet). ✔
- **T-15** Ranking público `/ranking` con podio, filtros por país y lenguaje (Sonnet). ✔
- **T-19** Web instalable en el móvil: manifest, iconos 192/512/maskable, abre en /sobre (Sonnet). ✔
- **T-20** Sonidos: intercambio al aceptar cambios y pasar página en el álbum (Haiku). ✔
- **T-23** Primeros pasos: tira de 3 pasos en Mi cromo y aviso en el álbum para abrir el primer sobre (Sonnet). ✔
- **QA** 12 rutas × móvil/escritorio × es/en sin fallos (Haiku). ✔
- **T-16** Insignias en Mi cromo calculadas con datos existentes (11 insignias, sin tablas nuevas) (Sonnet). ✔
- **T-24** «Su mundo»: mundo 3D de cada dev con sus datos reales (torres de cristal por repo, holograma, cielo de estrellas, commits en espiral, anillos por año) desde /c/ y el álbum (Sonnet). ✔
- **T-25** Sonidos rehechos uno a uno con bus maestro, compresor y reverb; medidos sin saturar (Sonnet). ✔
- **T-26** Cromo premium: holo y brillo que siguen al dedo, canto grueso, grano de impresión, relieve y destello al tocar (Sonnet; ajuste del dorado de la legendaria por el coordinador). ✔
- **T-27** Calidad de código: iconos, cuenta atrás y helpers centralizados, código y textos muertos borrados; capturas idénticas antes/después (Sonnet). ✔
- **T-28** Su mundo 2.0: tocar torre → ficha del repo y «Ver en GitHub», holograma con música de su rareza, ambiente sonoro, halos y brillo de commits (Sonnet). ✔
