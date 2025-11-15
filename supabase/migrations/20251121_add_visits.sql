create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  property_id uuid not null references public.company_properties (id) on delete cascade,
  scheduled_for date not null,
  notes text,
  created_by uuid not null references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.visit_focus_areas (
  visit_id uuid not null references public.visits (id) on delete cascade,
  focus_area_id uuid not null references public.property_focus_areas (id) on delete cascade,
  primary key (visit_id, focus_area_id)
);

alter table public.visits enable row level security;
alter table public.visit_focus_areas enable row level security;

create policy "Super admins manage visits"
  on public.visits
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "Super admins manage visit focus areas"
  on public.visit_focus_areas
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

