create table if not exists public.permissions (
  key text primary key,
  name text not null,
  description text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.roles (
  slug text primary key,
  name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.role_permissions (
  role_slug text not null references public.roles (slug) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (role_slug, permission_key)
);

insert into public.permissions (key, name, description)
values
  ('company.manage', 'Manage company profile', 'Update company profile details and global settings.'),
  ('members.manage', 'Manage members', 'Invite, update, or remove company members.'),
  ('properties.read', 'View properties', 'Read company properties and their focus areas.'),
  ('properties.write', 'Manage properties', 'Create or update company properties.'),
  ('focus_areas.write', 'Manage focus areas', 'Create or update property focus areas.')
on conflict (key) do nothing;

insert into public.roles (slug, name, description, is_system)
values
  ('company_admin', 'Company admin', 'Full control over the company workspace.', true),
  ('company_member', 'Company member', 'Manage operational data for the company.', true),
  ('company_viewer', 'Company viewer', 'Read-only visibility into company data.', true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description;

insert into public.role_permissions (role_slug, permission_key)
select seed.role_slug, seed.permission_key
from (
  values
    ('company_admin', 'company.manage'),
    ('company_admin', 'members.manage'),
    ('company_admin', 'properties.read'),
    ('company_admin', 'properties.write'),
    ('company_admin', 'focus_areas.write'),
    ('company_member', 'properties.read'),
    ('company_member', 'properties.write'),
    ('company_member', 'focus_areas.write'),
    ('company_viewer', 'properties.read')
) as seed(role_slug, permission_key)
on conflict do nothing;

alter table public.company_members
  drop constraint if exists company_members_role_check;

update public.company_members
set role = case
  when role in ('owner', 'admin') then 'company_admin'
  when role = 'member' then 'company_member'
  else role
end;

alter table public.company_members
  alter column role set default 'company_admin';

alter table public.company_members
  add constraint company_members_role_fkey
    foreign key (role) references public.roles (slug) on delete restrict;

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
  values (new_company_id, current_user_id, 'company_admin');

  perform public.seed_company_portfolio(new_company_id);

  return new_company_id;
end;
$$;

grant execute on function public.create_company_with_owner(text) to authenticated;


