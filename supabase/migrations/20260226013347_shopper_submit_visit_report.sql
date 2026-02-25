-- Shoppers can submit a report: only set status to report_submitted, no other changes.
-- Policy allows update; trigger restricts shoppers to only that change.

create policy "Shoppers update assigned visits for report submit"
  on public.visits
  for update
  using (
    exists (
      select 1 from public.shoppers s
      where s.id = visits.shopper_id and s.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.shoppers s
      where s.id = visits.shopper_id and s.auth_user_id = auth.uid()
    )
  );

create or replace function public.shopper_visit_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.shoppers s where s.id = new.shopper_id and s.auth_user_id = auth.uid()) then
    return new;
  end if;
  -- Shopper can only change status to report_submitted; nothing else
  new.company_id := old.company_id;
  new.property_id := old.property_id;
  new.shopper_id := old.shopper_id;
  new.scheduled_for := old.scheduled_for;
  new.notes := old.notes;
  if new.status is distinct from old.status and new.status <> 'report_submitted' then
    new.status := old.status;
  end if;
  return new;
end;
$$;

create trigger visits_shopper_guard
  before update on public.visits
  for each row execute function public.shopper_visit_update_guard();

create or replace function public.shopper_submit_visit_report(p_visit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  update public.visits
  set status = 'report_submitted'
  where id = p_visit_id
    and exists (
      select 1 from public.shoppers s
      where s.id = visits.shopper_id and s.auth_user_id = auth.uid()
    );
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Visit not found or you are not the assigned shopper'
      using errcode = 'P0001';
  end if;
end;
$$;

grant execute on function public.shopper_submit_visit_report(uuid) to authenticated;
