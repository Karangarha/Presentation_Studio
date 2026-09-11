alter table public.settings
  add column if not exists title_text text not null default 'Department of Computer Science and Technology',
  add column if not exists title_color text not null default '#ffffff',
  add column if not exists title_scale numeric not null default 1
    constraint settings_title_scale_range check (title_scale between 0.6 and 2);
