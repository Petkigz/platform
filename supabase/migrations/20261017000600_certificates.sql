-- Group 2 · certificates
--
-- Recorded rules: "Idempotent issuance", "Minimal public verification",
-- "Revoke rather than delete". D5 adds the reason: a certificate is a
-- snapshot of what a specific version of a course required, so it stays true
-- even after that version is retired.
--
-- D7: certificates are never hard-deleted and are retained indefinitely.
-- There is no deleted_at and no DELETE policy — revocation is a status.

create sequence public.certificate_number_seq;

create table public.certificates (
  id uuid primary key default gen_random_uuid(),

  learner_profile_id uuid not null
    references public.learner_profiles (id) on delete restrict,

  course_enrolment_id uuid not null
    references public.course_enrolments (id) on delete restrict,

  certificate_number text not null unique,

  status text not null default 'issued'
    check (status in ('issued', 'revoked')),

  issued_at timestamptz not null default now(),
  issued_by uuid not null
    references public.user_profiles (user_id) on delete restrict,

  revoked_at timestamptz,
  revoked_by uuid references public.user_profiles (user_id) on delete restrict,
  revocation_reason text,

  template_version text not null check (length(trim(template_version)) > 0),

  -- "Optional verification token hash." Stored hashed so a leaked database
  -- cannot be used to forge a verification link.
  verification_token_hash text check (
    verification_token_hash is null or verification_token_hash ~ '^[a-f0-9]{64}$'
  ),

  -- ---------------------------------------------------------------------
  -- The snapshot. These columns are the certificate; everything above them
  -- is metadata. Denormalised on purpose, because the course row will move
  -- on and the certificate must not.
  -- ---------------------------------------------------------------------
  course_title text not null check (length(trim(course_title)) > 0),
  course_version_number integer not null check (course_version_number > 0),
  course_language text not null,
  learner_display_name text not null check (length(trim(learner_display_name)) > 0),
  criteria_snapshot jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint certificates_revocation_agrees check (
    (status = 'revoked') = (revoked_at is not null and revoked_by is not null)
  ),
  constraint certificates_revocation_has_reason check (
    status <> 'revoked' or (revocation_reason is not null and length(trim(revocation_reason)) > 0)
  )
);

-- Idempotency: one certificate per enrolment, forever. Re-issuing returns the
-- existing row rather than creating a second claim to the same achievement.
create unique index certificates_one_per_enrolment
  on public.certificates (course_enrolment_id);

create index certificates_learner_idx on public.certificates (learner_profile_id);
create index certificates_status_idx  on public.certificates (status);

create trigger certificates_set_updated_at
  before update on public.certificates
  for each row execute function public.set_updated_at();

-- The snapshot may not drift after issue. A certificate is a record of a
-- moment; editing it would make it a lie.
create or replace function public.protect_certificate_snapshot()
returns trigger
language plpgsql
as $$
begin
  if new.course_title            is distinct from old.course_title
     or new.course_version_number is distinct from old.course_version_number
     or new.course_language       is distinct from old.course_language
     or new.learner_display_name  is distinct from old.learner_display_name
     or new.criteria_snapshot     is distinct from old.criteria_snapshot
     or new.certificate_number    is distinct from old.certificate_number
     or new.issued_at             is distinct from old.issued_at
     or new.issued_by             is distinct from old.issued_by
     or new.template_version      is distinct from old.template_version then
    raise exception
      'certificate % is an issued record and its snapshot is immutable', old.id
      using errcode = 'insufficient_privilege';
  end if;

  -- Once revoked, a certificate stays revoked.
  if old.status = 'revoked' and new.status <> 'revoked' then
    raise exception 'certificate % is revoked and may not be reinstated', old.id
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger certificates_protect_snapshot
  before update on public.certificates
  for each row execute function public.protect_certificate_snapshot();

-- ---------------------------------------------------------------------------
-- issuance
-- ---------------------------------------------------------------------------
create or replace function public.issue_certificate(
  p_enrolment_id uuid,
  p_actor_id     uuid,
  p_token_hash   text default null
)
returns public.certificates
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing  public.certificates;
  v_enrolment public.course_enrolments;
  v_policy    public.course_completion_policies;
  v_version   public.course_versions;
  v_course    public.courses;
  v_learner   public.learner_profiles;
  v_eval      record;
  v_number    text;
  v_criteria  jsonb;
  v_result    public.certificates;
