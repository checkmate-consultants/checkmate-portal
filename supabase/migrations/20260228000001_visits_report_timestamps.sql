-- Timestamps for overview stats: when shopper submitted, when reviewed, when submitted to client.
alter table public.visits
  add column if not exists under_review_at timestamptz,
  add column if not exists report_submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz;

-- Set timestamps when status changes (run after set_visits_updated_at so order matters).
create or replace function public.set_visits_report_timestamps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    if new.status = 'under_review' then
      new.under_review_at := timezone('utc', now());
    end if;
    if new.status = 'report_submitted' then
      new.report_submitted_at := timezone('utc', now());
    end if;
    if old.status = 'under_review' and new.status in ('report_submitted', 'feedback_requested') then
      new.reviewed_at := timezone('utc', now());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists visits_report_timestamps on public.visits;
create trigger visits_report_timestamps
  before update on public.visits
  for each row
  execute function public.set_visits_report_timestamps();
