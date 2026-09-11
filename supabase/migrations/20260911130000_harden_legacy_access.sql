drop policy if exists "Public read access" on public.slides;
drop policy if exists "Public insert access" on public.slides;
drop policy if exists "Public update access" on public.slides;
drop policy if exists "Public delete access" on public.slides;

drop policy if exists "Public read access" on public.logos;
drop policy if exists "Public update access" on public.logos;

drop policy if exists "Public read access" on public.settings;
drop policy if exists "Public insert access" on public.settings;
drop policy if exists "Public update access" on public.settings;

drop policy if exists "Public read access" on public.backgrounds;
drop policy if exists "Public insert access" on public.backgrounds;
drop policy if exists "Public update access" on public.backgrounds;

revoke select, insert, update, delete on public.slides from anon;
revoke select, update on public.logos from anon;
revoke select, insert, update on public.settings from anon;
revoke select, insert, update on public.backgrounds from anon;
