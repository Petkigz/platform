-- Cohorts: a dated group that goes through a published course together.
--
-- Why this table exists at all. Assessments are pinned to a course *version* and
-- locked once it is published (`lock_assessment_of_locked_version`,
-- `guard_draft_assessments_at_publication`), so a teacher cannot add work to a
-- course that is already live without cutting a new version and sending it back
-- through review. Everything dated — homework with a deadline, a term, a class
-- that starts on Monday — therefore needs a container that lives beside the
-- published course rather than inside it. This is that container. Assignments
-- come next and hang off it.
--
-- Two recorded decisions shape the rules below:
--   * **Both models are wanted**: catalogue courses stay self-paced, and a
--     teacher can also open a dated cohort of the same course. A cohort is
--     optional and additive; nothing about self-paced enrolment changes.
--   * **The course author marks the work**, so a cohort belongs to its course's
--     author. There is no cohort-teacher relationship to design, and no second
--     person who can see a roster.

insert into public.platform_settings
  (key, value_type, value_text, description, gate_type, preconditions, flag_group)
values
  ('learning.cohorts', 'boolean', 'false', 'Dated groups that take a published course together',
   'admin',
   'Late-join and late-work policy decided; roster privacy confirmed (learners cannot see each other by default); a teacher has run one real class through it. Assignments and file submissions are separate and still unbuilt.',
   'Learner features')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- cohorts
-- ---------------------------------------------------------------------------

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),

  course_id uuid not null
    references public.courses (id) on delete restrict,

  -- The version the class works through. Pinned with the same composite foreign
  -- key enrolments use, so a version belonging to a different course cannot be
  -- named at all.
  course_version_id uuid not null,
  constraint cohorts_version_belongs_to_course
    foreign key (course_id, course_version_id)
    references public.course_versions (course_id, id) on delete restrict,

  title text not null check (length(trim(title)) between 1 and 120),
  description text check (description is null or length(trim(description)) <= 2000),

  -- The course author, or a privileged account acting for them.
  created_by uuid not null
    references public.user_profiles (user_id) on delete restrict,

  starts_at timestamptz not null,
  -- NULL is an open-ended class: it runs until the teacher closes it.
  ends_at   timestamptz,

  -- NULL means no limit. A teacher with an audience may need one; a markbook
  -- for four hundred people is not a class.
  capacity integer check (capacity is null or capacity > 0),

  status text not null default 'draft'
    check (status in ('draft', 'open', 'closed', 'cancelled')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- D7: soft delete. Members, and later submissions, hang off this row.
  deleted_at timestamptz,

  constraint cohorts_dates_agree check (ends_at is null or ends_at > starts_at)
);

create index cohorts_course_status_idx on public.cohorts (course_id, status)
  where deleted_at is null;
create index cohorts_teacher_idx on public.cohorts (created_by, status);

create trigger cohorts_set_updated_at
  before update on public.cohorts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- cohort_members
-- ---------------------------------------------------------------------------

create table public.cohort_members (
  id uuid primary key default gen_random_uuid(),

  cohort_id uuid not null
    references public.cohorts (id) on delete cascade,

  -- D2: a child is a learner_profile, never a user, so a parent joins a child
  -- to a class exactly as they enrol one in a course.
  learner_profile_id uuid not null
    references public.learner_profiles (id) on delete restrict,

  joined_at timestamptz not null default now(),
  added_by  uuid not null
    references public.user_profiles (user_id) on delete restrict,

  left_at timestamptz,
  left_by uuid references public.user_profiles (user_id) on delete restrict,

  status text not null default 'active'
    check (status in ('active', 'left')),

  constraint cm_status_agrees check ((status = 'left') = (left_at is not null)),
  constraint cm_actor_agrees check ((left_at is null) = (left_by is null)),
  constraint cm_left_after_joined check (left_at is null or left_at >= joined_at)
);

-- One *active* membership per learner per cohort. The partial index is what
-- lets someone leave and rejoin without erasing the record that they were ever
-- in the class.
create unique index cohort_members_one_active_per_cohort
  on public.cohort_members (cohort_id, learner_profile_id)
  where status = 'active';

