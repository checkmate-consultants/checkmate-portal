-- Shopper status: pending (incomplete info) | under_review (submitted, awaiting admin) | confirmed (can be selected for visits)
alter table public.shoppers
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'under_review', 'confirmed'));

-- Personal info (submitted by shopper)
alter table public.shoppers add column if not exists date_of_birth date;
alter table public.shoppers add column if not exists gender text;
alter table public.shoppers add column if not exists nationalities text[] default '{}';
alter table public.shoppers add column if not exists location_country text;
alter table public.shoppers add column if not exists location_city text;
alter table public.shoppers add column if not exists location_lat double precision;
alter table public.shoppers add column if not exists location_lng double precision;
alter table public.shoppers add column if not exists resident_visa text; -- 'citizen' | 'yes' | 'no'
alter table public.shoppers add column if not exists phone text;
alter table public.shoppers add column if not exists native_language text;
alter table public.shoppers add column if not exists languages_spoken jsonb default '[]'; -- [{ "language": "", "fluency": "" }]
alter table public.shoppers add column if not exists marital_status text;
alter table public.shoppers add column if not exists children jsonb default '[]'; -- [{ "date_of_birth": "YYYY-MM-DD" }]
alter table public.shoppers add column if not exists accessibility_needs boolean default false;
alter table public.shoppers add column if not exists accessibility_notes text;
alter table public.shoppers add column if not exists info_submitted_at timestamptz;

-- Shoppers can update their own row including new fields (still only their own row)
-- Existing "Shoppers update own row" policy already allows update; no change needed.

-- Index for super admin filtering by status (e.g. confirmed only for visits)
create index if not exists idx_shoppers_status on public.shoppers (status);
