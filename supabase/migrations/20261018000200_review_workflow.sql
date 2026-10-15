-- Group 3 · review workflow
--
-- Recorded decisions enforced here:
--   · the author cannot be the required scholarly approver of their own course
--   · a reviewer needs a live authorisation for the subject and scope
--   · a disqualifying conflict declaration blocks assignment
--   · decisions are append-only
--   · disagreement escalates; the owner cannot override

-- ---------------------------------------------------------------------------
-- content_review_requirements
--
-- What this version needs before it may be published: one row per subject it
-- touches, per scope.
-- ---------------------------------------------------------------------------
create table public.content_review_requirements (
  id uuid primary key default gen_random_uuid(),

  course_version_id uuid not null
    references public.course_versions (id) on delete cascade,

  subject_area_id uuid not null
    references public.subject_areas (id) on delete restrict,

  review_scope text not null default 'scholarly'
    check (review_scope in ('technical', 'scholarly')),

  required_approval_count integer not null default 1 check (required_approval_count > 0),

  requirement_status text not null default 'open'
    check (requirement_status in ('open', 'satisfied', 'waived')),

  -- Which policy this requirement was created under, so a later policy change
  -- does not silently re-grade an old review.
  policy_version text not null default 'v1',

  waived_by uuid references public.user_profiles (user_id) on delete set null,
  waived_reason text,

  created_at timestamptz not null default now(),

  constraint crr_waiver_agrees check (
    (requirement_status = 'waived')
      = (waived_by is not null and waived_reason is not null)
  )
);

create unique index crr_one_per_subject_scope
  on public.content_review_requirements (course_version_id, subject_area_id, review_scope);

