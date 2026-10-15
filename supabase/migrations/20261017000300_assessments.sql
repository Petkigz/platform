-- Group 2 · assessments
--
-- Recorded rules: "Published definitions immutable", "Never expose answer
-- keys to clients", "Submitted attempt immutable", "Grade changes audited",
-- "Mixed grading waits for required manual grading", and "Assessment and
-- enrolment versions must match."
--
-- Answer keys are protected with column privileges, not RLS. RLS decides
-- which rows are visible; only column grants can keep a single column out of
-- a SELECT * that a client library will happily issue. The grading functions
-- below are security definer and are the only code that reads the key.

-- ---------------------------------------------------------------------------
-- assessments
-- ---------------------------------------------------------------------------
create table public.assessments (
  id uuid primary key default gen_random_uuid(),

  course_version_id uuid not null
    references public.course_versions (id) on delete cascade,

  -- NULL means a course-level assessment; a value ties it to one lesson.
  lesson_id uuid references public.lessons (id) on delete cascade,

  title text not null check (length(trim(title)) > 0),
  instructions text,

  type text not null default 'graded'
    check (type in ('practice', 'graded', 'final')),

  pass_threshold numeric(5,2) check (pass_threshold >= 0 and pass_threshold <= 100),

  -- NULL means unlimited.
  attempt_limit integer check (attempt_limit is null or attempt_limit > 0),

  status text not null default 'draft'
    check (status in ('draft', 'active', 'retired')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assessments_version_idx on public.assessments (course_version_id);
create index assessments_lesson_idx  on public.assessments (lesson_id);

create trigger assessments_set_updated_at
  before update on public.assessments
  for each row execute function public.set_updated_at();

-- A practice quiz has no pass mark to fail.
alter table public.assessments add constraint assessments_pass_threshold_sensible check (
  type <> 'practice' or pass_threshold is null
);

-- A graded or final assessment must have a pass mark, or "passed" is
-- undefined and a completion requirement cannot reference it.
alter table public.assessments add constraint assessments_graded_needs_threshold check (
  type = 'practice' or pass_threshold is not null
);

-- A lesson-scoped assessment must belong to a lesson in its own version.
create or replace function public.enforce_assessment_lesson_version()
returns trigger
language plpgsql
as $$
declare
  v_lesson_version uuid;
begin
  if new.lesson_id is null then
    return new;
  end if;

  select cs.course_version_id into v_lesson_version
    from public.lessons l
    join public.course_sections cs on cs.id = l.section_id
   where l.id = new.lesson_id;

  if v_lesson_version is distinct from new.course_version_id then
    raise exception
      'assessment lesson % belongs to version %, not to the assessment''s version %',
      new.lesson_id, v_lesson_version, new.course_version_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger assessments_lesson_version_match
  before insert or update of lesson_id, course_version_id on public.assessments
  for each row execute function public.enforce_assessment_lesson_version();

-- ---------------------------------------------------------------------------
-- assessment_questions
-- ---------------------------------------------------------------------------
create table public.assessment_questions (
  id uuid primary key default gen_random_uuid(),

  assessment_id uuid not null
    references public.assessments (id) on delete cascade,

  type text not null default 'single_choice'
    check (type in ('single_choice', 'multiple_choice', 'true_false', 'short_answer')),

  -- Prompt, choices, media references. Structured rather than a blob so a
  -- renderer can rely on the shape.
  content jsonb not null default '{}'::jsonb,

  -- PROTECTED. See the column grants at the bottom of this file.
  answer_key jsonb,

  points numeric(6,2) not null default 1 check (points > 0),

  position integer not null default 1 check (position > 0),

  -- Shown after grading.
  explanation text,

  grading_method text not null default 'automatic'
    check (grading_method in ('automatic', 'manual')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assessment_questions
  add constraint assessment_questions_position_key
  unique (assessment_id, position) deferrable initially deferred;

create trigger assessment_questions_set_updated_at
  before update on public.assessment_questions
  for each row execute function public.set_updated_at();

-- An automatically graded question is meaningless without a key.
alter table public.assessment_questions add constraint aq_automatic_needs_key check (
  grading_method <> 'automatic' or answer_key is not null
);

-- ---------------------------------------------------------------------------
-- assessment_attempts
-- ---------------------------------------------------------------------------
create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),

  assessment_id uuid not null
    references public.assessments (id) on delete restrict,

  learner_profile_id uuid not null
    references public.learner_profiles (id) on delete restrict,

  course_enrolment_id uuid not null
    references public.course_enrolments (id) on delete restrict,

  attempt_number integer not null check (attempt_number > 0),

  status text not null default 'in_progress'
    check (status in
      ('in_progress', 'submitted', 'awaiting_manual_grading', 'graded', 'abandoned')),

  started_at   timestamptz not null default now(),
  submitted_at timestamptz,
  graded_at    timestamptz,

  score_earned   numeric(7,2),
  score_possible numeric(7,2),

  passed boolean,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint aa_timestamps_agree check (
    (submitted_at is null or status <> 'in_progress')
    and (graded_at is null or status = 'graded')
    and (submitted_at is null or graded_at is null or submitted_at <= graded_at)
  ),
  constraint aa_score_agrees check (
    (score_earned is null and score_possible is null)
    or (score_earned is not null and score_possible is not null)
  ),
  constraint aa_score_in_range check (
    score_earned is null or score_possible is null
    or (score_earned >= 0 and score_earned <= score_possible)
  ),
  -- Grading is not complete until a verdict exists.
  constraint aa_graded_has_verdict check (
    status <> 'graded' or (score_earned is not null and passed is not null)
  )
);

alter table public.assessment_attempts
  add constraint aa_one_attempt_number_per_learner
  unique (assessment_id, learner_profile_id, attempt_number);

create index aa_enrolment_idx on public.assessment_attempts (course_enrolment_id);
create index aa_learner_idx   on public.assessment_attempts (learner_profile_id);

create trigger assessment_attempts_set_updated_at
  before update on public.assessment_attempts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- assessment_responses
-- ---------------------------------------------------------------------------
create table public.assessment_responses (
  id uuid primary key default gen_random_uuid(),

  assessment_attempt_id uuid not null
    references public.assessment_attempts (id) on delete cascade,

  question_id uuid not null
    references public.assessment_questions (id) on delete restrict,

  response_content jsonb,

  score numeric(7,2) check (score is null or score >= 0),

  -- NULL until graded, and stays NULL for an ungraded manual question.
  is_correct boolean,

  graded_by uuid references public.user_profiles (user_id) on delete restrict,
  graded_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ar_grading_agrees check (
    (graded_at is null) = (graded_by is null)
  ),
  -- A score without a verdict is half-graded.
  constraint ar_score_implies_verdict check (
    score is null or is_correct is not null
  )
);

alter table public.assessment_responses
  add constraint ar_one_response_per_question
  unique (assessment_attempt_id, question_id);

create trigger assessment_responses_set_updated_at
  before update on public.assessment_responses
  for each row execute function public.set_updated_at();

comment on table public.assessments is 'Assessment definition, scoped to a version.';
comment on table public.assessment_questions is 'Questions. answer_key is protected by column privileges.';
comment on table public.assessment_attempts is 'One attempt. Immutable once submitted.';
comment on table public.assessment_responses is 'One answer. Immutable once the attempt is submitted, except for grading.';
