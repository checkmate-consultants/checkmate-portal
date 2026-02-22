create table if not exists public.visit_focus_area_reports (
  visit_id uuid not null references public.visits (id) on delete cascade,
  focus_area_id uuid not null references public.property_focus_areas (id) on delete cascade,
  content text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (visit_id, focus_area_id)
);

alter table public.visit_focus_area_reports enable row level security;

drop policy if exists "Super admins manage visit reports" on public.visit_focus_area_reports;
create policy "Super admins manage visit reports"
  on public.visit_focus_area_reports
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Company members read visit reports" on public.visit_focus_area_reports;
create policy "Company members read visit reports"
  on public.visit_focus_area_reports
  for select
  using (
    exists (
      select 1
      from public.visits v
      join public.company_members m
        on m.company_id = v.company_id
      where v.id = visit_focus_area_reports.visit_id
        and m.user_id = auth.uid()
    )
  );



