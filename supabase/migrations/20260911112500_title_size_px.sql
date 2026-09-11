alter table public.settings
  add column if not exists title_size_px integer not null default 42
    constraint settings_title_size_px_range check (title_size_px > 0);