create index cohort_members_learner_idx on public.cohort_members (learner_profile_id, status);

alter table public.cohorts enable row level security;
alter table public.cohort_members enable row level security;

-- ---------------------------------------------------------------------------
-- Authorization predicates
-- ---------------------------------------------------------------------------

create or replace function public.can_manage_cohort(p_cohort_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.cohorts c
     where c.id = p_cohort_id
       and c.deleted_at is null
       and (c.created_by = public.current_user_id()
            or public.is_privileged(public.current_user_id()))
  );
$$;
revoke all on function public.can_manage_cohort(uuid) from public;
grant execute on function public.can_manage_cohort(uuid) to authenticated;

/**
 * May this caller see this cohort?
 *
 * An open cohort is public to signed-in learners — it is a class they might
 * join, listed on the course page like a start date. Everything else is visible
 * to its teacher, to staff, and to members.
 */
create or replace function public.can_read_cohort(p_cohort_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.cohorts c
     where c.id = p_cohort_id
       and c.deleted_at is null
       and (
         (c.status = 'open' and public.setting_bool('learning.cohorts', false))
         or c.created_by = public.current_user_id()
         or public.is_privileged(public.current_user_id())
         or exists (
           select 1
             from public.cohort_members m
            where m.cohort_id = c.id
              and m.status = 'active'
              and public.can_access_learner(m.learner_profile_id)
         )
       )
  );
$$;
revoke all on function public.can_read_cohort(uuid) from public;
grant execute on function public.can_read_cohort(uuid) to authenticated;

/**
 * May this caller see this membership row?
 *
 * Deliberately narrower than the cohort itself. **A learner cannot see the
 * roster**: who else is in the class, and above all which *children* are in it,
 * is not anyone else's business, and a class list of minors readable by every
 * other member is a safeguarding problem before it is a feature. The teacher and
 * staff see the whole roster; a learner sees their own row and, through
 * `can_access_learner`, the rows of the children in their family.
 *
 * Publishing a roster — a class list everyone can see — is a separate decision
 * and would need its own flag.
 */
create or replace function public.can_read_cohort_member(p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.cohort_members m
      join public.cohorts c on c.id = m.cohort_id
     where m.id = p_member_id
       and (
         public.can_access_learner(m.learner_profile_id)
         or c.created_by = public.current_user_id()
         or public.is_privileged(public.current_user_id())
       )
  );
$$;
revoke all on function public.can_read_cohort_member(uuid) from public;
grant execute on function public.can_read_cohort_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- create_cohort
-- ---------------------------------------------------------------------------

