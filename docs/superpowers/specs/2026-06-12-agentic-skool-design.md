# Agentic Skool — Diseño v1

- **Fecha:** 2026-06-12
- **Estado:** Aprobado por John (sesión de brainstorming)
- **Repo:** `growkeyfounders/growkey-forms`, fuente de verdad en `~/Code/growkey-forms`

## 1. Contexto y objetivo

Growkey acompaña a personas a monetizar su conocimiento creando comunidades de pago en Skool, siguiendo un programa de 4 fases de ~120 días ("Success Roadmap"). Hoy existen dos formularios web (`growkey-forms` en Render + Supabase) sin autenticación.

Se construirá **Agentic Skool**: un portal donde cada cliente del programa ve su progreso (fase, semana, día con fechas reales), sigue su checklist con clases de Skool linkeadas, llena formularios y chatea con el equipo; y donde el equipo gestiona internamente a todos los clientes. Vive separado de `app.growkey.ai`, en un subdominio de `growkey.ai`.

## 2. Decisiones de producto (aprobadas en brainstorming)

1. **Progresión automática**: checklist de la fase completo + formularios de la fase enviados → el sistema avanza al cliente solo.
2. **Acceso cerrado**: solo por invitación del equipo; el cliente entra con Google o definiendo contraseña. Sin registro abierto.
3. **Contenido por fase**: checklist base igual para todos (configuración) + tareas personalizadas por cliente agregadas por el equipo.
4. **Formularios**: solo los 2 existentes (`growkey-onboarding-v1`, `growkey-offer-v1`); el sistema debe permitir agregar más editando configuración, sin migraciones.
5. **Punto de partida**: el cliente elige su fecha de inicio al entrar por primera vez; el equipo puede ajustarla. Todas las fechas del programa se calculan desde ahí.
6. **Roadmap-calendario protagonista**: línea de tiempo de 4 fases con hitos por día del programa convertidos a fechas reales, marcador de "hoy", y vista semanal día a día.
7. **Clases de Skool linkeadas** por fase y por tarea ("mira esta clase → haz esta tarea → pasa de fase").
8. **Chat grupal por cliente** con el equipo, en v1 (ver §9).
9. **Producción**: subdominio de `growkey.ai` (ej. `skool.growkey.ai`) sobre Render; recomendado plan Starter para evitar el sleep del free tier.
10. **Agente IA y automatizaciones**: iteración futura. V1 deja la data estructurada y un endpoint de contexto unificado listos (ver §10 y §13).

## 3. Arquitectura

Evolución del proyecto existente (Opción A elegida por John):

- **Stack**: React + Vite + TypeScript (SPA) + `server.mjs` (Node) + Supabase, desplegado en Render. Mismo proyecto Supabase ("Formularios Growkey"); los datos existentes se conservan.
- **Repo único**: `~/Code/growkey-forms` (clon de `growkeyfounders/growkey-forms`). Se abandona el flujo de desarrollo en `growkey/examples/onboarding` + copia manual al repo de deploy: el Desktop sufre eviction de iCloud (git/builds se congelan) y la copia en el monorepo no está versionada.
- **Autenticación**: Supabase Auth. Login con Google OAuth y email+contraseña. Altas solo vía invitación (`inviteUserByEmail` desde el servidor). Roles en tabla `profiles`: `admin` | `client`.
- **Autorización en servidor**: `server.mjs` valida el JWT de Supabase (`auth.getUser(token)`) en todos los endpoints protegidos. La service role key vive solo en el servidor. RLS activo en todas las tablas como segunda barrera.
- **Endpoints existentes que pasan a ser solo-admin**: `GET /api/submissions`, `GET /api/submissions.csv` y `DELETE /api/submissions` (hoy son públicos — fuga de datos que se cierra). `POST /api/submissions` sigue público porque los formularios públicos lo necesitan.
- **Bootstrap de admins**: el primer admin se crea con un script seed (o SQL manual en Supabase) que asigna `role = 'admin'` en `profiles`; desde ahí, los admins pueden invitar a otros miembros del equipo desde el panel interno.
- **Tiempo real**: Supabase Realtime para el chat (canal por hilo de cliente), con fallback a polling.
- **Rutas SPA**:
  - `/` → login
  - `/app` → panel del cliente (roadmap, semana, checklist, clases, formularios, chat)
  - `/admin` → panel interno (ahora protegido con rol admin; hoy está abierto, esto se corrige)
  - `/onboarding`, `/offer` → formularios públicos existentes (compatibilidad con links ya compartidos). Si el formulario se llena estando autenticado dentro del portal, la submission queda ligada al cliente.

