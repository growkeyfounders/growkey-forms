# growkey-forms / Agentic Skool

Portal de progreso para clientes del programa Growkey (4 fases, 120 días) + los formularios públicos originales. **Lee primero `docs/AGENTIC-SKOOL.md`** — es la documentación completa (qué es, arquitectura, operación, pendientes).

## Reglas del proyecto

- Fuente de verdad: `~/Code/growkey-forms` (NUNCA trabajar en copias del Desktop — iCloud congela git).
- Responder y escribir UI en español neutro/colombiano (nunca argentino).
- El contenido del programa (fases, checklists, clases, hitos, formularios requeridos) se edita SOLO en `shared/program.mjs`. Los formularios en `src/formSchema.ts`.
- Escrituras de negocio SIEMPRE pasan por el server (`server/skool.mjs` con service role). El navegador solo habla directo con Supabase para auth y chat (RLS).
- El día del programa se calcula en zona `America/Bogota` (no UTC) — no "simplificar" esto.
- Desmarcar tareas nunca retrocede de fase. El avance es server-side e idempotente (`server/engine.mjs`, testeado).
- No poner secretos en archivos versionados: `.env.local` (gitignored) y Environment de Render.
- Antes de cada commit: `npm run typecheck && npm test && npm run build` en verde.
- Los formularios públicos `/onboarding` y `/offer` no pueden romperse: hay links ya compartidos con clientes.

## Comandos

```bash
npm run build && set -a; source .env.local; set +a; npm start  # local en :5174
npm test                                                        # unitarias
npm run typecheck                                               # tsc
```

## Mapa rápido

- `server.mjs` + `server/{skool,engine,auth,db}.mjs` — API y motor
- `shared/program.mjs` — el programa (config editable)
- `src/pages/` — ClientPortal (/app), AdminPanel + AdminClientDetail (/admin), LoginPage, FormPage, SubmissionsPage
- `src/components/` — PhaseTimeline, WeekView, Checklist, ChatThread
- `supabase/migrations/001_agentic_skool.sql` — esquema (ya aplicado en prod)
- `docs/superpowers/specs|plans/` — spec y plan originales
- Deploy: `DEPLOY.md` · Render auto-deploya `main`

## Futuro acordado (NO construir sin pedirlo)

Iteración 2: agentes IA (interno + del cliente) y automatizaciones Growkey Engine por fase. Punto de integración ya listo: `GET /api/skool/clients/:id/context`.