create or replace function public.create_cohort(
  p_course_id uuid,
  p_course_version_id uuid,
  p_title text,
  p_description text,
  p_starts_at timestamptz,
  p_ends_at timestamptz default null,
  p_capacity integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_author uuid;
  v_course_status text;
  v_status text;
  v_id uuid;
begin
  if v_actor is null then
    raise exception 'sign in to open a cohort' using errcode = 'insufficient_privilege';
  end if;

  if not public.setting_bool('learning.cohorts', false) then
    raise exception 'cohorts are not enabled (learning.cohorts is off)'
      using errcode = 'check_violation';
  end if;

  select c.created_by, c.status into v_author, v_course_status
    from public.courses c
   where c.id = p_course_id and c.deleted_at is null
   for update;
  if not found then
    raise exception 'course not found' using errcode = 'no_data_found';
  end if;

  -- The author of the course opens the class. Not "any teacher": the person who
  -- marks the work is the person who set it, and a second teacher with a roster
  -- of another teacher's learners is a conflict nobody has designed rules for.
  if v_author <> v_actor and not public.is_privileged(v_actor) then
    raise exception 'only the course author can open a cohort for this course'
      using errcode = 'insufficient_privilege';
  end if;
  if v_course_status <> 'active' then
    raise exception 'a cohort needs an active course'
      using errcode = 'check_violation';
  end if;

  select cv.version_status into v_status
    from public.course_versions cv
   where cv.id = p_course_version_id and cv.course_id = p_course_id;
  if not found then
    raise exception 'course version not found' using errcode = 'no_data_found';
  end if;
  if v_status <> 'published' then
    raise exception 'a cohort needs a published course version'
      using errcode = 'check_violation';
  end if;

  if p_starts_at is null then
    raise exception 'a cohort needs a start date' using errcode = 'check_violation';
  end if;
  if p_starts_at < now() then
    raise exception 'a cohort must start now or later' using errcode = 'check_violation';
  end if;
  if p_ends_at is not null and p_ends_at <= p_starts_at then
    raise exception 'a cohort must end after it starts' using errcode = 'check_violation';
  end if;
  if p_capacity is not null and p_capacity < 1 then
    raise exception 'capacity must be at least one' using errcode = 'check_violation';
  end if;

  insert into public.cohorts
    (course_id, course_version_id, title, description, created_by,
     starts_at, ends_at, capacity, status)
  values
    (p_course_id, p_course_version_id, trim(p_title), nullif(trim(coalesce(p_description, '')), ''),
     v_actor, p_starts_at, p_ends_at, p_capacity, 'draft')
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'cohort.created', 'cohort', v_id,
          jsonb_build_object('course_id', p_course_id,
                             'course_version_id', p_course_version_id,
                             'starts_at', p_starts_at, 'ends_at', p_ends_at,
                             'capacity', p_capacity));

  return v_id;
