-- Reviewers may only see visits that include at least one of their assigned focus areas.
-- Other company members (admin, member, viewer) continue to see all company visits.

drop policy if exists "Company members read visits" on public.visits;
create policy "Company members read visits"
  on public.visits
  for select
  using (
    exists (
      select 1 from public.company_members m
      where m.company_id = visits.company_id
        and m.user_id = auth.uid()
        and (
          m.role <> 'reviewer'
          or exists (
            select 1 from public.visit_focus_areas vfa
            join public.reviewer_focus_areas rfa
              on rfa.company_id = visits.company_id
             and rfa.user_id = auth.uid()
             and rfa.focus_area_id = vfa.focus_area_id
            where vfa.visit_id = visits.id
          )
        )
    )
  );

-- Reviewers may only see visit_focus_areas rows for their assigned focus areas (same as visit visibility).
drop policy if exists "Company members read visit focus areas" on public.visit_focus_areas;
create policy "Company members read visit focus areas"
  on public.visit_focus_areas
  for select
  using (
    exists (
      select 1 from public.visits v
      join public.company_members m on m.company_id = v.company_id and m.user_id = auth.uid()
      where v.id = visit_focus_areas.visit_id
        and (
          m.role <> 'reviewer'
          or exists (
            select 1 from public.reviewer_focus_areas rfa
            where rfa.company_id = v.company_id
              and rfa.user_id = auth.uid()
              and rfa.focus_area_id = visit_focus_areas.focus_area_id
          )
        )
    )
  );
