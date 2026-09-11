alter table public.settings
  add column if not exists logo_scale numeric not null default 1
  constraint settings_logo_scale_range check (logo_scale between 0.5 and 2);
