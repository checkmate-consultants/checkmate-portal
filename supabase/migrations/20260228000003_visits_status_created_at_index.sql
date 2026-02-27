-- Status breakdown for last 28 days: count by status where created_at >= since.
create index if not exists visits_status_created_at_idx
  on public.visits (status, created_at);