## 4. Configuración del programa (`phaseSchema.ts`)

Sigue el patrón de `formSchema.ts`: editar el programa = editar este archivo. Tipos:

```ts
type Milestone = { day: number; title: string; type: "call" | "launch" | "goal" };
type SkoolClass = { id: string; title: string; url: string; description?: string };
type BaseTask = {
  id: string;            // estable, identifica la tarea plantilla
  title: string;
  week: number;          // semana del programa a la que pertenece
  suggestedDay?: number; // día del programa sugerido
  classId?: string;      // clase de Skool asociada ("ver clase")
};
type PhaseConfig = {
  id: 1 | 2 | 3 | 4;
  name: string;          // "Oferta", "Blueprint", "Prelanzamiento", "Lanzamiento y evergreen"
  startDay: number;      // día del programa en que inicia
  endDay: number;        // día esperado de cierre (semáforo "atrasado")
  milestones: Milestone[];
  classes: SkoolClass[];
  baseTasks: BaseTask[];
  requiredForms: string[]; // slugs de formSchema requeridos para completar la fase
};
```

- Fases y días iniciales: F1 Oferta (0–14), F2 Blueprint (14–28), F3 Prelanzamiento (28–50), F4 Lanzamiento y evergreen (50–120). Hitos: día 7 auditoría de oferta, día 14 cierre oferta, día 28 revisión blueprint, día 37 prelanzamiento, día 50 lanzamiento oficial, día 61 evergreen, día 120 meta +$10K MRR.
- Asignación inicial de formularios: `growkey-onboarding-v1` y `growkey-offer-v1` en `requiredForms` de la fase 1.
- El contenido exacto de checklists y links de clases lo entrega el equipo durante la implementación; se arranca con contenido inicial editable basado en el Success Roadmap.

## 5. Modelo de datos (Supabase)

Tablas nuevas (prefijo `skool_`), junto a la existente:

| Tabla | Columnas clave |
|---|---|
| `profiles` | `user_id` (PK = auth.users.id), `role` ('admin'\|'client'), `name`, `photo_url`, `created_at` |
| `skool_clients` | `id` (PK = user_id), `email`, `name`, `business`, `status` ('invited'\|'active'\|'paused'\|'completed'), `start_date` (date, null hasta que el cliente la elige), `current_phase` (int, default 1), `phase_started_at`, `created_at` |
| `skool_client_tasks` | `id`, `client_id`, `phase`, `source` ('base'\|'custom'), `template_id` (null en custom), `title`, `week`, `suggested_day`, `class_id`, `position`, `done` (bool), `done_at`, `created_by`, `created_at` |
| `skool_messages` | `id`, `client_id` (= hilo), `sender_id`, `body`, `created_at` |
| `skool_thread_members` | `client_id`, `user_id` (miembros del equipo en el grupo), `added_at`. El cliente es miembro implícito de su hilo |
| `skool_message_reads` | `user_id`, `client_id`, `last_read_at` (contadores de no leídos) |
| `skool_events` | `id`, `client_id`, `type` ('task_done'\|'task_added'\|'form_submitted'\|'phase_advanced'\|'phase_override'\|'status_change'\|'start_date_set'\|'note'), `payload` (jsonb), `actor_id`, `created_at` |
| `growkey_form_submissions` (existente) | + columna nueva `client_id` (uuid, null). Nada más se toca |

