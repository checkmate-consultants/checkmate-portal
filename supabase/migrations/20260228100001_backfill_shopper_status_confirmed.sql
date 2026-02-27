-- Backfill existing shoppers to confirmed so they are not treated as pending
-- (they were created before the status flow; new shoppers get default 'pending' from the previous migration)
update public.shoppers
set status = 'confirmed'
where status = 'pending';