begin
  -- Idempotent: an existing certificate for this enrolment is returned as-is.
  select * into v_existing from public.certificates
   where course_enrolment_id = p_enrolment_id;
  if found then
    return v_existing;
  end if;

  if not public.is_privileged(p_actor_id)
     and not public.has_role(p_actor_id, 'support_agent') then
    raise exception 'actor % may not issue certificates', p_actor_id
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_enrolment from public.course_enrolments where id = p_enrolment_id;
  if not found then
    raise exception 'enrolment % not found', p_enrolment_id using errcode = 'no_data_found';
  end if;

  select * into v_policy from public.course_completion_policies
   where course_version_id = v_enrolment.course_version_id;
  if not found or not v_policy.certificate_enabled then
    raise exception
      'course version % does not issue certificates', v_enrolment.course_version_id
      using errcode = 'check_violation';
  end if;

  select * into v_eval from public.evaluate_completion(p_enrolment_id);
  if not v_eval.is_complete then
    raise exception
      'enrolment % is not complete: %', p_enrolment_id, array_to_string(v_eval.blocking, '; ')
      using errcode = 'check_violation';
  end if;

  select * into v_version from public.course_versions where id = v_enrolment.course_version_id;
  select * into v_course  from public.courses where id = v_enrolment.course_id;
  select * into v_learner from public.learner_profiles where id = v_enrolment.learner_profile_id;

  v_number := 'AS-' || to_char(v_enrolment.enrolled_at, 'YYYY') || '-'
              || lpad(nextval('public.certificate_number_seq')::text, 8, '0');

  -- The criteria are captured as they stood, so verification can show what
  -- was actually required rather than what is required today.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'type', ccr.type,
        'minimum_score', ccr.minimum_score,
        'minimum_percent', ccr.minimum_percent,
        'is_required', ccr.is_required
      ) order by ccr.position
    ), '[]'::jsonb)
    into v_criteria
    from public.course_completion_requirements ccr
   where ccr.completion_policy_id = v_policy.id;

  insert into public.certificates
    (learner_profile_id, course_enrolment_id, certificate_number, issued_by,
     template_version, verification_token_hash,
     course_title, course_version_number, course_language,
     learner_display_name, criteria_snapshot)
  values
    (v_enrolment.learner_profile_id, p_enrolment_id, v_number, p_actor_id,
     v_policy.certificate_template_version, p_token_hash,
     v_course.title, v_version.version_number, v_version.language,
     v_learner.display_name, v_criteria)
  returning * into v_result;

  -- Completing the course is a fact about the enrolment, not just the
  -- certificate, so record it once here rather than trusting a client.
  if v_enrolment.completed_at is null then
    perform set_config('app.bypassing_version_lock', 'on', true);
    update public.course_enrolments
       set status = 'completed', completed_at = now()
     where id = p_enrolment_id and status = 'active';
    perform set_config('app.bypassing_version_lock', 'off', true);
  end if;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- revocation — never deletion
-- ---------------------------------------------------------------------------
create or replace function public.revoke_certificate(
  p_certificate_id uuid,
  p_actor_id       uuid,
  p_reason         text
)
returns public.certificates
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.certificates;
begin
  select * into v from public.certificates where id = p_certificate_id for update;
  if not found then
    raise exception 'certificate % not found', p_certificate_id using errcode = 'no_data_found';
  end if;

  if not public.is_privileged(p_actor_id) then
    raise exception 'actor % may not revoke certificates', p_actor_id
      using errcode = 'insufficient_privilege';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'revoking a certificate requires a reason; it stays on the public record'
      using errcode = 'check_violation';
  end if;

  if v.status = 'revoked' then
    return v;
  end if;

  update public.certificates
     set status = 'revoked', revoked_at = now(),
         revoked_by = p_actor_id, revocation_reason = p_reason
   where id = p_certificate_id
  returning * into v;

  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- public verification
--
-- "Minimal public verification": confirm a number exists and is valid,
-- disclose only what a verifier needs. security definer so it can read
-- through RLS without exposing the underlying tables to anon.
-- ---------------------------------------------------------------------------
create or replace function public.verify_certificate(p_certificate_number text)
returns table (
  valid              boolean,
  status             text,
  course_title       text,
  learner_name       text,
  issued_on          timestamptz,
  course_version     integer,
  language           text,
  revoked_reason     text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.status = 'issued'  as valid,
    c.status,
    c.course_title,
    c.learner_display_name,
    c.issued_at,
    c.course_version_number,
    c.course_language,
    c.revocation_reason
  from public.certificates c
  where c.certificate_number = p_certificate_number;
$$;

revoke execute on function public.issue_certificate(uuid, uuid, text) from public, anon;
grant  execute on function public.issue_certificate(uuid, uuid, text) to authenticated;

revoke execute on function public.revoke_certificate(uuid, uuid, text) from public, anon;
grant  execute on function public.revoke_certificate(uuid, uuid, text) to authenticated;

revoke execute on function public.verify_certificate(text) from public;
grant  execute on function public.verify_certificate(text) to anon, authenticated;

comment on table public.certificates is
  'Immutable snapshots of an achievement. Revoked, never deleted (D7).';
comment on function public.issue_certificate(uuid, uuid, text) is
  'Idempotent. Requires a certificate-enabled policy and a genuinely complete enrolment.';
comment on function public.revoke_certificate(uuid, uuid, text) is
  'Privileged only, reason mandatory, irreversible.';
comment on function public.verify_certificate(text) is
  'Minimal public disclosure for a certificate number.';
