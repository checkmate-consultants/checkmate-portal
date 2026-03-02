-- Super admins can update company member roles (e.g. change a user to reviewer when managing a company)
create policy "Super admins can update company members"
  on public.company_members
  for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Super admins can manage reviewer focus areas for any company (assign focus areas when changing user to reviewer)
create policy "Super admins manage reviewer focus areas"
  on public.reviewer_focus_areas
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());
