-- Group 4 · entitlements
--
-- Recorded rules: "Payment state, subscription state and entitlement are
-- separate", "Free content may be accessed without payment", "Course
-- suspension overrides entitlement", and "Access expiry retains progress and
-- certificate history."
--
-- entitlement_grants is the single authoritative answer to "may this learner
-- open this content". Nothing else is consulted at access time. That is what
-- makes the separation real: a payment can fail, a subscription can lapse, and
-- access follows the grant rather than the invoice.

-- Course suspension is a governance act, and the recorded rule says it
-- overrides entitlement. It needs a column to live on.
alter table public.courses
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text,
  add column if not exists suspended_by uuid
    references public.user_profiles (user_id) on delete set null;

alter table public.courses
  drop constraint if exists courses_suspension_agrees;
alter table public.courses
  add constraint courses_suspension_agrees check (
    (suspended_at is null) = (suspended_reason is null)
  );

create table public.entitlement_grants (
  id uuid primary key default gen_random_uuid(),

  learner_profile_id uuid not null
    references public.learner_profiles (id) on delete restrict,

  institution_id uuid references public.institutions (id) on delete restrict,

  -- What the grant covers.
  scope_type text not null default 'course_version'
    check (scope_type in ('course_version', 'course', 'subject', 'feature')),

  course_id uuid references public.courses (id) on delete restrict,
  course_version_id uuid references public.course_versions (id) on delete restrict,
  subject_area_id uuid references public.subject_areas (id) on delete restrict,
  feature_code text,

  constraint eg_scope_matches check (
    case scope_type
      when 'course_version' then course_version_id is not null
      when 'course'         then course_id is not null and course_version_id is null
      when 'subject'        then subject_area_id is not null
                                and course_id is null and course_version_id is null
      when 'feature'        then feature_code is not null
                                and course_id is null and course_version_id is null
                                and subject_area_id is null
    end
  ),

  -- Where the grant came from. This is the audit answer to "why do they have
  -- access" and it is never inferred.
  source_type text not null
    check (source_type in
      ('purchase', 'subscription', 'family_entitlement', 'free', 'scholarship',
       'admin_grant', 'promotion')),

  source_id uuid,

  status text not null default 'active'
    check (status in ('active', 'suspended', 'revoked', 'expired')),

  effective_from timestamptz not null default now(),
  effective_until timestamptz,

  revoked_at timestamptz,
  revoked_by uuid references public.user_profiles (user_id) on delete set null,
  revocation_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- D7: expiry retains progress and certificate history, so a grant is never
  -- deleted — it changes status.

  constraint eg_window check (
    effective_until is null or effective_from <= effective_until
  ),
  constraint eg_revocation_agrees check (
    (status = 'revoked') = (revoked_at is not null and revocation_reason is not null)
  ),
  constraint eg_active_is_live check (
    status <> 'active' or effective_until is null or effective_until > now()
  )
);

create index eg_learner_idx  on public.entitlement_grants (learner_profile_id);
create index eg_version_idx  on public.entitlement_grants (course_version_id);
create index eg_status_idx   on public.entitlement_grants (status);

create trigger entitlement_grants_set_updated_at
  before update on public.entitlement_grants
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- entitlement_events — append-only
-- ---------------------------------------------------------------------------
create table public.entitlement_events (
  id uuid primary key default gen_random_uuid(),

  entitlement_grant_id uuid not null
    references public.entitlement_grants (id) on delete restrict,

  event_type text not null
    check (event_type in ('granted', 'activated', 'suspended', 'restored', 'revoked', 'expired')),

  from_status text,
  to_status text not null,

  reason text,
  performed_by uuid references public.user_profiles (user_id) on delete set null,
  occurred_at timestamptz not null default now()
);

create index entitlement_events_grant_idx on public.entitlement_events (entitlement_grant_id);

