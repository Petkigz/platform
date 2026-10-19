-- Standalone written/file assignments, distinct from quiz questions.
--
-- The current assessment system can manually grade a `short_answer` response,
-- but it is still a question in a quiz: assessments live inside an immutable
-- course version, the marking RPC accepts a score and a verdict, and there is
-- nowhere to put teacher feedback or a worksheet/recitation file. A teacher
-- needs to be able to issue marked work *after* a course is published, without
-- cutting a new curriculum version and sending it back through scholarly review.
--
-- The author confirmed both ways of learning:
--   * a self-paced assignment can be due N days after that learner's
--     `course_enrolments.enrolled_at`;
--   * a cohort assignment can have one absolute timestamp for the whole class.
--
-- A file is only a reference to a verified `media_assets` row. This migration
-- does not claim to transfer bytes or make a pending upload available. The
-- signed delivery path, byte scanning, retention policy and end-user UI remain
-- preconditions; `learning.assignments` stays off.

update public.platform_settings
   set description = 'Marked homework with deadlines, written/file submissions and teacher feedback — separate from quizzes',
       preconditions = 'Self-paced deadlines are relative to enrolment; cohort deadlines are absolute. The author and privileged staff mark. Late work is rejected by default and may be accepted per task. One submission per learner/task; no revision loop. The database accepts verified PDF/JPEG/PNG/WebP and AAC/MPEG/MP4/OGG/Opus/WAV files up to 25 MiB each, at most 10 per submission. Before enabling: connect trusted upload, byte verification/scanning, secure delivery and retention; finish cohort screens and review the late-join rule.'
 where key = 'learning.assignments';

update public.platform_settings
   set preconditions = 'Cohort data, version pinning, opt-in join/leave and private-roster rules are built. Teacher management and learner join screens are not. Current join window stays open after the start until the cohort ends; review that late-join rule before enabling. A learner/guardian opts in; the course author cannot silently add a learner. Roster visibility is limited to the author/staff and that learner’s family.'
 where key = 'learning.cohorts';

-- Needed for a composite FK below: an assignment's optional cohort must be the
-- cohort for that exact course and exact pinned version, not merely a class
-- whose id happened to be supplied by the caller.
alter table public.cohorts
  add constraint cohorts_id_course_version_key
  unique (id, course_id, course_version_id);

-- ---------------------------------------------------------------------------
-- course_assignments
-- ---------------------------------------------------------------------------

create table public.course_assignments (
  id uuid primary key default gen_random_uuid(),

  course_id uuid not null
    references public.courses (id) on delete restrict,

  course_version_id uuid not null,
  constraint course_assignments_version_belongs_to_course
    foreign key (course_id, course_version_id)
    references public.course_versions (course_id, id) on delete restrict,

  -- NULL = self-paced, offered to every eligible enrollee on this exact
  -- version. Non-NULL = a task for one dated cohort on that same version.
  cohort_id uuid,
  constraint course_assignments_cohort_matches_version
    foreign key (cohort_id, course_id, course_version_id)
    references public.cohorts (id, course_id, course_version_id) on delete restrict,

  title text not null check (length(trim(title)) between 1 and 200),
  instructions text not null default ''
    check (length(instructions) <= 10000),

  -- For self-paced work, the deadline is the enrolment timestamp plus this many
  -- calendar days. NULL means there is no deadline. Cohort assignments instead
  -- use `due_at`; the two clocks cannot both be set.
  due_after_days integer check (due_after_days is null or due_after_days > 0),
  due_at timestamptz,
  accept_late boolean not null default false,

  -- NULL means feedback-only marking. Otherwise the author can grade up to this
  -- number of points; the learner's score is stored on their submission.
  points_possible numeric(7,2)
    check (points_possible is null or points_possible > 0),

  status text not null default 'draft'
    check (status in ('draft', 'open', 'closed', 'cancelled')),

  created_by uuid not null
    references public.user_profiles (user_id) on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint course_assignments_clock_matches_scope check (
    (cohort_id is null and due_at is null)
    or (cohort_id is not null and due_after_days is null)
  )
);

create index course_assignments_course_status_idx
  on public.course_assignments (course_id, course_version_id, status)
  where deleted_at is null;
create index course_assignments_cohort_status_idx
  on public.course_assignments (cohort_id, status)
  where cohort_id is not null and deleted_at is null;

create trigger course_assignments_set_updated_at
  before update on public.course_assignments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- assignment_submissions
