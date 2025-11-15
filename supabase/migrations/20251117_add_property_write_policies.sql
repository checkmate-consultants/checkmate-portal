alter table public.company_properties enable row level security;
alter table public.property_focus_areas enable row level security;

alter table public.company_properties
  alter column latitude drop not null,
  alter column longitude drop not null;

drop policy if exists "Members can manage properties" on public.company_properties;
create policy "Members can manage properties"
  on public.company_properties
  for insert
  with check (
    exists (
      select 1
      from public.company_members m
      where m.company_id = company_properties.company_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Members can manage focus areas" on public.property_focus_areas;
create policy "Members can manage focus areas"
  on public.property_focus_areas
  for insert
  with check (
    exists (
      select 1
      from public.company_members m
      join public.company_properties p on p.company_id = m.company_id
      where p.id = property_focus_areas.property_id
        and m.user_id = auth.uid()
    )
  );

