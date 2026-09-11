-- Raise the default screen-title size from 42px to 64px so new
-- presentations start at a more legible size for a wall-mounted TV.
-- Existing presentations keep whatever title_size_px they already have.
alter table public.presentation_settings
  alter column title_size_px set default 64;

alter table public.settings
  alter column title_size_px set default 64;
