# Agentic Skool v1 — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir la app `growkey-forms` en Agentic Skool: portal con auth donde los clientes del programa Growkey ven su roadmap-calendario de 4 fases, completan checklists con clases de Skool, llenan formularios y chatean con el equipo; con panel interno de gestión.

**Architecture:** Evolución del stack existente (React+Vite+TS SPA + `server.mjs` Node + Supabase en Render). Config del programa en `shared/program.mjs` (compartido server/cliente). Motor de progresión server-side puro y testeado. Auth con Supabase (Google + invitación); escrituras de negocio pasan por el servidor; chat directo vía supabase-js con RLS + Realtime.

**Tech Stack:** React 19, Vite 6, TypeScript, Node (sin framework), `@supabase/supabase-js` v2, Vitest, Supabase (Postgres + Auth + Realtime), Render.

**Spec:** `docs/superpowers/specs/2026-06-12-agentic-skool-design.md` — leerlo antes de empezar.

**Convenciones para el ejecutor:**
- Repo: `/Users/john/Code/growkey-forms`. Trabajar en branch `feat/agentic-skool`.
- El código de UI de este plan define estructura y comportamiento exactos; el detalle visual (clases CSS nuevas en `styles.css`) puede ajustarse siguiendo el lenguaje visual existente de la app (variables y patrones ya presentes en `src/styles.css`). No cambiar el comportamiento especificado.
- Después de cada tarea: `npm run typecheck && npm test` deben pasar.
- Comandos de test: `npm test` = `vitest run`.
- Los textos visibles al usuario van en español.

---

## Estructura de archivos (mapa completo)

```
shared/program.mjs              NUEVO  Config del programa (fases/hitos/clases/tareas) + helpers puros de fechas
shared/program.d.mts            NUEVO  Tipos TS del módulo anterior
server/db.mjs                   NUEVO  supabaseRequest + helpers de tablas (service role)
server/auth.mjs                 NUEVO  authenticate() / requireAdmin() para server.mjs
server/engine.mjs               NUEVO  Motor de progresión (función pura evaluateAdvance)
server/skool.mjs                NUEVO  Handlers de la API /api/skool/*
server.mjs                      MOD    Monta auth en endpoints existentes + rutas /api/skool/*
supabase/migrations/001_agentic_skool.sql  NUEVO  Tablas, RLS, realtime
scripts/seed-admin.mjs          NUEVO  Crea el primer admin
src/supabaseClient.ts           NUEVO  Cliente supabase-js del navegador
src/session.tsx                 NUEVO  Contexto de sesión (user + profile + token)
src/api.ts                      NUEVO  fetch autenticado hacia /api/skool/*
src/skoolTypes.ts               NUEVO  Tipos de las respuestas de la API skool
src/App.tsx                     MOD    Queda solo el router; vistas se extraen a pages/
src/pages/FormPage.tsx          NUEVO  Vista de formulario (extraída de App.tsx, sin cambios de lógica)
src/pages/SubmissionsPage.tsx   NUEVO  Vista ops de submissions (extraída de App.tsx)
src/pages/LoginPage.tsx         NUEVO  Login Google/password + set-password de invitación
src/pages/ClientPortal.tsx      NUEVO  Panel del cliente (/app)
src/pages/AdminPanel.tsx        NUEVO  Panel interno (/admin): lista + métricas + swimlanes + bandeja
src/pages/AdminClientDetail.tsx NUEVO  Detalle de cliente (admin)
src/components/PhaseTimeline.tsx NUEVO Banda de fases + hitos con fechas + marcador hoy
src/components/WeekView.tsx     NUEVO  Chips lun–dom + tareas de la semana
src/components/Checklist.tsx    NUEVO  Checklist de fase (tareas + formularios)
src/components/ChatThread.tsx   NUEVO  Hilo de chat grupal (realtime)
src/formSchema.ts               SIN CAMBIOS
src/storage.ts                  MOD    saveSubmission manda Authorization si hay sesión
src/styles.css                  MOD    Estilos nuevos al final del archivo
render.yaml                     MOD    Nuevas env vars
package.json                    MOD    +@supabase/supabase-js, +vitest, script test
tsconfig.json                   MOD    incluir shared/ en include
.gitignore                      MOD    +.env.local
DEPLOY.md                       MOD    nuevos pasos de deploy
tests/program.test.ts           NUEVO
tests/engine.test.mjs           NUEVO
tests/auth.test.mjs             NUEVO
tests/integration.test.mjs      NUEVO  API + RLS contra entorno real (skippable)
```

Responsabilidades: `shared/program.mjs` no conoce DB ni HTTP; `server/engine.mjs` no conoce HTTP (recibe datos, devuelve decisión); `server/skool.mjs` orquesta (lee DB → engine → escribe DB); las pages consumen `src/api.ts` y nunca llaman a Supabase directo **excepto** chat y lecturas de mensajes (supabase-js + RLS).

---

## Chunk 1: Fundaciones — deps, migración SQL, config del programa, motor

