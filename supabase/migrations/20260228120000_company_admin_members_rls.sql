-- Company admins can view all members of their company (for user management tab)
create policy "Company admins can view company members"
  on public.company_members
  for select
  using (
    exists (
      select 1 from public.company_members m
      where m.company_id = company_members.company_id
        and m.user_id = auth.uid()
        and m.role = 'company_admin'
    )
  );

-- Company admins can insert new members for their company (role must be company_member or company_viewer; company_admin only via signup/trigger)
create policy "Company admins can insert company members"
  on public.company_members
  for insert
  with check (
    role in ('company_member', 'company_viewer')
    and exists (
      select 1 from public.company_members m
      where m.company_id = company_members.company_id
        and m.user_id = auth.uid()
        and m.role = 'company_admin'
    )
  );

-- Company admins can update role of members in their company (cannot change to company_admin)
create policy "Company admins can update company member roles"
  on public.company_members
  for update
  using (
    exists (
      select 1 from public.company_members m
      where m.company_id = company_members.company_id
        and m.user_id = auth.uid()
        and m.role = 'company_admin'
    )
  )
  with check (
    role in ('company_member', 'company_viewer')
    and exists (
      select 1 from public.company_members m
      where m.company_id = company_members.company_id
        and m.user_id = auth.uid()
        and m.role = 'company_admin'
    )
  );

-- Company admins can remove members from their company (except themselves if last admin - enforce in app if desired)
create policy "Company admins can delete company members"
  on public.company_members
  for delete
  using (
    exists (
      select 1 from public.company_members m
      where m.company_id = company_members.company_id
        and m.user_id = auth.uid()
        and m.role = 'company_admin'
    )
  );

-- Company members can read profiles of other users in the same company (for member list display)
create policy "Company members can read same-company profiles"
  on public.profiles
  for select
  using (
    exists (
      select 1 from public.company_members m1
      join public.company_members m2 on m1.company_id = m2.company_id and m2.user_id = profiles.id
      where m1.user_id = auth.uid()
    )
  );
