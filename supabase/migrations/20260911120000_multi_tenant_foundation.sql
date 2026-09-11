create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$')
);

create table if not exists public.presentations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  slug text not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint presentations_slug_format check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,78}[a-z0-9])?$'),
  unique (owner_id, slug)
);

create index if not exists presentations_owner_id_idx on public.presentations(owner_id);
create index if not exists presentations_public_slug_idx on public.presentations(slug) where is_public;

alter table public.slides
  add column if not exists presentation_id uuid references public.presentations(id) on delete cascade;

create index if not exists slides_presentation_position_idx
  on public.slides(presentation_id, position);

create table if not exists public.presentation_logos (
  presentation_id uuid not null references public.presentations(id) on delete cascade,
  slot text not null check (slot in ('left', 'right')),
  url text,
  updated_at timestamptz not null default now(),
  primary key (presentation_id, slot)
);

create table if not exists public.presentation_settings (
  presentation_id uuid primary key references public.presentations(id) on delete cascade,
  autoplay_interval_ms integer not null default 5000,
  logo_scale numeric not null default 1 check (logo_scale between 0.5 and 2),
  title_text text not null default 'Department of Computer Science and Technology',
  title_color text not null default '#ffffff',
  title_size_px integer not null default 42 check (title_size_px > 0),
  title_bold boolean not null default true
);

create table if not exists public.presentation_backgrounds (
  presentation_id uuid primary key references public.presentations(id) on delete cascade,
  url text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.presentations enable row level security;
alter table public.presentation_logos enable row level security;
alter table public.presentation_settings enable row level security;
alter table public.presentation_backgrounds enable row level security;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "Users can insert their profile" on public.profiles;
create policy "Users can insert their profile" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Owners can manage presentations" on public.presentations;
create policy "Owners can manage presentations" on public.presentations
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "Anyone can read public presentations" on public.presentations;
create policy "Anyone can read public presentations" on public.presentations
  for select to anon using (is_public);

drop policy if exists "Owners can manage presentation logos" on public.presentation_logos;
create policy "Owners can manage presentation logos" on public.presentation_logos
  for all to authenticated using (
    exists (select 1 from public.presentations p where p.id = presentation_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.presentations p where p.id = presentation_id and p.owner_id = auth.uid())
  );

drop policy if exists "Anyone can read public presentation logos" on public.presentation_logos;
create policy "Anyone can read public presentation logos" on public.presentation_logos
  for select to anon using (
    exists (select 1 from public.presentations p where p.id = presentation_id and p.is_public)
  );

drop policy if exists "Owners can manage presentation settings" on public.presentation_settings;
create policy "Owners can manage presentation settings" on public.presentation_settings
  for all to authenticated using (
    exists (select 1 from public.presentations p where p.id = presentation_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.presentations p where p.id = presentation_id and p.owner_id = auth.uid())
  );

drop policy if exists "Anyone can read public presentation settings" on public.presentation_settings;
create policy "Anyone can read public presentation settings" on public.presentation_settings
  for select to anon using (
    exists (select 1 from public.presentations p where p.id = presentation_id and p.is_public)
  );

drop policy if exists "Owners can manage presentation backgrounds" on public.presentation_backgrounds;
create policy "Owners can manage presentation backgrounds" on public.presentation_backgrounds
  for all to authenticated using (
    exists (select 1 from public.presentations p where p.id = presentation_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.presentations p where p.id = presentation_id and p.owner_id = auth.uid())
  );

drop policy if exists "Anyone can read public presentation backgrounds" on public.presentation_backgrounds;
create policy "Anyone can read public presentation backgrounds" on public.presentation_backgrounds
  for select to anon using (
    exists (select 1 from public.presentations p where p.id = presentation_id and p.is_public)
  );

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.presentations to authenticated;
grant select on public.presentations to anon;
grant select, insert, update, delete on public.presentation_logos to authenticated;
grant select on public.presentation_logos to anon;
grant select, insert, update, delete on public.presentation_settings to authenticated;
grant select on public.presentation_settings to anon;
grant select, insert, update, delete on public.presentation_backgrounds to authenticated;
grant select on public.presentation_backgrounds to anon;

create or replace function public.get_public_presentation(p_username text, p_slug text)
returns table (id uuid, title text, slug text, username text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.title, p.slug, pr.username
  from public.presentations p
  join public.profiles pr on pr.id = p.owner_id
  where pr.username = lower(p_username)
    and p.slug = lower(p_slug)
    and p.is_public = true
  limit 1
$$;

grant execute on function public.get_public_presentation(text, text) to anon, authenticated;

drop policy if exists "Owners can manage scoped slides" on public.slides;
create policy "Owners can manage scoped slides" on public.slides
  for all to authenticated using (
    presentation_id is not null and exists (
      select 1 from public.presentations p where p.id = presentation_id and p.owner_id = auth.uid()
    )
  ) with check (
    presentation_id is not null and exists (
      select 1 from public.presentations p where p.id = presentation_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Anyone can read public scoped slides" on public.slides;
create policy "Anyone can read public scoped slides" on public.slides
  for select to anon using (
    presentation_id is not null and exists (
      select 1 from public.presentations p where p.id = presentation_id and p.is_public
    )
  );