-- ---------------------------------------------------------------------------

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),

  assignment_id uuid not null
    references public.course_assignments (id) on delete restrict,

  learner_profile_id uuid not null
    references public.learner_profiles (id) on delete restrict,

  course_enrolment_id uuid not null
    references public.course_enrolments (id) on delete restrict,

  -- The actor who opened this draft (a parent may act for a child).
  created_by uuid not null
    references public.user_profiles (user_id) on delete restrict,

  -- The session actor who pressed Submit, separate from the learner whose work
  -- this is. NULL until the draft is submitted.
  submitted_by uuid references public.user_profiles (user_id) on delete restrict,

  body_text text not null default ''
    check (length(body_text) <= 10000),

  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'graded')),

  submitted_at timestamptz,
  is_late boolean,

  score_earned numeric(7,2) check (score_earned is null or score_earned >= 0),
  feedback text check (feedback is null or length(feedback) <= 5000),
  marked_by uuid references public.user_profiles (user_id) on delete restrict,
  marked_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint assignment_submissions_one_per_learner
    unique (assignment_id, learner_profile_id),
  constraint assignment_submissions_submit_actor_agrees check (
    (submitted_at is null) = (submitted_by is null)
  ),
  constraint assignment_submissions_mark_actor_agrees check (
    (marked_at is null) = (marked_by is null)
  ),
  constraint assignment_submissions_state_agrees check (
    case status
      when 'draft' then submitted_at is null and is_late is null
                        and marked_at is null and marked_by is null
                        and score_earned is null and feedback is null
      when 'submitted' then submitted_at is not null and is_late is not null
                           and marked_at is null and marked_by is null
                           and score_earned is null and feedback is null
      when 'graded' then submitted_at is not null and is_late is not null
                        and marked_at is not null and marked_by is not null
                        and (score_earned is not null or length(trim(coalesce(feedback, ''))) > 0)
    end
  )
);

create index assignment_submissions_learner_idx
  on public.assignment_submissions (learner_profile_id, status);
create index assignment_submissions_assignment_idx
  on public.assignment_submissions (assignment_id, status);

create trigger assignment_submissions_set_updated_at
  before update on public.assignment_submissions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- assignment_submission_assets
-- ---------------------------------------------------------------------------

create table public.assignment_submission_assets (
  id uuid primary key default gen_random_uuid(),

  submission_id uuid not null
    references public.assignment_submissions (id) on delete cascade,

  media_asset_id uuid not null unique
    references public.media_assets (id) on delete restrict,

  attached_by uuid not null
    references public.user_profiles (user_id) on delete restrict,

  position integer not null default 1 check (position > 0),
  created_at timestamptz not null default now(),

  constraint assignment_submission_assets_one_reference
    unique (submission_id, media_asset_id)
);

create index assignment_submission_assets_submission_idx
  on public.assignment_submission_assets (submission_id, position);

-- ---------------------------------------------------------------------------
-- Read predicates: learner/guardian, course author, or privileged staff.
-- ---------------------------------------------------------------------------

create or replace function public.learner_can_access_course_assignment(
  p_assignment_id uuid,
  p_learner_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.course_assignments a
      join public.course_enrolments ce
        on ce.course_id = a.course_id
       and ce.course_version_id = a.course_version_id
     where a.id = p_assignment_id
       and a.status = 'open'
       and a.deleted_at is null
       and ce.learner_profile_id = p_learner_profile_id
       and ce.status in ('active', 'completed')
       and ce.deleted_at is null
       and public.can_access_learner(p_learner_profile_id)
       and (
         a.cohort_id is null
         or exists (
           select 1
             from public.cohort_members cm
            where cm.cohort_id = a.cohort_id
              and cm.learner_profile_id = p_learner_profile_id
              and cm.status = 'active'
         )
       )
  );
$$;
revoke all on function public.learner_can_access_course_assignment(uuid, uuid) from public;

create or replace function public.can_read_course_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.course_assignments a
     where a.id = p_assignment_id
       and a.deleted_at is null
       and (
         a.created_by = public.current_user_id()
         or public.is_privileged(public.current_user_id())
         or exists (
           select 1
             from public.course_enrolments ce
            where ce.course_id = a.course_id
              and ce.course_version_id = a.course_version_id
              and ce.status in ('active', 'completed')
              and ce.deleted_at is null
              and public.learner_can_access_course_assignment(a.id, ce.learner_profile_id)
         )
         -- A submitted learner keeps access to the task and teacher feedback
         -- even if the cohort closes or the enrolment later ends.
         or exists (
           select 1
             from public.assignment_submissions s
            where s.assignment_id = a.id
              and public.can_access_learner(s.learner_profile_id)
         )
       )
  );
$$;
revoke all on function public.can_read_course_assignment(uuid) from public;
grant execute on function public.can_read_course_assignment(uuid) to authenticated;

create or replace function public.can_read_assignment_submission(p_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.assignment_submissions s
      join public.course_assignments a on a.id = s.assignment_id
     where s.id = p_submission_id
       and (
         public.can_access_learner(s.learner_profile_id)
         or a.created_by = public.current_user_id()
         or public.is_privileged(public.current_user_id())
       )
  );
