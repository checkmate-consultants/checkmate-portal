drop policy if exists "Super admins manage list" on public.super_admins;
create policy "Super admins manage list"
  on public.super_admins
  for select
  using (auth.uid() = user_id);

drop policy if exists "Super admins insert list" on public.super_admins;
create policy "Super admins insert list"
  on public.super_admins
  for insert
  with check (auth.uid() = user_id);

