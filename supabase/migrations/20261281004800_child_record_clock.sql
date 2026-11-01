-- -----------------------------------------------------------------------------
-- The third clock: a child's learning record
-- -----------------------------------------------------------------------------
--
-- The children's policy makes a promise with a number in it that the other two
-- clocks do not cover:
--
--   "A child's learning record is deleted with the guardian's account, 30 days
--    after that account closes. The exception is a certificate already issued:
--    its number stays verifiable, because a certificate somebody may have shown
--    an employer has to keep meaning something. It verifies the certificate, not
--    the child."
--
-- `20261281004700` wound the support-case and screening clocks and said, in its
-- own header, that this one was not wound. It was the right thing to leave: it is
-- a delete across nine tables with a certificate that has to survive it, and
-- guessing at it would have been worse than naming it. This migration is that
-- unit.
--
-- What closing an account already did (in `erase_my_account`): the child's name
-- became "Deleted learner", the profile went to `archived`, and their notes,
-- bookmarks, reviews and shares were deleted. What it did not do — because it
-- cannot do it in the same transaction, for a reason the policy states — was
-- remove the record of what the child actually did: the enrolments, the lesson
-- progress, the submissions, the attempts, the attendance. Those are what a
-- learning record *is*, and they stayed.
--
-- THE RULE THIS IMPLEMENTS
-- ------------------------
-- Thirty days after the guardian's account closed, delete the learning record
-- and keep the tombstone. The tombstone is a `learner_profiles` row with an id,
-- a type, a status and dates — nothing that identifies anybody — and it exists
-- for exactly one reason: a certificate column points at it with `on delete
-- restrict`, and a certificate that somebody may have shown an employer must go
-- on verifying.
--
--   deleted:      enrolments, lesson progress, submissions, assessment attempts
--                 and responses, attendance, memorisation passages and reviews,
--                 cohort memberships, offline devices and downloads, child
--                 logins, access checks, shares, invitations, entitlements,
--                 guardian links, plan allocations, sponsorship applications,
--                 the enrolment version history, and the child's reviews.
--
--   de-identified: the order keeps its money facts and loses the learner it was
--                 for; a support case keeps the conversation and loses the child
--                 it was about.
--
--   kept:         the certificate, with its number, its snapshot and its status;
--                 the ledger; the audit trail.
--
-- WHY THE CERTIFICATE NEEDS A SCHEMA CHANGE
-- -----------------------------------------
-- `certificates.course_enrolment_id` was `not null … on delete restrict`. That is
-- right for every other purpose — a certificate is evidence of an enrolment — and
-- it makes this promise impossible to keep, because the enrolment is the learning
-- record. So the column becomes nullable with `on delete set null`, and the
-- certificate records *that* its evidence was erased (`evidence_erased_at`)
-- rather than looking like a row somebody broke. Its snapshot never moves: the
-- title, the version, the criteria and the number are a record of a moment, and
-- they are what verification reads.
--
-- WHY ONLY CHILDREN
-- -----------------
-- The promise is about a child, whose record is held by somebody else. An adult
-- who closes their own account is told, on `/account/delete`, that their
-- enrolments and progress are kept — and they have been told that since the
-- screen was written. Changing that is a decision for the owner and a rewrite of
-- what that screen says; it is named in NEXT.md rather than done quietly here.
--
-- Still open after this: a child profile archived by an *account merge* is not
-- erased and has no clock. It is reported by `retention_plan()` rather than
-- deleted, because its record was moved to the surviving profile and the row left
-- behind is a pointer, not a person.

-- -----------------------------------------------------------------------------
-- 1. A status for the tombstone, and the columns it keeps
-- -----------------------------------------------------------------------------
-- `archived` means "no longer in use"; `erased` means "the record is gone and
-- this row is a foreign key target". Two different facts, and the second one has
-- to be distinguishable or the job would take the same profile every night.
alter table public.learner_profiles
  drop constraint if exists learner_profiles_status_check;
alter table public.learner_profiles
  add constraint learner_profiles_status_check
    check (status in ('active', 'archived', 'erased'));

alter table public.learner_profiles
  add column if not exists erased_at timestamptz;

