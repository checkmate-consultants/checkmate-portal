-- Shoppers need to read company and property data when loading their assigned visits
-- (the visits query joins to companies and company_properties; RLS was blocking those rows)

create policy "Shoppers read companies for assigned visits"
  on public.companies
  for select
  using (
    exists (
      select 1 from public.visits v
      join public.shoppers s on s.id = v.shopper_id
      where v.company_id = companies.id and s.auth_user_id = auth.uid()
    )
  );

create policy "Shoppers read properties for assigned visits"
  on public.company_properties
  for select
  using (
    exists (
      select 1 from public.visits v
      join public.shoppers s on s.id = v.shopper_id
      where v.property_id = company_properties.id and s.auth_user_id = auth.uid()
    )
  );

-- Shoppers need to read property_focus_areas for the visit focus areas join
create policy "Shoppers read focus areas for assigned visits"
  on public.property_focus_areas
  for select
  using (
    exists (
      select 1 from public.visits v
      join public.shoppers s on s.id = v.shopper_id
      join public.visit_focus_areas vfa on vfa.visit_id = v.id
      where vfa.focus_area_id = property_focus_areas.id and s.auth_user_id = auth.uid()
    )
  );
