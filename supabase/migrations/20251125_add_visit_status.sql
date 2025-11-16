alter table public.visits
  add column if not exists status text not null default 'scheduled';

-- Optional: constrain to known statuses
alter table public.visits
  add constraint visits_status_check
  check (status in (
    'scheduled',
    'under_review',
    'report_submitted',
    'feedback_requested',
    'done'
  ));


