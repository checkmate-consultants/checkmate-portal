-- Compliance: shopper_value must never be overwritten after it is set (super admin edits only update value).

create or replace function public.visit_report_answers_protect_shopper_value()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.shopper_value is not null and new.shopper_value is distinct from old.shopper_value then
    new.shopper_value := old.shopper_value;
  end if;
  return new;
end;
$$;

drop trigger if exists visit_report_answers_protect_shopper_value_trigger on public.visit_report_answers;
create trigger visit_report_answers_protect_shopper_value_trigger
  before update on public.visit_report_answers
  for each row
  execute function public.visit_report_answers_protect_shopper_value();