### Task 1: Dependencias y Vitest

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`

- [ ] **Step 1.1: Branch de trabajo**

```bash
cd /Users/john/Code/growkey-forms && git checkout -b feat/agentic-skool
```

- [ ] **Step 1.2: Instalar dependencias**

```bash
npm install @supabase/supabase-js
npm install -D vitest
```

- [ ] **Step 1.3: Agregar script test a package.json** (en `"scripts"`)

```json
"test": "vitest run --passWithNoTests"
```

- [ ] **Step 1.4: En tsconfig.json**, cambiar `"include": ["src"]` por `"include": ["src", "shared", "tests"]` y cambiar `"allowJs": false` a `true` (necesario para importar `shared/program.mjs` desde TS con su `.d.mts`).

- [ ] **Step 1.5: Verificar**

```bash
npm run typecheck && npm test
```
Expected: typecheck pasa; vitest sale con exit 0 reportando "No test files found".

- [ ] **Step 1.6: Commit**

```bash
git add package.json package-lock.json tsconfig.json
git commit -m "chore: add supabase-js and vitest"
```

### Task 2: Migración SQL completa

**Files:**
- Create: `supabase/migrations/001_agentic_skool.sql`

- [ ] **Step 2.1: Crear el archivo con este contenido exacto:**

```sql
-- Agentic Skool v1 — tablas, RLS y realtime
-- Aplicar en el SQL Editor de Supabase (proyecto "Formularios Growkey")

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','client')),
  name text not null default '',
  photo_url text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create table if not exists public.skool_clients (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  business text not null default '',
  status text not null default 'invited'
    check (status in ('invited','active','paused','completed')),
  start_date date,
  current_phase int not null default 1,
  phase_started_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.skool_client_tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.skool_clients(id) on delete cascade,
  phase int not null,
  source text not null default 'base' check (source in ('base','custom')),
  template_id text,
  title text not null,
  week int,
  suggested_day int,
  class_id text,
  position int not null default 0,
  done boolean not null default false,
  done_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- Único NO-parcial: la materialización usa PostgREST on_conflict=client_id,template_id
-- y Postgres no puede inferir un índice parcial como árbitro (error 42P10).
-- Los NULL de tareas custom no chocan entre sí (NULLS DISTINCT por defecto).
create unique index if not exists skool_client_tasks_client_template_idx
  on public.skool_client_tasks (client_id, template_id);

create index if not exists skool_client_tasks_client_phase_idx
  on public.skool_client_tasks (client_id, phase, position);

create table if not exists public.skool_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.skool_clients(id) on delete cascade,
  sender_id uuid not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists skool_messages_client_created_idx
  on public.skool_messages (client_id, created_at);

create table if not exists public.skool_thread_members (
  client_id uuid not null references public.skool_clients(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (client_id, user_id)
);

create table if not exists public.skool_message_reads (
  user_id uuid not null,
  client_id uuid not null references public.skool_clients(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, client_id)
);

create table if not exists public.skool_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.skool_clients(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  actor_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists skool_events_client_created_idx
  on public.skool_events (client_id, created_at desc);

alter table public.growkey_form_submissions
  add column if not exists client_id uuid;

-- ===== RLS =====
alter table public.profiles enable row level security;
alter table public.skool_clients enable row level security;
alter table public.skool_client_tasks enable row level security;
alter table public.skool_messages enable row level security;
alter table public.skool_thread_members enable row level security;
alter table public.skool_message_reads enable row level security;
alter table public.skool_events enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select
  using (user_id = auth.uid() or public.is_admin());

-- SIN policy de UPDATE en profiles: todas las escrituras de perfil las hace
-- el servidor con service role. Una policy de self-update permitiría a un
-- cliente hacer PATCH de su propio role a 'admin' (RLS no puede comparar
-- contra el valor anterior de la fila).

drop policy if exists "clients_select" on public.skool_clients;
create policy "clients_select" on public.skool_clients for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "tasks_select" on public.skool_client_tasks;
create policy "tasks_select" on public.skool_client_tasks for select
  using (client_id = auth.uid() or public.is_admin());

drop policy if exists "messages_select" on public.skool_messages;
create policy "messages_select" on public.skool_messages for select
  using (client_id = auth.uid() or public.is_admin());

drop policy if exists "messages_insert" on public.skool_messages;
create policy "messages_insert" on public.skool_messages for insert
  with check (
    sender_id = auth.uid()
    and (client_id = auth.uid() or public.is_admin())
  );

drop policy if exists "thread_members_select" on public.skool_thread_members;
create policy "thread_members_select" on public.skool_thread_members for select
  using (client_id = auth.uid() or public.is_admin());

drop policy if exists "reads_own" on public.skool_message_reads;
create policy "reads_own" on public.skool_message_reads for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "events_admin_select" on public.skool_events;
create policy "events_admin_select" on public.skool_events for select
  using (public.is_admin());

-- Realtime para chat
do $$ begin
  alter publication supabase_realtime add table public.skool_messages;
exception when duplicate_object then null;
end $$;
```

Notas: no hay policies de INSERT/UPDATE para tablas de negocio (clients, tasks, events) — esas escrituras solo las hace el servidor con service role (bypassa RLS). El chat sí permite INSERT directo del navegador. `growkey_form_submissions` conserva su policy service-role existente.

- [ ] **Step 2.2: Aplicar la migración** — MANUAL GATE: abrir el SQL Editor de Supabase (proyecto `rrqdnvpeamsossluynyc`), pegar el archivo completo, ejecutar. Verificar en Table Editor que existen las 7 tablas nuevas y la columna `client_id` en `growkey_form_submissions`.

- [ ] **Step 2.3: Commit**

```bash
git add supabase/migrations/001_agentic_skool.sql
git commit -m "feat: agentic skool database schema, RLS and realtime"
```

### Task 3: `shared/program.mjs` — config del programa + helpers de fechas (TDD)

**Files:**
- Create: `shared/program.mjs`
- Create: `shared/program.d.mts`
- Test: `tests/program.test.ts`

Reglas de dominio (del spec §4 y §6):
- `programDay(startDate, today)` = días enteros transcurridos desde `start_date` (día 0 = el día de inicio). Matemática en UTC sobre strings `YYYY-MM-DD` para evitar bugs de zona horaria.
- `currentWeek(day)` = `floor(day / 7) + 1` (día 0–6 → semana 1).
- Fase esperada por calendario: la fase cuyo rango `[startDay, endDay)` contiene el día (día ≥ 120 → fase 4).
- `isLate(currentPhaseId, day)` = `day > endDay` de la fase actual.
- `milestoneDate(start, day)` y `weekRange(start, week)` devuelven fechas `YYYY-MM-DD`.

- [ ] **Step 3.1: Escribir el test que falla** — `tests/program.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  PROGRAM,
  addDays,
  currentWeek,
  expectedPhaseForDay,
  isLate,
  milestoneDate,
  phaseById,
  programDay,
  weekRange,
} from "../shared/program.mjs";

describe("PROGRAM config", () => {
  it("tiene 4 fases contiguas que cubren 0..120", () => {
    expect(PROGRAM.phases.map((p) => p.id)).toEqual([1, 2, 3, 4]);
    expect(PROGRAM.phases[0].startDay).toBe(0);
    expect(PROGRAM.phases[3].endDay).toBe(120);
    for (let i = 1; i < 4; i++) {
      expect(PROGRAM.phases[i].startDay).toBe(PROGRAM.phases[i - 1].endDay);
    }
  });
  it("cada fase tiene requiredForms array y baseTasks con ids únicos", () => {
    const ids = PROGRAM.phases.flatMap((p) => p.baseTasks.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const phase of PROGRAM.phases) expect(Array.isArray(phase.requiredForms)).toBe(true);
  });
});

describe("fechas", () => {
  it("programDay cuenta desde 0 el día de inicio", () => {
    expect(programDay("2026-05-12", "2026-05-12")).toBe(0);
    expect(programDay("2026-05-12", "2026-05-19")).toBe(7);
    expect(programDay("2026-05-12", "2026-06-04")).toBe(23);
  });
  it("programDay nunca es negativo", () => {
    expect(programDay("2026-05-12", "2026-05-01")).toBe(0);
  });
  it("currentWeek", () => {
    expect(currentWeek(0)).toBe(1);
    expect(currentWeek(6)).toBe(1);
    expect(currentWeek(7)).toBe(2);
    expect(currentWeek(23)).toBe(4);
  });
  it("addDays y milestoneDate", () => {
    expect(addDays("2026-05-12", 7)).toBe("2026-05-19");
    expect(addDays("2026-05-28", 5)).toBe("2026-06-02");
    expect(milestoneDate("2026-05-12", 28)).toBe("2026-06-09");
  });
  it("weekRange", () => {
    expect(weekRange("2026-05-12", 1)).toEqual({ from: "2026-05-12", to: "2026-05-18" });
    expect(weekRange("2026-05-12", 4)).toEqual({ from: "2026-06-02", to: "2026-06-08" });
  });
});

describe("fases", () => {
  it("expectedPhaseForDay", () => {
    expect(expectedPhaseForDay(0).id).toBe(1);
    expect(expectedPhaseForDay(13).id).toBe(1);
    expect(expectedPhaseForDay(14).id).toBe(2);
    expect(expectedPhaseForDay(28).id).toBe(3);
    expect(expectedPhaseForDay(50).id).toBe(4);
    expect(expectedPhaseForDay(500).id).toBe(4);
  });
  it("isLate compara contra endDay de la fase ACTUAL del cliente", () => {
    expect(isLate(1, 10)).toBe(false);
    expect(isLate(1, 15)).toBe(true);
    expect(isLate(2, 20)).toBe(false);
    expect(isLate(4, 200)).toBe(true);
  });
  it("phaseById", () => {
    expect(phaseById(2).name).toBe("Blueprint");
  });
});
```

- [ ] **Step 3.2: Correr y verificar que falla**

```bash
npm test
```
Expected: FAIL — cannot find module `../shared/program.mjs`.

- [ ] **Step 3.3: Implementar `shared/program.mjs`:**

```js
// Config del programa Agentic Skool + helpers puros de fechas.
// Sin dependencias. Compartido entre server.mjs y la SPA.
// Editar este archivo = editar el programa (fases, hitos, clases, checklists).

export const MS_DAY = 86_400_000;

export const PROGRAM = {
  totalDays: 120,
  goal: "Meta +$10K MRR",
  phases: [
    {
      id: 1,
      name: "Oferta",
      headline: "Diseñamos tu escalera de valor",
      startDay: 0,
      endDay: 14,
      milestones: [
        { day: 7, title: "Auditoría de oferta", type: "call" },
        { day: 14, title: "Cierre de oferta", type: "call" },
      ],
      classes: [
        { id: "c1-escalera", title: "Diseña tu escalera de valor", url: "https://www.skool.com/" },
        { id: "c1-oferta", title: "Construye tu Skool Offer", url: "https://www.skool.com/" },
      ],
      baseTasks: [
        { id: "t1-onboarding", title: "Completa el formulario de onboarding", week: 1, suggestedDay: 1 },
        { id: "t1-escalera", title: "Define tu escalera de valor (free, low ticket, high ticket)", week: 1, suggestedDay: 3, classId: "c1-escalera" },
        { id: "t1-oferta-doc", title: "Llena el ejercicio de oferta", week: 2, suggestedDay: 8, classId: "c1-oferta" },
        { id: "t1-auditoria", title: "Agenda y asiste a tu auditoría de oferta", week: 2, suggestedDay: 10 },
      ],
      requiredForms: ["growkey-onboarding-v1", "growkey-offer-v1"],
    },
    {
      id: 2,
      name: "Blueprint",
      headline: "Creamos el mejor producto de tu vida (comunidad)",
      startDay: 14,
      endDay: 28,
      milestones: [
        { day: 28, title: "Revisión de Skool Blueprint", type: "call" },
      ],
      classes: [
        { id: "c2-dinamicas", title: "Dinámicas de comunidad", url: "https://www.skool.com/" },
        { id: "c2-contenido", title: "Contenido de valor", url: "https://www.skool.com/" },
        { id: "c2-workflow", title: "Workflow de ventas", url: "https://www.skool.com/" },
      ],
      baseTasks: [
        { id: "t2-dinamicas", title: "Define las dinámicas de tu comunidad", week: 3, suggestedDay: 16, classId: "c2-dinamicas" },
        { id: "t2-contenido", title: "Sube tu contenido de valor", week: 3, suggestedDay: 18, classId: "c2-contenido" },
        { id: "t2-eventos", title: "Configura los eventos del mes", week: 4, suggestedDay: 22 },
        { id: "t2-workflow", title: "Configura el workflow de ventas", week: 4, suggestedDay: 24, classId: "c2-workflow" },
        { id: "t2-branding", title: "Completa el branding de tu comunidad", week: 4, suggestedDay: 26 },
      ],
      requiredForms: [],
    },
    {
      id: 3,
      name: "Prelanzamiento",
      headline: "Llenamos tu lista de espera con contenido orgánico",
      startDay: 28,
      endDay: 50,
      milestones: [
        { day: 37, title: "Llamada de prelanzamiento", type: "call" },
      ],
      classes: [
        { id: "c3-waitlist", title: "Estrategia de waitlist", url: "https://www.skool.com/" },
        { id: "c3-contenido", title: "Contenido orgánico con CTA", url: "https://www.skool.com/" },
      ],
      baseTasks: [
        { id: "t3-waitlist", title: "Monta tu estrategia de waitlist", week: 5, suggestedDay: 30, classId: "c3-waitlist" },
        { id: "t3-whatsapp", title: "Crea el grupo de WhatsApp de lista de espera", week: 5, suggestedDay: 32 },
        { id: "t3-contenido", title: "Publica contenido orgánico con CTA al grupo", week: 6, suggestedDay: 37, classId: "c3-contenido" },
        { id: "t3-prelaunch", title: "Ejecuta el prelanzamiento con tu lista", week: 7, suggestedDay: 44 },
      ],
      requiredForms: [],
    },
    {
      id: 4,
      name: "Lanzamiento y evergreen",
      headline: "Lanzamos tu Skool y escalas a +$10K de MRR",
      startDay: 50,
      endDay: 120,
      milestones: [
        { day: 50, title: "Lanzamiento oficial", type: "launch" },
        { day: 61, title: "Inicio de evergreen scaling", type: "launch" },
        { day: 120, title: "Meta +$10K MRR", type: "goal" },
      ],
      classes: [
        { id: "c4-launch", title: "Launch oficial", url: "https://www.skool.com/" },
        { id: "c4-evergreen", title: "Evergreen scaling", url: "https://www.skool.com/" },
      ],
      baseTasks: [
        { id: "t4-launch", title: "Ejecuta tu lanzamiento oficial", week: 8, suggestedDay: 51, classId: "c4-launch" },
        { id: "t4-onboard-miembros", title: "Onboardea a tus primeros miembros", week: 9, suggestedDay: 58 },
        { id: "t4-evergreen", title: "Activa tu sistema evergreen", week: 9, suggestedDay: 62, classId: "c4-evergreen" },
        { id: "t4-offboarding", title: "Llamada de offboarding con el equipo", week: 10, suggestedDay: 68 },
      ],
      requiredForms: [],
    },
  ],
};

function toUtc(dateIso) {
  const [y, m, d] = dateIso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function programDay(startDateIso, todayIso) {
  return Math.max(0, Math.round((toUtc(todayIso) - toUtc(startDateIso)) / MS_DAY));
}

export function currentWeek(day) {
  return Math.floor(day / 7) + 1;
}

export function addDays(dateIso, days) {
  return fromUtc(toUtc(dateIso) + days * MS_DAY);
}

export function milestoneDate(startDateIso, milestoneDay) {
  return addDays(startDateIso, milestoneDay);
}

export function weekRange(startDateIso, week) {
  const from = addDays(startDateIso, (week - 1) * 7);
  return { from, to: addDays(from, 6) };
}

export function phaseById(id) {
  const phase = PROGRAM.phases.find((p) => p.id === id);
  if (!phase) throw new Error(`Fase desconocida: ${id}`);
  return phase;
}

export function expectedPhaseForDay(day) {
  return (
    PROGRAM.phases.find((phase) => day >= phase.startDay && day < phase.endDay) ??
    PROGRAM.phases[PROGRAM.phases.length - 1]
  );
}

export function isLate(currentPhaseId, day) {
  return day > phaseById(currentPhaseId).endDay;
}
```

- [ ] **Step 3.4: Crear `shared/program.d.mts`:**

```ts
export type Milestone = { day: number; title: string; type: "call" | "launch" | "goal" };
export type SkoolClass = { id: string; title: string; url: string };
export type BaseTask = { id: string; title: string; week: number; suggestedDay?: number; classId?: string };
export type PhaseConfig = {
  id: number; name: string; headline: string;
  startDay: number; endDay: number;
  milestones: Milestone[]; classes: SkoolClass[]; baseTasks: BaseTask[];
  requiredForms: string[];
};
export const MS_DAY: number;
export const PROGRAM: { totalDays: number; goal: string; phases: PhaseConfig[] };
export function programDay(startDateIso: string, todayIso: string): number;
export function currentWeek(day: number): number;
export function addDays(dateIso: string, days: number): string;
export function milestoneDate(startDateIso: string, milestoneDay: number): string;
export function weekRange(startDateIso: string, week: number): { from: string; to: string };
export function phaseById(id: number): PhaseConfig;
export function expectedPhaseForDay(day: number): PhaseConfig;
export function isLate(currentPhaseId: number, day: number): boolean;
```

- [ ] **Step 3.5: Correr tests hasta verde**

```bash
npm test && npm run typecheck
```
Expected: PASS todos. Si `programDay` con `Math.round` rompe el test de día 23 por DST, no aplica: la matemática es UTC pura — debe pasar exacto.

- [ ] **Step 3.6: Commit**

```bash
git add shared/ tests/program.test.ts
git commit -m "feat: program config and pure date helpers with tests"
```

### Task 4: `server/engine.mjs` — motor de progresión puro (TDD)

**Files:**
- Create: `server/engine.mjs`
- Test: `tests/engine.test.mjs`

Reglas (spec §6): fase N completa ⇔ todas las tareas de fase N `done` ∧ todos los `requiredForms` de N presentes en los slugs enviados del cliente. Si N < 4 → avanza a N+1. Si N = 4 → programa completado. Sin tareas materializadas (array vacío de tareas de la fase) → NO está completa (protege contra avance antes de materializar).

- [ ] **Step 4.1: Escribir test que falla** — `tests/engine.test.mjs`:

```js
import { describe, expect, it } from "vitest";
import { evaluateAdvance } from "../server/engine.mjs";

const tasks = (phase, dones) => dones.map((done, i) => ({ id: `x${i}`, phase, done }));

describe("evaluateAdvance", () => {
  it("no avanza si falta una tarea", () => {
    expect(
      evaluateAdvance({ currentPhaseId: 2, tasks: tasks(2, [true, false]), submittedFormSlugs: [] }),
    ).toEqual({ complete: false });
  });
  it("no avanza si falta un formulario requerido (fase 1)", () => {
    expect(
      evaluateAdvance({
        currentPhaseId: 1,
        tasks: tasks(1, [true, true]),
        submittedFormSlugs: ["growkey-onboarding-v1"],
      }),
    ).toEqual({ complete: false });
  });
  it("avanza cuando tareas y formularios están completos", () => {
    expect(
      evaluateAdvance({
        currentPhaseId: 1,
        tasks: tasks(1, [true, true, true]),
        submittedFormSlugs: ["growkey-onboarding-v1", "growkey-offer-v1"],
      }),
    ).toEqual({ complete: true, nextPhaseId: 2 });
  });
  it("ignora tareas de otras fases", () => {
    const mixed = [...tasks(2, [true, true]), ...tasks(3, [false])];
    expect(evaluateAdvance({ currentPhaseId: 2, tasks: mixed, submittedFormSlugs: [] })).toEqual({
      complete: true,
      nextPhaseId: 3,
    });
  });
  it("fase 4 completa → programa completado", () => {
    expect(
      evaluateAdvance({ currentPhaseId: 4, tasks: tasks(4, [true]), submittedFormSlugs: [] }),
    ).toEqual({ complete: true, programCompleted: true });
  });
  it("sin tareas materializadas no está completa", () => {
    expect(evaluateAdvance({ currentPhaseId: 3, tasks: [], submittedFormSlugs: [] })).toEqual({
      complete: false,
    });
  });
});
```

- [ ] **Step 4.2: Correr; verificar FAIL** (`npm test` — module not found).

- [ ] **Step 4.3: Implementar `server/engine.mjs`:**

```js
import { phaseById } from "../shared/program.mjs";

// Decisión pura de avance. No toca DB ni HTTP.
export function evaluateAdvance({ currentPhaseId, tasks, submittedFormSlugs }) {
  const phase = phaseById(currentPhaseId);
  const phaseTasks = tasks.filter((task) => task.phase === currentPhaseId);
  if (phaseTasks.length === 0) return { complete: false };
  if (!phaseTasks.every((task) => task.done)) return { complete: false };

  const submitted = new Set(submittedFormSlugs);
  if (!phase.requiredForms.every((slug) => submitted.has(slug))) return { complete: false };

  if (currentPhaseId >= 4) return { complete: true, programCompleted: true };
  return { complete: true, nextPhaseId: currentPhaseId + 1 };
}
```

- [ ] **Step 4.4: Verde + commit**

```bash
npm test
git add server/engine.mjs tests/engine.test.mjs
git commit -m "feat: pure phase progression engine with tests"
```

---

## Chunk 2: Auth — servidor, login, invitación, protección de endpoints

### Task 5: `server/db.mjs` — extraer capa Supabase del server

**Files:**
- Create: `server/db.mjs`
- Modify: `server.mjs` (quitar `supabaseRequest`/`normalizeSupabaseUrl` e importarlos)

- [ ] **Step 5.1: Crear `server/db.mjs`** moviendo desde `server.mjs` las funciones `supabaseRequest` (líneas 182-201) y `normalizeSupabaseUrl` (229-231), parametrizadas:

```js
const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabase = Boolean(supabaseUrl && serviceKey);
export { supabaseUrl };

export function normalizeSupabaseUrl(value) {
  return value?.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

// REST genérico con service role (bypassa RLS — solo server)
export async function supabaseRequest(pathAndQuery, options = {}) {
  const response = await fetch(`${supabaseUrl}${pathAndQuery}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request failed ${response.status}: ${text}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// Helpers de tabla (PostgREST)
export const db = {
  select: (table, query = "select=*") => supabaseRequest(`/rest/v1/${table}?${query}`),
  insert: (table, rows, prefer = "return=representation") =>
    supabaseRequest(`/rest/v1/${table}`, {
      method: "POST",
      headers: { Prefer: prefer },
      body: JSON.stringify(rows),
    }),
  update: (table, query, patch) =>
    supabaseRequest(`/rest/v1/${table}?${query}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    }),
  upsert: (table, rows) =>
    supabaseRequest(`/rest/v1/${table}`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(rows),
    }),
  remove: (table, query) =>
    supabaseRequest(`/rest/v1/${table}?${query}`, { method: "DELETE" }),
};
```

OJO: el `supabaseRequest` original recibía URL completa; el nuevo recibe path. Al refactorizar `server.mjs`, actualizar los call sites (`readSupabaseSubmissions`, `createSupabaseSubmission`, `clearSupabaseSubmissions`) para pasar `/rest/v1/...` sin el prefijo `supabaseUrl`.

- [ ] **Step 5.2: Smoke test local**

```bash
npm run build && SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... npm start &
curl -s http://127.0.0.1:5174/api/health
```
(`SUPABASE_ANON_KEY` no se usa todavía aquí, pero acostúmbrate a incluirla en todos los arranques locales: `server/auth.mjs` la lee y sin ella todo endpoint autenticado devuelve 401.)
Expected: `{"ok":true,"storage":"supabase"}`. Matar el server después.

- [ ] **Step 5.3: Commit** — `git commit -am "refactor: extract supabase data layer to server/db.mjs"`

### Task 6: `server/auth.mjs` — autenticación de requests (TDD en la parte pura)

**Files:**
- Create: `server/auth.mjs`
- Test: `tests/auth.test.mjs`

- [ ] **Step 6.1: Test que falla** — `tests/auth.test.mjs`:

```js
import { describe, expect, it } from "vitest";
import { authenticate } from "../server/auth.mjs";

const requestWith = (header) => ({ headers: header ? { authorization: header } : {} });

describe("authenticate", () => {
  it("null sin header Bearer", async () => {
    expect(await authenticate(requestWith(undefined), { fetchImpl: async () => { throw new Error("no llamar"); } })).toBeNull();
    expect(await authenticate(requestWith("Basic xyz"), { fetchImpl: async () => { throw new Error("no llamar"); } })).toBeNull();
  });
  it("null si supabase rechaza el token", async () => {
    const fetchImpl = async () => ({ ok: false });
    expect(await authenticate(requestWith("Bearer bad"), { fetchImpl })).toBeNull();
  });
  it("devuelve userId+role cuando token y perfil existen", async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => ({ id: "u1" }) });
    const loadProfile = async (id) => ({ user_id: id, role: "admin", name: "Majo" });
    const result = await authenticate(requestWith("Bearer good"), { fetchImpl, loadProfile });
    expect(result).toEqual({ userId: "u1", role: "admin", name: "Majo" });
  });
  it("null si no hay perfil (usuario no invitado)", async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => ({ id: "u2" }) });
    const loadProfile = async () => null;
    expect(await authenticate(requestWith("Bearer good"), { fetchImpl, loadProfile })).toBeNull();
  });
});
```

- [ ] **Step 6.2: Implementar `server/auth.mjs`:**

```js
import { db, supabaseUrl } from "./db.mjs";

