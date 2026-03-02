-- Reviewer role: can see visits and report data only for assigned focus areas; can leave feedback on answers.

insert into public.roles (slug, name, description, is_system)
values
  ('reviewer', 'Reviewer', 'Can view visits and report answers for assigned focus areas and leave feedback.', true)
on conflict (slug) do update
set name = excluded.name, description = excluded.description;

-- Optional: permissions for reviewer (visits.read, report.read for assigned areas enforced in RLS)
insert into public.permissions (key, name, description)
values
  ('visits.read', 'View visits', 'View company visits.'),
  ('report.feedback', 'Leave report feedback', 'Add and reply to feedback on report answers.')
on conflict (key) do nothing;

insert into public.role_permissions (role_slug, permission_key)
select seed.role_slug, seed.permission_key
from (values
  ('reviewer', 'visits.read'),
  ('reviewer', 'report.feedback')
) as seed(role_slug, permission_key)
on conflict do nothing;

-- Assign reviewers to focus areas (per company). Focus areas belong to company properties.
create table if not exists public.reviewer_focus_areas (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  focus_area_id uuid not null references public.property_focus_areas (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (company_id, user_id, focus_area_id)
);

-- Focus area belongs to a property; property has company_id. So we need (property_id, focus_area_id) to check company.
-- Actually property_focus_areas has property_id; company_properties has (id, company_id). So focus_area -> property_focus_areas.property_id -> company_properties.id -> company_id.
-- So the FK "focus area belongs to company" is: focus_area_id in (select id from property_focus_areas pfa join company_properties cp on cp.id = pfa.property_id where cp.company_id = reviewer_focus_areas.company_id).
-- We can enforce that with a check or trigger. Simpler: add a unique constraint and let the app only insert focus_area_ids that belong to the company. Or use a trigger.
create or replace function public.reviewer_focus_area_company_check()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from public.property_focus_areas pfa
    join public.company_properties cp on cp.id = pfa.property_id
    where pfa.id = NEW.focus_area_id and cp.company_id = NEW.company_id
  ) then
    raise exception 'Focus area must belong to a property of the company.';
  end if;
  if not exists (
    select 1 from public.company_members m
    where m.company_id = NEW.company_id and m.user_id = NEW.user_id and m.role = 'reviewer'
  ) then
    raise exception 'User must be a reviewer of the company.';
  end if;
  return NEW;
end;
$$;

create trigger reviewer_focus_area_company_trigger
  before insert or update on public.reviewer_focus_areas
  for each row execute function public.reviewer_focus_area_company_check();

create index if not exists reviewer_focus_areas_user_company_idx
  on public.reviewer_focus_areas (user_id, company_id);

alter table public.reviewer_focus_areas enable row level security;

-- Only company admins can manage reviewer focus areas (for their company)
create policy "Company admins manage reviewer focus areas"
  on public.reviewer_focus_areas
  for all
  using (public.is_company_admin_for(company_id))
  with check (public.is_company_admin_for(company_id));

-- Reviewers can read their own assignments
create policy "Reviewers read own focus area assignments"
  on public.reviewer_focus_areas
  for select
  using (user_id = auth.uid());

-- Allow company_admin to insert/update company_members with role 'reviewer'
drop policy if exists "Company admins can insert company members" on public.company_members;
create policy "Company admins can insert company members"
  on public.company_members
  for insert
  with check (
    role in ('company_member', 'company_viewer', 'reviewer')
    and public.is_company_admin_for(company_id)
  );

drop policy if exists "Company admins can update company member roles" on public.company_members;
create policy "Company admins can update company member roles"
  on public.company_members
  for update
  using (public.is_company_admin_for(company_id))
  with check (
    role in ('company_member', 'company_viewer', 'reviewer')
    and public.is_company_admin_for(company_id)
  );

-- Helper: can current user (as company member) see this focus area on a visit?
-- Returns true if user is not a reviewer, or is a reviewer assigned to this focus area for the visit's company.
create or replace function public.company_member_can_see_focus_area(
  p_visit_id uuid,
  p_focus_area_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.visits v
    join public.company_members m on m.company_id = v.company_id and m.user_id = auth.uid()
    where v.id = p_visit_id
      and (
        m.role <> 'reviewer'
        or exists (
          select 1 from public.reviewer_focus_areas rfa
          where rfa.company_id = v.company_id
            and rfa.user_id = auth.uid()
            and rfa.focus_area_id = p_focus_area_id
        )
      )
  );
$$;

grant execute on function public.company_member_can_see_focus_area(uuid, uuid) to authenticated;
grant execute on function public.company_member_can_see_focus_area(uuid, uuid) to service_role;

-- Restrict visit_report_sections: reviewers only see rows for their assigned focus areas
drop policy if exists "Company members read visit report sections" on public.visit_report_sections;
create policy "Company members read visit report sections"
  on public.visit_report_sections
  for select
  using (
    public.company_member_can_see_focus_area(visit_id, focus_area_id)
    or exists (
      select 1 from public.visits v
      join public.shoppers s on s.id = v.shopper_id
      where v.id = visit_report_sections.visit_id and s.auth_user_id = auth.uid()
    )
    or public.is_super_admin()
  );

-- Same for visit_report_questions (via section's visit_id and focus_area_id)
drop policy if exists "Company members read visit report questions" on public.visit_report_questions;
create policy "Company members read visit report questions"
  on public.visit_report_questions
  for select
  using (
    exists (
      select 1 from public.visit_report_sections vrs
      where vrs.id = visit_report_questions.visit_report_section_id
        and (
          public.company_member_can_see_focus_area(vrs.visit_id, vrs.focus_area_id)
          or public.is_super_admin()
        )
    )
    or exists (
      select 1 from public.visit_report_sections vrs
      join public.visits v on v.id = vrs.visit_id
      join public.shoppers s on s.id = v.shopper_id
      where vrs.id = visit_report_questions.visit_report_section_id and s.auth_user_id = auth.uid()
    )
  );

-- Same for visit_report_answers
drop policy if exists "Company members read visit report answers" on public.visit_report_answers;
create policy "Company members read visit report answers"
  on public.visit_report_answers
  for select
  using (
    public.company_member_can_see_focus_area(visit_id, focus_area_id)
    or exists (
      select 1 from public.visits v
      join public.shoppers s on s.id = v.shopper_id
      where v.id = visit_report_answers.visit_id and s.auth_user_id = auth.uid()
    )
    or public.is_super_admin()
  );

-- visit_focus_area_reports: reviewers only see rows for their assigned focus areas
drop policy if exists "Company members read visit reports" on public.visit_focus_area_reports;
create policy "Company members read visit reports"
  on public.visit_focus_area_reports
  for select
  using (
    public.company_member_can_see_focus_area(visit_id, focus_area_id)
  );
