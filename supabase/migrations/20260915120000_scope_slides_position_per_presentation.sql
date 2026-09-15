-- The original single-tenant schema made `position` unique across the
-- whole table. When multi-tenancy added presentation_id, this constraint
-- was never rescoped, so two different presentations can never both have
-- a slide at position 1 -- whichever one gets there second fails with
-- "duplicate key value violates unique constraint slides_position_key".
-- No existing rows can violate the new constraint: the old one already
-- prevented any actual collision from ever being written.
alter table public.slides drop constraint if exists slides_position_key;

drop index if exists public.slides_presentation_position_idx;
create unique index if not exists slides_presentation_position_idx
  on public.slides (presentation_id, position);
