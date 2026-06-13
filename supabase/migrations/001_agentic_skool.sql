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
