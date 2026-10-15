-- Group 2 · enrolments
--
-- Recorded rule: "Enrolments pin exact course version; new versions do not
-- mutate existing enrolments." This is the rule that makes D5 worth anything
-- — an immutable version nobody pins is just an archive.
--
-- The pin is enforced two ways, because a single check is not enough:
--   1. a composite foreign key, so a version id that belongs to a different
--      course cannot be pinned at all;
--   2. a trigger, so the pin cannot be changed by an ordinary UPDATE.
-- Re-pinning is an explicit, audited act via re_pin_enrolment().

-- Needed for the composite foreign key below.
alter table public.course_versions
  add constraint course_versions_course_and_id_key unique (course_id, id);

create table public.course_enrolments (
  id uuid primary key default gen_random_uuid(),

  -- D2: children are learner_profiles, never users. Adults have a
  -- learner_profile linked to their user, so this column serves both.
  learner_profile_id uuid not null
    references public.learner_profiles (id) on delete restrict,

  course_id uuid not null
    references public.courses (id) on delete restrict,

  -- The pin. The composite key guarantees it belongs to course_id.
  course_version_id uuid not null,
  constraint course_enrolments_version_belongs_to_course
    foreign key (course_id, course_version_id)
    references public.course_versions (course_id, id) on delete restrict,

  -- D1
  institution_id uuid references public.institutions (id) on delete restrict,

  source text not null default 'free'
    check (source in
      ('free', 'purchase', 'subscription', 'family_entitlement', 'admin_grant', 'scholarship')),

  status text not null default 'active'
    check (status in ('active', 'completed', 'withdrawn', 'suspended', 'expired')),

  enrolled_at  timestamptz not null default now(),
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- D7: soft delete. An enrolment is the anchor for progress and certificates;
  -- removing it would orphan both.
  deleted_at timestamptz,

  constraint ce_completed_requires_completed_at
    check ((status = 'completed') = (completed_at is not null))
);

-- One live enrolment per learner per course. A withdrawn one may be replaced;
-- that is why the index is partial.
create unique index course_enrolments_one_active_per_course
  on public.course_enrolments (learner_profile_id, course_id)
  where status in ('active', 'completed') and deleted_at is null;

create index course_enrolments_version_idx  on public.course_enrolments (course_version_id);
create index course_enrolments_learner_idx  on public.course_enrolments (learner_profile_id);
create index course_enrolments_institution_idx on public.course_enrolments (institution_id);

create trigger course_enrolments_set_updated_at
  before update on public.course_enrolments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- the pin
-- ---------------------------------------------------------------------------
create or replace function public.protect_enrolment_pin()
returns trigger
language plpgsql
as $$
begin
  -- security definer bypasses RLS but not triggers, so the audited re-pin
  -- path needs an explicit, transaction-local bypass of its own.
  if coalesce(current_setting('app.bypassing_enrolment_pin', true), '') = 'on' then
    return new;
  end if;

  if new.course_version_id is distinct from old.course_version_id then
    raise exception
      'enrolment % is pinned to course version % and may only be re-pinned through re_pin_enrolment(), which records the reason (D5)',
      old.id, old.course_version_id
      using errcode = 'insufficient_privilege';
  end if;

  if new.learner_profile_id is distinct from old.learner_profile_id
     or new.course_id is distinct from old.course_id then
    raise exception
      'enrolment % cannot be moved to a different learner or course; withdraw it and enrol again',
      old.id
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger course_enrolments_protect_pin
  before update on public.course_enrolments
  for each row execute function public.protect_enrolment_pin();

-- ---------------------------------------------------------------------------
-- course_enrolment_version_history
--
-- Append-only. There is no UPDATE or DELETE policy, and no updated_at.
-- "Preserve old progress, scores and certificates": re-pinning deliberately
-- does not touch lesson_progress, assessment_attempts or certificates, so a
-- learner who moves to a new version keeps their record under the old one.
-- ---------------------------------------------------------------------------
create table public.course_enrolment_version_history (
  id uuid primary key default gen_random_uuid(),

  course_enrolment_id uuid not null
    references public.course_enrolments (id) on delete restrict,

  from_version_id uuid not null
    references public.course_versions (id) on delete restrict,
  to_version_id uuid not null
    references public.course_versions (id) on delete restrict,

  initiator uuid not null
    references public.user_profiles (user_id) on delete restrict,

  reason text not null check (length(trim(reason)) > 0),

  method text not null default 'admin'
    check (method in ('admin', 'learner_request', 'course_merge', 'data_repair')),

  occurred_at timestamptz not null default now(),

  constraint cev_history_versions_differ
    check (from_version_id <> to_version_id)
);

create index cev_history_enrolment_idx
  on public.course_enrolment_version_history (course_enrolment_id);

-- ---------------------------------------------------------------------------
-- re-pinning
-- ---------------------------------------------------------------------------
create or replace function public.re_pin_enrolment(
  p_enrolment_id  uuid,
  p_to_version_id uuid,
  p_actor_id      uuid,
  p_reason        text,
  p_method        text default 'admin'
)
returns public.course_enrolments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enrolment public.course_enrolments;
  v_result    public.course_enrolments;
  v_from      uuid;
begin
  select * into v_enrolment from public.course_enrolments
   where id = p_enrolment_id for update;
  if not found then
    raise exception 'enrolment % not found', p_enrolment_id using errcode = 'no_data_found';
  end if;

  if not public.is_privileged(p_actor_id) then
    raise exception
      'actor % is not privileged and may not re-pin enrolment %', p_actor_id, p_enrolment_id
      using errcode = 'insufficient_privilege';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 're-pinning requires a reason; this is an audited change'
      using errcode = 'check_violation';
  end if;

  -- The new pin must belong to the same course, and must be published.
  if not exists (
    select 1 from public.course_versions cv
     where cv.id = p_to_version_id
       and cv.course_id = v_enrolment.course_id
       and cv.version_status = 'published'
  ) then
    raise exception
      'version % is not a published version of the enrolled course', p_to_version_id
      using errcode = 'check_violation';
  end if;

  v_from := v_enrolment.course_version_id;

  -- Only the pin moves. Progress, attempts and certificates stay where they
  -- are, attached to the versions they were earned against.
  perform set_config('app.bypassing_enrolment_pin', 'on', true);
  update public.course_enrolments
     set course_version_id = p_to_version_id
   where id = p_enrolment_id;
  perform set_config('app.bypassing_enrolment_pin', 'off', true);

  insert into public.course_enrolment_version_history
    (course_enrolment_id, from_version_id, to_version_id, initiator, reason, method)
  values
    (p_enrolment_id, v_from, p_to_version_id, p_actor_id, p_reason, p_method);

  -- A parenthesised subquery cannot be returned as a composite; assign first.
  select * into v_result from public.course_enrolments where id = p_enrolment_id;
  return v_result;
end;
$$;

revoke execute on function public.re_pin_enrolment(uuid, uuid, uuid, text, text) from public, anon;
grant  execute on function public.re_pin_enrolment(uuid, uuid, uuid, text, text) to authenticated;

comment on table public.course_enrolments is
  'Learner <-> course, pinned to one immutable version (D5).';
comment on table public.course_enrolment_version_history is
  'Append-only audit of every re-pin. Progress, scores and certificates are deliberately untouched by a re-pin.';
comment on function public.re_pin_enrolment(uuid, uuid, uuid, text, text) is
  'The only way to move an enrolment between versions. Privileged only, reason mandatory, history written.';
