insert into public.roles (slug, name, description, is_system)
values ('shopper', 'Shopper', 'Mystery shopper account', true)
on conflict (slug) do nothing;

create table if not exists public.shoppers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.shoppers enable row level security;

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

