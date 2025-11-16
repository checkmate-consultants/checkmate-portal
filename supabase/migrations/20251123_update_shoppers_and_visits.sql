alter table public.shoppers
  drop constraint if exists shoppers_company_id_fkey,
  drop column if exists company_id;

alter table public.visits
  add column if not exists shopper_id uuid references public.shoppers (id);

drop policy if exists "Super admins read shoppers" on public.shoppers;
create policy "Super admins read shoppers"
  on public.shoppers
  for select
  using (public.is_super_admin());

drop policy if exists "Super admins manage shoppers" on public.shoppers;
create policy "Super admins manage shoppers"
  on public.shoppers
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

