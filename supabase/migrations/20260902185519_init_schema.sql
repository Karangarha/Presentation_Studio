create table if not exists public.slides (
  id bigint generated always as identity primary key,
  position integer not null unique,
  type text not null check (type in ('title', 'content')),
  eyebrow text,
  heading text not null,
  subheading text,
  bullets jsonb,
  created_at timestamptz not null default now()
);

alter table public.slides enable row level security;

drop policy if exists "Public read access" on public.slides;
create policy "Public read access" on public.slides
  for select
  to anon
  using (true);

create table if not exists public.logos (
  slot text primary key check (slot in ('left', 'right')),
  url text,
  updated_at timestamptz not null default now()
);

alter table public.logos enable row level security;

drop policy if exists "Public read access" on public.logos;
create policy "Public read access" on public.logos
  for select
  to anon
  using (true);

drop policy if exists "Public update access" on public.logos;
create policy "Public update access" on public.logos
  for update
  to anon
  using (true)
  with check (true);

create table if not exists public.settings (
  id boolean primary key default true,
  autoplay_interval_ms integer not null default 5000,
  constraint settings_singleton check (id)
);

alter table public.settings enable row level security;

drop policy if exists "Public read access" on public.settings;
create policy "Public read access" on public.settings
  for select
  to anon
  using (true);

grant select on public.slides to anon;
grant select, update on public.logos to anon;
grant select on public.settings to anon;
grant all on public.slides, public.logos, public.settings to service_role;
grant usage, select on all sequences in schema public to service_role;
