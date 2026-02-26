-- Allow companies to exist without an owner (created_by nullable).
-- Super admins can create companies with no user owning them.
alter table public.companies
  alter column created_by drop not null;

-- RPC: super admins create a company with no owner. Company is active immediately.
create or replace function public.create_company_as_super_admin(company_name text)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  new_company_id uuid;
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins can create companies without an owner.';
  end if;

  if company_name is null or length(trim(company_name)) < 2 then
    raise exception 'Company name must be at least 2 characters.';
  end if;

  insert into public.companies (name, created_by, is_active)
  values (trim(company_name), null, true)
  returning id into new_company_id;

  perform public.seed_company_portfolio(new_company_id);

  return new_company_id;
end;
$$;

grant execute on function public.create_company_as_super_admin(text) to authenticated;
