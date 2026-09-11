create or replace function public.claim_legacy_presentation(p_presentation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.presentations
    where id = p_presentation_id and owner_id = auth.uid()
  ) then
    raise exception 'You do not own this presentation';
  end if;

  if exists (select 1 from public.slides where presentation_id is not null) then
    return;
  end if;

  update public.slides
  set presentation_id = p_presentation_id
  where presentation_id is null;

  insert into public.presentation_logos (presentation_id, slot, url)
  select p_presentation_id, slot, url from public.logos
  on conflict (presentation_id, slot) do nothing;

  insert into public.presentation_settings (
    presentation_id, autoplay_interval_ms, logo_scale, title_text,
    title_color, title_size_px, title_bold
  )
  select
    p_presentation_id, autoplay_interval_ms, logo_scale, title_text,
    title_color, title_size_px, title_bold
  from public.settings
  where id = true
  on conflict (presentation_id) do nothing;

  insert into public.presentation_backgrounds (presentation_id, url)
  select p_presentation_id, url from public.backgrounds where id = true
  on conflict (presentation_id) do nothing;
end;
$$;

grant execute on function public.claim_legacy_presentation(uuid) to authenticated;
