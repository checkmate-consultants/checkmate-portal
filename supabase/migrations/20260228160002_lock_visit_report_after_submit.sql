-- Once a report is submitted to the client (report_submitted), no one may update answers.

create or replace function public.visit_report_answers_reject_if_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from public.visits where id = new.visit_id;
  if v_status = 'report_submitted' then
    raise exception 'Report has been submitted to the client and cannot be edited'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists visit_report_answers_reject_if_submitted_trigger on public.visit_report_answers;
create trigger visit_report_answers_reject_if_submitted_trigger
  before update on public.visit_report_answers
  for each row
  execute function public.visit_report_answers_reject_if_submitted();