const anonKey = process.env.SUPABASE_ANON_KEY;

async function defaultLoadProfile(userId) {
  const rows = await db.select("profiles", `select=*&user_id=eq.${userId}`);
  return rows?.[0] ?? null;
}

// Valida el JWT contra Supabase Auth y carga el perfil (rol).
// Devuelve { userId, role, name } o null.
export async function authenticate(request, { fetchImpl = fetch, loadProfile = defaultLoadProfile } = {}) {
  const header = request.headers["authorization"] || "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7);

  const response = await fetchImpl(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const user = await response.json();

  const profile = await loadProfile(user.id);
  if (!profile) return null;
  return { userId: user.id, role: profile.role, name: profile.name };
}
```

- [ ] **Step 6.3: Verde + commit** — `npm test` → PASS; `git add server/auth.mjs tests/auth.test.mjs && git commit -m "feat: server request authentication against supabase auth"`

### Task 7: Proteger endpoints existentes + `client_id` en submissions

**Files:**
- Modify: `server.mjs`

Comportamiento nuevo (spec §3):
- `GET /api/submissions`, `GET /api/submissions.csv`, `DELETE /api/submissions` → requieren `role === 'admin'` (401 sin token, 403 con token de cliente).
- `POST /api/submissions` sigue público. Si llega `Authorization` válido de un **cliente**, el insert lleva `client_id` y después corre el motor (eso se conecta en Task 11; por ahora solo `client_id`).

- [ ] **Step 7.1: En `server.mjs`**, importar `authenticate` y modificar `handleSubmissions` y `handleSubmissionsCsv`:

```js
import { authenticate } from "./server/auth.mjs";

// dentro de handleSubmissions, método GET:
const auth = await authenticate(request);
if (!auth) { sendJson(response, 401, { error: "unauthorized" }); return; }
if (auth.role !== "admin") { sendJson(response, 403, { error: "forbidden" }); return; }
// ... resto igual

// método DELETE: misma guarda admin ANTES del check ALLOW_ADMIN_DELETE.

// método POST (público):
const auth = await authenticate(request);          // null es válido aquí
const saved = { ...submission, /* igual que hoy */ };
if (auth && auth.role === "client") saved.clientId = auth.userId;
```

En `createSupabaseSubmission` (que se mueve/queda en server.mjs usando `db`), incluir `client_id: submission.clientId ?? null` en el body del insert. En `handleSubmissionsCsv`, cambiar la firma de `(response, url)` a `(request, response, url)` (actualizar el call site en server.mjs:53) y aplicar la misma guarda admin que en GET.

- [ ] **Step 7.2: Smoke test**

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5174/api/submissions
```
Expected: `401`. Con un POST sin token a `/api/submissions` (body de prueba JSON): `200`.

- [ ] **Step 7.3: Commit** — `git commit -am "feat: protect submissions endpoints, stamp client_id"`

### Task 8: Cliente Supabase del navegador + contexto de sesión

**Files:**
- Create: `src/supabaseClient.ts`
- Create: `src/session.tsx`
- Create: `src/api.ts`

- [ ] **Step 8.1: `src/supabaseClient.ts`:**

```ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

Crear también `.env.local` (gitignored) con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (anon key pública del proyecto, pestaña API en Supabase). Agregar `.env.local` a `.gitignore` si no está.

- [ ] **Step 8.2: `src/session.tsx`** — contexto que expone `{ session, me, loading, refreshMe, signOut }`; escucha `supabase.auth.onAuthStateChange`; al haber sesión llama `GET /api/skool/me` (Task 12) para traer `profile` (role) y `client`. Mientras ese endpoint no exista, `profile` queda `null` y la UI muestra "cargando" — el wiring completo se prueba en Task 12.

```tsx
import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import { apiGet } from "./api";

type Me = {
  profile: { userId: string; role: "admin" | "client"; name: string; photoUrl?: string } | null;
  client: Record<string, unknown> | null;
};

type SessionState = {
  session: Session | null;
  me: Me | null;
  loading: boolean;
  refreshMe: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionState>({ session: null, me: null, loading: true, refreshMe: async () => {}, signOut: async () => {} });
export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    try { setMe(await apiGet<Me>("/api/skool/me")); }
    catch { setMe(null); }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setMe(null); setLoading(false); return; }
    setLoading(true);
    void refreshMe().finally(() => setLoading(false));
  }, [session?.access_token]);

  return (
    <Ctx.Provider value={{ session, me, loading, refreshMe, signOut: async () => { await supabase.auth.signOut(); } }}>
      {children}
    </Ctx.Provider>
  );
}
```

- [ ] **Step 8.3: `src/api.ts`:**

```ts
import { supabase } from "./supabaseClient";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `http_${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  return handle<T>(await fetch(path, { headers: await authHeaders() }));
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return handle<T>(
    await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

export async function apiDelete<T>(path: string): Promise<T> {
  return handle<T>(await fetch(path, { method: "DELETE", headers: await authHeaders() }));
}
```

