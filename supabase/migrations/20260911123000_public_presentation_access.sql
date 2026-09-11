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
