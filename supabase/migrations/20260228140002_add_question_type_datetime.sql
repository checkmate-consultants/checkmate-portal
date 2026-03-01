-- Allow 'datetime' as a question_type in report template and visit report questions.

alter table public.report_template_questions
  drop constraint if exists report_template_questions_question_type_check;

alter table public.report_template_questions
  add constraint report_template_questions_question_type_check
  check (question_type in (
    'short_text',
    'long_text',
    'number',
    'single_choice',
    'multi_choice',
    'date',
    'datetime',
    'rating'
  ));

alter table public.visit_report_questions
  drop constraint if exists visit_report_questions_question_type_check;

alter table public.visit_report_questions
  add constraint visit_report_questions_question_type_check
  check (question_type in (
    'short_text',
    'long_text',
    'number',
    'single_choice',
    'multi_choice',
    'date',
    'datetime',
    'rating'
  ));