comment on column public.learner_profiles.erased_at is
  'When the learning record behind this profile was deleted. The row itself survives only as a foreign key target for a certificate.';

-- The tombstone holds no name, no age band and no family, so the two constraints
-- that require them are waived for exactly this status — and for nothing else.
alter table public.learner_profiles
  drop constraint if exists lp_children_need_age_band;
alter table public.learner_profiles
  add constraint lp_children_need_age_band
    check (status = 'erased' or learner_type = 'adult' or age_band is not null);

alter table public.learner_profiles
  drop constraint if exists lp_needs_family_or_login;
alter table public.learner_profiles
  add constraint lp_needs_family_or_login
    check (status = 'erased' or family_id is not null or linked_user_id is not null);

create index if not exists learner_profiles_erased_idx
  on public.learner_profiles (deleted_at)
  where learner_type = 'child' and deleted_at is not null and status <> 'erased';

-- -----------------------------------------------------------------------------
-- 2. The certificate keeps its number and loses its evidence
-- -----------------------------------------------------------------------------
alter table public.certificates
  alter column course_enrolment_id drop not null;

-- The existing constraint is `on delete restrict`; it is replaced rather than
-- dropped and recreated by name, because the name is generated.
do $$
declare
  v_name text;
begin
  select conname into v_name
    from pg_constraint
   where conrelid = 'public.certificates'::regclass
     and contype = 'f'
     and conkey = array[
       (select attnum from pg_attribute
         where attrelid = 'public.certificates'::regclass
           and attname = 'course_enrolment_id')]
   limit 1;
  if v_name is not null then
    execute format('alter table public.certificates drop constraint %I', v_name);
  end if;
end $$;

alter table public.certificates
  add constraint certificates_course_enrolment_id_fkey
    foreign key (course_enrolment_id)
    references public.course_enrolments (id) on delete set null;

alter table public.certificates
  add column if not exists evidence_erased_at timestamptz;

comment on column public.certificates.course_enrolment_id is
  'The enrolment this certificate was issued against. Null once the learner''s record has been deleted under the retention policy — the certificate still verifies from its own snapshot.';
comment on column public.certificates.evidence_erased_at is
  'When the enrolment behind this certificate was deleted by the retention run. Null for a certificate whose evidence still exists.';

-- A certificate that has been issued is immutable, and that includes this: the
-- snapshot trigger already refuses every change to the fields that matter, and
-- `evidence_erased_at` may only ever be set once, from null.
create or replace function public.protect_certificate_evidence()
returns trigger
language plpgsql
as $$
begin
  if old.evidence_erased_at is not null
     and new.evidence_erased_at is distinct from old.evidence_erased_at then
    raise exception 'certificate % has already recorded that its evidence was erased', old.id
      using errcode = 'insufficient_privilege';
  end if;
  if old.course_enrolment_id is not null and new.course_enrolment_id is null
     and new.evidence_erased_at is null then
    raise exception 'certificate % lost its enrolment without recording why', old.id
      using errcode = 'check_violation',
            hint = 'set evidence_erased_at in the same statement';
  end if;
  if old.course_enrolment_id is null and new.course_enrolment_id is not null then
    raise exception 'certificate % cannot be re-attached to an enrolment', old.id
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger certificates_protect_evidence
  before update on public.certificates
  for each row execute function public.protect_certificate_evidence();

-- -----------------------------------------------------------------------------
-- 3. The third clock, in the view that already defines "due"
-- -----------------------------------------------------------------------------
create or replace view public.retention_due_records as
  select 'support_case'::text as kind,
         c.id,
         c.closed_at          as clock_started_at,
         ((c.closed_at at time zone 'UTC') + interval '3 years')::date as due_on
    from public.support_cases c
   where c.closed_at is not null
  union all
  select 'screening'::text,
         s.id,
         s.checked_at,
         s.retention_until
    from public.teacher_screenings s
  union all
  -- Thirty days after the guardian's account closed. Only a child, only once,
  -- and only from the moment the account actually closed: an archived profile
  -- with no `deleted_at` (an account merge) is not on this clock at all.
  select 'learner_record'::text,
         lp.id,
         lp.deleted_at,
         ((lp.deleted_at at time zone 'UTC') + interval '30 days')::date
    from public.learner_profiles lp
   where lp.learner_type = 'child'
     and lp.deleted_at is not null
     and lp.status <> 'erased';

