# Agentic Skool — Documentación

> Portal de progreso para los clientes del programa Growkey. Última actualización: 12 de junio de 2026.

## 1. Qué es

Agentic Skool es la plataforma donde los clientes del programa Growkey (personas que monetizan su conocimiento creando comunidades de pago en Skool) siguen su camino de **120 días en 4 fases**, y donde el equipo Growkey gestiona y acompaña a todos sus clientes.

| Fase | Nombre | Días | Qué pasa |
|---|---|---|---|
| 1 | Oferta | 0–14 | Descubrimiento y escalera de valor (Skool Offer) |
| 2 | Blueprint | 14–28 | Se construye la comunidad (dinámicas, contenido, workflow de ventas) |
| 3 | Prelanzamiento | 28–50 | Contenido orgánico → grupo de WhatsApp → lista de espera |
| 4 | Lanzamiento y evergreen | 50–120 | Lanzamiento oficial y escala a +$10K MRR |

**Para el cliente** (`/app`): elige su fecha de inicio, ve su roadmap-calendario con fechas reales y el marcador de "hoy", sigue el checklist semanal de su fase (con clases de Skool linkeadas y tareas personalizadas de su coach), llena los formularios, celebra cuando pasa de fase, y chatea 24/7 con su equipo.

**Para el equipo** (`/admin`): lista de clientes con métricas y semáforo al día/atrasado, vista roadmap con todos los clientes posicionados por día, detalle por cliente (checklist, tareas custom, formularios con score, bitácora, notas, overrides), bandeja de conversaciones con no-leídos, e invitación de clientes por email.

**Progresión automática**: cuando un cliente completa todas las tareas de su fase Y envió los formularios requeridos, el sistema lo avanza solo a la siguiente fase. El equipo puede intervenir manualmente (mover de fase, pausar, ajustar fecha) cuando haga falta.

## 2. URLs y entornos

| Qué | URL | Estado |
|---|---|---|
| Local (desarrollo) | http://localhost:5174 | ✅ Funcionando |
| Producción (Render) | https://growkey-forms.onrender.com | ⏳ Pendiente merge a main |
| Dominio final | https://agenticskool.growkey.ai | ⏳ Pendiente DNS (GoDaddy) + custom domain (Render) |
| Formularios públicos | `/onboarding` y `/offer` | ✅ Sin cambios — los links ya compartidos siguen funcionando |
| Login | `/` o `/login` | Redirige por rol: admin → `/admin`, cliente → `/app` |

## 3. Infraestructura

- **Repo**: `github.com/growkeyfounders/growkey-forms` — fuente de verdad local en `~/Code/growkey-forms` (⚠️ NUNCA desarrollar en el Desktop: iCloud congela git/builds).
- **Branch actual**: `feat/agentic-skool` (la implementación completa, lista para merge a `main`).
- **Hosting**: Render (servicio `growkey-forms`, deploy automático al hacer push a `main`). Recomendado: plan Starter (~$7/mes) para evitar que la app "duerma".
- **Base de datos + Auth + Realtime**: Supabase, proyecto "Formularios Growkey" (`rrqdnvpeamsossluynyc`).
- **Stack**: React 19 + Vite 6 + TypeScript (SPA) · Node sin framework (`server.mjs`) · `@supabase/supabase-js` · Vitest.

### Variables de entorno

Local: `.env.local` (gitignored, ya configurado). Render: pestaña Environment del servicio.

