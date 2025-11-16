-- Allow company members to read visits for their own company
drop policy if exists "Company members read visits" on public.visits;
create policy "Company members read visits"
  on public.visits
  for select
  using (
    exists (
      select 1
      from public.company_members m
      where m.company_id = visits.company_id
        and m.user_id = auth.uid()
    )
  );

-- Allow company members to read visit_focus_areas for their own company via visits
drop policy if exists "Company members read visit focus areas" on public.visit_focus_areas;
create policy "Company members read visit focus areas"
  on public.visit_focus_areas
  for select
  using (
    exists (
      select 1
      from public.visits v
      join public.company_members m
        on m.company_id = v.company_id
      where v.id = visit_focus_areas.visit_id
        and m.user_id = auth.uid()
    )
  );



