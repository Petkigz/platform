-- The revision loop: acting on feedback.
--
-- Until now a submission moved draft -> submitted -> graded and stopped. A
-- teacher could write 5000 characters of feedback and the learner could read it
-- and do nothing with it, because the work was frozen. That is half a feature:
-- feedback only teaches when it can be acted on, and for a child writing their
-- first paragraph the second attempt is where the learning happens.
--
-- The shape of this matters more than the columns. A revision **reopens the
-- submission as a draft** instead of adding a second hand-in path:
--
--   * `save_assignment_draft()` already edits a draft, so the learner's words
--     stay and they edit them rather than starting from a blank box;
--   * `attach_assignment_asset()` and `remove_assignment_asset()` only work on a
--     draft, so a revision can change its files under the rules that already
--     exist instead of a copy of them;
--   * `submit_assignment()` re-runs the deadline, the late-work choice and the
--     asset-availability check, so a revision is held to exactly the standard
--     the first hand-in was.
--
-- One new transition, everything downstream reused. Duplicating the deadline
-- arithmetic here would have produced two clocks that could disagree.
--
-- What is deliberately NOT here: no automatic re-marking, no partial credit
-- carry-over, and no revision after the task closes. Reopening clears the mark,
-- because a score attached to work that has since changed is a score of work
-- that no longer exists. The previous mark is preserved in a snapshot the
-- learner and the teacher can both read, so nobody loses the record.

-- ---------------------------------------------------------------------------
-- The task decides whether its work can be revised
-- ---------------------------------------------------------------------------
--
-- `revisions_allowed` defaults to true. That is a change of posture for a flag
-- that ships off, and the reasoning is that a revision loop nobody turns on is a
-- revision loop nobody finds; a teacher who wants a one-shot exam switches it
-- off per task, which is a smaller and more visible act than the reverse.
--
-- `revision_limit` counts *versions including the first*, so 2 means one
-- revision. NULL means unlimited. It is a per-task number set by the teacher
-- rather than a platform-wide constant, for the same reason a due date is: the
-- platform has no business deciding how many drafts a recitation exercise
-- deserves.

alter table public.course_assignments
  add column revisions_allowed boolean not null default true,
  add column revision_limit integer
    check (revision_limit is null or revision_limit >= 1);

alter table public.course_assignments
  add constraint course_assignments_limit_needs_revisions check (
    revision_limit is null or revisions_allowed
  );

comment on column public.course_assignments.revisions_allowed is
  'Whether marked work can be reopened as a draft and handed in again. Per task, set by the teacher.';
comment on column public.course_assignments.revision_limit is
  'Maximum number of versions including the first, so 2 allows one revision. NULL is unlimited.';

alter table public.assignment_submissions
  add column revision_number integer not null default 1
    check (revision_number >= 1);

comment on column public.assignment_submissions.revision_number is
  'Which version of this work the row currently holds. Incremented when a graded submission is reopened; the version it replaced is snapshotted in assignment_submission_revisions.';

-- ---------------------------------------------------------------------------
-- The snapshot
-- ---------------------------------------------------------------------------
--
-- Append-only, like the audit log. A record of what was marked that can be
-- quietly rewritten is not a record; it is a draft of one.

create table public.assignment_submission_revisions (
  id uuid primary key default gen_random_uuid(),

  submission_id uuid not null
    references public.assignment_submissions (id) on delete restrict,

  -- The version this snapshot *was*. The live submission row carries the next
  -- one, so a snapshot and the row it came from never claim the same number.
  revision_number integer not null check (revision_number >= 1),

  body_text text not null default '' check (length(body_text) <= 10000),

  -- The files that accompanied this version, by asset id. References only: this
  -- table stores no bytes, no buckets and no keys, the same rule as
  -- assignment_submission_assets.
  asset_ids jsonb not null default '[]'::jsonb,

  score_earned numeric(7,2) check (score_earned is null or score_earned >= 0),
  feedback text check (feedback is null or length(feedback) <= 5000),
  marked_by uuid references public.user_profiles (user_id) on delete restrict,
  marked_at timestamptz not null,

  submitted_at timestamptz not null,
  submitted_by uuid references public.user_profiles (user_id) on delete restrict,
  is_late boolean not null default false,

  -- Who asked to revise. A guardian may act for a child, so this is the session
  -- actor and not necessarily the learner.
  reopened_by uuid not null
    references public.user_profiles (user_id) on delete restrict,
  reopened_at timestamptz not null default now(),

  constraint assignment_submission_revisions_one_per_number
    unique (submission_id, revision_number),
  -- A snapshot is of a *marked* version; an unmarked one has nothing to record.
  constraint assignment_submission_revisions_was_marked check (
    score_earned is not null or length(trim(coalesce(feedback, ''))) > 0
  )
);

