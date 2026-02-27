-- Indexes for super admin overview stats (counts and range queries).

-- Status breakdown: 5 count queries by status.
create index if not exists visits_status_idx
  on public.visits (status);

-- Last-28-days counts: range queries on timestamp columns.
-- Partial indexes keep size down and match "is not null" implied by our queries.
create index if not exists visits_under_review_at_idx
  on public.visits (under_review_at)
  where under_review_at is not null;

create index if not exists visits_reviewed_at_idx
  on public.visits (reviewed_at)
  where reviewed_at is not null;

create index if not exists visits_report_submitted_at_idx
  on public.visits (report_submitted_at)
  where report_submitted_at is not null;

-- Shoppers created in last 28 days.
create index if not exists shoppers_created_at_idx
  on public.shoppers (created_at);