**RLS**: el cliente puede leer su `skool_clients`, leer/marcar `done` en sus tareas, leer/escribir mensajes de su hilo y leer sus submissions. El admin lee y escribe todo. El motor de progresión corre con service role en el servidor.

## 6. Motor de progresión (server-side)

- **Disparadores**: marcar/desmarcar tarea; llegada de submission ligada a un cliente.
- **Regla de cierre de fase N**: todas las tareas de fase N (base + custom) con `done = true` **y** todos los `requiredForms` de N con submission ligada al cliente.
- **Acción de avance**: `current_phase = N+1`, `phase_started_at = now()`, materializar `baseTasks` de N+1 como filas en `skool_client_tasks` (si no existen), registrar evento `phase_advanced`. La respuesta al cliente activa la pantalla de celebración.
- **Validación siempre en servidor** (revalida condiciones antes de escribir; idempotente — dos requests simultáneos no avanzan dos fases).
- **Desmarcar una tarea** solo actualiza esa tarea (y registra evento); nunca retrocede de fase. La condición de cierre se reevalúa en el siguiente disparador.
- **Cierre del programa**: cuando se cumplen los requisitos de la fase 4, el motor pone `status = 'completed'` (misma regla de cierre, sin fase 5) y se muestra la celebración final. La meta +$10K MRR del día 120 es un hito informativo, no una condición.
- **Tarea custom agregada** a la fase en curso → nuevo requisito para avanzar. Agregada a una fase ya completada → no retrocede al cliente (solo override manual).
- **Overrides del admin**: mover de fase (adelante/atrás), pausar/reactivar, editar `start_date`. Todo queda en `skool_events`.
- **Semáforo "atrasado"**: día calendario del cliente (`hoy - start_date`) > `endDay` de su fase actual → atrasado. Pausado nunca marca atrasado.
- **La pausa no detiene el reloj del programa**: las fechas no se desplazan solas. El mecanismo intencional para recalibrar después de una pausa larga es que el admin ajuste `start_date` desde el detalle del cliente.
- **Semana actual**: `floor((hoy - start_date) / 7) + 1`; fechas reales de hitos: `start_date + day`.

## 7. Panel del cliente (`/app`)

1. **Primer ingreso**: pantalla de bienvenida → elegir fecha de inicio (default hoy) → se materializa el checklist de fase 1. Evento `start_date_set`.
2. **Header**: saludo, negocio, badge de fase, "Semana N · día D de 120".
3. **Roadmap-calendario** (sección principal): banda de 4 fases proporcional a días, hitos con "Día X · fecha real", marcador de hoy que avanza solo.
4. **Esta semana**: chips lun–dom con la fecha real y puntos donde hay tareas o llamadas; lista de tareas de la semana con día sugerido; hito próximo.
5. **Checklist de la fase**: tareas base + custom (etiqueta "de tu coach"), botón "ver clase" cuando la tarea tiene clase asociada; los formularios requeridos de la fase aparecen integrados con su estado (pendiente → se llena dentro del portal; enviado → check).
6. **Clases de esta fase**: lista de clases de Skool con link directo al classroom.
7. **Chat con tu equipo**: hilo grupal (ver §9), accesible desde el panel con indicador de no leídos.
8. **Celebración** al completar fase, y al llegar a fase 4 + meta, cierre del camino.

Los mockups de estructura fueron aprobados; el diseño visual final se hace en implementación con la identidad Growkey.

## 8. Panel interno (`/admin`)

