-- Snapshot of report template sections/questions at visit schedule time. No FK to templates so template edits do not affect visits.

create table if not exists public.visit_report_sections (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits (id) on delete cascade,
  focus_area_id uuid not null references public.property_focus_areas (id) on delete cascade,
  section_name text not null,
  display_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.visit_report_questions (
  id uuid primary key default gen_random_uuid(),
  visit_report_section_id uuid not null references public.visit_report_sections (id) on delete cascade,
  label text not null,
  question_type text not null check (question_type in (
    'short_text',
    'long_text',
    'number',
    'single_choice',
    'multi_choice',
    'date',
    'rating'
  )),
  options jsonb,
  required boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.visit_report_answers (
  visit_id uuid not null references public.visits (id) on delete cascade,
  focus_area_id uuid not null references public.property_focus_areas (id) on delete cascade,
  question_id uuid not null references public.visit_report_questions (id) on delete cascade,
  value text, -- short_text, long_text, number, date, rating; single_choice: one value; multi_choice: json array string
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (visit_id, focus_area_id, question_id)
);

create index if not exists visit_report_sections_visit_focus_idx
  on public.visit_report_sections (visit_id, focus_area_id);
create index if not exists visit_report_questions_section_idx
  on public.visit_report_questions (visit_report_section_id);
create index if not exists visit_report_answers_visit_focus_idx
  on public.visit_report_answers (visit_id, focus_area_id);

alter table public.visit_report_sections enable row level security;
alter table public.visit_report_questions enable row level security;
alter table public.visit_report_answers enable row level security;

-- Super admins full access to visit report structure and answers
create policy "Super admins manage visit report sections"
  on public.visit_report_sections for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "Super admins manage visit report questions"
  on public.visit_report_questions for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "Super admins manage visit report answers"
  on public.visit_report_answers for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Company members read visit report data for their company's visits
create policy "Company members read visit report sections"
  on public.visit_report_sections for select
  using (
    exists (
      select 1 from public.visits v
      join public.company_members m on m.company_id = v.company_id
      where v.id = visit_report_sections.visit_id and m.user_id = auth.uid()
    )
  );

create policy "Company members read visit report questions"
  on public.visit_report_questions for select
  using (
    exists (
      select 1 from public.visit_report_sections vrs
      join public.visits v on v.id = vrs.visit_id
      join public.company_members m on m.company_id = v.company_id
      where vrs.id = visit_report_questions.visit_report_section_id and m.user_id = auth.uid()
    )
  );

create policy "Company members read visit report answers"
  on public.visit_report_answers for select
  using (
    exists (
      select 1 from public.visits v
      join public.company_members m on m.company_id = v.company_id
      where v.id = visit_report_answers.visit_id and m.user_id = auth.uid()
    )
  );

-- Shoppers read and update visit report sections/questions/answers for their assigned visits
create policy "Shoppers read visit report sections for assigned"
  on public.visit_report_sections for select
  using (
    exists (
      select 1 from public.visits v
      join public.shoppers s on s.id = v.shopper_id
      where v.id = visit_report_sections.visit_id and s.auth_user_id = auth.uid()
    )
  );

create policy "Shoppers read visit report questions for assigned"
  on public.visit_report_questions for select
  using (
    exists (
      select 1 from public.visit_report_sections vrs
      join public.visits v on v.id = vrs.visit_id
      join public.shoppers s on s.id = v.shopper_id
      where vrs.id = visit_report_questions.visit_report_section_id and s.auth_user_id = auth.uid()
    )
  );

create policy "Shoppers read visit report answers for assigned"
  on public.visit_report_answers for select
  using (
    exists (
      select 1 from public.visits v
      join public.shoppers s on s.id = v.shopper_id
      where v.id = visit_report_answers.visit_id and s.auth_user_id = auth.uid()
    )
  );

create policy "Shoppers insert visit report answers for assigned"
  on public.visit_report_answers for insert
  with check (
    exists (
      select 1 from public.visits v
      join public.shoppers s on s.id = v.shopper_id
      where v.id = visit_report_answers.visit_id and s.auth_user_id = auth.uid()
    )
  );

create policy "Shoppers update visit report answers for assigned"
  on public.visit_report_answers for update
  using (
    exists (
      select 1 from public.visits v
      join public.shoppers s on s.id = v.shopper_id
      where v.id = visit_report_answers.visit_id and s.auth_user_id = auth.uid()
    )
  );
