-- Companies created at signup (by trigger) start inactive; activated when user confirms email.
alter table public.companies
  add column if not exists is_active boolean not null default true;


-- Function called when a new auth user is inserted: create inactive company + membership if pending_company_name in metadata
create or replace function public.handle_new_user_company_signup()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  pending_name text;
  new_company_id uuid;
begin
  pending_name := trim(coalesce(NEW.raw_user_meta_data->>'pending_company_name', ''));
  if length(pending_name) < 2 then
    return NEW;
  end if;

  -- User already has a company (e.g. re-run or edge case)
  if exists (select 1 from public.company_members where user_id = NEW.id) then
    return NEW;
  end if;

  insert into public.companies (name, created_by, is_active)
  values (pending_name, NEW.id, false)
  returning id into new_company_id;

  insert into public.company_members (company_id, user_id, role)
  values (new_company_id, NEW.id, 'company_admin');

  perform public.seed_company_portfolio(new_company_id);

  return NEW;
end;
$$;

-- Trigger on auth.users: after insert, create company when pending_company_name is set
drop trigger if exists on_auth_user_created_company on auth.users;
create trigger on_auth_user_created_company
  after insert on auth.users
  for each row
  execute function public.handle_new_user_company_signup();

-- Activate company when user confirms email
create or replace function public.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if OLD.email_confirmed_at is distinct from NEW.email_confirmed_at
     and NEW.email_confirmed_at is not null then
    update public.companies
    set is_active = true
    where created_by = NEW.id and is_active = false;
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update on auth.users
  for each row
  execute function public.handle_user_email_confirmed();
