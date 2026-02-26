-- Self-signup shoppers: RPC to create a shoppers row for the current user (from auth metadata).
-- Called once after email confirmation when user signed up as shopper.
create or replace function public.create_shopper_self()
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  uid uuid;
  u_email text;
  u_name text;
  new_id uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Must be authenticated.';
  end if;

  if exists (select 1 from public.shoppers where auth_user_id = uid) then
    select id into new_id from public.shoppers where auth_user_id = uid limit 1;
    return new_id;
  end if;

  select email, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', '')
  into u_email, u_name
  from auth.users
  where id = uid;

  if u_email is null or length(trim(u_email)) = 0 then
    raise exception 'User email not found.';
  end if;

  insert into public.shoppers (auth_user_id, full_name, email, created_by)
  values (uid, coalesce(nullif(trim(u_name), ''), 'Shopper'), trim(u_email), uid)
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.create_shopper_self() to authenticated;

-- Shoppers can update their own row (full_name, email) for profile editing.
drop policy if exists "Shoppers update own row" on public.shoppers;
create policy "Shoppers update own row"
  on public.shoppers
  for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- Allow authenticated users to insert their own shopper row only via create_shopper_self (no direct insert).
-- So we do not add an insert policy for shoppers; the RPC does the insert with definer rights.
