-- Fix infinite recursion: policies on company_members must not select from company_members.
-- Use a SECURITY DEFINER function so the check runs with definer privileges and does not
-- re-enter RLS on company_members.

create or replace function public.is_company_admin_for(p_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = p_company_id
      and m.user_id = auth.uid()
      and m.role = 'company_admin'
  );
$$;

grant execute on function public.is_company_admin_for(uuid) to authenticated;
grant execute on function public.is_company_admin_for(uuid) to service_role;

-- Drop the recursive policies
drop policy if exists "Company admins can view company members" on public.company_members;
drop policy if exists "Company admins can insert company members" on public.company_members;
drop policy if exists "Company admins can update company member roles" on public.company_members;
drop policy if exists "Company admins can delete company members" on public.company_members;

-- Recreate using the function (no self-reference)
create policy "Company admins can view company members"
  on public.company_members
  for select
  using (public.is_company_admin_for(company_id));

create policy "Company admins can insert company members"
  on public.company_members
  for insert
  with check (
    role in ('company_member', 'company_viewer')
    and public.is_company_admin_for(company_id)
  );

create policy "Company admins can update company member roles"
  on public.company_members
  for update
  using (public.is_company_admin_for(company_id))
  with check (
    role in ('company_member', 'company_viewer')
    and public.is_company_admin_for(company_id)
  );

create policy "Company admins can delete company members"
  on public.company_members
  for delete
  using (public.is_company_admin_for(company_id));
