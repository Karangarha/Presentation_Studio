alter table public.settings
  add column if not exists title_bold boolean not null default true;
