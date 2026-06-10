create table if not exists public.growkey_form_submissions (
  id text primary key,
  form_slug text not null,
  created_at timestamptz not null default now(),
  score integer not null default 0,
  stage text not null default '',
  values jsonb not null default '{}'::jsonb
);

create index if not exists growkey_form_submissions_form_slug_created_at_idx
  on public.growkey_form_submissions (form_slug, created_at desc);

create index if not exists growkey_form_submissions_values_gin_idx
  on public.growkey_form_submissions using gin (values);

alter table public.growkey_form_submissions enable row level security;

drop policy if exists "Server service role can manage submissions" on public.growkey_form_submissions;
create policy "Server service role can manage submissions"
  on public.growkey_form_submissions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