create index assignment_submission_revisions_submission_idx
  on public.assignment_submission_revisions (submission_id, revision_number desc);

alter table public.assignment_submission_revisions enable row level security;

create or replace function public.guard_assignment_submission_revisions()
returns trigger
language plpgsql
as $$
begin
  raise exception 'a recorded revision of marked work cannot be changed or deleted'
    using errcode = 'insufficient_privilege';
end;
$$;
revoke all on function public.guard_assignment_submission_revisions() from public;

create trigger assignment_submission_revisions_append_only
  before update or delete on public.assignment_submission_revisions
  for each row execute function public.guard_assignment_submission_revisions();

-- Readable by exactly the people who can read the submission it came from: the
-- learner, their family, the course author, privileged staff. No other learner.
create policy assignment_submission_revisions_read
  on public.assignment_submission_revisions
  for select to authenticated
  using (public.can_read_assignment_submission(submission_id));

revoke all on public.assignment_submission_revisions from anon, authenticated;
grant select on public.assignment_submission_revisions to authenticated;

comment on table public.assignment_submission_revisions is
  'Append-only snapshots of a marked submission, taken when the learner reopens it to revise. Readable by whoever can read the submission.';

-- ---------------------------------------------------------------------------
-- reopen_assignment_submission
-- ---------------------------------------------------------------------------