- [ ] **Step 8.4: typecheck + commit** — `npm run typecheck`; `git add src/supabaseClient.ts src/session.tsx src/api.ts .gitignore && git commit -m "feat: browser supabase client, session context, authed api helpers"`

### Task 9: Router + extracción de páginas + LoginPage

**Files:**
- Modify: `src/App.tsx` (queda solo router + shell)
- Create: `src/pages/FormPage.tsx`, `src/pages/SubmissionsPage.tsx`, `src/pages/LoginPage.tsx`
- Modify: `src/main.tsx` (envolver en `SessionProvider`)
- Modify: `src/storage.ts` (Authorization en saveSubmission)

- [ ] **Step 9.1: Extraer `FormPage.tsx`** — mover de `App.tsx` el JSX del modo `form` (líneas 108-193) y los componentes/helpers `Field`, `FieldControl`, y los helpers de validación (`isFieldEmpty`, `isFormValid`, `getCompletion`, `getVisibleFieldIds`, `isFieldComplete`, `OTHER_VALUE`, `otherFieldId`). Props: `{ form: FormConfig; onSubmitted?: () => void }`. Sin cambios de lógica — copy/paste disciplinado.

- [ ] **Step 9.2: Extraer `SubmissionsPage.tsx`** — mover el JSX del modo `ops` (líneas 195-249) + `ClientDetail`, `submissionKind`, `initials`, `money`, `formatValue`. Props: `{ filterSlug: string | null }`. Carga con `loadSubmissions(filterSlug)`.

- [ ] **Step 9.3: Reescribir `App.tsx` como router por pathname:**

| Ruta | Render | Guarda |
|---|---|---|
| `/onboarding`, `/offer` | `FormPage` | pública |
| `/login` y `/` | `LoginPage` | si ya hay sesión: redirect según rol (`admin` → `/admin`, `client` → `/app`) |
| `/app` | `ClientPortal` (Chunk 4; placeholder `<p>Próximamente</p>` hasta entonces) | requiere sesión + rol client |
| `/admin` y `/admin/*` | `AdminPanel` (Chunk 5; mientras tanto montar `SubmissionsPage` con el filtro actual) | requiere sesión + rol admin |

Guardas: usar `useSession()`; sin sesión → `window.location.replace("/login")`; con sesión pero `me.profile` null (usuario no invitado, p. ej. Google ajeno) → vista "Sin acceso" con botón cerrar sesión; rol incorrecto → redirect a su home. `resolveRoute()` actual se elimina; `FormPage` recibe el form según pathname como hoy (`/onboarding` → onboardingForm, resto → offerForm).

- [ ] **Step 9.4: `LoginPage.tsx`:**

```tsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useSession } from "../session";
import logoUrl from "../assets/growkey-mascot.png";

export function LoginPage() {
  const { session, me, loading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Capturar el hash SINCRÓNICAMENTE en el initializer: supabase-js
  // (detectSessionInUrl) consume y borra el hash de forma asíncrona,
  // así que un useEffect puede llegar tarde y saltarse el set-password.
  const [mode, setMode] = useState<"login" | "set-password">(() =>
    window.location.hash.includes("type=invite") || window.location.hash.includes("type=recovery")
      ? "set-password"
      : "login",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !session || mode === "set-password") return;
    if (me?.profile?.role === "admin") window.location.replace("/admin");
    else if (me?.profile?.role === "client") window.location.replace("/app");
  }, [loading, session, me, mode]);

  async function loginPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Correo o contraseña incorrectos.");
    setBusy(false);
  }

  async function loginGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/login" },
    });
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError("No pudimos guardar la contraseña. Intenta de nuevo.");
    else { setMode("login"); window.location.hash = ""; window.location.replace("/app"); }
    setBusy(false);
  }

  return (
    <div className="login-shell">
      <img src={logoUrl} alt="" width={56} />
      <h1>Agentic Skool</h1>
      {mode === "set-password" ? (
        <form onSubmit={setNewPassword} className="login-card">
          <h2>Crea tu contraseña</h2>
          <input type="password" placeholder="Nueva contraseña" value={password} minLength={8} required
            onChange={(e) => setPassword(e.currentTarget.value)} />
          <button className="primary-button" disabled={busy} type="submit">Guardar y entrar</button>
        </form>
      ) : (
        <form onSubmit={loginPassword} className="login-card">
          <button className="secondary-button" onClick={loginGoogle} type="button">Entrar con Google</button>
          <span className="login-divider">o con tu correo</span>
          <input type="email" placeholder="Correo" value={email} required onChange={(e) => setEmail(e.currentTarget.value)} />
          <input type="password" placeholder="Contraseña" value={password} required onChange={(e) => setPassword(e.currentTarget.value)} />
          <button className="primary-button" disabled={busy} type="submit">Entrar</button>
        </form>
      )}
      {error ? <p className="login-error">{error}</p> : null}
    </div>
  );
}
```

- [ ] **Step 9.5: `src/main.tsx`** — envolver `<App />` en `<SessionProvider>`. `src/storage.ts` — en `saveSubmission`, agregar el header Authorization si hay sesión (import dinámico para no romper formularios públicos):

```ts
// dentro de saveSubmission, antes del fetch:
let authHeader: Record<string, string> = {};
try {
  const { supabase } = await import("./supabaseClient");
  const { data } = await supabase.auth.getSession();
  if (data.session) authHeader = { Authorization: `Bearer ${data.session.access_token}` };
} catch { /* formulario público sin supabase configurado */ }
// y en headers: { "Content-Type": "application/json", ...authHeader }
```