$$;
revoke all on function public.can_read_assignment_submission(uuid) from public;
grant execute on function public.can_read_assignment_submission(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- create_course_assignment
-- ---------------------------------------------------------------------------

create or replace function public.create_course_assignment(
  p_course_version_id uuid,
  p_cohort_id uuid,
  p_title text,
  p_instructions text,
  p_due_after_days integer,
  p_due_at timestamptz,
  p_accept_late boolean,
  p_points_possible numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_course_id uuid;
  v_author uuid;
  v_course_status text;
  v_version_status text;
  v_cohort_status text;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_id uuid;
begin
  if v_actor is null then
    raise exception 'sign in to create an assignment' using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('learning.assignments', false) then
    raise exception 'assignments are not enabled (learning.assignments is off)' using errcode = 'check_violation';
  end if;

  if coalesce(length(trim(p_title)), 0) = 0 or length(trim(p_title)) > 200 then
    raise exception 'assignment title must be between 1 and 200 characters' using errcode = 'check_violation';
  end if;
  if length(coalesce(p_instructions, '')) > 10000 then
    raise exception 'assignment instructions cannot exceed 10000 characters' using errcode = 'check_violation';
  end if;
  if p_due_after_days is not null and p_due_after_days < 1 then
    raise exception 'a relative deadline must be at least one day after enrolment' using errcode = 'check_violation';
  end if;
  if p_accept_late is null then
    raise exception 'choose whether late work is accepted' using errcode = 'check_violation';
  end if;
  if p_points_possible is not null and p_points_possible <= 0 then
    raise exception 'points possible must be greater than zero' using errcode = 'check_violation';
  end if;
  if p_cohort_id is null and p_due_at is not null then
    raise exception 'self-paced work uses a relative deadline, not an absolute date' using errcode = 'check_violation';
  end if;
  if p_cohort_id is not null and p_due_after_days is not null then
    raise exception 'cohort work uses an absolute date, not a relative deadline' using errcode = 'check_violation';
  end if;

  select cv.course_id, cv.version_status into v_course_id, v_version_status
    from public.course_versions cv
   where cv.id = p_course_version_id;
  if not found then
    raise exception 'course version not found' using errcode = 'no_data_found';
  end if;

  select c.created_by, c.status into v_author, v_course_status
    from public.courses c
   where c.id = v_course_id and c.deleted_at is null;
  if not found then
    raise exception 'course not found' using errcode = 'no_data_found';
  end if;
  if v_author <> v_actor and not public.is_privileged(v_actor) then
    raise exception 'only the course author can create this assignment' using errcode = 'insufficient_privilege';
  end if;
  if v_course_status <> 'active' or v_version_status <> 'published' then
    raise exception 'an assignment needs an active course and a published version' using errcode = 'check_violation';
  end if;

  if p_cohort_id is not null then
    if not public.setting_bool('learning.cohorts', false) then
      raise exception 'cohort assignments need learning.cohorts enabled' using errcode = 'check_violation';
    end if;
    select c.status, c.starts_at, c.ends_at
      into v_cohort_status, v_starts_at, v_ends_at
      from public.cohorts c
     where c.id = p_cohort_id
       and c.course_id = v_course_id
       and c.course_version_id = p_course_version_id
       and c.deleted_at is null;
    if not found then
      raise exception 'cohort not found for this course version' using errcode = 'no_data_found';
    end if;
    if v_cohort_status <> 'open' then
      raise exception 'a cohort assignment needs an open cohort' using errcode = 'check_violation';
    end if;
    if p_due_at is not null and p_due_at < v_starts_at then
      raise exception 'the due date cannot be before the cohort starts' using errcode = 'check_violation';
    end if;
    if p_due_at is not null and v_ends_at is not null and p_due_at > v_ends_at then
      raise exception 'the due date cannot be after the cohort ends' using errcode = 'check_violation';
    end if;
  end if;

  insert into public.course_assignments
    (course_id, course_version_id, cohort_id, title, instructions,
     due_after_days, due_at, accept_late, points_possible, created_by)
  values
    (v_course_id, p_course_version_id, p_cohort_id, trim(p_title),
     coalesce(p_instructions, ''), p_due_after_days, p_due_at,
     p_accept_late, p_points_possible, v_actor)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'course_assignment.created', 'course_assignment', v_id,
          jsonb_build_object('course_id', v_course_id,
                             'course_version_id', p_course_version_id,
                             'cohort_id', p_cohort_id,
                             'due_after_days', p_due_after_days,
                             'due_at', p_due_at,
                             'accept_late', p_accept_late,
                             'points_possible', p_points_possible));
  return v_id;
end;
$$;
revoke all on function public.create_course_assignment(uuid, uuid, text, text, integer, timestamptz, boolean, numeric) from public;
grant execute on function public.create_course_assignment(uuid, uuid, text, text, integer, timestamptz, boolean, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- update_course_assignment_draft
-- ---------------------------------------------------------------------------

create or replace function public.update_course_assignment_draft(
  p_assignment_id uuid,
  p_title text,
  p_instructions text,
  p_due_after_days integer,
  p_due_at timestamptz,
  p_accept_late boolean,
  p_points_possible numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_course_id uuid;
  v_version_id uuid;
  v_cohort_id uuid;
  v_status text;
  v_author uuid;
  v_cohort_status text;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
begin
  if v_actor is null then
    raise exception 'sign in to edit an assignment' using errcode = 'insufficient_privilege';
  end if;

  select a.course_id, a.course_version_id, a.cohort_id, a.status, a.created_by
    into v_course_id, v_version_id, v_cohort_id, v_status, v_author
    from public.course_assignments a
   where a.id = p_assignment_id and a.deleted_at is null
   for update;
  if not found then
    raise exception 'assignment not found' using errcode = 'no_data_found';
  end if;
  if v_author <> v_actor and not public.is_privileged(v_actor) then
    raise exception 'only the course author can edit this assignment' using errcode = 'insufficient_privilege';
  end if;
  if v_status <> 'draft' then
    raise exception 'only a draft assignment can be edited' using errcode = 'check_violation';
  end if;

  if coalesce(length(trim(p_title)), 0) = 0 or length(trim(p_title)) > 200 then
    raise exception 'assignment title must be between 1 and 200 characters' using errcode = 'check_violation';
  end if;
  if length(coalesce(p_instructions, '')) > 10000 then
    raise exception 'assignment instructions cannot exceed 10000 characters' using errcode = 'check_violation';
  end if;
  if p_due_after_days is not null and p_due_after_days < 1 then
    raise exception 'a relative deadline must be at least one day after enrolment' using errcode = 'check_violation';
  end if;
  if p_accept_late is null then
    raise exception 'choose whether late work is accepted' using errcode = 'check_violation';
  end if;
  if p_points_possible is not null and p_points_possible <= 0 then
    raise exception 'points possible must be greater than zero' using errcode = 'check_violation';
  end if;
  if v_cohort_id is null and p_due_at is not null then
    raise exception 'self-paced work uses a relative deadline, not an absolute date' using errcode = 'check_violation';
  end if;
  if v_cohort_id is not null and p_due_after_days is not null then
    raise exception 'cohort work uses an absolute date, not a relative deadline' using errcode = 'check_violation';
  end if;

  if v_cohort_id is not null then
    if not public.setting_bool('learning.cohorts', false) then
      raise exception 'cohort assignments need learning.cohorts enabled' using errcode = 'check_violation';
    end if;
    select c.status, c.starts_at, c.ends_at
      into v_cohort_status, v_starts_at, v_ends_at
      from public.cohorts c
     where c.id = v_cohort_id and c.deleted_at is null;
    if not found or v_cohort_status <> 'open' then
      raise exception 'the assignment cohort is no longer open' using errcode = 'check_violation';
    end if;
    if p_due_at is not null and p_due_at < v_starts_at then
      raise exception 'the due date cannot be before the cohort starts' using errcode = 'check_violation';
    end if;
    if p_due_at is not null and v_ends_at is not null and p_due_at > v_ends_at then
      raise exception 'the due date cannot be after the cohort ends' using errcode = 'check_violation';
    end if;
  end if;

  update public.course_assignments
     set title = trim(p_title), instructions = coalesce(p_instructions, ''),
         due_after_days = p_due_after_days, due_at = p_due_at,
         accept_late = p_accept_late, points_possible = p_points_possible
   where id = p_assignment_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'course_assignment.updated', 'course_assignment', p_assignment_id,
          jsonb_build_object('due_after_days', p_due_after_days, 'due_at', p_due_at,
                             'accept_late', p_accept_late, 'points_possible', p_points_possible));
end;
$$;
revoke all on function public.update_course_assignment_draft(uuid, text, text, integer, timestamptz, boolean, numeric) from public;
grant execute on function public.update_course_assignment_draft(uuid, text, text, integer, timestamptz, boolean, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- set_course_assignment_status
-- ---------------------------------------------------------------------------

create or replace function public.set_course_assignment_status(p_assignment_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_course_id uuid;
  v_version_id uuid;
  v_cohort_id uuid;
  v_current text;
  v_author uuid;
  v_due_at timestamptz;
  v_accept_late boolean;
  v_ends_at timestamptz;
  v_course_status text;
  v_version_status text;
  v_cohort_status text;
begin
  if v_actor is null then
    raise exception 'sign in to change an assignment' using errcode = 'insufficient_privilege';
  end if;
  if p_status is null or p_status not in ('draft', 'open', 'closed', 'cancelled') then
    raise exception 'unknown assignment status' using errcode = 'check_violation';
  end if;

  select a.course_id, a.course_version_id, a.cohort_id, a.status,
         a.created_by, a.due_at, a.accept_late
    into v_course_id, v_version_id, v_cohort_id, v_current,
         v_author, v_due_at, v_accept_late
    from public.course_assignments a
   where a.id = p_assignment_id and a.deleted_at is null
   for update;
  if not found then
    raise exception 'assignment not found' using errcode = 'no_data_found';
  end if;
  if v_author <> v_actor and not public.is_privileged(v_actor) then
    raise exception 'only the course author can change this assignment' using errcode = 'insufficient_privilege';
  end if;
  if v_current = p_status then return; end if;

  if not (
    (v_current = 'draft' and p_status in ('open', 'cancelled'))
    or (v_current = 'open' and p_status in ('closed', 'cancelled'))
  ) then
    raise exception 'an assignment cannot move from % to %', v_current, p_status
      using errcode = 'check_violation';
  end if;

  if p_status = 'open' then
    if not public.setting_bool('learning.assignments', false) then
      raise exception 'assignments are not enabled (learning.assignments is off)' using errcode = 'check_violation';
    end if;
    select c.status, cv.version_status into v_course_status, v_version_status
      from public.courses c
      join public.course_versions cv on cv.course_id = c.id
     where c.id = v_course_id and cv.id = v_version_id and c.deleted_at is null;
    if not found or v_course_status <> 'active' or v_version_status <> 'published' then
      raise exception 'an assignment needs an active course and a published version' using errcode = 'check_violation';
    end if;
    if v_cohort_id is not null then
      if not public.setting_bool('learning.cohorts', false) then
        raise exception 'cohort assignments need learning.cohorts enabled' using errcode = 'check_violation';
      end if;
      select c.status, c.ends_at into v_cohort_status, v_ends_at
        from public.cohorts c
       where c.id = v_cohort_id and c.deleted_at is null;
      if not found or v_cohort_status <> 'open' then
        raise exception 'the assignment cohort is no longer open' using errcode = 'check_violation';
      end if;
      if v_due_at is not null and v_ends_at is not null and v_due_at > v_ends_at then
        raise exception 'the due date cannot be after the cohort ends' using errcode = 'check_violation';
      end if;
      if v_due_at is not null and v_due_at <= now() and not v_accept_late then
        raise exception 'this assignment is already past its due date' using errcode = 'check_violation';
      end if;
    end if;
  end if;

  update public.course_assignments set status = p_status where id = p_assignment_id;
  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'course_assignment.' || p_status, 'course_assignment', p_assignment_id,
          jsonb_build_object('from', v_current, 'to', p_status));
end;
$$;
revoke all on function public.set_course_assignment_status(uuid, text) from public;
grant execute on function public.set_course_assignment_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- save_assignment_draft
-- ---------------------------------------------------------------------------

create or replace function public.save_assignment_draft(
  p_assignment_id uuid,
  p_learner_profile_id uuid,
  p_body_text text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_course_id uuid;
  v_version_id uuid;
  v_cohort_id uuid;
  v_assignment_status text;
  v_enrolment_id uuid;
  v_submission_id uuid;
  v_submission_status text;
begin
  if v_actor is null then
    raise exception 'sign in to save an assignment draft' using errcode = 'insufficient_privilege';
  end if;
  if length(coalesce(p_body_text, '')) > 10000 then
    raise exception 'assignment text cannot exceed 10000 characters' using errcode = 'check_violation';
  end if;

  select a.course_id, a.course_version_id, a.cohort_id, a.status
    into v_course_id, v_version_id, v_cohort_id, v_assignment_status
    from public.course_assignments a
   where a.id = p_assignment_id and a.deleted_at is null
   for share;
  if not found then
    raise exception 'assignment not found' using errcode = 'no_data_found';
  end if;
  if v_assignment_status <> 'open' then
    raise exception 'this assignment is not open for submissions' using errcode = 'check_violation';
  end if;
  if not public.can_access_learner(p_learner_profile_id) then
    raise exception 'you can only submit for a learner you are responsible for' using errcode = 'insufficient_privilege';
  end if;

  select ce.id into v_enrolment_id
    from public.course_enrolments ce
   where ce.course_id = v_course_id
     and ce.course_version_id = v_version_id
     and ce.learner_profile_id = p_learner_profile_id
     and ce.status in ('active', 'completed')
     and ce.deleted_at is null
     and (
       v_cohort_id is null
       or exists (
         select 1 from public.cohort_members cm
          where cm.cohort_id = v_cohort_id
            and cm.learner_profile_id = p_learner_profile_id
            and cm.status = 'active'
       )
     )
   for update;
  if not found then
    raise exception 'this learner needs an active enrolment in this exact course version and cohort' using errcode = 'insufficient_privilege';
  end if;

  select s.id, s.status into v_submission_id, v_submission_status
    from public.assignment_submissions s
   where s.assignment_id = p_assignment_id
     and s.learner_profile_id = p_learner_profile_id
   for update;

  if found then
    if v_submission_status <> 'draft' then
      raise exception 'this assignment has already been submitted' using errcode = 'check_violation';
    end if;
    update public.assignment_submissions
       set body_text = coalesce(p_body_text, '')
     where id = v_submission_id;
  else
    insert into public.assignment_submissions
      (assignment_id, learner_profile_id, course_enrolment_id, created_by, body_text)
    values
      (p_assignment_id, p_learner_profile_id, v_enrolment_id, v_actor, coalesce(p_body_text, ''))
    returning id into v_submission_id;
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'assignment_submission.draft_saved', 'assignment_submission', v_submission_id,
          jsonb_build_object('assignment_id', p_assignment_id,
                             'learner_profile_id', p_learner_profile_id));
  return v_submission_id;
end;
$$;
revoke all on function public.save_assignment_draft(uuid, uuid, text) from public;
grant execute on function public.save_assignment_draft(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Assignment file references
-- ---------------------------------------------------------------------------

create or replace function public.attach_assignment_asset(p_submission_id uuid, p_media_asset_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_assignment_id uuid;
  v_learner_id uuid;
  v_assignment_status text;
  v_submission_status text;
  v_asset_status text;
  v_asset_owner uuid;
  v_mime text;
  v_size bigint;
  v_id uuid;
begin
  if v_actor is null then
    raise exception 'sign in to attach a file' using errcode = 'insufficient_privilege';
  end if;

  select s.assignment_id, s.learner_profile_id, s.status, a.status
    into v_assignment_id, v_learner_id, v_submission_status, v_assignment_status
    from public.assignment_submissions s
    join public.course_assignments a on a.id = s.assignment_id
   where s.id = p_submission_id
     and a.deleted_at is null
   for update of s;
  if not found then
    raise exception 'assignment submission not found' using errcode = 'no_data_found';
  end if;
  -- Share-lock the assignment so a simultaneous close waits for this write.
  select a.status into v_assignment_status
    from public.course_assignments a
   where a.id = v_assignment_id and a.deleted_at is null
   for share;
  if not found then
    raise exception 'assignment not found' using errcode = 'no_data_found';
  end if;
  if v_assignment_status <> 'open' or v_submission_status <> 'draft' then
    raise exception 'files can only be attached to an open draft' using errcode = 'check_violation';
  end if;
  if not public.can_access_learner(v_learner_id) then
    raise exception 'you can only attach a file to a learner you are responsible for' using errcode = 'insufficient_privilege';
  end if;

  select ma.status, ma.uploaded_by, lower(ma.mime_type), ma.byte_size
    into v_asset_status, v_asset_owner, v_mime, v_size
    from public.media_assets ma
   where ma.id = p_media_asset_id and ma.deleted_at is null;
  if not found then
    raise exception 'media asset not found' using errcode = 'no_data_found';
  end if;
  if v_asset_owner <> v_actor then
    raise exception 'only the uploader can attach this file' using errcode = 'insufficient_privilege';
  end if;
  if v_asset_status <> 'available' then
    raise exception 'a file must be verified and available before it can be attached' using errcode = 'check_violation';
  end if;
  if v_size > 26214400 then
    raise exception 'an assignment file cannot exceed 25 MiB' using errcode = 'program_limit_exceeded';
  end if;
  if v_mime not in (
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    'audio/aac', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/opus',
    'audio/wav', 'audio/x-m4a', 'audio/x-wav'
  ) then
    raise exception 'this file type is not supported for an assignment' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.assignment_submission_assets asa
       where asa.submission_id = p_submission_id) >= 10 then
    raise exception 'an assignment can have at most 10 files' using errcode = 'program_limit_exceeded';
  end if;

  insert into public.assignment_submission_assets (submission_id, media_asset_id, attached_by)
  values (p_submission_id, p_media_asset_id, v_actor)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'assignment_submission.file_attached', 'assignment_submission', p_submission_id,
          jsonb_build_object('media_asset_id', p_media_asset_id, 'mime_type', v_mime,
                             'byte_size', v_size));
  return v_id;
end;
$$;
revoke all on function public.attach_assignment_asset(uuid, uuid) from public;
grant execute on function public.attach_assignment_asset(uuid, uuid) to authenticated;

create or replace function public.remove_assignment_asset(p_submission_id uuid, p_media_asset_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_assignment_id uuid;
  v_learner_id uuid;
  v_submission_status text;
  v_assignment_status text;
begin
  if v_actor is null then
    raise exception 'sign in to remove a file' using errcode = 'insufficient_privilege';
  end if;

  select s.assignment_id, s.learner_profile_id, s.status, a.status
    into v_assignment_id, v_learner_id, v_submission_status, v_assignment_status
    from public.assignment_submissions s
    join public.course_assignments a on a.id = s.assignment_id
   where s.id = p_submission_id and a.deleted_at is null
   for update of s;
  if not found then
    raise exception 'assignment submission not found' using errcode = 'no_data_found';
  end if;
  -- Serialize this operation against the teacher closing the assignment.
  select a.status into v_assignment_status
    from public.course_assignments a
   where a.id = v_assignment_id and a.deleted_at is null
   for share;
  if not found then
    raise exception 'assignment not found' using errcode = 'no_data_found';
  end if;
  if v_submission_status <> 'draft' or v_assignment_status <> 'open' then
    raise exception 'files can only be removed from an open draft' using errcode = 'check_violation';
  end if;
  if not public.can_access_learner(v_learner_id) then
    raise exception 'you can only remove a file from a learner you are responsible for' using errcode = 'insufficient_privilege';
  end if;

  delete from public.assignment_submission_assets
   where submission_id = p_submission_id and media_asset_id = p_media_asset_id;
  if not found then
    raise exception 'that file is not attached to this submission' using errcode = 'no_data_found';
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'assignment_submission.file_removed', 'assignment_submission', p_submission_id,
          jsonb_build_object('media_asset_id', p_media_asset_id));
end;
$$;
revoke all on function public.remove_assignment_asset(uuid, uuid) from public;
grant execute on function public.remove_assignment_asset(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- submit_assignment
-- ---------------------------------------------------------------------------

create or replace function public.submit_assignment(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_assignment_id uuid;
  v_learner_id uuid;
  v_course_id uuid;
  v_version_id uuid;
  v_cohort_id uuid;
  v_due_after_days integer;
  v_due_at timestamptz;
  v_accept_late boolean;
  v_assignment_status text;
  v_submission_status text;
  v_body text;
  v_enrolment_id uuid;
  v_enrolled_at timestamptz;
  v_deadline timestamptz;
  v_has_asset boolean;
  v_bad_asset boolean;
  v_is_late boolean := false;
begin
  if v_actor is null then
    raise exception 'sign in to submit this assignment' using errcode = 'insufficient_privilege';
  end if;

  select s.assignment_id, s.learner_profile_id, s.course_enrolment_id,
         s.status, s.body_text,
         a.course_id, a.course_version_id, a.cohort_id, a.due_after_days,
         a.due_at, a.accept_late, a.status
    into v_assignment_id, v_learner_id, v_enrolment_id,
         v_submission_status, v_body,
         v_course_id, v_version_id, v_cohort_id, v_due_after_days,
         v_due_at, v_accept_late, v_assignment_status
    from public.assignment_submissions s
    join public.course_assignments a on a.id = s.assignment_id
   where s.id = p_submission_id and a.deleted_at is null
   for update of s;
  if not found then
    raise exception 'assignment submission not found' using errcode = 'no_data_found';
  end if;
  -- Closing an assignment takes an exclusive row lock; share-lock it here so a
  -- submission either commits before the close, or observes the closed state.
  select a.status into v_assignment_status
    from public.course_assignments a
   where a.id = v_assignment_id and a.deleted_at is null
   for share;
  if not found then
    raise exception 'assignment not found' using errcode = 'no_data_found';
  end if;
  if not public.can_access_learner(v_learner_id) then
    raise exception 'you can only submit for a learner you are responsible for' using errcode = 'insufficient_privilege';
  end if;
  if v_assignment_status <> 'open' or v_submission_status <> 'draft' then
    raise exception 'only an open draft can be submitted' using errcode = 'check_violation';
  end if;

  select ce.enrolled_at into v_enrolled_at
    from public.course_enrolments ce
   where ce.id = v_enrolment_id
     and ce.course_id = v_course_id
     and ce.course_version_id = v_version_id
     and ce.learner_profile_id = v_learner_id
     and ce.status in ('active', 'completed')
     and ce.deleted_at is null
     and (
       v_cohort_id is null
       or exists (
         select 1 from public.cohort_members cm
          where cm.cohort_id = v_cohort_id
            and cm.learner_profile_id = v_learner_id
            and cm.status = 'active'
       )
     );
  if not found then
    raise exception 'this learner needs an active enrolment and cohort membership' using errcode = 'insufficient_privilege';
  end if;

  select exists (
    select 1 from public.assignment_submission_assets asa
     where asa.submission_id = p_submission_id
  ) into v_has_asset;
  if length(trim(coalesce(v_body, ''))) = 0 and not v_has_asset then
    raise exception 'write an answer or attach a file before submitting' using errcode = 'check_violation';
  end if;
  if exists (
    select 1
      from public.assignment_submission_assets asa
      join public.media_assets ma on ma.id = asa.media_asset_id
     where asa.submission_id = p_submission_id
       and (ma.status <> 'available' or ma.deleted_at is not null)
  ) then
    raise exception 'a submission file is no longer available; remove it before submitting' using errcode = 'check_violation';
  end if;

  if v_cohort_id is null and v_due_after_days is not null then
    v_deadline := v_enrolled_at + make_interval(days => v_due_after_days);
  else
    v_deadline := v_due_at;
  end if;
  if v_deadline is not null and now() > v_deadline then
    if not v_accept_late then
      raise exception 'this assignment deadline has passed' using errcode = 'check_violation';
    end if;
    v_is_late := true;
  end if;

  update public.assignment_submissions
     set status = 'submitted', submitted_at = now(), submitted_by = v_actor,
         is_late = v_is_late
   where id = p_submission_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'assignment_submission.submitted', 'assignment_submission', p_submission_id,
          jsonb_build_object('assignment_id', v_assignment_id,
                             'learner_profile_id', v_learner_id,
                             'late', v_is_late));
end;
$$;
revoke all on function public.submit_assignment(uuid) from public;
grant execute on function public.submit_assignment(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- mark_assignment_submission
-- ---------------------------------------------------------------------------

create or replace function public.mark_assignment_submission(
  p_submission_id uuid,
  p_score numeric,
  p_feedback text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_author uuid;
  v_status text;
  v_points numeric;
  v_learner_id uuid;
begin
  if v_actor is null then
    raise exception 'sign in to mark this assignment' using errcode = 'insufficient_privilege';
  end if;

  select a.created_by, a.points_possible, s.status, s.learner_profile_id
    into v_author, v_points, v_status, v_learner_id
    from public.assignment_submissions s
    join public.course_assignments a on a.id = s.assignment_id
   where s.id = p_submission_id and a.deleted_at is null
   for update of s;
  if not found then
    raise exception 'assignment submission not found' using errcode = 'no_data_found';
  end if;
  if v_author <> v_actor and not public.is_privileged(v_actor) then
    raise exception 'only the course author can mark this work' using errcode = 'insufficient_privilege';
  end if;
  if v_status <> 'submitted' then
    raise exception 'only submitted work can be marked' using errcode = 'check_violation';
  end if;
  if p_score is not null and v_points is null then
    raise exception 'this assignment is feedback-only and does not have a score' using errcode = 'check_violation';
  end if;
  if p_score is not null and (p_score < 0 or p_score > v_points) then
    raise exception 'the score must be between zero and the points possible' using errcode = 'check_violation';
  end if;
  if p_score is null and length(trim(coalesce(p_feedback, ''))) = 0 then
    raise exception 'provide a score or written feedback' using errcode = 'check_violation';
  end if;
  if length(coalesce(p_feedback, '')) > 5000 then
    raise exception 'feedback cannot exceed 5000 characters' using errcode = 'check_violation';
  end if;

  update public.assignment_submissions
     set status = 'graded', score_earned = p_score,
         feedback = nullif(trim(coalesce(p_feedback, '')), ''),
         marked_by = v_actor, marked_at = now()
   where id = p_submission_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'assignment_submission.graded', 'assignment_submission', p_submission_id,
          jsonb_build_object('score', p_score, 'has_feedback', nullif(trim(coalesce(p_feedback, '')), '') is not null,
                             'learner_profile_id', v_learner_id));
end;
$$;
revoke all on function public.mark_assignment_submission(uuid, numeric, text) from public;
grant execute on function public.mark_assignment_submission(uuid, numeric, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS and direct table privileges
-- ---------------------------------------------------------------------------

alter table public.course_assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.assignment_submission_assets enable row level security;

create policy course_assignments_read on public.course_assignments
  for select to authenticated
  using (public.can_read_course_assignment(id));

create policy assignment_submissions_read on public.assignment_submissions
  for select to authenticated
  using (public.can_read_assignment_submission(id));

create policy assignment_submission_assets_read on public.assignment_submission_assets
  for select to authenticated
  using (public.can_read_assignment_submission(submission_id));

revoke all on public.course_assignments,
  public.assignment_submissions,
  public.assignment_submission_assets from anon, authenticated;
grant select on public.course_assignments,
  public.assignment_submissions,
  public.assignment_submission_assets to authenticated;

comment on table public.course_assignments is
  'Standalone marked work attached to a published course version, optionally scoped to one cohort; self-paced work uses days after enrolment, cohort work uses an absolute due_at.';
comment on table public.assignment_submissions is
  'One private draft/submission/mark per learner and assignment. The learner or their guardian can read it; only the course author or privileged staff can mark it.';
comment on table public.assignment_submission_assets is
  'Private references to available, verified media assets attached to an assignment submission; never stores bytes or public object keys.';
comment on function public.learner_can_access_course_assignment(uuid, uuid) is
  'Exact-version enrolment plus, for a cohort task, active membership; the current actor must be the learner, their family member, or privileged staff.';
comment on function public.can_read_course_assignment(uuid) is
  'Course author/staff, an eligible enrolled learner/guardian, or a learner/guardian with a saved submission can read the task.';
comment on function public.can_read_assignment_submission(uuid) is
  'The learner, their family, the course author, or privileged staff can read a submission and its feedback; no other learner can.';
comment on function public.create_course_assignment(uuid, uuid, text, text, integer, timestamptz, boolean, numeric) is
  'Creates a draft outside the frozen course-version subtree. Self-paced work uses due_after_days; cohort work uses due_at; author, version and scope come from database-checked rows.';
comment on function public.set_course_assignment_status(uuid, text) is
  'Only draft-to-open/cancelled and open-to-closed/cancelled transitions are allowed. Turning the feature off blocks new work but leaves open assignments and learner submissions in flight.';
comment on function public.save_assignment_draft(uuid, uuid, text) is
  'Creates or edits one draft for the learner the caller may act for, on an exact-version enrolment and (if cohort-scoped) active membership.';
comment on function public.submit_assignment(uuid) is
  'Submits text and/or verified attachments, checks the per-enrolment or cohort deadline, and records whether accepted work was late.';
comment on function public.mark_assignment_submission(uuid, numeric, text) is
  'The course author or privileged staff records a score and/or feedback. Submitted work and its attachments are not learner-editable.';