-- Not flag-gated, matching `submit_assignment()` and `mark_assignment_submission()`:
-- switching `learning.assignments` off stops new tasks and new openings, but work
-- already in flight keeps its whole lifecycle. Gating this one would create the
-- exact trap the deadline check below exists to prevent — a learner reopens, and
-- then cannot hand the work back in.
create or replace function public.reopen_assignment_submission(p_submission_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_assignment_id uuid;
  v_learner_id uuid;
  v_enrolment_id uuid;
  v_course_id uuid;
  v_version_id uuid;
  v_cohort_id uuid;
  v_assignment_status text;
  v_submission_status text;
  v_revision_number integer;
  v_revisions_allowed boolean;
  v_revision_limit integer;
  v_due_after_days integer;
  v_due_at timestamptz;
  v_accept_late boolean;
  v_enrolled_at timestamptz;
  v_deadline timestamptz;
  v_next integer;
begin
  if v_actor is null then
    raise exception 'sign in to revise this submission' using errcode = 'insufficient_privilege';
  end if;

  select s.assignment_id, s.learner_profile_id, s.course_enrolment_id,
         s.status, s.revision_number,
         a.course_id, a.course_version_id, a.cohort_id, a.status,
         a.revisions_allowed, a.revision_limit,
         a.due_after_days, a.due_at, a.accept_late
    into v_assignment_id, v_learner_id, v_enrolment_id,
         v_submission_status, v_revision_number,
         v_course_id, v_version_id, v_cohort_id, v_assignment_status,
         v_revisions_allowed, v_revision_limit,
         v_due_after_days, v_due_at, v_accept_late
    from public.assignment_submissions s
    join public.course_assignments a on a.id = s.assignment_id
   where s.id = p_submission_id and a.deleted_at is null
   for update of s;
  if not found then
    raise exception 'assignment submission not found' using errcode = 'no_data_found';
  end if;

  -- Share-lock the task, the same way submit_assignment does: closing a task
  -- takes an exclusive lock, so a reopen either commits first or sees it closed.
  select a.status into v_assignment_status
    from public.course_assignments a
   where a.id = v_assignment_id and a.deleted_at is null
   for share;
  if not found then
    raise exception 'assignment not found' using errcode = 'no_data_found';
  end if;

  if not public.can_access_learner(v_learner_id) then
    raise exception 'you can only revise work for a learner you are responsible for'
      using errcode = 'insufficient_privilege';
  end if;
  if v_submission_status <> 'graded' then
    raise exception 'only marked work can be revised' using errcode = 'check_violation';
  end if;
  if v_assignment_status <> 'open' then
    raise exception 'this assignment is not open for revisions' using errcode = 'check_violation';
  end if;
  if not v_revisions_allowed then
    raise exception 'this assignment does not allow revisions' using errcode = 'check_violation';
  end if;
  if v_revision_limit is not null and v_revision_number >= v_revision_limit then
    raise exception 'this assignment allows % versions and this is version %',
      v_revision_limit, v_revision_number using errcode = 'program_limit_exceeded';
  end if;

  -- The protection that matters most here. Reopening destroys a mark, so refuse
  -- to do it when the learner could not hand the work in again: a deadline that
  -- has passed on a task that does not accept late work. Without this check a
  -- learner could trade a grade for nothing, and would only find out at the
  -- submit step.
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
    raise exception 'this learner needs an active enrolment and cohort membership'
      using errcode = 'insufficient_privilege';
  end if;

  if v_cohort_id is null and v_due_after_days is not null then
    v_deadline := v_enrolled_at + make_interval(days => v_due_after_days);
  else
    v_deadline := v_due_at;
  end if;
  if v_deadline is not null and now() > v_deadline and not v_accept_late then
    raise exception 'the deadline has passed, so this mark stands'
      using errcode = 'check_violation';
  end if;

  v_next := v_revision_number + 1;

  insert into public.assignment_submission_revisions (
    submission_id, revision_number, body_text, asset_ids,
    score_earned, feedback, marked_by, marked_at,
    submitted_at, submitted_by, is_late, reopened_by
  )
  select s.id, s.revision_number, s.body_text,
         coalesce(
           (select jsonb_agg(asa.media_asset_id order by asa.created_at, asa.position)
              from public.assignment_submission_assets asa
             where asa.submission_id = s.id),
           '[]'::jsonb),
         s.score_earned, s.feedback, s.marked_by, s.marked_at,
         s.submitted_at, s.submitted_by, coalesce(s.is_late, false), v_actor
    from public.assignment_submissions s
   where s.id = p_submission_id;

  -- Back to a draft with the learner's words still in the box. Clearing the mark
  -- is what makes the snapshot necessary: the row now describes work that has
  -- not been judged yet, and `assignment_submissions_state_agrees` requires
  -- every marking column to be empty while it does.
  update public.assignment_submissions
     set status = 'draft',
         submitted_at = null, submitted_by = null, is_late = null,
         score_earned = null, feedback = null,
         marked_by = null, marked_at = null,
         revision_number = v_next
   where id = p_submission_id;

  -- The audit records the transition and the score that was given up, not the
  -- feedback text. The comment belongs to one learner about their own work, and
  -- it is preserved where it can be read rather than copied into a log.
  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'assignment_submission.reopened', 'assignment_submission', p_submission_id,
          jsonb_build_object('assignment_id', v_assignment_id,
                             'learner_profile_id', v_learner_id,
                             'revision_number', v_next,
                             'previous_score',
                               (select r.score_earned
                                  from public.assignment_submission_revisions r
                                 where r.submission_id = p_submission_id
                                   and r.revision_number = v_revision_number)));

  return v_next;
end;
$$;
revoke all on function public.reopen_assignment_submission(uuid) from public;
grant execute on function public.reopen_assignment_submission(uuid) to authenticated;