- [ ] **Step 9.6: Estilos** — agregar al final de `styles.css` clases `login-shell`, `login-card`, `login-divider`, `login-error` siguiendo el lenguaje existente (card centrada, max-width 380px).

- [ ] **Step 9.7: Verificar** — `npm run typecheck && npm run build`; `npm run dev` y comprobar: `/onboarding` y `/offer` se ven idénticos a antes; `/login` muestra el login; `/admin` redirige a `/login` sin sesión.

- [ ] **Step 9.8: Commit** — `git add -A && git commit -m "feat: router, login page, extracted form/submissions pages"`

### Task 10: Seed del primer admin + configuración Supabase Auth

**Files:**
- Create: `scripts/seed-admin.mjs`

- [ ] **Step 10.1: Crear `scripts/seed-admin.mjs`:**

```js
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//      ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME="..." node scripts/seed-admin.mjs
const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || "Equipo Growkey";
if (!url || !key || !email || !password) {
  console.error("Faltan env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD");
  process.exit(1);
}
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

const createRes = await fetch(`${url}/auth/v1/admin/users`, {
  method: "POST",
  headers,
  body: JSON.stringify({ email, password, email_confirm: true }),
});
const created = await createRes.json();
let userId = created.id;
if (!createRes.ok) {
  if (!String(created.msg || created.message || "").toLowerCase().includes("already")) {
    console.error("Error creando usuario:", created);
    process.exit(1);
  }
  const lookup = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`, { headers }).then((r) => r.json());
  userId = lookup.users.find((u) => u.email === email)?.id;
}
if (!userId) { console.error("No se pudo resolver el user id"); process.exit(1); }

const upsert = await fetch(`${url}/rest/v1/profiles`, {
  method: "POST",
  headers: { ...headers, Prefer: "resolution=merge-duplicates" },
  body: JSON.stringify({ user_id: userId, role: "admin", name }),
});
if (!upsert.ok) { console.error("Error en profiles:", await upsert.text()); process.exit(1); }
console.log(`Admin listo: ${email} (${userId})`);
```

- [ ] **Step 10.2: MANUAL GATE — configurar Supabase Auth** (dashboard del proyecto):
  1. Authentication → Providers → habilitar **Google** (client id/secret de Google Cloud; OAuth consent + redirect `https://rrqdnvpeamsossluynyc.supabase.co/auth/v1/callback`).
  2. Authentication → URL Configuration → Site URL = URL de producción (p. ej. `https://skool.growkey.ai`); en Redirect URLs agregar exactamente `http://localhost:5173/login`, `https://<servicio>.onrender.com/login` y `https://skool.growkey.ai/login` — sin la URL exacta de `/login`, el login con Google rebota al root del Site URL.
  3. Correr el seed: `node scripts/seed-admin.mjs` con las env vars. Verificar fila en `profiles` con role admin.
  4. Login manual en `/login` con ese admin → debe quedar en sesión (redirect a `/admin` cuando exista `/api/skool/me`; hasta Task 12 mostrará cargando/sin acceso — aceptable en este punto).

- [ ] **Step 10.3: Commit** — `git add scripts/seed-admin.mjs && git commit -m "feat: seed script for first admin"`

---

## Chunk 3: API Skool — invitación, portal, toggle con motor, gestión admin

Todos los endpoints viven en `server/skool.mjs` y se montan desde `server.mjs` con un prefijo único:

```js
// server.mjs, dentro del createServer, después de los ifs existentes de /api/*:
if (url.pathname.startsWith("/api/skool/")) {
  await handleSkool(request, response, url, { sendJson, readBody });
  return;
}
```

`handleSkool` resuelve método+path internamente (switch sobre `url.pathname` y `request.method`). Toda respuesta de error usa los mismos códigos: 401 sin auth, 403 rol incorrecto, 404 recurso, 409 conflicto, 400 input inválido.

### Task 11: Esqueleto de `server/skool.mjs` + helpers de dominio

**Files:**
- Create: `server/skool.mjs`

- [ ] **Step 11.1: Crear `server/skool.mjs`** con el router interno, auth guards y helpers compartidos:

```js
import { db, supabaseRequest } from "./db.mjs";
import { authenticate } from "./auth.mjs";
import { evaluateAdvance } from "./engine.mjs";
import { PROGRAM, currentWeek, isLate, phaseById, programDay } from "../shared/program.mjs";

const todayIso = () => new Date().toISOString().slice(0, 10);

async function logEvent(clientId, type, payload, actorId) {
  await db.insert("skool_events", { client_id: clientId, type, payload, actor_id: actorId ?? null }, "return=minimal");
}

async function getClient(clientId) {
  const rows = await db.select("skool_clients", `select=*&id=eq.${clientId}`);
  return rows?.[0] ?? null;
}

async function getTasks(clientId) {
  const rows = await db.select("skool_client_tasks", `select=*&client_id=eq.${clientId}&order=phase.asc,position.asc,created_at.asc`);
  return rows ?? [];
}

async function getSubmittedSlugs(clientId) {
  const rows = await db.select("growkey_form_submissions", `select=form_slug&client_id=eq.${clientId}`);
  return (rows ?? []).map((row) => row.form_slug);
}

// Copia las baseTasks de una fase como filas del cliente. Idempotente por
// el unique index (client_id, template_id): inserta con resolution=ignore-duplicates.
async function materializePhase(clientId, phaseId) {
  const phase = phaseById(phaseId);
  if (!phase.baseTasks.length) return;
  const rows = phase.baseTasks.map((task, index) => ({
    client_id: clientId,
    phase: phaseId,
    source: "base",
    template_id: task.id,
    title: task.title,
    week: task.week,
    suggested_day: task.suggestedDay ?? null,
    class_id: task.classId ?? null,
    position: index,
  }));
  // Idempotente gracias al índice único NO-parcial (client_id, template_id)
  // de la migración: reintentos y dobles llamadas no duplican tareas.
  await supabaseRequest(`/rest/v1/skool_client_tasks?on_conflict=client_id,template_id`, {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
}

// Estado derivado que consumen ambos paneles.
function clientView(client, tasks, submittedSlugs) {
  const day = client.start_date ? programDay(client.start_date, todayIso()) : null;
  return {
    ...client,
    day,
    week: day === null ? null : currentWeek(day),
    late: day !== null && client.status === "active" ? isLate(client.current_phase, day) : false,
    tasks,
    submittedFormSlugs: submittedSlugs,
  };
}

// Corre el motor y aplica el avance si corresponde. Devuelve {advanced, programCompleted, client}.
// Idempotente: relee el cliente y solo escribe si la fase no cambió debajo.
async function runEngine(clientId, actorId) {
  const client = await getClient(clientId);
  if (!client || client.status !== "active" || !client.start_date) return { advanced: false, client };
  const [tasks, submitted] = await Promise.all([getTasks(clientId), getSubmittedSlugs(clientId)]);
  const verdict = evaluateAdvance({
    currentPhaseId: client.current_phase,
    tasks,
    submittedFormSlugs: submitted,
  });
  if (!verdict.complete) return { advanced: false, client };

  if (verdict.programCompleted) {
    const updated = await db.update(
      "skool_clients",
      `id=eq.${clientId}&current_phase=eq.${client.current_phase}&status=eq.active`,
      { status: "completed" },
    );
    if (updated?.length) await logEvent(clientId, "status_change", { to: "completed" }, actorId);
    return { advanced: false, programCompleted: Boolean(updated?.length), client: updated?.[0] ?? client };
  }

  const updated = await db.update(
    "skool_clients",
    `id=eq.${clientId}&current_phase=eq.${client.current_phase}`,
    { current_phase: verdict.nextPhaseId, phase_started_at: new Date().toISOString() },
  );
  if (!updated?.length) return { advanced: false, client }; // otra request avanzó primero
  await materializePhase(clientId, verdict.nextPhaseId);
  await logEvent(clientId, "phase_advanced", { from: client.current_phase, to: verdict.nextPhaseId }, actorId);
  return { advanced: true, client: updated[0] };
}

export async function handleSkool(request, response, url, { sendJson, readBody }) {
  const auth = await authenticate(request);
  if (!auth) { sendJson(response, 401, { error: "unauthorized" }); return; }
  const isAdmin = auth.role === "admin";
  const path = url.pathname.replace("/api/skool", "");
  const method = request.method;
  let body = null;
  if (method === "POST") {
    try {
      body = JSON.parse((await readBody(request)) || "{}");
    } catch {
      sendJson(response, 400, { error: "invalid_json" });
      return;
    }
  }

  // --- las rutas se agregan en las tareas siguientes ---
  sendJson(response, 404, { error: "not_found" });
}
```

- [ ] **Step 11.2: Montar en `server.mjs`** (bloque mostrado arriba del Task 11). `npm run build` debe pasar. Commit: `git commit -am "feat: skool api skeleton with engine runner"`

### Task 12: Endpoints `/me`, `/start-date`, `/portal` y trigger por formulario

**Files:**
- Modify: `server/skool.mjs`
- Modify: `server.mjs` (POST /api/submissions corre el motor)

- [ ] **Step 12.1: Agregar rutas dentro de `handleSkool`** (antes del 404):

```js
if (path === "/me" && method === "GET") {
  const client = auth.role === "client" ? await getClient(auth.userId) : null;
  sendJson(response, 200, {
    profile: { userId: auth.userId, role: auth.role, name: auth.name },
    client,
    program: PROGRAM,
  });
  return;
}

if (path === "/start-date" && method === "POST") {
  if (auth.role !== "client") { sendJson(response, 403, { error: "forbidden" }); return; }
  const startDate = String(body.startDate || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) { sendJson(response, 400, { error: "invalid_date" }); return; }
  const existing = await getClient(auth.userId);
  if (!existing) { sendJson(response, 404, { error: "not_found" }); return; }
  if (existing.start_date) { sendJson(response, 409, { error: "already_started" }); return; }
  const updated = await db.update("skool_clients", `id=eq.${auth.userId}`, {
    start_date: startDate,
    status: "active",
    phase_started_at: new Date().toISOString(),
  });
  await materializePhase(auth.userId, 1);
  await logEvent(auth.userId, "start_date_set", { startDate }, auth.userId);
  sendJson(response, 200, updated[0]);
  return;
}

if (path === "/portal" && method === "GET") {
  if (auth.role !== "client") { sendJson(response, 403, { error: "forbidden" }); return; }
  const client = await getClient(auth.userId);
  if (!client) { sendJson(response, 404, { error: "not_found" }); return; }
  const [tasks, submitted] = await Promise.all([getTasks(auth.userId), getSubmittedSlugs(auth.userId)]);
  sendJson(response, 200, { program: PROGRAM, client: clientView(client, tasks, submitted) });
  return;
}
```

