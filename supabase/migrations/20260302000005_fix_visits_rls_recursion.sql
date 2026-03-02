-- Fix RLS recursion: "Company members read visits" reads visit_focus_areas, and
-- "Company members read visit focus areas" reads visits, causing mutual recursion and 500.
-- Use SECURITY DEFINER functions so the check runs with definer privileges (no RLS re-entry).

-- Returns true if the current user (as company member) can see this visit.
-- Reads company_members, visits, visit_focus_areas, reviewer_focus_areas; runs as definer so no RLS.
create or replace function public.company_member_can_see_visit(p_visit_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.company_members m
    join public.visits v on v.company_id = m.company_id and v.id = p_visit_id
    where m.user_id = auth.uid()
      and (
        m.role <> 'reviewer'
        or exists (
          select 1 from public.visit_focus_areas vfa
          join public.reviewer_focus_areas rfa
            on rfa.company_id = v.company_id
           and rfa.user_id = auth.uid()
           and rfa.focus_area_id = vfa.focus_area_id
          where vfa.visit_id = p_visit_id
        )
      )
  );
$$;

grant execute on function public.company_member_can_see_visit(uuid) to authenticated;
grant execute on function public.company_member_can_see_visit(uuid) to service_role;

-- Returns true if the current user can see this (visit_id, focus_area_id) row.
-- Does not read visit_focus_areas, so no recursion when used from visit_focus_areas policy.
create or replace function public.company_member_can_see_visit_focus_area_row(
  p_visit_id uuid,
  p_focus_area_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.visits v
    join public.company_members m on m.company_id = v.company_id and m.user_id = auth.uid()
    where v.id = p_visit_id
      and (
        m.role <> 'reviewer'
        or exists (
          select 1 from public.reviewer_focus_areas rfa
          where rfa.company_id = v.company_id
            and rfa.user_id = auth.uid()
            and rfa.focus_area_id = p_focus_area_id
        )
      )
  );
$$;

grant execute on function public.company_member_can_see_visit_focus_area_row(uuid, uuid) to authenticated;
grant execute on function public.company_member_can_see_visit_focus_area_row(uuid, uuid) to service_role;

-- Visits: use function so we don't directly read visit_focus_areas (avoids recursion).
drop policy if exists "Company members read visits" on public.visits;
create policy "Company members read visits"
  on public.visits
  for select
  using (public.company_member_can_see_visit(id));

-- Visit_focus_areas: use function that doesn't read visit_focus_areas (avoids recursion).
drop policy if exists "Company members read visit focus areas" on public.visit_focus_areas;
create policy "Company members read visit focus areas"
  on public.visit_focus_areas
  for select
  using (public.company_member_can_see_visit_focus_area_row(visit_id, focus_area_id));
