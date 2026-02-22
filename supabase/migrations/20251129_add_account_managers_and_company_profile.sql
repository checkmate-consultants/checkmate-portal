-- Account managers: platform role with fewer privileges than super admin
create table if not exists public.account_managers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.account_managers enable row level security;

create or replace function public.is_account_manager()
returns boolean
language sql
security definer
set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1
    from public.account_managers am
    where am.user_id = auth.uid()
  );
$$;

-- Account managers can read the list (to see they are one)
drop policy if exists "Account managers read list" on public.account_managers;
create policy "Account managers read list"
  on public.account_managers
  for select
  using (auth.uid() = user_id);

-- Super admins manage account managers list
create policy "Super admins manage account managers"
  on public.account_managers
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Profiles for displaying user names/emails (e.g. account managers)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles
  for select
  using (id = auth.uid());

create policy "Super admins and account managers can read all profiles"
  on public.profiles
  for select
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.account_managers am
      where am.user_id = auth.uid()
    )
  );

-- Company profile fields and account manager assignment (must run before policies that reference account_manager_id)
alter table public.companies
  add column if not exists email text,
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists account_manager_id uuid references auth.users (id) on delete set null;

create index if not exists companies_account_manager_idx
  on public.companies (account_manager_id);

-- Company members can read profile of their company's account manager
create policy "Company members can read account manager profile"
  on public.profiles
  for select
  using (
    exists (
      select 1 from public.company_members m
      join public.companies c on c.id = m.company_id
      where m.user_id = auth.uid() and c.account_manager_id = profiles.id
    )
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, updated_at)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    timezone('utc', now())
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Companies: allow super admins to update (for account_manager_id and profile fields)
-- Company members (company_admin) can update their company profile (email, address, phone) but not account_manager_id
create policy "Super admins update companies"
  on public.companies
  for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "Company admins update own company profile"
  on public.companies
  for update
  using (
    exists (
      select 1 from public.company_members m
      where m.company_id = companies.id
        and m.user_id = auth.uid()
        and m.role = 'company_admin'
    )
  )
  with check (
    -- Only allow changing email, address, phone (not name, account_manager_id, etc.) via this policy
    -- We enforce that in app or with a trigger; here we just allow the update
    exists (
      select 1 from public.company_members m
      where m.company_id = companies.id
        and m.user_id = auth.uid()
        and m.role = 'company_admin'
    )
  );

-- Extend "Users can view their companies" to include account managers for their assigned companies
drop policy if exists "Users can view their companies" on public.companies;
create policy "Users can view their companies"
  on public.companies
  for select
  using (
    public.is_super_admin()
    or (public.is_account_manager() and companies.account_manager_id = auth.uid())
    or exists (
      select 1
      from public.company_members m
      where m.company_id = companies.id
        and m.user_id = auth.uid()
    )
  );

-- Account managers can read companies they manage; they already fall under the select policy above
-- Visits, properties, etc.: account managers should see data for companies they manage
-- Update existing policies to include is_account_manager() and company assignment

drop policy if exists "Members can read properties" on public.company_properties;
create policy "Members can read properties"
  on public.company_properties
  for select
  using (
    public.is_super_admin()
    or (public.is_account_manager() and exists (
      select 1 from public.companies c
      where c.id = company_properties.company_id and c.account_manager_id = auth.uid()
    ))
    or exists (
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
    public.is_super_admin()
    or (public.is_account_manager() and exists (
      select 1 from public.companies c
      where c.id = company_properties.company_id and c.account_manager_id = auth.uid()
    ))
    or exists (
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
    public.is_super_admin()
    or (public.is_account_manager() and exists (
      select 1 from public.company_properties p
      join public.companies c on c.id = p.company_id
      where p.id = property_focus_areas.property_id and c.account_manager_id = auth.uid()
    ))
    or exists (
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
    public.is_super_admin()
    or (public.is_account_manager() and exists (
      select 1 from public.company_properties p
      join public.companies c on c.id = p.company_id
      where p.id = property_focus_areas.property_id and c.account_manager_id = auth.uid()
    ))
    or exists (
      select 1
      from public.company_members m
      join public.company_properties p on p.company_id = m.company_id
      where p.id = property_focus_areas.property_id
        and m.user_id = auth.uid()
    )
  );

-- Visits: account managers can read/manage visits for their companies
drop policy if exists "Super admins manage visits" on public.visits;
create policy "Super admins manage visits"
  on public.visits
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "Account managers manage their companies visits"
  on public.visits
  for all
  using (
    public.is_account_manager()
    and exists (
      select 1 from public.companies c
      where c.id = visits.company_id and c.account_manager_id = auth.uid()
    )
  )
  with check (
    public.is_account_manager()
    and exists (
      select 1 from public.companies c
      where c.id = visits.company_id and c.account_manager_id = auth.uid()
    )
  );

drop policy if exists "Super admins manage visit focus areas" on public.visit_focus_areas;
create policy "Super admins manage visit focus areas"
  on public.visit_focus_areas
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "Account managers manage their companies visit focus areas"
  on public.visit_focus_areas
  for all
  using (
    public.is_account_manager()
    and exists (
      select 1 from public.visits v
      join public.companies c on c.id = v.company_id
      where v.id = visit_focus_areas.visit_id and c.account_manager_id = auth.uid()
    )
  )
  with check (
    public.is_account_manager()
    and exists (
      select 1 from public.visits v
      join public.companies c on c.id = v.company_id
      where v.id = visit_focus_areas.visit_id and c.account_manager_id = auth.uid()
    )
  );

-- Shoppers: only super admins (account managers do not manage shoppers)
-- Visit reports: account managers can read/write for their companies' visits
drop policy if exists "Super admins manage visit reports" on public.visit_focus_area_reports;
create policy "Super admins manage visit reports"
  on public.visit_focus_area_reports
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "Account managers manage their companies visit reports"
  on public.visit_focus_area_reports
  for all
  using (
    public.is_account_manager()
    and exists (
      select 1 from public.visits v
      join public.companies c on c.id = v.company_id
      where v.id = visit_focus_area_reports.visit_id and c.account_manager_id = auth.uid()
    )
  )
  with check (
    public.is_account_manager()
    and exists (
      select 1 from public.visits v
      join public.companies c on c.id = v.company_id
      where v.id = visit_focus_area_reports.visit_id and c.account_manager_id = auth.uid()
    )
  );

-- Trigger to sync profiles from auth (must run after profiles table exists)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute function public.handle_new_user();

-- Backfill existing auth users into profiles (one-time)
insert into public.profiles (id, email, full_name, updated_at)
select
  id,
  email,
  coalesce(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    split_part(email, '@', 1)
  ),
  timezone('utc', now())
from auth.users
on conflict (id) do update set
  email = excluded.email,
  full_name = coalesce(excluded.full_name, public.profiles.full_name),
  updated_at = timezone('utc', now());