- [ ] **Step 12.2: Trigger del motor al enviar formulario** — en `server.mjs`, en el POST de `/api/submissions`, después de `saveSubmission(saved)`: si hubo `auth` de cliente, `const engine = await runEngine(auth.userId, auth.userId)` (exportar `runEngine` desde `server/skool.mjs`) y responder `{ ...saved, advanced: engine.advanced }`.

- [ ] **Step 12.3: Smoke test con curl** (requiere admin seed + un token: obtenerlo con `supabase.auth.signInWithPassword` desde la consola del navegador en `/login`, copiar `access_token`):

```bash
TOKEN=...; curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:5174/api/skool/me
```
Expected: JSON con `profile.role: "admin"`, `client: null`, `program.phases` con 4 fases.

- [ ] **Step 12.4: Commit** — `git commit -am "feat: me/start-date/portal endpoints, engine on form submit"`

### Task 13: Toggle de tareas con motor

**Files:**
- Modify: `server/skool.mjs`

- [ ] **Step 13.1: Ruta toggle** (cliente sobre sus tareas; admin sobre cualquiera):

```js
const toggleMatch = path.match(/^\/tasks\/([0-9a-f-]+)\/toggle$/);
if (toggleMatch && method === "POST") {
  const taskId = toggleMatch[1];
  const rows = await db.select("skool_client_tasks", `select=*&id=eq.${taskId}`);
  const task = rows?.[0];
  if (!task) { sendJson(response, 404, { error: "not_found" }); return; }
  if (!isAdmin && task.client_id !== auth.userId) { sendJson(response, 403, { error: "forbidden" }); return; }

  const client = await getClient(task.client_id);
  if (!isAdmin && task.phase !== client.current_phase) { sendJson(response, 409, { error: "not_current_phase" }); return; }

  const nextDone = !task.done;
  const updated = await db.update("skool_client_tasks", `id=eq.${taskId}`, {
    done: nextDone,
    done_at: nextDone ? new Date().toISOString() : null,
  });
  await logEvent(task.client_id, nextDone ? "task_done" : "task_undone", { taskId, title: task.title }, auth.userId);

  const engine = nextDone ? await runEngine(task.client_id, auth.userId) : { advanced: false };
  const [tasks, submitted] = await Promise.all([getTasks(task.client_id), getSubmittedSlugs(task.client_id)]);
  const freshClient = await getClient(task.client_id);
  sendJson(response, 200, {
    task: updated[0],
    advanced: engine.advanced ?? false,
    programCompleted: engine.programCompleted ?? false,
    client: clientView(freshClient, tasks, submitted),
  });
  return;
}
```

Regla: desmarcar (`task_undone`) NO corre el motor ni retrocede fase (spec §6). Clientes solo togglean tareas de su fase actual (tareas de fases pasadas quedan congeladas para ellos; admin sí puede).

- [ ] **Step 13.2: Smoke test** — con un cliente de prueba (creado en Task 14), marcar todas las tareas de fase 1 vía curl y verificar que la respuesta del último toggle (con los 2 formularios ya ligados) trae `advanced: true` y `client.current_phase: 2`, y que en Supabase aparecen las tareas de fase 2 materializadas y el evento `phase_advanced`.

- [ ] **Step 13.3: Commit** — `git commit -am "feat: task toggle endpoint with auto-advance"`

### Task 14: Endpoints admin — invitar, listar, contexto, tareas custom, overrides, notas, ligar submissions

**Files:**
- Modify: `server/skool.mjs`

- [ ] **Step 14.1: Invitar cliente** (`POST /clients`, solo admin):

```js
if (path === "/clients" && method === "POST") {
  if (!isAdmin) { sendJson(response, 403, { error: "forbidden" }); return; }
  const { email, name = "", business = "" } = body;
  if (!email || !/.+@.+\..+/.test(email)) { sendJson(response, 400, { error: "invalid_email" }); return; }

  const invite = await fetch(`${supabaseUrlFromDb}/auth/v1/invite`, {
    method: "POST",
    headers: serviceHeaders, // mismos headers que db.mjs: apikey + Bearer service role
    body: JSON.stringify({ email, data: { name } }),
  });
  const invited = await invite.json();
  if (!invite.ok) { sendJson(response, 409, { error: "invite_failed", detail: invited.msg }); return; }

  await db.upsert("profiles", { user_id: invited.id, role: "client", name });
  await db.upsert("skool_clients", { id: invited.id, email, name, business, status: "invited" });
  await db.upsert("skool_thread_members", { client_id: invited.id, user_id: auth.userId });
  await logEvent(invited.id, "status_change", { to: "invited" }, auth.userId);
  sendJson(response, 200, await getClient(invited.id));
  return;
}
```

(Exponer desde `db.mjs` los `serviceHeaders` y `supabaseUrl` para este fetch, o agregar `db.authInvite(email, data)` — preferir lo segundo para mantener una sola puerta a Supabase.)

- [ ] **Step 14.2: Listar clientes** (`GET /clients`, admin) → todos los `skool_clients` + para cada uno `clientView` con sus tareas y slugs (3 queries batch: clients, todas las tasks con `client_id=in.(...)`, todas las submissions con client_id). Incluir `progressPct` por cliente (tareas done de su fase actual / total de su fase actual; 0 si no hay) y `lastActivityAt` = máximo entre su último `skool_events.created_at` y su último `skool_messages.created_at` (2 selects globales ordenados desc + primer match por cliente en JS).

- [ ] **Step 14.3: Contexto unificado** (`GET /clients/:id/context`, admin) — spec §10:

```js
const ctxMatch = path.match(/^\/clients\/([0-9a-f-]+)\/context$/);
if (ctxMatch && method === "GET") {
  if (!isAdmin) { sendJson(response, 403, { error: "forbidden" }); return; }
  const clientId = ctxMatch[1];
  const client = await getClient(clientId);
  if (!client) { sendJson(response, 404, { error: "not_found" }); return; }
  const [tasks, submissions, events, messages, members] = await Promise.all([
    getTasks(clientId),
    db.select("growkey_form_submissions", `select=*&client_id=eq.${clientId}&order=created_at.desc`),
    db.select("skool_events", `select=*&client_id=eq.${clientId}&order=created_at.desc&limit=200`),
    db.select("skool_messages", `select=*&client_id=eq.${clientId}&order=created_at.asc&limit=500`),
    db.select("skool_thread_members", `select=*,profiles(name,photo_url)&client_id=eq.${clientId}`),
  ]);
  sendJson(response, 200, {
    program: PROGRAM,
    client: clientView(client, tasks, (submissions ?? []).map((s) => s.form_slug)),
    submissions, events, messages, threadMembers: members,
  });
  return;
}
```

- [ ] **Step 14.4: Tareas custom** — `POST /clients/:id/tasks` (admin) `{ title, phase, week?, suggestedDay?, classId? }` (el `classId` opcional debe existir en `phaseById(phase).classes`; 400 si no) → insert con `source: "custom"`, `created_by: auth.userId`, evento `task_added`. `DELETE /tasks/:id` (admin, solo `source === "custom"`; 409 si es base) + evento `task_deleted`.

- [ ] **Step 14.5: Overrides** — `POST /clients/:id/override` (admin) con `{ action }`:
  - `set_phase` `{ phase: 1-4 }` → update de `current_phase` **y** `phase_started_at = now()` + `materializePhase(clientId, phase)` + evento `phase_override`.
  - `pause` / `resume` → status `paused`/`active` + evento `status_change`.
  - `set_start_date` `{ startDate }` → update + evento `start_date_set`. **Primera activación por el equipo:** si `start_date` era null, además poner `status: "active"`, `phase_started_at = now()` y `materializePhase(clientId, client.current_phase)` — equivale al `/start-date` del cliente.
  - `complete` → status `completed` + evento.
  Validar action con whitelist; 400 si no.

- [ ] **Step 14.6: Reenviar invitación** — `POST /clients/:id/resend-invite` (admin): re-llama `POST /auth/v1/invite` con el email del cliente; si GoTrue responde "already registered" (cliente que ya confirmó o entró con Google), fallback a `POST /auth/v1/recover` `{ email }` (manda email de restablecer contraseña, que aterriza en el mismo flujo set-password de `LoginPage` vía `type=recovery`). Responder `{ ok: true, via: "invite" | "recover" }`.

- [ ] **Step 14.7: Notas** — `POST /clients/:id/notes` (admin) `{ text }` → evento `note` con `payload: { text }`.

- [ ] **Step 14.8: Ligar submission histórica** — `POST /clients/:id/link-submission` (admin) `{ submissionId }` → `db.update("growkey_form_submissions", \`id=eq.${submissionId}\`, { client_id: clientId })` + evento `form_submitted` con `{ linked: true }` + `runEngine(clientId, auth.userId)` (ligar el formulario puede completar la fase).

- [ ] **Step 14.9: Smoke test de flujo completo por curl** (admin token; semi-manual — requiere acceso al inbox del email de prueba): invitar email de prueba → listar → override `set_start_date` (activa y materializa fase 1) → marcar tareas vía toggle → ligar las 2 submissions de prueba → verificar avance a fase 2 en `/context`.

- [ ] **Step 14.10: Commit** — `git commit -am "feat: admin endpoints — invite, list, context, custom tasks, overrides, notes, link submissions"`

---

## Chunk 4: Panel del cliente (`/app`)

Tipos compartidos de UI: crear `src/skoolTypes.ts` con los tipos de las respuestas de la API (`ClientView`, `TaskRow`, `PortalData`) derivados de las filas de §5 del spec (snake_case tal como llegan del server). Las pages consumen `apiGet/apiPost` de `src/api.ts`.

### Task 15: Componente `PhaseTimeline`

**Files:**
- Create: `src/components/PhaseTimeline.tsx`
- Modify: `src/styles.css`

