create table if not exists public.super_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.super_admins enable row level security;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1
    from public.super_admins sa
    where sa.user_id = auth.uid()
  );
$$;

drop policy if exists "Super admins manage list" on public.super_admins;
create policy "Super admins manage list"
  on public.super_admins
  for select
  using (public.is_super_admin());

drop policy if exists "Super admins insert list" on public.super_admins;
create policy "Super admins insert list"
  on public.super_admins
  for insert
  with check (public.is_super_admin());

drop policy if exists "Users can view their companies" on public.companies;
create policy "Users can view their companies"
  on public.companies
  for select
  using (
    public.is_super_admin() or exists (
      select 1
      from public.company_members m
      where m.company_id = companies.id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Members can read properties" on public.company_properties;
create policy "Members can read properties"
  on public.company_properties
  for select
  using (
    public.is_super_admin() or exists (
      select 1
      from public.company_members m
      where m.company_id = company_properties.company_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Members can manage properties" on public.company_properties;
create policy "Members can manage properties"
  on public.company_properties
  for insert
  with check (
    public.is_super_admin() or exists (
      select 1
      from public.company_members m
      where m.company_id = company_properties.company_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Members can read focus areas" on public.property_focus_areas;
create policy "Members can read focus areas"
  on public.property_focus_areas
  for select
  using (
    public.is_super_admin() or exists (
      select 1
      from public.company_members m
      join public.company_properties p on p.company_id = m.company_id
      where p.id = property_focus_areas.property_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Members can manage focus areas" on public.property_focus_areas;
create policy "Members can manage focus areas"
  on public.property_focus_areas
  for insert
  with check (
    public.is_super_admin() or exists (
      select 1
      from public.company_members m
      join public.company_properties p on p.company_id = m.company_id
      where p.id = property_focus_areas.property_id
        and m.user_id = auth.uid()
    )
  );

