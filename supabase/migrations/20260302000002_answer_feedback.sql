-- Comment threads on report answers (like Google Docs comments). One row per comment; parent_id null = top-level, else reply.

create table if not exists public.answer_feedback (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits (id) on delete cascade,
  focus_area_id uuid not null references public.property_focus_areas (id) on delete cascade,
  question_id uuid not null references public.visit_report_questions (id) on delete cascade,
  parent_id uuid references public.answer_feedback (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists answer_feedback_visit_focus_question_idx
  on public.answer_feedback (visit_id, focus_area_id, question_id);
create index if not exists answer_feedback_parent_idx
  on public.answer_feedback (parent_id);
create index if not exists answer_feedback_author_idx
  on public.answer_feedback (author_id);

alter table public.answer_feedback enable row level security;

-- Super admins full access
create policy "Super admins manage answer feedback"
  on public.answer_feedback
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Company members (including reviewers for their focus areas) can read feedback on answers they can see
create policy "Company members read answer feedback"
  on public.answer_feedback
  for select
  using (
    public.company_member_can_see_focus_area(visit_id, focus_area_id)
  );

-- Company members (and reviewers for their focus areas) can insert feedback (top-level or reply)
create policy "Company members insert answer feedback"
  on public.answer_feedback
  for insert
  with check (
    author_id = auth.uid()
    and public.company_member_can_see_focus_area(visit_id, focus_area_id)
  );

-- Authors can update/delete their own comments (optional: allow edit within time window in app)
create policy "Authors update own answer feedback"
  on public.answer_feedback
  for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "Authors delete own answer feedback"
  on public.answer_feedback
  for delete
  using (author_id = auth.uid());