end;
$$;
revoke all on function public.create_cohort(uuid, uuid, text, text, timestamptz, timestamptz, integer) from public;
grant execute on function public.create_cohort(uuid, uuid, text, text, timestamptz, timestamptz, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Status transitions
-- ---------------------------------------------------------------------------

create or replace function public.set_cohort_status(p_cohort_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_current text;
  v_starts timestamptz;
  v_ends timestamptz;
  v_course_status text;
  v_version_status text;
begin
  if v_actor is null then
    raise exception 'sign in to change a cohort' using errcode = 'insufficient_privilege';
  end if;

  if p_status is null or p_status not in ('draft', 'open', 'closed', 'cancelled') then
    raise exception 'unknown cohort status' using errcode = 'check_violation';
  end if;

  select c.status, c.starts_at, c.ends_at into v_current, v_starts, v_ends
    from public.cohorts c
   where c.id = p_cohort_id and c.deleted_at is null
   for update;
  if not found then
    raise exception 'cohort not found' using errcode = 'no_data_found';
  end if;

  if not public.can_manage_cohort(p_cohort_id) then
    raise exception 'only the teacher who opened this cohort can change it'
      using errcode = 'insufficient_privilege';
  end if;

  if v_current = p_status then
    return;
  end if;

  if p_status = 'open' and not public.setting_bool('learning.cohorts', false) then
    raise exception 'cohorts are not enabled (learning.cohorts is off)'
      using errcode = 'check_violation';
  end if;

  -- Only forwards, and only from a state that means it. Reopening a cancelled
  -- class would rewrite what people were told, so it is refused: open a new one.
  if not (
    (v_current = 'draft' and p_status in ('open', 'cancelled'))
    or (v_current = 'open' and p_status in ('closed', 'cancelled'))
  ) then
    raise exception 'a cohort cannot move from % to %', v_current, p_status
      using errcode = 'check_violation';
  end if;

  if p_status = 'open' then
    select c.status, cv.version_status into v_course_status, v_version_status
      from public.cohorts h
      join public.courses c on c.id = h.course_id
      join public.course_versions cv on cv.id = h.course_version_id
     where h.id = p_cohort_id;
    if v_course_status <> 'active' or v_version_status <> 'published' then
      raise exception 'a cohort needs an active course and a published course version'
        using errcode = 'check_violation';
    end if;
    if v_starts < now() then
      raise exception 'this cohort was due to start already; open a new one'
        using errcode = 'check_violation';
    end if;
    if v_ends is not null and v_ends <= now() then
      raise exception 'this cohort was due to end already'
        using errcode = 'check_violation';
    end if;
  end if;

  update public.cohorts set status = p_status where id = p_cohort_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'cohort.' || p_status, 'cohort', p_cohort_id,
          jsonb_build_object('from', v_current, 'to', p_status));
end;
$$;
revoke all on function public.set_cohort_status(uuid, text) from public;
grant execute on function public.set_cohort_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- join_cohort
-- ---------------------------------------------------------------------------

create or replace function public.join_cohort(
  p_cohort_id uuid,
  p_learner_profile_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_course uuid;
  v_status text;
  v_ends timestamptz;
  v_capacity integer;
  v_active integer;
  v_version uuid;
  v_id uuid;
begin
  if v_actor is null then
    raise exception 'sign in to join a cohort' using errcode = 'insufficient_privilege';
  end if;

  if not public.setting_bool('learning.cohorts', false) then
    raise exception 'cohorts are not enabled (learning.cohorts is off)'
      using errcode = 'check_violation';
  end if;

  select c.course_id, c.course_version_id, c.status, c.ends_at, c.capacity
    into v_course, v_version, v_status, v_ends, v_capacity
    from public.cohorts c
   where c.id = p_cohort_id and c.deleted_at is null
   for update;
  if not found then
    raise exception 'cohort not found' using errcode = 'no_data_found';
  end if;

  -- Joining is an opt-in by the learner or their guardian. The course author
  -- sees the roster and marks the work, but cannot silently place a child into
  -- a dated class. A guardian may join a child through can_access_learner().
  if not public.can_access_learner(p_learner_profile_id) then
    raise exception 'you can only join a learner you are responsible for'
      using errcode = 'insufficient_privilege';
  end if;

  if v_status <> 'open' then
    raise exception 'this cohort is not open to joiners' using errcode = 'check_violation';
  end if;
  if v_ends is not null and v_ends <= now() then
    raise exception 'this cohort has already ended' using errcode = 'check_violation';
  end if;

  -- A class takes one exact course version, just like an enrolment does (D5).
  -- A learner pinned to a newer edition cannot be placed in the older class and
  -- then find the lessons and assignment context do not match. Existing members
  -- of a cohort continue on its pinned edition when a new version is published;
  -- new cohorts use the new edition.
  if not exists (
    select 1
      from public.course_enrolments ce
     where ce.course_id = v_course
       and ce.course_version_id = v_version
       and ce.learner_profile_id = p_learner_profile_id
       and ce.status in ('active', 'completed')
       and ce.deleted_at is null
  ) then
    raise exception 'this learner must be enrolled in this course version first'
      using errcode = 'insufficient_privilege';
  end if;

  if exists (
    select 1 from public.cohort_members m
     where m.cohort_id = p_cohort_id
       and m.learner_profile_id = p_learner_profile_id
       and m.status = 'active'
  ) then
    raise exception 'this learner is already in the cohort' using errcode = 'unique_violation';
  end if;

  if v_capacity is not null then
    select count(*) into v_active
      from public.cohort_members m
     where m.cohort_id = p_cohort_id and m.status = 'active';
    if v_active >= v_capacity then
      raise exception 'this cohort is full' using errcode = 'program_limit_exceeded';
    end if;
  end if;

  insert into public.cohort_members (cohort_id, learner_profile_id, added_by)
  values (p_cohort_id, p_learner_profile_id, v_actor)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'cohort.joined', 'cohort_member', v_id,
          jsonb_build_object('cohort_id', p_cohort_id,
                             'learner_profile_id', p_learner_profile_id));

  return v_id;
end;
$$;
revoke all on function public.join_cohort(uuid, uuid) from public;
grant execute on function public.join_cohort(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- leave_cohort
-- ---------------------------------------------------------------------------

create or replace function public.leave_cohort(p_cohort_id uuid, p_learner_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_id uuid;
  v_teacher boolean;
begin
  if v_actor is null then
    raise exception 'sign in to leave a cohort' using errcode = 'insufficient_privilege';
  end if;

  -- Not flag-gated, on purpose: switching cohorts off must not leave anyone
  -- unable to leave a class, the same reasoning as removal from a saved list.
  select (c.created_by = v_actor or public.is_privileged(v_actor)) into v_teacher
    from public.cohorts c
   where c.id = p_cohort_id and c.deleted_at is null;
  if not found then
    raise exception 'cohort not found' using errcode = 'no_data_found';
  end if;

  if not v_teacher and not public.can_access_learner(p_learner_profile_id) then
    raise exception 'you can only remove a learner you are responsible for'
      using errcode = 'insufficient_privilege';
  end if;

  update public.cohort_members
     set status = 'left', left_at = now(), left_by = v_actor
   where cohort_id = p_cohort_id
     and learner_profile_id = p_learner_profile_id
     and status = 'active'
  returning id into v_id;

  if v_id is null then
    raise exception 'this learner is not in the cohort' using errcode = 'no_data_found';
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'cohort.left', 'cohort_member', v_id,
          jsonb_build_object('cohort_id', p_cohort_id,
                             'learner_profile_id', p_learner_profile_id,
                             'removed_by_teacher', v_teacher));
end;
$$;
revoke all on function public.leave_cohort(uuid, uuid) from public;
grant execute on function public.leave_cohort(uuid, uuid) to authenticated;

/** How many active members a cohort has, for the joiner-facing "3 of 12 places". */
create or replace function public.cohort_member_count(p_cohort_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
    from public.cohort_members m
   where m.cohort_id = p_cohort_id
     and m.status = 'active'
     and public.can_read_cohort(p_cohort_id);
$$;
revoke all on function public.cohort_member_count(uuid) from public;
grant execute on function public.cohort_member_count(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

create policy cohorts_read on public.cohorts
  for select to authenticated
  using (public.can_read_cohort(id));

create policy cohort_members_read on public.cohort_members
  for select to authenticated
  using (public.can_read_cohort_member(id));

-- No insert, update or delete policies: every write goes through a function,
-- and the grants below are select only. A direct write is refused by privilege
-- rather than by policy, which is the louder failure.
revoke all on public.cohorts, public.cohort_members from anon, authenticated;
grant select on public.cohorts, public.cohort_members to authenticated;

comment on table public.cohorts is
  'A dated group taking a published course version together, opened by the course author; flag-gated by learning.cohorts.';
comment on table public.cohort_members is
  'Who is in a cohort. The roster is readable by the teacher and staff only — a learner sees their own row and their family’s, never a class list of other people’s children.';
comment on function public.can_manage_cohort(uuid) is
  'The course author who opened this cohort, or a privileged role.';
comment on function public.can_read_cohort(uuid) is
  'Open cohorts are visible to signed-in users only while learning.cohorts is on; otherwise only the teacher, staff and members can still read them.';
comment on function public.can_read_cohort_member(uuid) is
  'Own row, a learner the caller is responsible for, the cohort’s teacher, or a privileged role. Deliberately narrower than can_read_cohort.';
comment on function public.join_cohort(uuid, uuid) is
  'Opt-in by a learner or their guardian (staff can assist). The course author cannot silently add a child. Requires an open cohort that has not ended, spare capacity, and an active enrolment pinned to the same course version.';
comment on function public.create_cohort(uuid, uuid, text, text, timestamptz, timestamptz, integer) is
  'The course author opens a draft cohort on an active course and an exact published version; dates and capacity are validated, and creation is audited.';
comment on function public.set_cohort_status(uuid, text) is
  'Only forward transitions are allowed. Opening requires the flag, an active course, and a still-published version; closing/cancelling an existing cohort remains possible when the flag is off.';
comment on function public.cohort_member_count(uuid) is
  'Returns only the number of active members, not their identities; readable only by a caller who can read the cohort.';
comment on function public.leave_cohort(uuid, uuid) is
  'Leaves or removes, with the membership row kept rather than deleted. Not flag-gated, so disabling cohorts cannot trap anyone in a class.';