1. **Lista de clientes**: avatar, nombre, negocio, fase, semana, barra de progreso de fase, estado (al día / atrasado / pausado / invitado), última actividad. Filtros por fase y estado. Métricas arriba (activos, por fase, atrasados).
2. **Vista roadmap (swimlanes)**: todos los clientes posicionados por su día del programa sobre la banda de fases; anillo verde/ámbar según semáforo. Pestaña junto a la lista.
3. **Detalle de cliente**: timeline individual, checklist completo (marcar, agregar/quitar tareas custom con clase opcional), respuestas de formularios con score y stage (lo ya existente), bitácora (`skool_events`), notas internas (evento `note`), chat del hilo, overrides (fase, pausa, `start_date`), gestión de miembros del hilo, acción "ligar submission existente a este cliente" (para datos históricos como Zentia).
4. **Bandeja de conversaciones**: hilos ordenados por último mensaje con contador de no leídos por miembro del equipo.
5. **Invitar cliente**: email + nombre + negocio → crea usuario auth + `skool_clients` (status `invited`) + email de invitación. Reenviar invitación disponible.
6. Los paneles de submissions existentes (`/admin/onboarding`, `/admin/offer`) quedan integrados bajo el admin autenticado.

## 9. Chat grupal

- **Un hilo por cliente**, estilo grupo: cliente + los miembros del equipo agregados al hilo, cada uno con nombre y foto (de `profiles`).
- Todos los admins pueden ver todos los hilos; `skool_thread_members` define quiénes aparecen como miembros del grupo y quiénes acumulan contadores de no leídos en su bandeja.
- El cliente ve el grupo como "Tu equipo Growkey" con las fotos de los miembros.
- Mensajes en tiempo real (Supabase Realtime por `client_id`), con fallback a polling. Sin adjuntos en v1 (solo texto); sin edición ni borrado de mensajes en v1.

## 10. Endpoint de contexto unificado

`GET /api/clients/:id/context` (rol admin o service role) → JSON único con: perfil + datos de cliente, fase/semana/día y semáforo, checklist con estados e historial, submissions con scores, bitácora de eventos y conversación del chat.

- **Hoy** lo consume el detalle del cliente en el panel interno.
- **Mañana** lo consumen el agente IA (interno y del cliente) y los agentes de automatización de Growkey Engine — que además leen `current_phase` para configurarse según la fase. Es el único punto de integración que necesitarán.

## 11. Manejo de errores

- UI optimista con rollback: si falla el guardado de un check, se revierte visualmente con aviso. Nada falla en silencio.
- Los formularios conservan el borrador local mientras se llenan (comportamiento actual).
- Sesión expirada → redirección a login; el estado del servidor queda intacto.
- Avance de fase idempotente (revalidación server-side antes de escribir).
- Mensajes de chat: reintento con indicador "no enviado" si falla la red.

## 12. Testing

- **Unitarias** (motor de progresión y cálculos): fase completa avanza; tarea pendiente o formulario faltante no avanza; tarea custom reabre requisito; override funciona; cálculo de semana/día/fechas reales; semáforo atrasado; pausado no marca atrasado.
- **Integración** (API con auth): cliente no puede leer/escribir datos de otro cliente ni rutas admin; admin sí.
- **RLS**: verificación directa contra Supabase con tokens de cliente.
- **E2E manual guiado**: invitar → entrar (Google y contraseña) → elegir inicio → marcar tareas → enviar formulario → avance automático → chat en dos sesiones.

## 13. Futuro (fuera de alcance v1, integración prevista)

- Agente IA interno ("¿cómo va Laura y cómo la ayudo?") y agente del cliente: consumen `/api/clients/:id/context`.
- Agentes de automatización de Growkey Engine (publicar contenido, guiones, etc.) configurados por fase del cliente.
- Más formularios: agregar `FormConfig` en `formSchema.ts` + slug en `requiredForms` de la fase.
- Notificaciones por email/WhatsApp de mensajes y hitos.

## 14. Riesgos y notas operativas

- **Submissions históricas sin `client_id`** (ej. Zentia): se ligan manualmente desde el detalle del cliente.
- **Emails de invitación**: el SMTP por defecto de Supabase tiene límites; si se vuelve problema, configurar SMTP propio.
- **Render free tier** duerme tras ~15 min: subir a Starter (~$7/mes) antes de invitar clientes reales.
- **Dominio**: crear el subdominio elegido en el DNS de `growkey.ai` y agregarlo como custom domain en Render.
- **Google OAuth**: configurar el provider en Supabase Auth con credenciales de Google Cloud del proyecto Growkey.
