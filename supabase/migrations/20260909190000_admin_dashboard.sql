alter table public.slides add column if not exists image_url text;

drop policy if exists "Public insert access" on public.slides;
create policy "Public insert access" on public.slides for insert to anon with check (true);
drop policy if exists "Public update access" on public.slides;
create policy "Public update access" on public.slides for update to anon using (true) with check (true);
drop policy if exists "Public delete access" on public.slides;
create policy "Public delete access" on public.slides for delete to anon using (true);
grant select, insert, update, delete on public.slides to anon;

drop policy if exists "Public insert access" on public.logos;
create policy "Public insert access" on public.logos for insert to anon with check (true);
grant insert on public.logos to anon;

drop policy if exists "Public insert access" on public.settings;
create policy "Public insert access" on public.settings for insert to anon with check (true);
drop policy if exists "Public update access" on public.settings;
create policy "Public update access" on public.settings for update to anon using (true) with check (true);
grant insert, update on public.settings to anon;

alter table public.slides replica identity full;
alter table public.logos replica identity full;
alter table public.settings replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.slides;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.logos;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.settings;
exception
  when duplicate_object then null;
end $$;

create table if not exists public.backgrounds (
  id boolean primary key default true,
  url text,
  updated_at timestamptz not null default now(),
  constraint backgrounds_singleton check (id)
);

alter table public.backgrounds enable row level security;

drop policy if exists "Public read access" on public.backgrounds;
create policy "Public read access" on public.backgrounds for select to anon using (true);
drop policy if exists "Public insert access" on public.backgrounds;
create policy "Public insert access" on public.backgrounds for insert to anon with check (true);
drop policy if exists "Public update access" on public.backgrounds;
create policy "Public update access" on public.backgrounds for update to anon using (true) with check (true);

grant select, insert, update on public.backgrounds to anon;
alter table public.backgrounds replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.backgrounds;
exception
  when duplicate_object then null;
end $$;