comment on view public.retention_due_records is
  'Every record with a retention date, and which clock set it: a closed support case, a screening record, and a child''s learning record thirty days after the guardian''s account closed. One definition of "due" for the plan, the cleanup and psql.';

revoke all on public.retention_due_records from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. What deleting a child's record actually means
-- -----------------------------------------------------------------------------
-- Internal: not granted to anybody. `run_retention_jobs()` is the only caller,
-- because a per-learner purge button would be a second door to the same
-- destructive act with its own gate to get wrong. The owner runs the clock.
create or replace function public.purge_learner_record(p_learner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind       text;
  v_status     text;
  v_deleted    timestamptz;
  v_enrolments uuid[];
  v_attempts   uuid[];
  v_enrolled   integer := 0;
  v_progress   integer := 0;
  v_submitted  integer := 0;
  v_attempted  integer := 0;
  v_attended   integer := 0;
  v_memorised  integer := 0;
  v_other      integer := 0;
  v_evidence   integer := 0;
begin
  select learner_type, status, deleted_at
    into v_kind, v_status, v_deleted
    from public.learner_profiles
   where id = p_learner_id;

  if not found then
    raise exception 'learner:not_found' using errcode = 'no_data_found';
  end if;
  if v_kind <> 'child' then
    raise exception 'learner:not_a_child'
      using errcode = 'check_violation',
            hint = 'the thirty-day clock is the children''s policy; an adult''s own record is a separate decision';
  end if;
  if v_status = 'erased' then
    return jsonb_build_object('erased', true, 'alreadyErased', true);
  end if;
  if v_deleted is null then
    raise exception 'learner:no_clock'
      using errcode = 'check_violation',
            hint = 'no guardian account has closed, so the thirty days have not started';
  end if;

  select array_agg(id) into v_enrolments
    from public.course_enrolments where learner_profile_id = p_learner_id;
  v_enrolments := coalesce(v_enrolments, '{}'::uuid[]);

  select array_agg(id) into v_attempts
    from public.assessment_attempts where learner_profile_id = p_learner_id;
  v_attempts := coalesce(v_attempts, '{}'::uuid[]);

  -- ---------------------------------------------------------------- what they did
  delete from public.assessment_responses
   where assessment_attempt_id = any(v_attempts);
  delete from public.assessment_attempts where learner_profile_id = p_learner_id;
  get diagnostics v_attempted = row_count;

  delete from public.assignment_submissions where learner_profile_id = p_learner_id;
  get diagnostics v_submitted = row_count;

  delete from public.lesson_progress
   where course_enrolment_id = any(v_enrolments);
  get diagnostics v_progress = row_count;

  -- Notes, bookmarks and reviews are already gone: `erase_my_account()` removes
  -- them when the account closes, because they are words rather than a record.
  -- They are deleted again here so this function is correct on its own — a row
  -- written between the close and the purge (a child login could) still goes.
  delete from public.lesson_notes where learner_profile_id = p_learner_id;
  delete from public.lesson_bookmarks where learner_profile_id = p_learner_id;
  delete from public.course_reviews where learner_profile_id = p_learner_id;

  delete from public.live_session_attendance where learner_profile_id = p_learner_id;
  get diagnostics v_attended = row_count;

  delete from public.hifz_passages where learner_profile_id = p_learner_id;
  get diagnostics v_memorised = row_count;

  -- ------------------------------------------------------------- who could reach them
  delete from public.cohort_members where learner_profile_id = p_learner_id;
  delete from public.offline_downloads where learner_profile_id = p_learner_id;
  delete from public.offline_devices where learner_profile_id = p_learner_id;
  delete from public.child_logins where learner_profile_id = p_learner_id;
  delete from public.access_checks where learner_profile_id = p_learner_id;
  delete from public.adult_learning_shares where learner_profile_id = p_learner_id;
  delete from public.share_invitations where learner_profile_id = p_learner_id;
  delete from public.guardian_relationships where learner_profile_id = p_learner_id;
  delete from public.sponsorship_applications where learner_profile_id = p_learner_id;
  delete from public.entitlement_grants where learner_profile_id = p_learner_id;
  delete from public.family_plan_allocations where learner_profile_id = p_learner_id;

  -- ------------------------------------------------------- kept, and de-identified
  -- The ledger is kept and the child is not named on it any more. The money facts
  -- are what a refund, a payout and a tax return rest on; the learner column is
  -- an identity, and it goes.
  update public.orders
     set learner_profile_id = null
   where learner_profile_id = p_learner_id;

  -- A support case is the guardian's conversation and is kept on its own clock.
  -- The link to the child is not part of the conversation.
  update public.support_cases
     set learner_profile_id = null
   where learner_profile_id = p_learner_id;

  -- The certificate keeps everything except the enrolment it was issued against,
  -- and records why that went. `protect_certificate_snapshot` refuses any other
  -- change to it, so this is the one update a certificate will ever take.
  update public.certificates
     set course_enrolment_id = null,
         evidence_erased_at = now()
   where learner_profile_id = p_learner_id
     and course_enrolment_id is not null;
  get diagnostics v_evidence = row_count;

  -- ------------------------------------------------------------ the enrolment itself
  delete from public.course_enrolment_version_history
   where course_enrolment_id = any(v_enrolments);

  delete from public.course_enrolments where learner_profile_id = p_learner_id;
  get diagnostics v_enrolled = row_count;

  -- ------------------------------------------------------------------- the tombstone
  update public.learner_profiles
     set status = 'erased',
         erased_at = now(),
         display_name = 'Deleted learner',
         age_band = null,
         family_id = null,
         linked_user_id = null
   where id = p_learner_id;

  -- Everything else that named the learner is counted rather than listed, so the
  -- receipt says how much went without turning into a name.
  select (select count(*) from public.assignment_submissions where learner_profile_id = p_learner_id)
       + (select count(*) from public.course_enrolments where learner_profile_id = p_learner_id)
    into v_other;

  return jsonb_build_object(
    'erased', true,
    'alreadyErased', false,
    'deleted', jsonb_build_object(
      'enrolments', v_enrolled,
      'lessonProgress', v_progress,
      'submissions', v_submitted,
      'assessmentAttempts', v_attempted,
      'attendance', v_attended,
      'memorisation', v_memorised),
    'certificatesKept', (select count(*)::int from public.certificates
                          where learner_profile_id = p_learner_id),
    'certificatesUnlinked', v_evidence,
    'nothingLeft', v_other = 0);
end;
$$;

revoke all on function public.purge_learner_record(uuid) from public, anon, authenticated;

comment on function public.purge_learner_record(uuid) is
  'Deletes a child''s learning record and leaves a tombstone: the row a certificate still points at. Internal — run_retention_jobs() is the only caller.';

-- -----------------------------------------------------------------------------
-- 5. The plan and the run, saying the third clock
-- -----------------------------------------------------------------------------
-- Re-declared whole rather than patched: PostgreSQL cannot add a branch to a
-- function body, and a second definition of "what is due" is exactly the drift
-- this unit exists to stop.
create or replace function public.retention_plan(p_now timestamptz default now())
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor       uuid := public.current_user_id();
  v_as_of       date := (p_now at time zone 'UTC')::date;
  v_case        integer;
  v_case_old    date;
  v_case_next   date;
  v_stuck       integer;
  v_stuck_old   timestamptz;
  v_screen      integer;
  v_screen_old  date;
  v_screen_next date;
  v_learner     integer;
  v_learner_old date;
  v_learner_next date;
  v_erased      integer;
  v_orphan      integer;
  v_orphan_old  timestamptz;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'retention:not_allowed'
      using errcode = 'insufficient_privilege',
            hint = 'deleting a record before its time is destroying evidence; only the platform admin runs the clock';
  end if;

  select count(*)::int, min(due_on)
    into v_case, v_case_old
    from public.retention_due_records
   where kind = 'support_case' and due_on <= v_as_of;
  select min(due_on) into v_case_next
    from public.retention_due_records
   where kind = 'support_case' and due_on > v_as_of;

  -- A case nobody closed has no clock. Saying "0 due" without saying this would
  -- describe a queue of cases kept forever as if the rule covered them.
  select count(*)::int, min(created_at)
    into v_stuck, v_stuck_old
    from public.support_cases
   where closed_at is null
     and created_at <= p_now - interval '3 years';

  select count(*)::int, min(due_on)
    into v_screen, v_screen_old
    from public.retention_due_records
   where kind = 'screening' and due_on <= v_as_of;
  select min(due_on) into v_screen_next
    from public.retention_due_records
   where kind = 'screening' and due_on > v_as_of;

  select count(*)::int, min(due_on)
    into v_learner, v_learner_old
    from public.retention_due_records
   where kind = 'learner_record' and due_on <= v_as_of;
  select min(due_on) into v_learner_next
    from public.retention_due_records
   where kind = 'learner_record' and due_on > v_as_of;

  select count(*)::int into v_erased
    from public.learner_profiles where status = 'erased';

  -- The one child-shaped thing with no clock: a profile an account merge archived
  -- without closing anybody's account. Its record was moved to the surviving
  -- profile, so there is nothing here to delete — but a pointer nobody ever looks
  -- at is a pointer that becomes a person again if the schema moves.
  select count(*)::int, min(created_at)
    into v_orphan, v_orphan_old
    from public.learner_profiles
   where learner_type = 'child'
     and status = 'archived'
     and deleted_at is null;

  return jsonb_build_object(
    'asOf', v_as_of,
    'policies', jsonb_build_object(
      'supportCase', jsonb_build_object(
        'years', 3,
        'clock', 'three years after the case closed',
        'source', 'privacy notice: "A support case is kept for three years after it is closed."'),
      'screening', jsonb_build_object(
        'years', 7,
        'clock', 'seven years after the later of the check and the subject''s eighteenth birthday',
        'source', 'privacy notice: "A safeguarding or screening record is kept for seven years after the person it concerns turns 18, or for seven years after it is made where they were already an adult."'),
      'learnerRecord', jsonb_build_object(
        'days', 30,
        'clock', 'thirty days after the guardian''s account closed',
        'source', 'children''s policy: "A child''s learning record is deleted with the guardian''s account, 30 days after that account closes."')),
    'supportCases', jsonb_build_object(
      'due', v_case,
      'oldestDue', v_case_old,
      'nextDue', v_case_next,
      'waiting', jsonb_build_object(
        'count', v_stuck,
        'oldestCreatedAt', v_stuck_old,
        'note', 'Cases that were never closed. The three years have not started because nothing ended them, and this job will not delete a case somebody might still be answering.')),
    'screenings', jsonb_build_object(
      'due', v_screen,
      'oldestDue', v_screen_old,
      'nextDue', v_screen_next),
    'learnerRecords', jsonb_build_object(
      'due', v_learner,
      'oldestDue', v_learner_old,
      'nextDue', v_learner_next,
      'erasedToDate', v_erased,
      'waiting', jsonb_build_object(
        'count', v_orphan,
        'oldestCreatedAt', v_orphan_old,
        'note', 'Child profiles left behind by an account merge. Their record was moved to the surviving profile, so there is nothing here to delete — and no policy sets a date for the row itself.')));
end;
$$;

revoke all on function public.retention_plan(timestamptz) from public, anon;
grant execute on function public.retention_plan(timestamptz) to authenticated;

comment on function public.retention_plan(timestamptz) is
  'What the three retention clocks say is due, what is due next, and what has no clock running at all. Deletes nothing; the owner reads it before pressing anything.';

create or replace function public.run_retention_jobs(
  p_now   timestamptz default now(),
  p_limit integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor       uuid := public.current_user_id();
  -- The date is a parameter so the run can be replayed and tested. It cannot be
  -- talked into the future: asking to clean as of 2040 cleans as of today, and
  -- the plan is what answers the question about 2040.
  v_as_of       date := least((p_now at time zone 'UTC')::date,
                              (now() at time zone 'UTC')::date);
  v_case_ids    uuid[];
  v_screen_ids  uuid[];
  v_learner_ids uuid[];
  v_cases       integer := 0;
  v_messages    integer := 0;
  v_screenings  integer := 0;
  v_learners    integer := 0;
  v_cases_left  integer := 0;
  v_screen_left integer := 0;
  v_learner_left integer := 0;
  v_one         uuid;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'retention:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception 'retention:limit_out_of_range'
      using errcode = 'invalid_parameter_value',
            hint = 'between 1 and 5000 rows per call';
  end if;

  -- Cases, and the messages inside them. The messages go first because the
  -- foreign key refuses to leave one behind, and a case whose replies survived
  -- would be the record this job exists to remove.
  select array_agg(id) into v_case_ids
    from (select id from public.retention_due_records
           where kind = 'support_case' and due_on <= v_as_of
           order by due_on, id
           limit p_limit) picked;

  if v_case_ids is not null then
    delete from public.support_case_messages where case_id = any(v_case_ids);
    get diagnostics v_messages = row_count;

    delete from public.support_cases where id = any(v_case_ids);
    get diagnostics v_cases = row_count;
  end if;

  -- Screenings. The trigger refuses a delete unless the caller says it is the
  -- cleanup and names the date it is cleaning as of — and it re-checks the row
  -- against that date and against this database's own clock, so saying so is not
  -- enough to take one early.
  select array_agg(id) into v_screen_ids
    from (select id from public.retention_due_records
           where kind = 'screening' and due_on <= v_as_of
           order by due_on, id
           limit p_limit) picked;

  if v_screen_ids is not null then
    perform set_config('ayahspring.retention_purge', 'on', true);
    perform set_config('ayahspring.retention_as_of', v_as_of::text, true);
    delete from public.teacher_screenings where id = any(v_screen_ids);
    get diagnostics v_screenings = row_count;
    perform set_config('ayahspring.retention_purge', '', true);
    perform set_config('ayahspring.retention_as_of', '', true);
  end if;

  -- Children's learning records, one profile at a time, because each is a delete
  -- across a dozen tables and a receipt worth being able to read.
  for v_one in
    select id from public.retention_due_records
     where kind = 'learner_record' and due_on <= v_as_of
     order by due_on, id
     limit p_limit
  loop
    perform public.purge_learner_record(v_one);
    v_learners := v_learners + 1;
  end loop;

  select count(*)::int into v_cases_left
    from public.retention_due_records
   where kind = 'support_case' and due_on <= v_as_of;
  select count(*)::int into v_screen_left
    from public.retention_due_records
   where kind = 'screening' and due_on <= v_as_of;
  select count(*)::int into v_learner_left
    from public.retention_due_records
   where kind = 'learner_record' and due_on <= v_as_of;

  -- The run is recorded when it did something. A daily no-op entry would bury
  -- the days that mattered, and the plan already answers "nothing is due".
  if v_cases + v_screenings + v_learners > 0 then
    insert into public.governance_audit_events (actor, action, target_type, detail)
    values (v_actor, 'retention.purged', 'retention_run',
            jsonb_build_object('asOf', v_as_of, 'supportCases', v_cases,
                               'supportCaseMessages', v_messages,
                               'screenings', v_screenings,
                               'learnerRecords', v_learners, 'limit', p_limit));
  end if;

  return jsonb_build_object(
    'asOf', v_as_of,
    'deleted', jsonb_build_object(
      'supportCases', v_cases,
      'supportCaseMessages', v_messages,
      'screenings', v_screenings,
      'learnerRecords', v_learners),
    'remaining', jsonb_build_object(
      'supportCases', v_cases_left,
      'screenings', v_screen_left,
      'learnerRecords', v_learner_left),
    'audited', v_cases + v_screenings + v_learners > 0);
end;
$$;

revoke all on function public.run_retention_jobs(timestamptz, integer) from public, anon;
grant execute on function public.run_retention_jobs(timestamptz, integer) to authenticated;

comment on function public.run_retention_jobs(timestamptz, integer) is
  'Deletes what the three clocks say is due — closed support cases past three years, screening records past seven, children''s learning records past thirty days — in bounded batches, and writes one audit event when it removed anything.';
