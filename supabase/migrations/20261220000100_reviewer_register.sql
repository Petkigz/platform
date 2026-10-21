-- Somebody can be made a reviewer.
--
-- THE DEAD END
-- ------------
-- Publishing a course version requires a scholarly approval: `governance.min_
-- approvals` ships at 1, and `enforce_publication_gate()` counts distinct
-- `content_review_decisions` rows with review_scope = 'scholarly' and decision =
-- 'approved'. A decision can only be recorded against an assignment, and
-- `validate_review_assignment()` only accepts a reviewer whose `reviewer_profiles`
-- row reads 'active' — a status that also has to carry `verified_at` and
-- `verified_by`, because verification is a fact rather than a label.
--
-- Nothing in the product could produce that row. A user may insert their own
-- `reviewer_profiles` row (`reviewer_profiles_insert` admits `user_id =
-- current_user_id()`), and staff may update one (`reviewer_profiles_update` admits
-- a privileged caller), but no screen or route did either, and there is no
-- registration page — the migration that closed the self-verification hole says so
-- in as many words. `/admin/reviews` lists reviewers whose status is already
-- 'active', so its dropdown was permanently empty, so no assignment could be made,
-- so no scholarly approval could exist, so **no course version could be published
-- through the product at all**.
--
-- Behind that, three more tables in the same feature had no writer anywhere:
-- `reviewer_qualifications`, `reviewer_subject_authorizations` and
-- `reviewer_conflict_declarations`. The second one matters most, because
-- `is_authorised_reviewer()` is what stops a reviewer approving a subject they hold
-- no authorisation for, and without a way to grant one, the check could only ever
-- refuse — or, since nothing can create a `content_review_requirements` row either,
-- never run at all.
--
-- WHAT THIS ADDS
-- --------------
-- Seven writer functions and the two screens that reach them: a person offers
-- themselves as a reviewer and records their qualifications; governance staff
-- verify the person, verify each qualification, and authorise subjects and scopes;
-- a reviewer declares a conflict and governance staff assess it. Every one of them
-- is audited, because each is a decision about who may speak for the platform on a
-- matter of faith, and a record of who made it is the only thing that makes such a
-- decision reviewable.
--
-- "Governance staff" means `governance_admin` or `platform_admin`, not the blanket
-- `is_privileged()`. That is the convention the money writers already follow with
-- `finance_admin`, and it matters more here: `support_agent` is flagged privileged
-- as the least-privileged staff role, and a support agent appointing somebody to
-- approve Islamic scholarship is not a lesser version of the same decision. The
-- precedent for this domain is `gvc_admin` on `guardian_verification_cases`.
--
-- WHAT THIS DELIBERATELY DOES NOT DECIDE
-- ---------------------------------------
-- A verified qualification is *not* a precondition for an authorisation. The schema
-- already records the separation — "a verified ijazah in tajweed does not let
-- someone approve fiqh, and it does not even let them approve tajweed until a
-- privileged actor says so" — and the converse rule (no authorisation without a
-- verified qualification for that subject) is a governance policy this platform has
-- not decided: `qualification_type` includes 'experience' and
-- 'institutional_affiliation', so the shape of acceptable evidence is not settled
-- either. The screen therefore puts the reviewer's verified qualifications beside
-- the authorisation decision instead of enforcing a relationship between them, and
-- the open question is recorded in NEXT.md rather than guessed at here.
--
-- Also untouched: `content_review_requirements`, `technical_review_checks` and
-- `content_change_assessments`, which are about what a *version* needs rather than
-- who may review it. Until something can state a requirement, an authorisation has
-- nothing to bite on and `validate_review_assignment()` skips its subject loop.

-- ---------------------------------------------------------------------------
-- 1. Offering yourself as a reviewer
-- ---------------------------------------------------------------------------
-- The row is created as an 'applicant'. It cannot be created as anything else:
-- `protect_reviewer_verification()` already refuses a caller who tries to set
-- themselves active, and this function never takes a status parameter, so there is
-- no second path to the same outcome.

