-- Shopper submit → under_review (company does not see report until admin "Submit report to client" → report_submitted)

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
  -- Shopper can only change status to under_review (report submitted for review; company sees only after admin submits to client)
  new.company_id := old.company_id;
  new.property_id := old.property_id;
  new.shopper_id := old.shopper_id;
  new.scheduled_for := old.scheduled_for;
  new.notes := old.notes;
  if new.status is distinct from old.status and new.status <> 'under_review' then
    new.status := old.status;
  end if;
  return new;
end;
$$;

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
  set status = 'under_review'
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
