-- Tenant & membership baseline
create extension if not exists "pgcrypto";

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.company_members (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')) default 'owner',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (company_id, user_id)
);

create unique index if not exists company_members_user_unique
  on public.company_members (user_id);

alter table public.companies enable row level security;
alter table public.company_members enable row level security;

drop policy if exists "Users can view their companies" on public.companies;
create policy "Users can view their companies"
  on public.companies
  for select
  using (
    exists (
      select 1
      from public.company_members m
      where m.company_id = companies.id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Users can create a single company" on public.companies;
create policy "Users can create a single company"
  on public.companies
  for insert
  with check (created_by = auth.uid());

drop policy if exists "Users can view their membership" on public.company_members;
create policy "Users can view their membership"
  on public.company_members
  for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert their membership" on public.company_members;
create policy "Users can insert their membership"
  on public.company_members
  for insert
  with check (user_id = auth.uid());

create or replace function public.create_company_with_owner(company_name text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  current_user_id uuid;
  new_company_id uuid;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'Must be authenticated.';
  end if;

  if company_name is null or length(trim(company_name)) < 2 then
    raise exception 'Company name is required.';
  end if;

  perform 1
  from public.company_members m
  where m.user_id = current_user_id;

  if found then
    raise exception 'User already belongs to a company.';
  end if;

  insert into public.companies (name, created_by)
  values (trim(company_name), current_user_id)
  returning id into new_company_id;

  insert into public.company_members (company_id, user_id, role)
  values (new_company_id, current_user_id, 'owner');

  return new_company_id;
end;
$$;

grant execute on function public.create_company_with_owner(text) to authenticated;