comment on function public.reopen_assignment_submission(uuid) is
  'Returns marked work to a draft so the learner can revise it: snapshots the mark, clears it from the live row, and increments the revision number. Refuses when the deadline has passed on a task that does not accept late work, so a learner cannot trade a grade for nothing.';

-- ---------------------------------------------------------------------------
-- set_assignment_revision_policy
-- ---------------------------------------------------------------------------
--
-- Separate from `update_course_assignment_draft()` on purpose. Content and
-- deadlines freeze once a task is open, because learners rely on them. The
-- revision policy governs what happens *after* marking, so a teacher can change
-- it on an open task without invalidating anybody's work.
--
-- Turning revisions off never traps a learner mid-revision: submitting a draft
-- does not consult this policy, so an already-reopened draft can still be handed
-- in. What closes is the *next* reopen.

create or replace function public.set_assignment_revision_policy(
  p_assignment_id uuid,
  p_revisions_allowed boolean,
  p_revision_limit integer
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
  v_allowed boolean;
  v_limit integer;
begin
  if v_actor is null then
    raise exception 'sign in to change this assignment' using errcode = 'insufficient_privilege';
  end if;
  if p_revisions_allowed is null then
    raise exception 'choose whether revisions are allowed' using errcode = 'invalid_parameter_value';
  end if;

  v_allowed := p_revisions_allowed;
  v_limit := p_revision_limit;
  if not v_allowed then
    -- A limit on revisions that are not allowed is a contradiction the table
    -- would refuse; clearing it here means switching revisions off is one act
    -- rather than two, and switching them back on does not resurrect a stale
    -- number the teacher has forgotten.
    v_limit := null;
  end if;
  if v_limit is not null and v_limit < 1 then
    raise exception 'a revision limit must be at least one version'
      using errcode = 'invalid_parameter_value';
  end if;

  select a.created_by, a.status into v_author, v_status
    from public.course_assignments a
   where a.id = p_assignment_id and a.deleted_at is null
   for update;
  if not found then
    raise exception 'assignment not found' using errcode = 'no_data_found';
  end if;
  if v_author <> v_actor and not public.is_privileged(v_actor) then
    raise exception 'only the course author can change this assignment'
      using errcode = 'insufficient_privilege';
  end if;
  if v_status not in ('draft', 'open') then
    raise exception 'a closed or cancelled assignment cannot be changed'
      using errcode = 'check_violation';
  end if;

  update public.course_assignments
     set revisions_allowed = v_allowed,
         revision_limit = v_limit
   where id = p_assignment_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'assignment.revision_policy_set', 'course_assignment', p_assignment_id,
          jsonb_build_object('revisions_allowed', v_allowed, 'revision_limit', v_limit));
end;
$$;
revoke all on function public.set_assignment_revision_policy(uuid, boolean, integer) from public;
grant execute on function public.set_assignment_revision_policy(uuid, boolean, integer) to authenticated;

comment on function public.set_assignment_revision_policy(uuid, boolean, integer) is
  'The course author or privileged staff decides whether marked work can be revised and how many versions are allowed. Works on a draft or an open task; switching revisions off clears the limit and never traps a draft already reopened.';

-- The register row described the missing revision loop as a precondition. It is
-- built now; what remains is the media path and the late-join review.
-- `value_text` is deliberately untouched: the flag still ships off.
update public.platform_settings
   set preconditions = 'Self-paced deadlines are relative to enrolment (a number of days after it); cohort deadlines are absolute. The author (plus privileged staff) marks; late work is rejected by default and each task can explicitly accept it. Text hand-in, private feedback and a per-task revision loop are built: marked work can be reopened as a draft, the previous mark is snapshotted, and reopening is refused once a deadline has passed on a task that does not accept late work. One submission per learner/task. The DB accepts verified PDF/JPEG/PNG/WebP and AAC/MPEG/MP4/OGG/Opus/WAV references, up to 25 MiB each and 10 files, but upload bytes, scanning, secure delivery and retention are not wired. Build/review that path and review the cohort late-join rule before enabling; assignments stay off'
 where key = 'learning.assignments';
