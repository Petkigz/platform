-- Who may say that a reviewer is qualified, and what a qualification is for.
-- Decided 2026-10-22.
--
-- Two changes, both about the same claim: that the content on this platform was
-- checked by somebody whose credentials a named person looked at.
--
-- ONE: the decision belongs to the platform owner. `verify_reviewer_qualification`
-- accepted any governance admin, which made the claim "a governance admin saw a
-- document" rather than "the person who answers for this platform saw it". The
-- owner may appoint a scholarly board and switch it on
-- (`governance.scholar_board_active`); while it is on, a board member may take the
-- decision. Appointing or removing a board member is the owner's alone — see the
-- trigger at the bottom. Everything else in the reviewer register stays with
-- governance staff: checking the person is a staffing decision, granting a scope
-- is a staffing decision, and both are recorded with who and when.
--
-- TWO: an authorisation needs a verified qualification in that subject, for every
-- scope including technical. `reviewer_qualifications.subject_area_id` was
-- nullable, so a qualification could be recorded without a subject and could
-- never authorise anything; it is now mandatory at the point of recording.
-- `set_reviewer_authorization()` refuses an active authorisation without one, and
-- `is_authorised_reviewer()` checks again, so a credential that expires or is
-- rejected takes the authorisation with it.
--
-- Verification itself is unchanged: a named person looked at a document held
-- outside the platform, recorded with who and when. The platform cannot read the
-- document and does not imply that it did.

-- ---------------------------------------------------------------------------
-- The board switch
-- ---------------------------------------------------------------------------
-- Off by default. "Present and active" is a fact the owner states, not something
-- inferred from the existence of a role grant: a board that has been appointed
-- but not convened must not be deciding credentials.

insert into public.platform_settings
  (key, description, value_type, value_text, gate_type, preconditions, flag_group)
values
  ('governance.scholar_board_active', 'A scholarly board is convened and may check reviewer credentials',
   'boolean', 'false', 'admin', null, 'Governance')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Recording a qualification
-- ---------------------------------------------------------------------------

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

  -- A qualification that names no subject cannot authorise anything, because
  -- authorisation is per subject. Recording one would create a credential that
  -- looks usable on the reviewer's own screen and is invisible to the check
  -- that matters (decided 2026-10-22), so it is refused at the point somebody
  -- could still choose a subject.
  if p_subject_area_id is null then
    raise exception
      'a qualification has to name the subject it is in; without one it can never authorise anything'
      using errcode = 'check_violation';
  end if;

  if not exists (select 1 from public.subject_areas sa where sa.id = p_subject_area_id) then
    raise exception 'no subject area %', p_subject_area_id
      using errcode = 'no_data_found';
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

-- ---------------------------------------------------------------------------
-- Checking a qualification
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
  -- Who decides (decided 2026-10-22). The platform owner is the final
  -- authorisation on a credential: a named person looked at a document, and
  -- that person answers for it. A scholarly board may take the decision only
  -- while the owner has switched the board on, and the owner appoints the
  -- board. Governance staff keep everything else in this file — checking the
  -- person and granting the scope — because those are staffing decisions, not
  -- claims about what somebody knows.
  if v_actor is null or not (
       public.has_role(v_actor, 'platform_admin')
    or (public.setting_bool('governance.scholar_board_active', false)
        and public.has_role(v_actor, 'scholarly_panel_member'))) then
    raise exception
      'only the platform owner, or the scholarly board while it is active, may check a reviewer qualification'
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

-- ---------------------------------------------------------------------------
-- Authorising a subject
-- ---------------------------------------------------------------------------

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

  -- A credential the platform can point at (decided 2026-10-22), for every
  -- scope including technical. Checked here, where the mistake is being made
  -- and the reason can be given, and again in is_authorised_reviewer(), because
  -- a qualification can expire or be rejected after the authorisation exists.
  if p_status = 'active' and not exists (
       select 1 from public.reviewer_qualifications rq
        where rq.reviewer_profile_id = p_reviewer_profile_id
          and rq.subject_area_id = p_subject_area_id
          and rq.verification_status = 'verified'
          and (rq.valid_until is null or rq.valid_until > now())
     ) then
    raise exception
      'this reviewer has no verified qualification in that subject, so they cannot be authorised for it'
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

-- ---------------------------------------------------------------------------
-- The check that follows an authorisation
-- ---------------------------------------------------------------------------
-- `is_authorised_reviewer()` is read by the assignment trigger and by the
-- requirement recount. Adding the qualification here is what makes an expired
-- credential stop working: the authorisation row can still say `active`, and an
-- assignment that rests on it is refused.

