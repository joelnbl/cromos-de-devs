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

- **T-06 Estados de carga, vacío y error** en todas las páginas.

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