create or replace function public.register_as_reviewer(p_public_bio text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_bio   text := nullif(btrim(coalesce(p_public_bio, '')), '');
  v_id    uuid;
  v_row   record;
begin
  if v_actor is null then
    raise exception 'sign in to offer yourself as a reviewer'
      using errcode = 'insufficient_privilege';
  end if;

  if v_bio is not null and length(v_bio) > 2000 then
    raise exception 'a reviewer biography must be 2000 characters or fewer'
      using errcode = 'check_violation';
  end if;

  select rp.id, rp.reviewer_status, rp.deleted_at
    into v_row
    from public.reviewer_profiles rp
   where rp.user_id = v_actor;

  if found then
    if v_row.deleted_at is not null then
      raise exception
        'your reviewer registration was closed; ask platform staff to reopen it'
        using errcode = 'object_not_in_prerequisite_state';
    end if;
    -- One profile per person, and registering twice is not an error worth
    -- failing on: the answer is the state they are already in.
    return jsonb_build_object(
      'reviewerProfileId', v_row.id,
      'status', v_row.reviewer_status,
      'registered', false,
      'note', 'you are already registered as a reviewer');
  end if;

  insert into public.reviewer_profiles (user_id, public_bio, reviewer_status)
  values (v_actor, v_bio, 'applicant')
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'reviewer.registered', 'reviewer_profile', v_id,
          jsonb_build_object('status', 'applicant', 'has_bio', v_bio is not null));

  return jsonb_build_object(
    'reviewerProfileId', v_id,
    'status', 'applicant',
    'registered', true);
end;
$$;

comment on function public.register_as_reviewer(text) is
  'Creates the caller''s own reviewer profile as an applicant. There is no status parameter: becoming active is a staff decision made by set_reviewer_status(), and the trigger on reviewer_profiles already refuses self-verification.';

-- ---------------------------------------------------------------------------
-- 2. Verifying, suspending and retiring a reviewer
-- ---------------------------------------------------------------------------
-- This is the function the platform was missing. Verification is recorded once and
-- never rewritten: reinstating a suspended reviewer does not change who verified
-- them, because that would replace a fact with a newer, less true one.

