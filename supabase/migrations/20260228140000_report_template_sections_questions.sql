-- Report template sections and questions (like Google Forms). Super admins create/edit these.
-- When a visit is scheduled, sections/questions are COPIED into visit-specific tables so template changes do not affect existing visits.

create table if not exists public.report_template_sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.report_template_questions (
  id uuid primary key default gen_random_uuid(),
  template_section_id uuid not null references public.report_template_sections (id) on delete cascade,
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
  options jsonb, -- for single_choice/multi_choice: array of { value: string, label?: string }
  required boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists report_template_questions_section_idx
  on public.report_template_questions (template_section_id);

alter table public.report_template_sections enable row level security;
alter table public.report_template_questions enable row level security;

create policy "Super admins manage report template sections"
  on public.report_template_sections for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "Super admins manage report template questions"
  on public.report_template_questions for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Company members and shoppers need to read templates when scheduling or filling reports (templates are also copied at schedule time; this is for the schedule UI)
create policy "Authenticated read report template sections"
  on public.report_template_sections for select
  using (auth.role() = 'authenticated');

create policy "Authenticated read report template questions"
  on public.report_template_questions for select
  using (auth.role() = 'authenticated');
