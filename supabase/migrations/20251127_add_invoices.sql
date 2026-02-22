-- Invoices per customer (company) - runs after companies/super_admins exist
do $$
begin
  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type public.invoice_status as enum (
      'draft',
      'pending',
      'paid',
      'overdue',
      'void'
    );
  end if;
end
$$;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  invoice_number text not null,
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'USD',
  status public.invoice_status not null default 'draft',
  due_date date,
  issued_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists invoices_company_number_idx
  on public.invoices (company_id, invoice_number);

create index if not exists invoices_company_idx
  on public.invoices (company_id);

create index if not exists invoices_status_idx
  on public.invoices (status);

create index if not exists invoices_issued_at_idx
  on public.invoices (issued_at);

alter table public.invoices enable row level security;

drop policy if exists "Super admins manage invoices" on public.invoices;
create policy "Super admins manage invoices"
  on public.invoices
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Members can read company invoices" on public.invoices;
create policy "Members can read company invoices"
  on public.invoices
  for select
  using (
    exists (
      select 1
      from public.company_members m
      where m.company_id = invoices.company_id
        and m.user_id = auth.uid()
    )
  );

-- Trigger to keep updated_at in sync
create or replace function public.set_invoices_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at
  before update on public.invoices
  for each row
  execute function public.set_invoices_updated_at();