create or replace function public.reject_entitlement_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'entitlement events are append-only'
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger entitlement_events_append_only
  before update or delete on public.entitlement_events
  for each row execute function public.reject_entitlement_event_mutation();

create or replace function public.record_entitlement_status_change()
returns trigger
language plpgsql
as $$
declare
  v_type text;
begin
  v_type := case
    when old.status = 'active' and new.status = 'suspended' then 'suspended'
    when old.status = 'suspended' and new.status = 'active' then 'restored'
    when new.status = 'revoked' then 'revoked'
    when new.status = 'expired' then 'expired'
    when old.status is distinct from new.status then 'activated'
    else null
  end;

  if v_type is not null then
    insert into public.entitlement_events
      (entitlement_grant_id, event_type, from_status, to_status, reason, performed_by)
    values (new.id, v_type, old.status, new.status,
            coalesce(new.revocation_reason, ''), new.revoked_by);
  end if;

  return new;
end;
$$;

create trigger entitlement_grants_record_event
  after update of status on public.entitlement_grants
  for each row
  when (new.status is distinct from old.status)
  execute function public.record_entitlement_status_change();

-- ---------------------------------------------------------------------------
-- access_checks — diagnostics only, explicitly not the source of truth
-- ---------------------------------------------------------------------------
create table public.access_checks (
  id uuid primary key default gen_random_uuid(),

  learner_profile_id uuid references public.learner_profiles (id) on delete cascade,
  course_version_id uuid references public.course_versions (id) on delete cascade,

  was_allowed boolean not null,
  reason text,

  checked_at timestamptz not null default now()
);

create index access_checks_recent_idx on public.access_checks (checked_at desc);

-- ---------------------------------------------------------------------------
-- The access check
--
-- security definer so it can read across RLS. This is the only function the
-- application should call to answer "may this learner open this".
-- ---------------------------------------------------------------------------
create or replace function public.can_access_course_version(
  p_learner_id uuid,
  p_version_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.course_versions cv
      join public.courses c on c.id = cv.course_id
     where cv.id = p_version_id
       -- Suspension overrides entitlement. Deletion ends access.
       --
       -- Retirement deliberately does NOT: D6 says unpublishing stops new
       -- enrolments, but already-enrolled learners keep access and issued
       -- certificates stay verifiable. Filtering on c.status here would have
       -- quietly broken that promise.
       and c.suspended_at is null
       and c.deleted_at is null
       and exists (
         select 1 from public.entitlement_grants eg
          where eg.learner_profile_id = p_learner_id
            and eg.status = 'active'
            and now() >= eg.effective_from
            and (eg.effective_until is null or eg.effective_until > now())
            and (
              eg.scope_type = 'course_version' and eg.course_version_id = p_version_id
              or eg.scope_type = 'course' and eg.course_id = cv.course_id
              or eg.scope_type = 'subject' and exists (
                select 1 from public.course_version_subjects cvs
                 where cvs.course_version_id = p_version_id
                   and cvs.subject_area_id = eg.subject_area_id)
            )
       )
  );
$$;

-- Free content: preview lessons are open without payment, per the recorded
-- rule "Free content may be accessed without payment".
create or replace function public.can_access_lesson(
  p_learner_id uuid,
  p_lesson_id  uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.lessons l
      join public.course_sections cs on cs.id = l.section_id
     where l.id = p_lesson_id
       and (l.is_preview
            or public.can_access_course_version(p_learner_id, cs.course_version_id))
  );
$$;

comment on table public.entitlement_grants is
  'The single authoritative answer to "may this learner open this". Never deleted, only status-changed.';
comment on table public.access_checks is
  'Diagnostics only. Recorded so a support agent can explain a denial. Never consulted for a decision.';
comment on function public.can_access_course_version(uuid, uuid) is
  'Entitlement, minus suspension. The only function the application should call.';
comment on function public.can_access_lesson(uuid, uuid) is
  'Preview lessons are free; everything else goes through the entitlement check.';
