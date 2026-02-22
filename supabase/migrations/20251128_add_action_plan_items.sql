-- Action tracker items per company (issue, suggested action, responsible, deadline, status)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'action_plan_status') then
    create type public.action_plan_status as enum (
      'pending',
      'in_progress',
      'completed'
    );
  end if;
end
$$;

create table if not exists public.action_plan_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  issue text not null,
  suggested_action text not null,
  responsible text not null,
  deadline date,
  status public.action_plan_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists action_plan_items_company_idx
  on public.action_plan_items (company_id);

create index if not exists action_plan_items_status_idx
  on public.action_plan_items (status);

alter table public.action_plan_items enable row level security;

-- Super admins: full access
drop policy if exists "Super admins manage action plan items" on public.action_plan_items;
create policy "Super admins manage action plan items"
  on public.action_plan_items
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Company members: read/write for their company
drop policy if exists "Members can read company action plan items" on public.action_plan_items;
create policy "Members can read company action plan items"
  on public.action_plan_items
  for select
  using (
    exists (
      select 1
      from public.company_members m
      where m.company_id = action_plan_items.company_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Members can insert company action plan items" on public.action_plan_items;
create policy "Members can insert company action plan items"
  on public.action_plan_items
  for insert
  with check (
    exists (
      select 1
      from public.company_members m
      where m.company_id = action_plan_items.company_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Members can update company action plan items" on public.action_plan_items;
create policy "Members can update company action plan items"
  on public.action_plan_items
  for update
  using (
    exists (
      select 1
      from public.company_members m
      where m.company_id = action_plan_items.company_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Members can delete company action plan items" on public.action_plan_items;
create policy "Members can delete company action plan items"
  on public.action_plan_items
  for delete
  using (
    exists (
      select 1
      from public.company_members m
      where m.company_id = action_plan_items.company_id
        and m.user_id = auth.uid()
    )
  );

-- Trigger to keep updated_at in sync
create or replace function public.set_action_plan_items_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists action_plan_items_updated_at on public.action_plan_items;
create trigger action_plan_items_updated_at
  before update on public.action_plan_items
  for each row
  execute function public.set_action_plan_items_updated_at();
