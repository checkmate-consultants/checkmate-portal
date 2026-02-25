-- Fix infinite recursion: companies policy reads visits, visits policy reads companies.
-- Use cache tables (maintained by triggers) so policies never query visits.

drop policy if exists "Shoppers read companies for assigned visits" on public.companies;
drop policy if exists "Shoppers read properties for assigned visits" on public.company_properties;
drop policy if exists "Shoppers read focus areas for assigned visits" on public.property_focus_areas;

-- Cache tables: which companies/properties/focus_areas each shopper can read (from assigned visits).
-- RLS on these tables only references shoppers (no companies), so no recursion.

create table if not exists public.shopper_company_access (
  shopper_id uuid not null references public.shoppers (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  primary key (shopper_id, company_id)
);

create table if not exists public.shopper_property_access (
  shopper_id uuid not null references public.shoppers (id) on delete cascade,
  property_id uuid not null references public.company_properties (id) on delete cascade,
  primary key (shopper_id, property_id)
);

create table if not exists public.shopper_focus_area_access (
  shopper_id uuid not null references public.shoppers (id) on delete cascade,
  focus_area_id uuid not null references public.property_focus_areas (id) on delete cascade,
  primary key (shopper_id, focus_area_id)
);

alter table public.shopper_company_access enable row level security;
alter table public.shopper_property_access enable row level security;
alter table public.shopper_focus_area_access enable row level security;

-- Shoppers can read their own rows (shoppers table has no dependency on companies)
create policy "Shoppers read own company access"
  on public.shopper_company_access for select
  using (
    exists (select 1 from public.shoppers s where s.id = shopper_company_access.shopper_id and s.auth_user_id = auth.uid())
  );

create policy "Shoppers read own property access"
  on public.shopper_property_access for select
  using (
    exists (select 1 from public.shoppers s where s.id = shopper_property_access.shopper_id and s.auth_user_id = auth.uid())
  );

create policy "Shoppers read own focus area access"
  on public.shopper_focus_area_access for select
  using (
    exists (select 1 from public.shoppers s where s.id = shopper_focus_area_access.shopper_id and s.auth_user_id = auth.uid())
  );

-- Super admins and migration runner can write (trigger runs as super admin; backfill as migration user)
create policy "Super admin or postgres manages shopper company access"
  on public.shopper_company_access for all
  using (public.is_super_admin() or current_user in ('postgres', 'supabase_admin'))
  with check (public.is_super_admin() or current_user in ('postgres', 'supabase_admin'));

create policy "Super admin or postgres manages shopper property access"
  on public.shopper_property_access for all
  using (public.is_super_admin() or current_user in ('postgres', 'supabase_admin'))
  with check (public.is_super_admin() or current_user in ('postgres', 'supabase_admin'));

create policy "Super admin or postgres manages shopper focus area access"
  on public.shopper_focus_area_access for all
  using (public.is_super_admin() or current_user in ('postgres', 'supabase_admin'))
  with check (public.is_super_admin() or current_user in ('postgres', 'supabase_admin'));

-- Trigger function: keep shopper_company_access in sync with visits
create or replace function public.sync_shopper_company_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.shopper_id is not null then
    insert into public.shopper_company_access (shopper_id, company_id)
    values (new.shopper_id, new.company_id)
    on conflict (shopper_id, company_id) do nothing;
  elsif tg_op = 'DELETE' or tg_op = 'UPDATE' then
    if (tg_op = 'DELETE' and old.shopper_id is not null) or (tg_op = 'UPDATE' and old.shopper_id is not null and (new.shopper_id is distinct from old.shopper_id or new.company_id is distinct from old.company_id)) then
      delete from public.shopper_company_access sca
      where sca.shopper_id = old.shopper_id and sca.company_id = old.company_id
        and not exists (select 1 from public.visits v where v.shopper_id = sca.shopper_id and v.company_id = sca.company_id);
    end if;
  end if;
  if tg_op = 'UPDATE' and new.shopper_id is not null then
    insert into public.shopper_company_access (shopper_id, company_id)
    values (new.shopper_id, new.company_id)
    on conflict (shopper_id, company_id) do nothing;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger visits_sync_shopper_company_access
  after insert or update or delete on public.visits
  for each row execute function public.sync_shopper_company_access();

-- Same for property and focus area
create or replace function public.sync_shopper_property_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.shopper_id is not null then
    insert into public.shopper_property_access (shopper_id, property_id)
    values (new.shopper_id, new.property_id)
    on conflict (shopper_id, property_id) do nothing;
  end if;
  if (tg_op = 'DELETE' or tg_op = 'UPDATE') and old.shopper_id is not null then
    if tg_op = 'UPDATE' and (new.shopper_id is distinct from old.shopper_id or new.property_id is distinct from old.property_id) then
      delete from public.shopper_property_access sca
      where sca.shopper_id = old.shopper_id and sca.property_id = old.property_id
        and not exists (select 1 from public.visits v where v.shopper_id = sca.shopper_id and v.property_id = sca.property_id);
    end if;
    if tg_op = 'DELETE' then
      delete from public.shopper_property_access sca
      where sca.shopper_id = old.shopper_id and sca.property_id = old.property_id
        and not exists (select 1 from public.visits v where v.shopper_id = sca.shopper_id and v.property_id = sca.property_id);
    end if;
  end if;
  if tg_op = 'UPDATE' and new.shopper_id is not null then
    insert into public.shopper_property_access (shopper_id, property_id)
    values (new.shopper_id, new.property_id)
    on conflict (shopper_id, property_id) do nothing;
  end if;
  return coalesce(new, old);
end;
$$;

-- Focus area sync: on visit_focus_areas insert/delete, keep shopper_focus_area_access in sync
create or replace function public.sync_shopper_focus_area_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shopper_id uuid;
begin
  if tg_op = 'INSERT' then
    select shopper_id into v_shopper_id from public.visits where id = new.visit_id;
    if v_shopper_id is not null then
      insert into public.shopper_focus_area_access (shopper_id, focus_area_id)
      values (v_shopper_id, new.focus_area_id)
      on conflict (shopper_id, focus_area_id) do nothing;
    end if;
  elsif tg_op = 'DELETE' then
    select shopper_id into v_shopper_id from public.visits where id = old.visit_id;
    if v_shopper_id is not null then
      delete from public.shopper_focus_area_access sca
      where sca.shopper_id = v_shopper_id and sca.focus_area_id = old.focus_area_id
        and not exists (select 1 from public.visit_focus_areas vfa join public.visits v on v.id = vfa.visit_id where v.shopper_id = sca.shopper_id and vfa.focus_area_id = sca.focus_area_id);
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger visits_sync_shopper_property_access
  after insert or update or delete on public.visits
  for each row execute function public.sync_shopper_property_access();

create trigger visit_focus_areas_sync_shopper_focus_area_access
  after insert or delete on public.visit_focus_areas
  for each row execute function public.sync_shopper_focus_area_access();

-- Backfill cache from existing visits (run as definer so we can insert)
create or replace function public.backfill_shopper_access_caches()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.shopper_company_access (shopper_id, company_id)
  select distinct v.shopper_id, v.company_id from public.visits v where v.shopper_id is not null
  on conflict (shopper_id, company_id) do nothing;

  insert into public.shopper_property_access (shopper_id, property_id)
  select distinct v.shopper_id, v.property_id from public.visits v where v.shopper_id is not null
  on conflict (shopper_id, property_id) do nothing;

  insert into public.shopper_focus_area_access (shopper_id, focus_area_id)
  select distinct v.shopper_id, vfa.focus_area_id
  from public.visits v
  join public.visit_focus_areas vfa on vfa.visit_id = v.id
  where v.shopper_id is not null
  on conflict (shopper_id, focus_area_id) do nothing;
end;
$$;

select public.backfill_shopper_access_caches();

-- Policies on companies / company_properties / property_focus_areas use cache (no visits read)
create policy "Shoppers read companies for assigned visits"
  on public.companies for select
  using (
    exists (
      select 1 from public.shopper_company_access sca
      join public.shoppers s on s.id = sca.shopper_id
      where sca.company_id = companies.id and s.auth_user_id = auth.uid()
    )
  );

create policy "Shoppers read properties for assigned visits"
  on public.company_properties for select
  using (
    exists (
      select 1 from public.shopper_property_access spa
      join public.shoppers s on s.id = spa.shopper_id
      where spa.property_id = company_properties.id and s.auth_user_id = auth.uid()
    )
  );

create policy "Shoppers read focus areas for assigned visits"
  on public.property_focus_areas for select
  using (
    exists (
      select 1 from public.shopper_focus_area_access sfa
      join public.shoppers s on s.id = sfa.shopper_id
      where sfa.focus_area_id = property_focus_areas.id and s.auth_user_id = auth.uid()
    )
  );
