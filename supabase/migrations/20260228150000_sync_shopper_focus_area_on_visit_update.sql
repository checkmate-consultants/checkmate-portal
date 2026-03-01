-- When a visit's shopper_id is set or changed, sync shopper_focus_area_access so the shopper
-- can read property_focus_areas (and thus see report form sections/questions) for that visit.

create or replace function public.sync_shopper_focus_area_access_on_visit_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- New shopper assigned: grant focus area access for this visit's focus areas
  if new.shopper_id is not null then
    insert into public.shopper_focus_area_access (shopper_id, focus_area_id)
    select new.shopper_id, vfa.focus_area_id
    from public.visit_focus_areas vfa
    where vfa.visit_id = new.id
    on conflict (shopper_id, focus_area_id) do nothing;
  end if;

  -- Shopper removed or changed: revoke old shopper's access for focus areas that only belonged to this visit
  if old.shopper_id is not null and old.shopper_id is distinct from new.shopper_id then
    delete from public.shopper_focus_area_access sca
    where sca.shopper_id = old.shopper_id
      and sca.focus_area_id in (
        select vfa.focus_area_id from public.visit_focus_areas vfa where vfa.visit_id = old.id
      )
      and not exists (
        select 1 from public.visit_focus_areas vfa2
        join public.visits v2 on v2.id = vfa2.visit_id and v2.shopper_id = old.shopper_id
        where vfa2.focus_area_id = sca.focus_area_id and v2.id != old.id
      );
  end if;

  return coalesce(new, old);
end;
$$;

create trigger visits_sync_shopper_focus_area_access
  after update of shopper_id on public.visits
  for each row
  execute function public.sync_shopper_focus_area_access_on_visit_update();

-- Backfill: ensure any visit that already has a shopper but missed focus area sync gets it
insert into public.shopper_focus_area_access (shopper_id, focus_area_id)
select distinct v.shopper_id, vfa.focus_area_id
from public.visits v
join public.visit_focus_areas vfa on vfa.visit_id = v.id
where v.shopper_id is not null
on conflict (shopper_id, focus_area_id) do nothing;