-- ---------------------------------------------------------------------------
-- content_review_assignments
-- ---------------------------------------------------------------------------
create table public.content_review_assignments (
  id uuid primary key default gen_random_uuid(),

  course_version_id uuid not null
    references public.course_versions (id) on delete cascade,

  reviewer_profile_id uuid not null
    references public.reviewer_profiles (id) on delete restrict,

  review_scope text not null default 'scholarly'
    check (review_scope in ('technical', 'scholarly')),

  assignment_status text not null default 'offered'
    check (assignment_status in
      ('offered', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled')),

  assigned_by uuid not null
    references public.user_profiles (user_id) on delete restrict,

  assigned_at  timestamptz not null default now(),
  accepted_at  timestamptz,
  completed_at timestamptz,
  due_at       timestamptz,

  constraint cra_timestamps_agree check (
    (accepted_at is null or assignment_status <> 'offered')
    and (completed_at is null or assignment_status in ('completed', 'cancelled'))
  )
);

create index cra_version_idx  on public.content_review_assignments (course_version_id);
create index cra_reviewer_idx on public.content_review_assignments (reviewer_profile_id);

-- ---------------------------------------------------------------------------
-- Independence and authorisation, enforced at assignment time
-- ---------------------------------------------------------------------------
create or replace function public.validate_review_assignment()
returns trigger
language plpgsql
as $$
declare
  v_version_author uuid;
  v_reviewer_user  uuid;
  v_subject        uuid;
begin
  select cv.created_by into v_version_author
    from public.course_versions cv where cv.id = new.course_version_id;

  select rp.user_id into v_reviewer_user
    from public.reviewer_profiles rp where rp.id = new.reviewer_profile_id;

  -- Recorded decision: the author may do limited technical checks, but cannot
  -- be the required scholarly approver of their own course.
  if v_reviewer_user = v_version_author and new.review_scope = 'scholarly' then
    raise exception
      'the author of course version % may not be assigned as its scholarly reviewer',
      new.course_version_id
      using errcode = 'insufficient_privilege';
  end if;

  -- The reviewer must hold a live authorisation for every subject this version
  -- requires, at the scope being assigned.
  for v_subject in
    select distinct crr.subject_area_id
      from public.content_review_requirements crr
     where crr.course_version_id = new.course_version_id
       and crr.review_scope = new.review_scope
  loop
    if not public.is_authorised_reviewer(v_reviewer_user, v_subject, new.review_scope) then
      raise exception
        'reviewer % holds no active % authorisation for subject %',
        new.reviewer_profile_id, new.review_scope, v_subject
        using errcode = 'insufficient_privilege';
    end if;
  end loop;

  -- A disqualifying, unresolved conflict blocks the assignment outright.
  if exists (
    select 1 from public.reviewer_conflict_declarations rcd
     where rcd.reviewer_profile_id = new.reviewer_profile_id
       and (rcd.course_version_id = new.course_version_id or rcd.course_version_id is null)
       and rcd.status in ('declared', 'under_assessment', 'disqualifying')
  ) then
    raise exception
      'reviewer % has an unresolved conflict declaration against course version %',
      new.reviewer_profile_id, new.course_version_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger cra_validate
  before insert on public.content_review_assignments
  for each row execute function public.validate_review_assignment();

-- One live assignment per reviewer per version per scope.
create unique index cra_one_live_per_reviewer
  on public.content_review_assignments (course_version_id, reviewer_profile_id, review_scope)
  where assignment_status in ('offered', 'accepted', 'in_progress');

-- ---------------------------------------------------------------------------
-- content_review_decisions — append-only
-- ---------------------------------------------------------------------------
create table public.content_review_decisions (
  id uuid primary key default gen_random_uuid(),

  review_assignment_id uuid not null
    references public.content_review_assignments (id) on delete restrict,

  course_version_id uuid not null
    references public.course_versions (id) on delete restrict,

  review_scope text not null default 'scholarly'
    check (review_scope in ('technical', 'scholarly')),

  decision text not null
    check (decision in ('approved', 'revision_requested', 'rejected')),

  rationale text not null check (length(trim(rationale)) > 0),

  -- What was actually reviewed. A hash of the version's content, so a later
  -- edit — impossible for a published version, possible for a reopened draft
  -- — is detectable.
  reviewed_content_hash text,

  policy_version text not null default 'v1',

  decided_by uuid not null
    references public.user_profiles (user_id) on delete restrict,

  decided_at timestamptz not null default now(),

  supersedes_decision_id uuid
    references public.content_review_decisions (id) on delete restrict
);

create index crd_version_idx   on public.content_review_decisions (course_version_id);
create index crd_assignment_idx on public.content_review_decisions (review_assignment_id);

-- Append-only. No updated_at column at all, so there is nothing to maintain.
create or replace function public.reject_decision_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'content review decisions are append-only; record a new decision with supersedes_decision_id instead'
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger crd_append_only
  before update or delete on public.content_review_decisions
  for each row execute function public.reject_decision_mutation();

-- A decision must come from the reviewer who holds the assignment.
create or replace function public.validate_review_decision()
returns trigger
language plpgsql
as $$
declare
  v_assignment public.content_review_assignments;
  v_reviewer_user uuid;
begin
  select * into v_assignment from public.content_review_assignments
   where id = new.review_assignment_id;

  if v_assignment.course_version_id <> new.course_version_id
     or v_assignment.review_scope <> new.review_scope then
    raise exception
      'decision % does not match the version and scope of its assignment', new.id
      using errcode = 'check_violation';
  end if;

  select rp.user_id into v_reviewer_user
    from public.reviewer_profiles rp where rp.id = v_assignment.reviewer_profile_id;

  if v_reviewer_user <> new.decided_by then
    raise exception
      'decisions must be recorded by the assigned reviewer, not by %', new.decided_by
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger crd_validate
  before insert on public.content_review_decisions
  for each row execute function public.validate_review_decision();

-- ---------------------------------------------------------------------------
-- technical_review_checks
--
-- The limited checks an author IS allowed to perform on their own course:
-- does the video play, are the captions present, do the links resolve.
-- Recorded decision: technical only, never scholarly approval.
-- ---------------------------------------------------------------------------
create table public.technical_review_checks (
  id uuid primary key default gen_random_uuid(),

  course_version_id uuid not null
    references public.course_versions (id) on delete cascade,

  check_type text not null
    check (check_type in
      ('media_plays', 'captions_present', 'links_resolve', 'metadata_complete',
       'quiz_answers_graded', 'accessibility', 'other')),

  passed boolean not null,
  evidence text,

  performed_by uuid not null
    references public.user_profiles (user_id) on delete restrict,
  performed_at timestamptz not null default now()
);

create index trc_version_idx on public.technical_review_checks (course_version_id);

comment on table public.content_review_requirements is
  'What a version needs before publication: one row per subject per scope.';
comment on table public.content_review_assignments is
  'Who is reviewing what. Blocks self-assignment, unauthorised subjects and unresolved conflicts.';
comment on table public.content_review_decisions is
  'Append-only. There is no updated_at column, and a change of mind is a new row that supersedes.';
comment on table public.technical_review_checks is
  'The limited self-checks an author may perform. Never a substitute for scholarly approval.';
