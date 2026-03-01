-- Preserve shopper's original answers when they submit (version 1). Super admin edits update value (version 2).

alter table public.visit_report_answers
  add column if not exists shopper_value text;

comment on column public.visit_report_answers.shopper_value is 'Original value submitted by shopper; value is the current/final (may be edited by super admin).';

-- Backfill: for visits already under_review, treat current value as shopper version
update public.visit_report_answers a
set shopper_value = a.value
from public.visits v
where v.id = a.visit_id
  and v.status = 'under_review'
  and a.shopper_value is null;

-- When visit status becomes under_review (shopper submitted), snapshot current answers as shopper_value.
create or replace function public.visit_report_snapshot_shopper_answers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'under_review' and (old.status is null or old.status <> 'under_review') then
    update public.visit_report_answers
    set shopper_value = value
    where visit_id = new.id
      and shopper_value is null;
  end if;
  return new;
end;
$$;

drop trigger if exists visit_report_snapshot_shopper_answers_trigger on public.visits;
create trigger visit_report_snapshot_shopper_answers_trigger
  after update of status on public.visits
  for each row
  execute function public.visit_report_snapshot_shopper_answers();
