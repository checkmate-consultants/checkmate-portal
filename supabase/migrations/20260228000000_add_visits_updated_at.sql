-- Add updated_at to visits for "reports submitted in last N days" overview stats.
-- Backfill existing rows so updated_at is never null.
alter table public.visits
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.visits
set updated_at = created_at
where updated_at is null;

alter table public.visits
  alter column updated_at set default timezone('utc', now());

create or replace function public.set_visits_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists visits_updated_at on public.visits;
create trigger visits_updated_at
  before update on public.visits
  for each row
  execute function public.set_visits_updated_at();