create or replace function public.set_reviewer_status(
  p_reviewer_profile_id uuid,
  p_status              text,
  p_note                text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_note    text := nullif(btrim(coalesce(p_note, '')), '');
  v_profile record;
  v_changed boolean;
  v_verified_at timestamptz;
begin
  if v_actor is null or not (
       public.has_role(v_actor, 'governance_admin')
    or public.has_role(v_actor, 'platform_admin')) then
    raise exception 'only a governance admin may change who is a reviewer'
      using errcode = 'insufficient_privilege';
  end if;

  -- 'applicant' and 'pending_verification' are states a registration produces, not
  -- states anybody may set by hand: an admin who could move a reviewer back to
  -- 'applicant' could also hide a suspension.
  if p_status is null or p_status not in ('active', 'suspended', 'inactive') then
    raise exception
      'a reviewer status is active, suspended or inactive; % is not one of them',
      coalesce(p_status, 'nothing')
      using errcode = 'check_violation';
  end if;

  -- Taking somebody off the review list ends work in flight, so it needs a reason
  -- in writing. Verifying them does not.
  if p_status in ('suspended', 'inactive') and v_note is null then
    raise exception 'say why this reviewer is being %', p_status
      using errcode = 'check_violation';
  end if;

  if v_note is not null and length(v_note) > 1000 then
    raise exception 'a note must be 1000 characters or fewer'
      using errcode = 'check_violation';
  end if;

  select rp.id, rp.reviewer_status, rp.verified_at, rp.verified_by, rp.deleted_at
    into v_profile
    from public.reviewer_profiles rp
   where rp.id = p_reviewer_profile_id;

  if not found then
    raise exception 'no reviewer profile %', p_reviewer_profile_id
      using errcode = 'no_data_found';
  end if;

  if v_profile.deleted_at is not null then
    raise exception 'reviewer profile % is closed', p_reviewer_profile_id
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  v_changed  := v_profile.reviewer_status is distinct from p_status;
  v_verified_at := v_profile.verified_at;

  if v_changed then
    -- rp_active_requires_verification wants a verifier and a time before the row
    -- may read 'active'. Set them the first time and never again.
    if p_status = 'active' and v_profile.verified_at is null then
      v_verified_at := now();
      update public.reviewer_profiles
         set reviewer_status = p_status,
             verified_at     = v_verified_at,
             verified_by     = v_actor,
             internal_notes  = coalesce(v_note, internal_notes)
       where id = p_reviewer_profile_id;
    else
      update public.reviewer_profiles
         set reviewer_status = p_status,
             internal_notes  = coalesce(v_note, internal_notes)
       where id = p_reviewer_profile_id;
    end if;

    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (v_actor, 'reviewer.status_set', 'reviewer_profile', p_reviewer_profile_id,
            jsonb_build_object(
              'from_status', v_profile.reviewer_status,
              'to_status', p_status,
              'verification_recorded', p_status = 'active' and v_profile.verified_at is null,
              'note', v_note));
  end if;

  return jsonb_build_object(
    'reviewerProfileId', p_reviewer_profile_id,
    'status', p_status,
    'changed', v_changed,
    'verifiedAt', v_verified_at,
    'note', case when v_changed then null
                 else 'this reviewer is already ' || p_status end);
end;
$$;

comment on function public.set_reviewer_status(uuid, text, text) is
  'Governance staff only (governance_admin or platform_admin). Verifies an applicant (recording who verified them and when, once), suspends or retires a reviewer, and audits every change. Suspending or retiring needs a written reason. Verification is never rewritten: reinstating keeps the original verifier.';

-- ---------------------------------------------------------------------------
-- 3. Recording a qualification
-- ---------------------------------------------------------------------------
-- Written by the reviewer or by staff on their behalf, and always as 'pending'.
-- The insert grant on the table already excludes the verification columns, so a
-- client could not set them directly either; the point of the function is that
-- there is one path, and that the path is audited.

create or replace function public.record_reviewer_qualification(
  p_reviewer_profile_id uuid,
  p_qualification_type  text,
  p_title               text,
  p_issuing_institution text default null,
  p_subject_area_id     uuid default null,
  p_evidence_reference  text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_title   text := nullif(btrim(coalesce(p_title, '')), '');
  v_issuer  text := nullif(btrim(coalesce(p_issuing_institution, '')), '');
  v_ref     text := nullif(btrim(coalesce(p_evidence_reference, '')), '');
  v_owner   uuid;
  v_id      uuid;
begin
  if v_actor is null then
    raise exception 'sign in to record a qualification'
      using errcode = 'insufficient_privilege';
  end if;

  select rp.user_id into v_owner
    from public.reviewer_profiles rp
   where rp.id = p_reviewer_profile_id;

  if not found then
    raise exception 'no reviewer profile %', p_reviewer_profile_id
      using errcode = 'no_data_found';
  end if;

  if v_owner <> v_actor and not (
       public.has_role(v_actor, 'governance_admin')
    or public.has_role(v_actor, 'platform_admin')) then
    raise exception 'you may only record qualifications for your own reviewer profile'
      using errcode = 'insufficient_privilege';
  end if;

  if p_qualification_type is null or p_qualification_type not in
     ('certificate', 'degree', 'ijazah', 'experience', 'institutional_affiliation') then
    raise exception
      'a qualification is a certificate, degree, ijazah, experience or institutional affiliation; % is not one of them',
      coalesce(p_qualification_type, 'nothing')
      using errcode = 'check_violation';
  end if;

  if v_title is null then
    raise exception 'a qualification needs a title'
      using errcode = 'check_violation';
  end if;
  if length(v_title) > 200 then
    raise exception 'a qualification title must be 200 characters or fewer'
      using errcode = 'check_violation';
  end if;
  if v_issuer is not null and length(v_issuer) > 200 then
    raise exception 'an issuing institution must be 200 characters or fewer'
      using errcode = 'check_violation';
  end if;
  -- A storage key, not a document: the evidence itself lives outside the database
  -- and is never served to a client.
  if v_ref is not null and length(v_ref) > 500 then
    raise exception 'an evidence reference must be 500 characters or fewer'
      using errcode = 'check_violation';
  end if;

  insert into public.reviewer_qualifications
    (reviewer_profile_id, qualification_type, qualification_title,
     issuing_institution, subject_area_id, evidence_reference, verification_status)
  values
    (p_reviewer_profile_id, p_qualification_type, v_title,
     v_issuer, p_subject_area_id, v_ref, 'pending')
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'reviewer.qualification_recorded', 'reviewer_qualification', v_id,
          jsonb_build_object(
            'reviewer_profile_id', p_reviewer_profile_id,
            'qualification_type', p_qualification_type,
            'title', v_title,
            'subject_area_id', p_subject_area_id,
            'has_evidence', v_ref is not null,
            'recorded_for_someone_else', v_owner <> v_actor));

  return jsonb_build_object(
    'qualificationId', v_id,
    'verificationStatus', 'pending',
    'note', 'recorded, and waiting for platform staff to check it');
end;
$$;

comment on function public.record_reviewer_qualification(uuid, text, text, text, uuid, text) is
  'The reviewer themselves, or governance staff on their behalf. Always creates a pending qualification: nothing about this function can produce a verified one, which is what makes verify_reviewer_qualification() the only route to a credential the platform stands behind.';

-- ---------------------------------------------------------------------------
-- 4. Checking a qualification
-- ---------------------------------------------------------------------------

create or replace function public.verify_reviewer_qualification(
  p_qualification_id uuid,
  p_decision         text,
  p_valid_until      timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_row   record;
  v_changed boolean;
begin
  if v_actor is null or not (
       public.has_role(v_actor, 'governance_admin')
    or public.has_role(v_actor, 'platform_admin')) then
    raise exception 'only a governance admin may check a reviewer qualification'
      using errcode = 'insufficient_privilege';
  end if;

  if p_decision is null or p_decision not in ('verified', 'rejected') then
    raise exception 'a qualification is verified or rejected; % is neither',
      coalesce(p_decision, 'nothing')
      using errcode = 'check_violation';
  end if;

  select rq.id, rq.verification_status, rq.verified_at
    into v_row
    from public.reviewer_qualifications rq
   where rq.id = p_qualification_id;

  if not found then
    raise exception 'no reviewer qualification %', p_qualification_id
      using errcode = 'no_data_found';
  end if;

  -- rq_validity_window compares valid_until against verified_at, which this is
  -- about to set to now() whichever way the decision goes, so a window that has
  -- already closed cannot be written at all: rejecting a qualification with an
  -- expiry date in the past would break the same constraint as verifying it, and
  -- the caller would get the constraint's name instead of a sentence.
  if p_valid_until is not null and p_valid_until <= now() then
    raise exception 'a validity window that closed on % cannot be recorded', p_valid_until
      using errcode = 'check_violation';
  end if;

  v_changed := v_row.verification_status is distinct from p_decision;

  if v_changed then
    update public.reviewer_qualifications
       set verification_status = p_decision,
           verified_by         = v_actor,
           verified_at         = now(),
           valid_until         = p_valid_until
     where id = p_qualification_id;

    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (v_actor,
            case when p_decision = 'verified' then 'reviewer.qualification_verified'
                 else 'reviewer.qualification_rejected' end,
            'reviewer_qualification', p_qualification_id,
            jsonb_build_object('valid_until', p_valid_until,
                               'previous_status', v_row.verification_status));
  end if;

  return jsonb_build_object(
    'qualificationId', p_qualification_id,
    'verificationStatus', p_decision,
    'changed', v_changed,
    'validUntil', p_valid_until,
    'note', case when v_changed then null
                 else 'this qualification is already ' || p_decision end);
end;
$$;

comment on function public.verify_reviewer_qualification(uuid, text, timestamptz) is
  'Governance staff only (governance_admin or platform_admin). Records who checked a qualification and when, and refuses to verify one whose validity window has already closed. Deciding twice reports no change instead of replacing the first decision.';

-- ---------------------------------------------------------------------------
-- 5. Authorising a subject and scope
-- ---------------------------------------------------------------------------
-- The decision `is_authorised_reviewer()` reads, and the one the platform could
-- not previously make. One row per reviewer per subject per scope while it is
-- pending or active (`rsa_one_per_subject_scope`), so this updates that row where
-- it exists and otherwise writes a new one — a revocation stays as the record it
-- is, and a change of mind is a new row.

create or replace function public.set_reviewer_authorization(
  p_reviewer_profile_id uuid,
  p_subject_area_id     uuid,
  p_review_scope        text,
  p_status              text,
  p_effective_until     timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_existing record;
  v_reviewer text;
  v_id       uuid;
  v_changed  boolean;
begin
  if v_actor is null or not (
       public.has_role(v_actor, 'governance_admin')
    or public.has_role(v_actor, 'platform_admin')) then
    raise exception 'only a governance admin may authorise a reviewer for a subject'
      using errcode = 'insufficient_privilege';
  end if;

  if p_review_scope is null or p_review_scope not in ('technical', 'scholarly') then
    raise exception 'a review scope is technical or scholarly; % is neither',
      coalesce(p_review_scope, 'nothing')
      using errcode = 'check_violation';
  end if;

  if p_status is null or p_status not in ('pending', 'active', 'suspended', 'revoked') then
    raise exception 'an authorisation is pending, active, suspended or revoked; % is not one of them',
      coalesce(p_status, 'nothing')
      using errcode = 'check_violation';
  end if;

  select rp.reviewer_status into v_reviewer
    from public.reviewer_profiles rp
   where rp.id = p_reviewer_profile_id and rp.deleted_at is null;

  if not found then
    raise exception 'no reviewer profile %', p_reviewer_profile_id
      using errcode = 'no_data_found';
  end if;

  if not exists (select 1 from public.subject_areas sa where sa.id = p_subject_area_id) then
    raise exception 'no subject area %', p_subject_area_id
      using errcode = 'no_data_found';
  end if;

  -- An authorisation for somebody who is not an active reviewer does nothing at
  -- all: is_authorised_reviewer() requires both. Refusing says so up front rather
  -- than storing a row that looks like permission and acts like none.
  if p_status = 'active' and v_reviewer <> 'active' then
    raise exception
      'this reviewer is %; verify them before authorising a subject', v_reviewer
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  if p_status = 'active' and p_effective_until is not null and p_effective_until <= now() then
    raise exception 'an authorisation that expired on % cannot be made active', p_effective_until
      using errcode = 'check_violation';
  end if;

  select rsa.id, rsa.status, rsa.effective_until
    into v_existing
    from public.reviewer_subject_authorizations rsa
   where rsa.reviewer_profile_id = p_reviewer_profile_id
     and rsa.subject_area_id = p_subject_area_id
     and rsa.review_scope = p_review_scope
     and rsa.status in ('pending', 'active');

  if found then
    v_changed := v_existing.status is distinct from p_status
              or v_existing.effective_until is distinct from p_effective_until;

    if v_changed then
      update public.reviewer_subject_authorizations
         set status          = p_status,
             effective_until = p_effective_until,
             approver        = case when p_status = 'active' then v_actor else approver end,
             approved_at     = case when p_status = 'active' and approver is null
                                    then now() else approved_at end
       where id = v_existing.id;
      v_id := v_existing.id;
    else
      v_id := v_existing.id;
    end if;
  else
    insert into public.reviewer_subject_authorizations
      (reviewer_profile_id, subject_area_id, review_scope, status, effective_until,
       approver, approved_at)
    values
      (p_reviewer_profile_id, p_subject_area_id, p_review_scope, p_status, p_effective_until,
       case when p_status = 'active' then v_actor end,
       case when p_status = 'active' then now() end)
    returning id into v_id;
    v_changed := true;
  end if;

  if v_changed then
    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (v_actor, 'reviewer.authorization_set', 'reviewer_subject_authorization', v_id,
            jsonb_build_object(
              'reviewer_profile_id', p_reviewer_profile_id,
              'subject_area_id', p_subject_area_id,
              'review_scope', p_review_scope,
              'status', p_status,
              'effective_until', p_effective_until));
  end if;

  return jsonb_build_object(
    'authorizationId', v_id,
    'reviewerProfileId', p_reviewer_profile_id,
    'subjectAreaId', p_subject_area_id,
    'reviewScope', p_review_scope,
    'status', p_status,
    'changed', v_changed,
    'effectiveUntil', p_effective_until,
    'note', case when v_changed then null
                 else 'this authorisation is already ' || p_status end);
end;
$$;

comment on function public.set_reviewer_authorization(uuid, uuid, text, text, timestamptz) is
  'Governance staff only (governance_admin or platform_admin). The row is_authorised_reviewer() reads. Updating the live authorisation where one exists and writing a new row otherwise, so a revocation stays on the record. Refuses to make one active for a reviewer who is not verified, or with a window that has already closed.';

-- ---------------------------------------------------------------------------
-- 6. Declaring a conflict
-- ---------------------------------------------------------------------------
-- The reviewer's own statement, about themselves: the identity comes from the
-- session and there is no reviewer parameter, which is what `rcd_insert` already
-- insists on. A declaration with no course version is a standing one.
--
-- The status vocabulary is worth being precise about, because reading it backwards
-- would quietly unbar a conflicted reviewer: `validate_review_assignment()` refuses
-- an assignment while a declaration is 'declared', 'under_assessment' or
-- 'disqualifying', so 'accepted' and 'resolved' are the two states that let the
-- reviewer work. 'accepted' means the declaration was heard and is not a barrier;
-- 'disqualifying' means it bars the assignment.

create or replace function public.declare_reviewer_conflict(
  p_conflict_type     text,
  p_description       text,
  p_course_version_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_profile  uuid;
  v_text     text := nullif(btrim(coalesce(p_description, '')), '');
  v_existing uuid;
  v_id       uuid;
begin
  if v_actor is null then
    raise exception 'sign in to declare a conflict'
      using errcode = 'insufficient_privilege';
  end if;

  select rp.id into v_profile
    from public.reviewer_profiles rp
   where rp.user_id = v_actor and rp.deleted_at is null;

  if not found then
    raise exception 'you are not registered as a reviewer, so there is no review to stand aside from'
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  if p_conflict_type is null or p_conflict_type not in
     ('authorship', 'financial', 'family', 'teacher_student',
      'institutional', 'personal', 'other') then
    raise exception
      'a conflict is authorship, financial, family, teacher_student, institutional, personal or other; % is not one of them',
      coalesce(p_conflict_type, 'nothing')
      using errcode = 'check_violation';
  end if;

  if v_text is null then
    raise exception 'describe the conflict, so the person assessing it does not have to guess'
      using errcode = 'check_violation';
  end if;
  if length(v_text) > 2000 then
    raise exception 'a conflict description must be 2000 characters or fewer'
      using errcode = 'check_violation';
  end if;

  if p_course_version_id is not null
     and not exists (select 1 from public.course_versions cv
                      where cv.id = p_course_version_id) then
    raise exception 'no course version %', p_course_version_id
      using errcode = 'no_data_found';
  end if;

  -- Declaring the same conflict twice would make it look like two problems, and the
  -- second row would keep the reviewer barred after the first was assessed.
  select rcd.id into v_existing
    from public.reviewer_conflict_declarations rcd
   where rcd.reviewer_profile_id = v_profile
     and rcd.conflict_type = p_conflict_type
     and rcd.course_version_id is not distinct from p_course_version_id
     and rcd.status in ('declared', 'under_assessment');

  if found then
    return jsonb_build_object(
      'declarationId', v_existing,
      'status', 'declared',
      'declared', false,
      'note', 'you have already declared this and it is waiting to be assessed');
  end if;

  insert into public.reviewer_conflict_declarations
    (reviewer_profile_id, course_version_id, conflict_type, description, status)
  values (v_profile, p_course_version_id, p_conflict_type, v_text, 'declared')
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'reviewer.conflict_declared', 'reviewer_conflict_declaration', v_id,
          jsonb_build_object(
            'conflict_type', p_conflict_type,
            'course_version_id', p_course_version_id,
            'standing', p_course_version_id is null));

  return jsonb_build_object(
    'declarationId', v_id,
    'status', 'declared',
    'declared', true,
    'note', 'declared; you cannot be assigned this work until platform staff assess it');
end;
$$;

comment on function public.declare_reviewer_conflict(text, text, uuid) is
  'The reviewer''s own declaration, against their own profile: no reviewer parameter, because the identity is the session. A null course version is a standing conflict. Declaring the same open conflict twice reports the existing one rather than writing a second.';

-- ---------------------------------------------------------------------------
-- 7. Assessing a conflict
-- ---------------------------------------------------------------------------

create or replace function public.assess_reviewer_conflict(
  p_declaration_id   uuid,
  p_status           text,
  p_resolution_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_notes   text := nullif(btrim(coalesce(p_resolution_notes, '')), '');
  v_row     record;
  v_changed boolean;
begin
  if v_actor is null or not (
       public.has_role(v_actor, 'governance_admin')
    or public.has_role(v_actor, 'platform_admin')) then
    raise exception 'only a governance admin may assess a conflict declaration'
      using errcode = 'insufficient_privilege';
  end if;

  if p_status is null or p_status not in ('under_assessment', 'accepted', 'disqualifying', 'resolved') then
    raise exception
      'a declaration is under_assessment, accepted, disqualifying or resolved; % is not one of them',
      coalesce(p_status, 'nothing')
      using errcode = 'check_violation';
  end if;

  -- Both of these end something: 'disqualifying' bars the reviewer from the work
  -- and 'accepted' lets them proceed despite what they declared. Either way the
  -- person reading the register later has to be able to see why.
  if p_status in ('disqualifying', 'accepted') and v_notes is null then
    raise exception 'say why this declaration is being %', p_status
      using errcode = 'check_violation';
  end if;

  if v_notes is not null and length(v_notes) > 2000 then
    raise exception 'assessment notes must be 2000 characters or fewer'
      using errcode = 'check_violation';
  end if;

  select rcd.id, rcd.status into v_row
    from public.reviewer_conflict_declarations rcd
   where rcd.id = p_declaration_id;

  if not found then
    raise exception 'no conflict declaration %', p_declaration_id
      using errcode = 'no_data_found';
  end if;

  v_changed := v_row.status is distinct from p_status;

  if v_changed then
    update public.reviewer_conflict_declarations
       set status           = p_status,
            assessed_by     = v_actor,
            assessed_at     = now(),
            resolution_notes = coalesce(v_notes, resolution_notes)
     where id = p_declaration_id;

    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (v_actor, 'reviewer.conflict_assessed', 'reviewer_conflict_declaration',
            p_declaration_id,
            jsonb_build_object(
              'from_status', v_row.status,
              'to_status', p_status,
              'notes', v_notes));
  end if;

  return jsonb_build_object(
    'declarationId', p_declaration_id,
    'status', p_status,
    'changed', v_changed,
    'note', case when v_changed then null
                 else 'this declaration is already ' || p_status end);
end;
$$;

comment on function public.assess_reviewer_conflict(uuid, text, text) is
  'Governance staff only (governance_admin or platform_admin). Ends a declaration in writing: accepting or disqualifying needs a reason, because both change whether the reviewer may be assigned the work they stood aside from.';

-- ---------------------------------------------------------------------------
-- Two reads the register needs, and one the assignment dropdown always needed
-- ---------------------------------------------------------------------------
-- `reviewer_profiles` and `reviewer_qualifications` are granted by column rather
-- than by table, so that `internal_notes` and `evidence_reference` cannot survive a
-- SELECT *. That protection is right and stays. What it also does is refuse a query
-- that *filters* on an ungranted column, and one such query is already shipped:
-- `fetchAssignableReviewers()` asks for active reviewers with
-- `deleted_at is null`, and `deleted_at` is not in the grant list, so the reviewer
-- dropdown on `/admin/reviews` fails with "permission denied for table
-- reviewer_profiles" for every member of staff who opens it. The screen did not
-- have an empty dropdown; it had no dropdown at all.
--
-- `deleted_at` is granted because a closed profile is not a secret — the read
-- policy already hides the row from everybody but staff and the reviewer, and staff
-- need to be able to say "and not closed" out loud. `verified_by` is granted on both
-- tables because a governance screen that cannot say who verified a reviewer, or
-- who checked a qualification, asks to be trusted instead of showing its record;
-- the same fact is already freely readable on an authorisation (`approver`) and in
-- the audit log.
--
-- Deliberately still not granted: `internal_notes` (staff-only commentary that a
-- reviewer must not be able to read on their own row) and `evidence_reference` (the
-- storage key of an identity document, readable by every privileged role including
-- a support agent). The consequence is worth stating rather than hiding: the
-- register shows what a reviewer claims and when staff checked it, but it cannot
-- show the document, so verifying a qualification remains a judgement made outside
-- the platform until a signed evidence route exists.

grant select (deleted_at, verified_by) on public.reviewer_profiles to authenticated;
grant select (verified_by) on public.reviewer_qualifications to authenticated;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.register_as_reviewer(text) from public;
revoke all on function public.register_as_reviewer(text) from anon;
grant execute on function public.register_as_reviewer(text) to authenticated;

revoke all on function public.set_reviewer_status(uuid, text, text) from public;
revoke all on function public.set_reviewer_status(uuid, text, text) from anon;
grant execute on function public.set_reviewer_status(uuid, text, text) to authenticated;

revoke all on function public.record_reviewer_qualification(uuid, text, text, text, uuid, text)
  from public;
revoke all on function public.record_reviewer_qualification(uuid, text, text, text, uuid, text)
  from anon;
grant execute on function public.record_reviewer_qualification(uuid, text, text, text, uuid, text)
  to authenticated;

revoke all on function public.verify_reviewer_qualification(uuid, text, timestamptz) from public;
revoke all on function public.verify_reviewer_qualification(uuid, text, timestamptz) from anon;
grant execute on function public.verify_reviewer_qualification(uuid, text, timestamptz)
  to authenticated;

revoke all on function public.set_reviewer_authorization(uuid, uuid, text, text, timestamptz)
  from public;
revoke all on function public.set_reviewer_authorization(uuid, uuid, text, text, timestamptz)
  from anon;
grant execute on function public.set_reviewer_authorization(uuid, uuid, text, text, timestamptz)
  to authenticated;

revoke all on function public.declare_reviewer_conflict(text, text, uuid) from public;
revoke all on function public.declare_reviewer_conflict(text, text, uuid) from anon;
grant execute on function public.declare_reviewer_conflict(text, text, uuid) to authenticated;

revoke all on function public.assess_reviewer_conflict(uuid, text, text) from public;
revoke all on function public.assess_reviewer_conflict(uuid, text, text) from anon;
grant execute on function public.assess_reviewer_conflict(uuid, text, text) to authenticated;
