create table if not exists public.company_properties (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  city text not null,
  country text not null,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists company_properties_company_idx
  on public.company_properties (company_id);

alter table public.company_properties enable row level security;

drop policy if exists "Members can read properties" on public.company_properties;
create policy "Members can read properties"
  on public.company_properties
  for select
  using (
    exists (
      select 1
      from public.company_members m
      where m.company_id = company_properties.company_id
        and m.user_id = auth.uid()
    )
  );

create table if not exists public.property_focus_areas (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.company_properties (id) on delete cascade,
  name text not null,
  description text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists property_focus_areas_property_idx
  on public.property_focus_areas (property_id);

alter table public.property_focus_areas enable row level security;

drop policy if exists "Members can read focus areas" on public.property_focus_areas;
create policy "Members can read focus areas"
  on public.property_focus_areas
  for select
  using (
    exists (
      select 1
      from public.company_members m
      join public.company_properties p on p.company_id = m.company_id
      where p.id = property_focus_areas.property_id
        and m.user_id = auth.uid()
    )
  );

create or replace function public.seed_company_portfolio(target_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  aurora_bay uuid;
  desert_ridge uuid;
  harbor_table uuid;
begin
  if target_company_id is null then
    raise exception 'Target company id is required.';
  end if;

  if exists (
    select 1
    from public.company_properties
    where company_id = target_company_id
  ) then
    return;
  end if;

  insert into public.company_properties (
    company_id,
    name,
    city,
    country,
    latitude,
    longitude
  )
  values (
    target_company_id,
    'Aurora Bay Hotel & Spa',
    'Dubai',
    'United Arab Emirates',
    25.0803,
    55.1401
  )
  returning id into aurora_bay;

  insert into public.company_properties (
    company_id,
    name,
    city,
    country,
    latitude,
    longitude
  )
  values (
    target_company_id,
    'Desert Ridge Residences',
    'Riyadh',
    'Saudi Arabia',
    24.7136,
    46.6753
  )
  returning id into desert_ridge;

  insert into public.company_properties (
    company_id,
    name,
    city,
    country,
    latitude,
    longitude
  )
  values (
    target_company_id,
    'Harbor Table',
    'Doha',
    'Qatar',
    25.2854,
    51.5310
  )
  returning id into harbor_table;

  insert into public.property_focus_areas (property_id, name, description)
  values
    (
      aurora_bay,
      'Spa ritual',
      'Evaluate the full spa journey from arrival to post-treatment guidance.'
    ),
    (
      aurora_bay,
      'Suite arrival',
      'Inspect housekeeping readiness, amenities, and turndown quality.'
    ),
    (
      aurora_bay,
      'Valet & parking',
      'Time handover, note professionalism, and photograph vehicle handling.'
    ),
    (
      desert_ridge,
      'Check-in journey',
      'Capture digital pre-arrival, lobby welcome, and room escort.'
    ),
    (
      desert_ridge,
      'Laundry turnaround',
      'Submit garments, document promised timelines, and confirm delivery.'
    ),
    (
      harbor_table,
      'Weekday lunch',
      'Evaluate reservation flow, host readiness, and table pacing.'
    ),
    (
      harbor_table,
      'Delivery experience',
      'Order via aggregators, track ETAs, and inspect packaging.'
    );
end;
$$;

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

  perform public.seed_company_portfolio(new_company_id);

  return new_company_id;
end;
$$;

grant execute on function public.create_company_with_owner(text) to authenticated;