Comportamiento (mockup aprobado "agentic_skool_timeline_cliente"):
- Banda horizontal con un segmento por fase, ancho proporcional a `(endDay - startDay) / totalDays`.
- Etiquetas de fase arriba (`Fase {id} · {name}`).
- Puntos de hito sobre la banda en `day / totalDays`; etiqueta bajo la banda con `Día {day} · {fecha real}` y el título — mostrar como etiqueta solo los hitos `day` en [7, 28, 50, 120] para no saturar; el resto solo punto. Fechas con `milestoneDate(startDate, day)` formateadas `d MMM` (es-CO).
- Marcador "hoy" (línea vertical) en `day / totalDays`, solo si `startDate` existe y `day <= totalDays`.
- Fases pasadas se pintan "completadas", la actual resaltada, futuras atenuadas (clases CSS `tl-seg--done|current|next`).
- Props: `{ startDate: string | null; currentPhase: number; day: number | null; compact?: boolean }`. `compact` (para swimlanes del admin) oculta etiquetas de hito.

```tsx
import { PROGRAM, milestoneDate } from "../../shared/program.mjs";

const LABELED_MILESTONES = new Set([7, 28, 50, 120]);
const fmt = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-CO", { day: "numeric", month: "short" });

export function PhaseTimeline({ startDate, currentPhase, day, compact = false }: {
  startDate: string | null; currentPhase: number; day: number | null; compact?: boolean;
}) {
  const total = PROGRAM.totalDays;
  const pct = (d: number) => `${Math.min(100, (d / total) * 100)}%`;
  const milestones = PROGRAM.phases.flatMap((phase) => phase.milestones);

  return (
    <div className={compact ? "timeline timeline--compact" : "timeline"}>
      <div className="tl-labels">
        {PROGRAM.phases.map((phase) => (
          <span key={phase.id} style={{ width: pct(phase.endDay - phase.startDay) }}>
            Fase {phase.id} · {phase.name}
          </span>
        ))}
      </div>
      <div className="tl-band">
        {PROGRAM.phases.map((phase) => (
          <div
            key={phase.id}
            className={`tl-seg ${phase.id < currentPhase ? "tl-seg--done" : phase.id === currentPhase ? "tl-seg--current" : "tl-seg--next"}`}
            style={{ width: pct(phase.endDay - phase.startDay) }}
          />
        ))}
        {milestones.map((m) => (
          <span className="tl-dot" key={m.day} style={{ left: pct(m.day) }} title={m.title} />
        ))}
        {day !== null && day <= total ? <span className="tl-today" style={{ left: pct(day) }} /> : null}
      </div>
      {!compact && (
        <div className="tl-milestones">
          {milestones.filter((m) => LABELED_MILESTONES.has(m.day)).map((m) => (
            <div className="tl-milestone" key={m.day} style={{ left: pct(m.day) }}>
              <strong>Día {m.day}{startDate ? ` · ${fmt(milestoneDate(startDate, m.day))}` : ""}</strong>
              <small>{m.title}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 15.1: Implementar el componente** (código arriba) + CSS al final de `styles.css` (`.timeline`, `.tl-band` posición relative con segmentos flex, `.tl-dot`/`.tl-today` absolutos con `transform: translateX(-50%)`, `.tl-milestones` contenedor relative de altura fija con hijos absolutos; el hito de día 120 alineado a la derecha con `transform: translateX(-100%)` para no desbordar).
- [ ] **Step 15.2: typecheck + commit** — `git commit -am "feat: phase timeline component"`

### Task 16: Componentes `WeekView` y `Checklist`

**Files:**
- Create: `src/components/WeekView.tsx`
- Create: `src/components/Checklist.tsx`

- [ ] **Step 16.1: `WeekView`** — props `{ startDate: string; day: number; tasks: TaskRow[] }`. Usa `currentWeek(day)` y `weekRange(startDate, week)`; renderiza 7 chips — uno por cada `addDays(from, i)` con i en 0..6. **La etiqueta del día de la semana se deriva de la fecha real**: `new Date(fecha + "T12:00:00Z").toLocaleDateString("es-CO", { weekday: "short" })` (la semana del programa empieza el día de la semana en que el cliente arrancó, NO siempre lunes) + número del día del mes. Chip de hoy resaltado; punto si alguna tarea pendiente tiene `suggested_day` cayendo ese día (`suggested_day - (week-1)*7 === i`) o si hay hito ese día (`milestone.day - (week-1)*7 === i`). Debajo, lista de tareas de la semana (`task.week === week`, pendientes primero) con etiqueta `sugerida · {etiqueta del chip}` y el hito de la semana si existe (`milestones` de la fase cuya fecha cae en `[weekRange.from, weekRange.to]`).

- [ ] **Step 16.2: `Checklist`** — props `{ tasks: TaskRow[]; phase: PhaseConfig; submittedFormSlugs: string[]; onToggle: (task: TaskRow) => void; busyTaskId?: string | null; canToggle: boolean }`. Renderiza:
  - Tareas de la fase actual ordenadas por `position` (custom al final): checkbox accesible (`<button role="checkbox" aria-checked>`), título tachado si done, badge `de tu coach` si `source === "custom"`, link `ver clase` (abre `phase.classes.find(c => c.id === task.class_id)?.url` en target _blank) si aplica.
  - Después de las tareas, una fila por cada `phase.requiredForms`: nombre del formulario (buscar en `formConfigs` de `formSchema.ts` por slug → `shortTitle`), estado `enviado ✓` si el slug está en `submittedFormSlugs`, o botón "Llenar formulario" → navega a `${form.path}?embedded=1`.
  - Contador "X de Y listas" en el header.

Toggle optimista con rollback (spec §11): el padre (`ClientPortal`) marca el task en el estado local, llama `apiPost`, y si falla revierte y muestra un toast `.toast-error` ("No pudimos guardar, intenta de nuevo").

- [ ] **Step 16.3: typecheck + commit** — `git commit -am "feat: week view and checklist components"`

### Task 17: Página `ClientPortal`

**Files:**
- Create: `src/pages/ClientPortal.tsx`
- Modify: `src/App.tsx` (reemplazar placeholder)
- Modify: `src/styles.css`

- [ ] **Step 17.1: Implementar la página** con estos estados/secciones:

1. **Carga**: `apiGet<PortalData>("/api/skool/portal")` al montar; spinner mientras.
2. **Sin `start_date`** → pantalla de bienvenida: saludo con `client.name`, explicación corta del camino de 120 días, `<input type="date">` (default hoy, `min` hoy - 30 días) y botón "Empezar mi camino" → `apiPost("/api/skool/start-date", { startDate })` → recargar portal.
3. **Pausado** → banner "Tu programa está en pausa — habla con tu equipo en el chat".
4. **Activo**: header (saludo, negocio, badge `Fase {n} · {name}`, "Semana {week} · día {day} de 120"), `<PhaseTimeline />`, `<WeekView />`, `<Checklist />` (con el toggle optimista descrito en Task 16), tarjeta "Clases de esta fase" (lista `phase.classes` con links), acceso al chat (Task 20; hasta entonces ocultar).
5. **Avance de fase**: si la respuesta del toggle trae `advanced: true` → overlay de celebración (`.celebration`): "¡Pasaste a la fase {n}: {name}!" con botón "Ver mi nueva fase" que recarga el portal. Si `programCompleted: true` → celebración final ("¡Completaste el programa!").
6. **Completado** (`status === "completed"`): timeline completa + mensaje de cierre, checklist en solo lectura.

- [ ] **Step 17.2: Formularios embebidos y celebración por formulario** — en `FormPage`, leer `?embedded=1`: tras enviar con sesión activa, si la respuesta del server trae `advanced: true` (Step 12.2 — `storage.ts` ya devuelve el JSON del server tal cual), redirigir a `/app?celebrate=1`; si no, mostrar botón "Volver a mi panel" → `/app`. En `ClientPortal`, al montar: si la URL trae `?celebrate=1`, mostrar el overlay de celebración y limpiar el query param con `history.replaceState` (así el avance disparado por formulario también celebra, spec §6).

- [ ] **Step 17.3: Verificación manual** (dev): con el cliente de prueba del Task 14 — login → elegir fecha → ver timeline con fechas reales → marcar tareas → ver celebración al completar fase 1 (con formularios ya ligados) → verificar fase 2 con sus tareas.

- [ ] **Step 17.4: Commit** — `git commit -am "feat: client portal page with roadmap, week view, checklist and celebration"`

---

## Chunk 5: Panel interno, chat y deploy

### Task 18: `AdminPanel` — lista, métricas y swimlanes

**Files:**
- Create: `src/pages/AdminPanel.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 18.1: Implementar `AdminPanel`** con pestañas internas (estado local): **Clientes** | **Roadmap** | **Conversaciones** (Task 20) | **Formularios**.
  - **Clientes** (mockup "agentic_skool_panel_interno"): métricas arriba (activos, por fase, atrasados — derivadas de `apiGet("/api/skool/clients")`), filtros por fase y por estado (dos `<select>` sobre la tabla, filtrado en cliente), tabla con avatar-iniciales, nombre/negocio, `Fase {n} · {name}`, semana, barra `progressPct`, badge estado (`al día` verde / `atrasado` ámbar / `pausado` gris / `invitado` azul / `completado`), columna "última actividad" (fecha relativa desde `lastActivityAt`), fila → `/admin/clients/{id}`. Botón "Invitar cliente" abre modal con email + nombre + negocio → `apiPost("/api/skool/clients")` → refrescar y mostrar "Invitación enviada".
  - **Roadmap** (mockup "agentic_skool_timeline_interno"): `<PhaseTimeline compact neutral startDate={null} currentPhase={0} day={null} />` como cabecera de banda (agregar prop `neutral?: boolean` a `PhaseTimeline`: pinta los 4 segmentos en estilo base, sin done/current/next) + una fila por cliente activo con su avatar posicionado `left: day/120 %`, anillo verde/ámbar según `late`. Click → detalle.
  - **Formularios**: monta `SubmissionsPage` (la vista existente) con su navegación onboarding/oferta/todos.

- [ ] **Step 18.2: Routing** — `/admin` → AdminPanel (pestaña clientes), `/admin/clients/:id` → `AdminClientDetail` (Task 19), `/admin/onboarding|offer` → AdminPanel pestaña formularios con filtro. Parsear el pathname a mano como hace el router del Task 9.

- [ ] **Step 18.3: Verificación + commit** — login admin → ver lista con cliente de prueba, invitar uno nuevo (email real de prueba), recibir el correo de invitación, completar set-password y entrar como cliente. `git commit -am "feat: admin panel with client list, metrics and roadmap swimlanes"`

