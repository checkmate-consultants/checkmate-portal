-- Shoppers can read their own row (so the app can resolve auth user -> shopper id)
drop policy if exists "Shoppers read own row" on public.shoppers;
create policy "Shoppers read own row"
  on public.shoppers
  for select
  using (auth_user_id = auth.uid());

-- Shoppers can read visits assigned to them
create policy "Shoppers read assigned visits"
  on public.visits
  for select
  using (
    exists (
      select 1 from public.shoppers s
      where s.id = visits.shopper_id and s.auth_user_id = auth.uid()
    )
  );

-- Shoppers can read visit_focus_areas for their assigned visits
create policy "Shoppers read visit focus areas for assigned visits"
  on public.visit_focus_areas
  for select
  using (
    exists (
      select 1 from public.visits v
      join public.shoppers s on s.id = v.shopper_id
      where v.id = visit_focus_areas.visit_id and s.auth_user_id = auth.uid()
    )
  );

-- Shoppers can read and update visit reports for their assigned visits (to submit reports)
create policy "Shoppers read own visit reports"
  on public.visit_focus_area_reports
  for select
  using (
    exists (
      select 1 from public.visits v
      join public.shoppers s on s.id = v.shopper_id
      where v.id = visit_focus_area_reports.visit_id and s.auth_user_id = auth.uid()
    )
  );

create policy "Shoppers insert own visit reports"
  on public.visit_focus_area_reports
  for insert
  with check (
    exists (
      select 1 from public.visits v
      join public.shoppers s on s.id = v.shopper_id
      where v.id = visit_focus_area_reports.visit_id and s.auth_user_id = auth.uid()
    )
  );

create policy "Shoppers update own visit reports"
  on public.visit_focus_area_reports
  for update
  using (
    exists (
      select 1 from public.visits v
      join public.shoppers s on s.id = v.shopper_id
      where v.id = visit_focus_area_reports.visit_id and s.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.visits v
      join public.shoppers s on s.id = v.shopper_id
      where v.id = visit_focus_area_reports.visit_id and s.auth_user_id = auth.uid()
    )
  );