| Variable | Para qué |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase (server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave secreta (`sb_secret_...`) — SOLO server, nunca en el frontend |
| `SUPABASE_ANON_KEY` | Llave publicable (`sb_publishable_...`) — el server valida JWTs con ella |
| `SUPABASE_TABLE` | `growkey_form_submissions` |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Frontend (Vite las inyecta en el build) |
| `ALLOW_ADMIN_DELETE` | `false` salvo que se quiera habilitar el borrado de submissions |

## 4. Cómo editar el programa (fases, checklists, clases)

**Todo el contenido del programa vive en un solo archivo: [`shared/program.mjs`](../shared/program.mjs).**

- Cada fase define: nombre, días de inicio/fin, hitos (`milestones` con su día del programa), clases de Skool (`classes` con título + URL al classroom), checklist base (`baseTasks` con semana, día sugerido y clase asociada) y formularios requeridos (`requiredForms`).
- Cambiar un texto, agregar una clase o una tarea = editar ese archivo y hacer deploy. Sin migraciones.
- ⚠️ Los links de las clases hoy apuntan a `https://www.skool.com/` genérico — **falta reemplazarlos por los links reales del classroom**.
- Los formularios se definen en [`src/formSchema.ts`](../src/formSchema.ts) (mismo patrón). Para exigir un formulario nuevo en una fase: crear el `FormConfig` y agregar su slug a `requiredForms` de la fase.

## 5. Arquitectura técnica

```
Navegador (React SPA)
  ├── Login/sesión ──────────── Supabase Auth (Google + contraseña, solo invitados)
  ├── Chat (lectura/escritura) ─ Supabase directo con RLS + Realtime
  └── Todo lo demás ─────────── API del server (con token Bearer)
server.mjs (Node, Render)
  ├── /api/submissions* ──────── formularios (POST público; GET/DELETE/CSV solo admin)
  ├── /api/skool/* ───────────── portal, tareas, clientes, overrides, chat-inbox, contexto
  └── Motor de progresión ────── server/engine.mjs (puro y testeado) + service role a Supabase
Supabase (Postgres)
  └── RLS en todas las tablas: cada cliente SOLO ve lo suyo; sin policy de
      auto-edición de rol (imposible auto-ascenderse a admin)
```

**Archivos clave**: `server/skool.mjs` (API del portal), `server/engine.mjs` (regla de avance), `server/auth.mjs` (validación de tokens), `shared/program.mjs` (programa), `src/pages/ClientPortal.tsx` (panel cliente), `src/pages/AdminPanel.tsx` + `AdminClientDetail.tsx` (panel interno), `src/components/ChatThread.tsx` (chat), `supabase/migrations/001_agentic_skool.sql` (esquema, ya aplicado).

**Tablas**: `profiles` (roles), `skool_clients`, `skool_client_tasks`, `skool_messages`, `skool_thread_members`, `skool_message_reads`, `skool_events` (bitácora completa — la base de datos histórica del cliente), y `growkey_form_submissions` (existente, ahora con `client_id`).

**Detalles finos**: el día del programa se calcula en zona horaria de **Bogotá**; el avance de fase es idempotente (dos clics simultáneos no avanzan dos veces); desmarcar una tarea nunca retrocede de fase; "atrasado" = día calendario por encima del fin de su fase actual (pausados nunca marcan atrasado).

## 6. Operación diaria

### Invitar a un cliente
Panel interno → **Invitar cliente** (email + nombre + negocio) → le llega correo para crear contraseña → al entrar elige su fecha de inicio → su checklist de fase 1 se crea solo. Si el correo no llegó: botón **Reenviar invitación** en su detalle.

### Acompañarlo
Su detalle muestra todo: timeline, checklist (el equipo puede marcar/agregar tareas), formularios con score, bitácora y chat. Overrides disponibles: mover de fase, pausar/reactivar, cambiar fecha de inicio, marcar completado.

### Correr en local
```bash
cd ~/Code/growkey-forms
npm install && npm run build
set -a; source .env.local; set +a; npm start   # → http://localhost:5174
```

### Tests
```bash
npm test                          # unitarias (motor, fechas, auth) — siempre
# Suite de integración + seguridad RLS contra Supabase real (server corriendo):
TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... TEST_CLIENT_EMAIL=... TEST_CLIENT_PASSWORD=... npm test
```

### Deploy
Merge a `main` + push → Render despliega solo. Guía completa en [`DEPLOY.md`](../DEPLOY.md).

## 7. Accesos actuales

- **Admin**: `johnaaiig@gmail.com` (creado con `scripts/seed-admin.mjs`; contraseña temporal compartida por chat — cambiarla). Nuevos admins: por ahora se crean con el mismo script seed.
- **Cliente de prueba real**: `johnaaiig+cliente@gmail.com` (invitado, correo en el inbox de John).
- **Cliente sintético con datos demo**: `johnaaiig+test@gmail.com` — fase 2, día 24, fase 1 completa con avance automático ejecutado, formularios ligados, mensaje de chat.
- 🔑 Las llaves NUNCA van en archivos versionados: viven en `.env.local` (local) y Environment de Render (producción).

## 8. Pendientes (al 12 jun 2026)

1. ⏳ Variables nuevas en Render (`SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) — en proceso.
2. ⏳ Merge `feat/agentic-skool` → `main` (deploy automático). Hacerlo DESPUÉS de las variables.
3. ⏳ Custom domain en Render: `agenticskool.growkey.ai` + CNAME en GoDaddy → `growkey-forms.onrender.com`.
4. ⏳ Supabase → Authentication → URL Configuration: Site URL de producción + Redirect URLs (`/login` de producción, onrender y localhost).
5. ⏳ Google login (Authentication → Providers, necesita credenciales de Google Cloud) — opcional, contraseña ya funciona.
6. ⏳ Plan Starter de Render antes de invitar clientes reales.
7. ⏳ Links reales de clases de Skool en `shared/program.mjs`.
8. ⏳ Pasada de pulido visual sobre la app corriendo.
9. ⏳ Contenido definitivo de checklists por fase (el actual es la base editable derivada del Success Roadmap).

## 9. Futuro — iteración 2 (diseñada, no construida)

- **Agente IA interno**: analiza el caso de cada cliente ("¿cómo va Laura y cómo la ayudo?") consumiendo `GET /api/skool/clients/:id/context` — un solo endpoint que ya entrega TODO el caso (perfil, fase, tareas, formularios con score, bitácora y conversaciones).
- **Agente del cliente**: chat de IA para dudas sobre su avance, mismo contexto.
- **Automatizaciones Growkey Engine**: agentes que publican contenido, escriben guiones, etc., configurados según `current_phase` del cliente.
- La data ya queda estructurada para esto desde hoy: no habrá migración cuando llegue el momento.

## 10. Historia del proyecto

Diseñado y construido el 12 de junio de 2026 en una sesión con Claude Code: brainstorming con decisiones de producto → spec formal → plan de 22 tareas → implementación con workflows multi-agente (33 commits, 5 revisiones adversariales de código aprobadas, 2 blockers y 27 hallazgos menores corregidos) → verificación E2E contra Supabase real (33 tests en vivo, incluyendo seguridad RLS).

- Spec: [`docs/superpowers/specs/2026-06-12-agentic-skool-design.md`](superpowers/specs/2026-06-12-agentic-skool-design.md)
- Plan: [`docs/superpowers/plans/2026-06-12-agentic-skool.md`](superpowers/plans/2026-06-12-agentic-skool.md)
- Reemplaza el flujo anterior basado en Airtable; la app de formularios original (2 formularios públicos + paneles) quedó íntegra adentro.