### Task 19: `AdminClientDetail`

**Files:**
- Create: `src/pages/AdminClientDetail.tsx`

- [ ] **Step 19.1: Implementar** sobre `apiGet(\`/api/skool/clients/${id}/context\`)`, en columnas:
  - **Cabecera**: nombre, negocio, email, badge fase + semana/día + semáforo; acciones: pausar/reactivar, mover de fase (select 1-4 + confirmar → override `set_phase`), editar fecha de inicio (date input → `set_start_date`), marcar completado.
  - **Timeline** individual (`PhaseTimeline`).
  - **Checklist** completo agrupado por fase (todas las fases materializadas): toggle directo (admin puede marcar), agregar tarea custom (modal: título, fase, semana, día sugerido) → `POST /clients/:id/tasks`, eliminar custom.
  - **Formularios**: submissions ligadas con score/stage → click expande el detalle con el componente `ClientDetail` existente de `SubmissionsPage`; debajo, "Ligar respuesta existente": lista de submissions sin `client_id` (cargar `apiGet("/api/submissions")` y filtrar) con botón "Ligar" → `link-submission`.
  - **Bitácora**: lista de `events` (icono por tipo, fecha relativa, payload legible).
  - **Notas**: textarea + botón → `POST /clients/:id/notes`; las notas aparecen en la bitácora.
  - **Chat**: placeholder hasta Task 20 (ahí se reemplaza por `ChatThread` + gestión de miembros).

- [ ] **Step 19.2: Verificación + commit** — flujo completo sobre el cliente de prueba (override de fase, tarea custom aparece en su portal con badge, nota en bitácora, ligar submission avanza fase si correspondía). `git commit -am "feat: admin client detail with overrides, custom tasks, submissions and events"`

### Task 20: Chat — `ChatThread` + lecturas

**Files:**
- Create: `src/components/ChatThread.tsx`
- Modify: `server/skool.mjs` (inbox + thread members)

- [ ] **Step 20.1: `ChatThread`** — props `{ clientId: string; meId: string; members: Array<{ user_id: string; name: string; photo_url?: string }> }`:

```tsx
// núcleo del componente (estado y datos):
const [messages, setMessages] = useState<MessageRow[]>([]);
useEffect(() => {
  let active = true;
  void supabase
    .from("skool_messages")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true })
    .limit(500)
    .then(({ data }) => { if (active && data) setMessages(data); });

  const channel = supabase
    .channel(`skool-chat-${clientId}`)
    .on("postgres_changes",
      { event: "INSERT", schema: "public", table: "skool_messages", filter: `client_id=eq.${clientId}` },
      (payload) => setMessages((curr) =>
        curr.some((m) => m.id === (payload.new as MessageRow).id) ? curr : [...curr, payload.new as MessageRow]),
    )
    .subscribe();
  return () => { active = false; void supabase.removeChannel(channel); };
}, [clientId]);

async function send(body: string) {
  const optimistic = { id: crypto.randomUUID(), client_id: clientId, sender_id: meId, body, created_at: new Date().toISOString(), pending: true };
  setMessages((c) => [...c, optimistic]);
  const { error } = await supabase.from("skool_messages").insert({ id: optimistic.id, client_id: clientId, sender_id: meId, body });
  if (error) setMessages((c) => c.map((m) => (m.id === optimistic.id ? { ...m, failed: true } : m)));
  else setMessages((c) => c.map((m) => (m.id === optimistic.id ? { ...m, pending: false } : m)));
  void supabase.from("skool_message_reads").upsert({ user_id: meId, client_id: clientId, last_read_at: new Date().toISOString() });
}
```

UI: header de grupo con avatares/nombres de `members` (el cliente lo ve como "Tu equipo Growkey"); burbujas propias a la derecha; nombre + foto del emisor en las ajenas (resolver con `members` + el cliente); estado `no enviado · reintentar` si `failed` (reintento reinserta); al montar y al recibir mensajes, upsert de `skool_message_reads`. Suscripción realtime con dedupe por id (arriba). **Fallback a polling** (spec §9): si el callback de `.subscribe()` reporta `CHANNEL_ERROR` o `TIMED_OUT`, activar un `setInterval` de 15s que repite el select inicial; limpiarlo en el cleanup y cuando la suscripción llegue a `SUBSCRIBED`.

- [ ] **Step 20.2: Endpoints de apoyo en `server/skool.mjs`:**
  - `GET /inbox` (admin) → por cada cliente: último mensaje, `unread` (count de mensajes con `created_at > last_read_at` del admin, sin contar los propios), miembros del hilo. Implementar con 3 selects + merge en JS (volumen bajo, sin RPC).
  - `GET /thread/:clientId/members` (admin o el dueño) → miembros con `profiles(name, photo_url)`.
  - `POST /clients/:id/thread-members` (admin) `{ userId, action: "add" | "remove" }`.
  - `GET /admins` (admin) → lista de perfiles admin (para el selector de "agregar al grupo").

- [ ] **Step 20.3: Integrar** — (1) pestaña **Conversaciones** del AdminPanel: lista de hilos de `GET /inbox` con badge unread → abre `ChatThread` + gestión de miembros (selector de admins con `GET /admins`, add/remove vía `thread-members`); (2) reemplazar el placeholder de chat en `AdminClientDetail` por el mismo `ChatThread` + gestión de miembros (spec §8.3); (3) sección de chat en `ClientPortal` con badge de no leídos (count de mensajes posteriores a mi `last_read_at`, query directa supabase-js).

- [ ] **Step 20.4: Verificación realtime** — dos navegadores (admin + cliente): mensaje aparece en vivo en ambos; unread sube y se limpia al abrir; mensaje con red caída (DevTools offline) muestra `no enviado · reintentar`.

- [ ] **Step 20.5: Commit** — `git commit -am "feat: group chat with realtime, unread counts and inbox"`

### Task 21: Pruebas de integración de API y RLS

**Files:**
- Create: `tests/integration.test.mjs`

Corren contra el server local + el Supabase real con usuarios de prueba, y **se saltan solas si no hay credenciales** (CI-safe y `npm test` local sigue verde sin setup): envolver todo en `describe.skipIf(!process.env.TEST_ADMIN_EMAIL)(...)`.

- [ ] **Step 21.1: Setup** — usar el admin del seed y el cliente de prueba del Task 14. Exponer `TEST_ADMIN_EMAIL/TEST_ADMIN_PASSWORD`, `TEST_CLIENT_EMAIL/TEST_CLIENT_PASSWORD`, `TEST_BASE_URL` (default `http://127.0.0.1:5174`), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. En `beforeAll`, obtener tokens con `createClient(...).auth.signInWithPassword(...)` para ambos usuarios.

- [ ] **Step 21.2: Casos de API con auth** (server corriendo; fetch directo con cada token):
  - `GET /api/submissions` sin token → 401; con token de cliente → 403; con token admin → 200.
  - `GET /api/skool/portal` con token admin → 403; con token cliente → 200 y `client.id` = el suyo.
  - `GET /api/skool/clients` con token cliente → 403.
  - `POST /api/skool/tasks/{id}/toggle` con token de cliente sobre una tarea de OTRO cliente → 403 (tomar el id de una tarea del admin context de otro cliente, o crear un segundo cliente de prueba).

- [ ] **Step 21.3: Casos de RLS** (supabase-js con anon key + sesión del cliente, sin pasar por el server):
  - `select * from skool_clients` → exactamente 1 fila (la propia).
  - `select * from skool_messages` filtrado por el client_id de otro cliente → 0 filas.
  - `insert into skool_messages` con `client_id` ajeno → error de RLS.
  - `update profiles set role='admin'` sobre su propia fila → error (no hay policy de UPDATE).
  - `select * from skool_events` → 0 filas (solo admin).

- [ ] **Step 21.4: Verificar ambos modos** — `npm test` sin env vars (suite se salta, exit 0) y con env vars (todo verde). Commit: `git add tests/integration.test.mjs && git commit -m "test: api auth and rls integration suite"`

### Task 22: Deploy a producción

**Files:**
- Modify: `render.yaml`, `DEPLOY.md`

- [ ] **Step 22.1: `render.yaml`** — agregar a `envVars`: `SUPABASE_ANON_KEY` (sync: false), `VITE_SUPABASE_URL` (sync: false), `VITE_SUPABASE_ANON_KEY` (sync: false). Nota: las `VITE_*` se necesitan en build time — Render las inyecta en `npm run build` por ser env vars del servicio.

- [ ] **Step 22.2: `DEPLOY.md`** — actualizar con: nuevas env vars, pasos de migración SQL (apuntar a `supabase/migrations/001_agentic_skool.sql`), configuración de Google provider + Site URL/Redirect URLs, seed de admin, y el dominio: en Render → Custom Domains agregar el subdominio elegido (ej. `skool.growkey.ai`) + CNAME en el DNS de growkey.ai; recomendar plan Starter.

- [ ] **Step 22.3: MANUAL GATE — deploy**: push del branch, merge a `main` (previo OK de John), verificar build en Render, setear env vars, correr smoke E2E de producción:
  1. `/api/health` → `{"ok":true,"storage":"supabase"}`
  2. `/onboarding` y `/offer` públicos funcionan y guardan (regresión).
  3. `/admin` exige login; admin entra y ve los paneles.
  4. Invitar un cliente real de prueba → correo llega → set password → portal → elegir fecha → marcar tarea → chat en vivo con el admin.
  5. `GET /api/submissions` sin token → 401.

- [ ] **Step 22.4: Commit final + tag** — `git commit -am "chore: production deploy config for agentic skool" && git tag agentic-skool-v1`

---

## Orden de ejecución y dependencias

```
Chunk 1 (Tasks 1-4)  →  Chunk 2 (5-10)  →  Chunk 3 (11-14)  →  Chunk 4 (15-17)  →  Chunk 5 (18-22)
```

Gates manuales que requieren a John (o acceso al dashboard): Step 2.2 (migración SQL), Step 10.2 (Google provider + seed admin), Step 22.3 (deploy + dominio). Semi-manuales (requieren consola del navegador o inbox de email de prueba): Steps 12.3, 14.9, 18.3, 21.1. El resto es ejecutable de forma autónoma.

**Regresión obligatoria en cada chunk:** los formularios públicos `/onboarding` y `/offer` deben seguir funcionando sin sesión (son los links ya compartidos con clientes).