create or replace function public.is_authorised_reviewer(
  p_user_id      uuid,
  p_subject_id   uuid,
  p_scope        text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.reviewer_profiles rp
      join public.reviewer_subject_authorizations rsa
        on rsa.reviewer_profile_id = rp.id
     where rp.user_id = p_user_id
       and rp.reviewer_status = 'active'
       and rsa.subject_area_id = p_subject_id
       and rsa.review_scope = p_scope
       and rsa.status = 'active'
       and rsa.effective_from <= now()
       and (rsa.effective_until is null or rsa.effective_until > now())
       and exists (
         select 1
           from public.reviewer_qualifications rq
          where rq.reviewer_profile_id = rp.id
            and rq.subject_area_id = p_subject_id
            and rq.verification_status = 'verified'
            and (rq.valid_until is null or rq.valid_until > now())
       )
  );
$$;

comment on function public.is_authorised_reviewer(uuid, uuid, text) is
  'Active reviewer, an unexpired authorisation for this subject and scope, and a verified unexpired qualification in that subject. The last clause is what makes a lapsed credential end the authorisation it supported.';

-- ---------------------------------------------------------------------------
-- Appointing the board
-- ---------------------------------------------------------------------------
-- The board exercises the owner's authority over credentials, so the owner is
-- the one who names it — and the one who removes a name. A trigger rather than
-- a rewrite of assign_role() and revoke_role(), because both write this table
-- and a rule about one role should not have to be repeated in two functions.
--
-- A null actor is a migration or the fixture harness writing directly; the
-- application cannot reach the table except through the writers, which always
-- carry the session's actor.

create or replace function public.protect_scholar_board_appointment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_role_id uuid;
  v_code    text;
  v_actor   uuid := public.current_user_id();
begin
  if tg_op = 'DELETE' then
    v_role_id := old.role_id;
  else
    v_role_id := new.role_id;
    -- An update that changes nothing about membership is not an appointment.
    if tg_op = 'UPDATE'
       and new.role_id = old.role_id
       and new.revoked_at is not distinct from old.revoked_at then
      return new;
    end if;
  end if;

  select r.code into v_code from public.roles r where r.id = v_role_id;
  if v_code is distinct from 'scholarly_panel_member' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if v_actor is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if not public.has_role(v_actor, 'platform_admin') then
    raise exception 'only the platform owner may appoint or remove a scholarly board member'
      using errcode = 'insufficient_privilege';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

comment on function public.protect_scholar_board_appointment() is
  'The scholarly board may check credentials only because the owner appointed it; appointing and removing a member is therefore the owner''s alone.';

drop trigger if exists ura_protect_scholar_board on public.user_role_assignments;
create trigger ura_protect_scholar_board
  before insert or update or delete on public.user_role_assignments
  for each row execute function public.protect_scholar_board_appointment();

comment on function public.record_reviewer_qualification(uuid, text, text, text, uuid, text) is
  'The reviewer themselves, or governance staff on their behalf. Always creates a pending qualification, and always requires the subject it is in: a qualification that names no subject can never authorise anything, so recording one would be a credential that looks usable and is not.';

comment on function public.verify_reviewer_qualification(uuid, text, timestamptz) is
  'The platform owner, or a scholarly board while governance.scholar_board_active is on. Records who checked a qualification and when, and refuses to verify one whose validity window has already closed. Deciding twice reports no change instead of replacing the first decision.';

comment on function public.set_reviewer_authorization(uuid, uuid, text, text, timestamptz) is
  'Governance staff only (governance_admin or platform_admin). The row is_authorised_reviewer() reads. Refuses to make one active for a reviewer who is not verified, for a subject they hold no verified qualification in, or with a window that has already closed.';

-- Grants: replacing a function keeps its ACL, but saying it again is cheap and
-- makes this file readable on its own.
revoke all on function public.record_reviewer_qualification(uuid, text, text, text, uuid, text) from public;
grant execute on function public.record_reviewer_qualification(uuid, text, text, text, uuid, text) to authenticated;
revoke all on function public.verify_reviewer_qualification(uuid, text, timestamptz) from public;
grant execute on function public.verify_reviewer_qualification(uuid, text, timestamptz) to authenticated;
revoke all on function public.set_reviewer_authorization(uuid, uuid, text, text, timestamptz) from public;
grant execute on function public.set_reviewer_authorization(uuid, uuid, text, text, timestamptz) to authenticated;
