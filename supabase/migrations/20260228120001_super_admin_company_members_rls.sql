-- Super admins can view and delete any company member (for user management when viewing a company)
create policy "Super admins can view company members"
  on public.company_members
  for select
  using (public.is_super_admin());

create policy "Super admins can delete company members"
  on public.company_members
  for delete
  using (public.is_super_admin());
