-- Verifiable parental consent, from "a table exists" to "an adult can be trusted
-- with a child's record, and that trust has a date on it".
--
-- `guardian_relationships` and `guardian_verification_cases` were built in the first
-- week and left dormant, and the notes on them were honest about why: the parent had
-- no way to submit a case (the table is staff-write), there was no record of *how*
-- anybody established that a person is a child's parent, and nothing about a
-- verification ever expired. So a verification was a boolean that lived for ever, and
-- "this adult was checked in 2029" would have meant nothing in 2035.
--
-- What this migration adds is the four things that make consent *verifiable* rather
-- than merely *recorded*:
--
--   1. **A submission the parent can make themselves.** `submit_guardian_consent()`
--      writes the relationship and the pending case in one call, because the case
--      table is — correctly — staff-write and a definer function is the only honest
--      way round that.
--   2. **A method, not a checkbox.** How the relationship was established is recorded
--      from a closed vocabulary — a video call, an identity document, in person, or a
--      signed declaration — together with the parent's own statement in their own
--      words. The evidence itself is a write-only reference, exactly as the reviewer
--      register and the screening register hold theirs.
--   3. **An expiry.** Consent is granted for a stated number of months (default 12,
--      and never more than 36). It does not delete anything when it lapses: the child's
--      record stays, and the guardian's access pauses until somebody renews it.
--   4. **A withdrawal the parent controls.** Revoking clears the permissions, records
--      the reason, and starts the deletion the children's policy promises — a parent
--      who withdraws consent is not asking for a pause.
--
-- **Expiry and revocation are different things, and the difference is the point.**
-- An expired consent is a renewal the owner has not asked for yet; the child's work is
-- untouched and comes back the moment somebody re-verifies. A revoked consent is a
-- withdrawal: the record is deleted on the schedule the policy states.
--
-- **Which policy the guardian agreed to is recorded, not assumed.** If the children's
-- policy is in force, its version is stored with the consent. If it is not — as today —
-- the column is null and the console says so, because "they agreed to the policy" when
-- no policy has been published is a sentence this platform should not be able to write.
--
-- **Nothing here is enforced while `family.guardian_verification` is off.** The flag
-- stays off, and the expiry check is gated on it, so today's behaviour is unchanged to
-- the row. Turning it on is what makes an unexpired verification mandatory, and that is
-- stated in FLAGS.md rather than discovered.

-- ---------------------------------------------------------------------------
-- What a consent is made of
-- ---------------------------------------------------------------------------
alter table public.guardian_relationships
  add column if not exists consent_method text
    check (consent_method is null or consent_method in
      ('video_call', 'id_document', 'in_person', 'signed_declaration')),
  -- When the verification lapses. Null on an unverified request, and null on a
  -- relationship verified before this migration — which is a fact the register
  -- reports rather than a gap it fills in.
  add column if not exists consent_expires_at timestamptz,
  -- The children's policy version in force when the guardian agreed. Null when
  -- nothing was in force, which is the honest answer today.
  add column if not exists consented_policy_version_id uuid
    references public.policy_versions (id) on delete set null,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_reason text;

comment on column public.guardian_relationships.consent_expires_at is
  'When this verification lapses. A lapse pauses the guardian''s access; it deletes nothing. Set from the months the deciding staff member chose.';
comment on column public.guardian_relationships.consent_method is
  'How the relationship was established: video_call, id_document, in_person or signed_declaration. The evidence itself is a write-only reference on the case.';
comment on column public.guardian_relationships.consented_policy_version_id is
  'The children''s policy version in force when consent was given. Null means nothing was in force — which the console reports instead of claiming agreement to a document that did not exist.';

-- A live verification is a date and a method, or it is not a verification.
alter table public.guardian_relationships
  drop constraint if exists gr_active_is_verifiable;
alter table public.guardian_relationships
  add constraint gr_active_is_verifiable check (
    status <> 'active'
    or (verified_at is not null
        and (consent_expires_at is null or consent_expires_at > verified_at)));

-- A revocation is a reason and a time, or neither.
alter table public.guardian_relationships
  drop constraint if exists gr_revoked_is_recorded;
alter table public.guardian_relationships
  add constraint gr_revoked_is_recorded check (
    (revoked_at is null) = (revoked_reason is null));

alter table public.guardian_verification_cases
  add column if not exists method text
    check (method is null or method in
      ('video_call', 'id_document', 'in_person', 'signed_declaration')),
  -- The parent's own words. Told to a reviewer, kept on the record: a decision
  -- that says "they said they were the parent" without those words is a rumour.
  add column if not exists guardian_statement text,
  add column if not exists submitted_by uuid
    references public.user_profiles (user_id) on delete set null;

comment on column public.guardian_verification_cases.guardian_statement is
  'The guardian''s own account of the relationship, in their words. Kept as written, because the decision rests on it.';

create index if not exists gvc_open_incident_idx
  on public.guardian_verification_cases (guardian_relationship_id)
  where status in ('pending', 'in_review', 'needs_information');

create index if not exists gr_consent_expiry_idx
  on public.guardian_relationships (consent_expires_at)
  where status = 'active';

-- The evidence reference is **write-only**, exactly like the reviewer register's and
-- the screening register's. Before this, `gvc_admin` was `for all`, so governance
-- staff could read the column — and a pointer to somebody's identity documents is
-- the one thing a consent queue must never hand out, however privileged the reader.
-- A reviewer needs to know evidence *exists*; `referenceGiven` in the register says
-- that, and the register is a definer function so it can look without the grant.
--
-- The revoke is at **table** level and the readable columns are granted back, because
-- a column-level revoke does not outrank a table-level grant: the original
-- `grant select ... on all tables` would have kept handing the column out.
revoke select on public.guardian_verification_cases from authenticated, anon;
grant select (id, guardian_relationship_id, status, method, guardian_statement,
              submitted_by, submitted_at, reviewed_by, reviewed_at, decision_reason,
              created_at, updated_at)
  on public.guardian_verification_cases to authenticated;

comment on column public.guardian_verification_cases.evidence_reference is
  'Write-only: no client role holds select on this column. The queue reports that evidence exists and never what it is. A reviewer''s judgement therefore rests on the statement, the method and whatever they verified outside the platform.';

-- ---------------------------------------------------------------------------
-- The gate: is this verification still good?
-- ---------------------------------------------------------------------------
/**
 * True when the flag is off, so nothing changes until the owner turns it on.
 * When the flag is on, a verification without a stated expiry does not count —
 * it has to be renewed, because an approval given before this migration was given
 * without a lifetime and nobody can say how long it was meant to last.
 */
create or replace function public.guardian_consent_enforced()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.setting_bool('family.guardian_verification', false), false);
$$;

revoke all on function public.guardian_consent_enforced() from public, anon;
grant execute on function public.guardian_consent_enforced() to authenticated;

comment on function public.guardian_consent_enforced() is
  'Whether a guardian verification must be current for a child to be reachable. Off by default; expiry is inert while it is.';

/** Is this relationship a live verification, as of now? */
create or replace function public.guardian_consent_is_current(p_relationship_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.guardian_relationships gr
     where gr.id = p_relationship_id
       and gr.status = 'active'
       and gr.verified_at is not null
       and gr.deleted_at is null
       and (
         not public.guardian_consent_enforced()
         or (gr.consent_expires_at is not null and gr.consent_expires_at > now())
       )
  );
$$;

revoke all on function public.guardian_consent_is_current(uuid) from public, anon;
grant execute on function public.guardian_consent_is_current(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The seam: an expired verification stops being access
-- ---------------------------------------------------------------------------
-- `is_verified_guardian_of()` and `can_access_learner()` are between them behind
-- thirteen policies. Adding the expiry here — and only here — is what makes a lapse
-- bite on the profile, the progress, the grades, the certificates and the enrolments
-- at once, rather than in whichever screens somebody remembered to update.
--
-- The learner themselves and their family membership are untouched: a lapse is about
-- the guardian's authority, not about the child's work.
create or replace function public.is_verified_guardian_of(p_learner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.guardian_relationships gr
     where gr.learner_profile_id = p_learner_id
       and gr.guardian_user_id = public.current_user_id()
       and gr.status = 'active'
       and public.guardian_consent_is_current(gr.id)
  );
$$;

revoke all on function public.is_verified_guardian_of(uuid) from public, anon;
grant execute on function public.is_verified_guardian_of(uuid) to authenticated;

comment on function public.is_verified_guardian_of(uuid) is
  'Holds an active, verified guardian relationship for this learner, whose consent has not lapsed while verification is enforced.';

-- **The hole this closes.** Family membership alone admitted a family owner to a
-- child's learning record, so a parent could see everything about a child they had
-- added and never verified — which made the consent gate theatre. When verification
-- is enforced, a family member reaches a *child's* learning data only through a
-- current consent. The child's profile row stays readable to the family (existence
-- and a name are not the record), so a parent is never left looking at an empty
-- household; what closes is the progress, the grades, the enrolments and the
-- certificates.
create or replace function public.can_access_learner(p_learner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_own_learner_profile(p_learner_id)
      or (
        public.is_learner_family_member(p_learner_id)
        and (
          not public.guardian_consent_enforced()
          or not exists (
            select 1 from public.learner_profiles lp
             where lp.id = p_learner_id and lp.learner_type = 'child')
          or exists (
            select 1 from public.guardian_relationships gr
             where gr.learner_profile_id = p_learner_id
               and gr.guardian_user_id = public.current_user_id()
               and gr.status = 'active'
               and gr.deleted_at is null
               and public.guardian_consent_is_current(gr.id))
        )
      )
      or public.is_privileged(public.current_user_id())
      -- A verified guardian, but only where the relationship carries the
      -- progress permission and the consent is current.
      or exists (
        select 1
          from public.guardian_relationships gr
         where gr.learner_profile_id = p_learner_id
           and gr.guardian_user_id = public.current_user_id()
           and gr.status = 'active'
           and gr.can_view_progress
           and public.guardian_consent_is_current(gr.id)
      );
$$;

revoke all on function public.can_access_learner(uuid) from public, anon;
grant execute on function public.can_access_learner(uuid) to authenticated;

comment on function public.can_access_learner(uuid) is
  'The learner themselves, a family member other than billing-only, a privileged role, or a guardian holding can_view_progress whose consent is current.';

-- Enrolment: the same rule, on the write that starts a child's learning.
create or replace function public.enforce_guardian_consent_on_enrolment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_learner_type text;
begin
  if not public.guardian_consent_enforced() then return new; end if;

  select lp.learner_type into v_learner_type
    from public.learner_profiles lp
   where lp.id = new.learner_profile_id and lp.deleted_at is null;
  if not found or v_learner_type <> 'child' then return new; end if;

  if not exists (
    select 1 from public.guardian_relationships gr
     where gr.learner_profile_id = new.learner_profile_id
       and gr.guardian_user_id = public.current_user_id()
       and gr.status = 'active'
       and gr.verified_at is not null
       and gr.can_manage_learning
       and gr.deleted_at is null
       and public.guardian_consent_is_current(gr.id)
  ) then
    raise exception 'verified guardian consent is required before enrolling this child'
      using errcode = 'insufficient_privilege',
            hint = 'a consent that has lapsed has to be renewed; nothing the child did was lost';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_guardian_consent_on_enrolment() from public, anon, authenticated;

comment on function public.enforce_guardian_consent_on_enrolment() is
  'When guardian verification is enabled, every enrolment write path requires a current verified guardian for a child, including definer fulfilment.';

-- ---------------------------------------------------------------------------
-- Asking, from the parent's side
-- ---------------------------------------------------------------------------
/**
 * The parent's own submission.
 *
 * Before this, a parent could write a `guardian_relationships` row and could not
 * create the case that makes anybody look at it — the case table is staff-write, and
 * rightly so. The result was a request with nowhere to go. This function is the one
 * door: it creates or refreshes the relationship and opens the case, in a single
 * transaction, so there is no state in which one exists without the other.
 *
 * It refuses anybody who is not a member of the family the child belongs to, which
 * means an unrelated adult cannot open a case about somebody else's child and use the
 * review queue as a way of learning that the child exists.
 */
create or replace function public.submit_guardian_consent(
  p_learner_profile_id uuid,
  p_relationship_type  text default 'parent',
  p_method             text default 'video_call',
  p_evidence_reference text default null,
  p_statement          text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_child   public.learner_profiles;
  v_type    text := lower(btrim(coalesce(p_relationship_type, 'parent')));
  v_method  text := lower(btrim(coalesce(p_method, 'video_call')));
  v_ref     text := nullif(btrim(coalesce(p_evidence_reference, '')), '');
  v_say     text := nullif(btrim(coalesce(p_statement, '')), '');
  v_rel     public.guardian_relationships;
  v_rel_id  uuid;
  v_case_id uuid;
  v_policy  uuid;
begin
  if v_actor is null then
    raise exception 'guardian:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;
  if v_type not in ('parent', 'guardian', 'other') then
    raise exception 'guardian:relationship_invalid'
      using errcode = 'check_violation';
  end if;
  if v_method not in ('video_call', 'id_document', 'in_person', 'signed_declaration') then
    raise exception 'guardian:method_invalid'
      using errcode = 'check_violation',
            hint = 'say how the relationship can be established';
  end if;
  if v_say is null or length(v_say) < 20 then
    raise exception 'guardian:statement_required'
      using errcode = 'check_violation',
            hint = 'say who this child is to you, in your own words — the reviewer reads it';
  end if;

  select * into v_child from public.learner_profiles
   where id = p_learner_profile_id and deleted_at is null;
  if not found then
    raise exception 'guardian:child_not_found'
      using errcode = 'no_data_found';
  end if;
  if v_child.learner_type <> 'child' then
    raise exception 'guardian:not_a_child'
      using errcode = 'check_violation',
            hint = 'an adult manages their own account; consent is for a child';
  end if;
  if not public.is_learner_family_member(p_learner_profile_id)
     and not public.is_privileged(v_actor) then
    raise exception 'guardian:not_in_family'
      using errcode = 'insufficient_privilege',
            hint = 'only an adult in this child''s family may ask to be their guardian';
  end if;

  -- The children's policy, if one is in force. Not required — claiming agreement to
  -- a document that has never been published would be a worse lie than a null.
  select v.id into v_policy
    from public.policy_versions v
    join public.policy_documents d on d.id = v.document_id
   where d.slug = 'children' and v.status = 'in_force'
   limit 1;

  select * into v_rel from public.guardian_relationships
   where guardian_user_id = v_actor and learner_profile_id = p_learner_profile_id;

  if found then
    v_rel_id := v_rel.id;
    -- A live consent has nothing to renew. An **expired** one always does, whether or
    -- not expiry is currently enforced — the flag governs access, not the parent's
    -- ability to re-establish something that has run out.
    if v_rel.status = 'active'
       and (v_rel.consent_expires_at is null or v_rel.consent_expires_at > now()) then
      raise exception 'guardian:already_verified'
        using errcode = 'check_violation',
              hint = 'this child is already verified to you; nothing to renew until it lapses';
    end if;
    if exists (select 1 from public.guardian_verification_cases
                where guardian_relationship_id = v_rel_id
                  and status in ('pending', 'in_review', 'needs_information')) then
      raise exception 'guardian:already_waiting'
        using errcode = 'check_violation',
              hint = 'a request is already with the reviewer';
    end if;

    -- A lapsed or rejected relationship is refreshed rather than duplicated: the
    -- pair has one row, and its history is the cases against it.
    --
    -- The permissions are **not** reset here. A reviewer may have narrowed them, and
    -- a refresh must carry that forward: asking again is not a way of talking your way
    -- back to a permission you were refused. The decision writes what it grants.
    update public.guardian_relationships
       set status = 'pending_verification',
           relationship_type = v_type,
           consent_method = v_method,
           consent_expires_at = null,
           consented_policy_version_id = v_policy,
           revoked_at = null,
           revoked_reason = null
     where id = v_rel_id;
  else
    insert into public.guardian_relationships
      (guardian_user_id, learner_profile_id, relationship_type, status,
       can_manage_profile, can_view_progress, can_manage_learning,
       consent_method, consented_policy_version_id)
    values (v_actor, p_learner_profile_id, v_type, 'pending_verification',
            true, true, true, v_method, v_policy)
    returning id into v_rel_id;
  end if;

  insert into public.guardian_verification_cases
    (guardian_relationship_id, status, evidence_reference, method,
     guardian_statement, submitted_by)
  values (v_rel_id, 'pending', v_ref, v_method, v_say, v_actor)
  returning id into v_case_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'guardian.consent_requested', 'learner_profile', p_learner_profile_id,
          jsonb_build_object('case', v_case_id, 'method', v_method,
                             'relationship', v_rel_id, 'policyVersion', v_policy));

  return jsonb_build_object('relationshipId', v_rel_id, 'caseId', v_case_id,
                            'status', 'pending', 'method', v_method,
                            'policyVersionId', v_policy,
                            'referenceGiven', v_ref is not null);
end;
$$;

revoke all on function public.submit_guardian_consent(uuid, text, text, text, text)
  from public, anon;
grant execute on function public.submit_guardian_consent(uuid, text, text, text, text)
  to authenticated;

comment on function public.submit_guardian_consent(uuid, text, text, text, text) is
  'A family member asks to be a child''s guardian: one call writes the relationship and the case, so a request always has somewhere to go. The statement is required and the evidence reference is write-only.';

-- ---------------------------------------------------------------------------
-- Deciding, with a lifetime
-- ---------------------------------------------------------------------------
/**
 * Verified, rejected, or needing more information.
 *
 * A verification now carries **months**. Twelve by default, one to thirty-six
 * allowed, and the expiry is computed here from the decision rather than typed, so
 * two reviewers deciding the same week give the same answer. The permissions are
 * narrowed, never widened: a reviewer may grant sight of progress without granting
 * the right to change a child's learning.
 *
 * The old trigger (`apply_guardian_verification_decision`) still moves the
 * relationship to active or revoked. What is added here is everything the trigger
 * could not know: the lifetime, the method, the policy version and the audit row.
 */
create or replace function public.decide_guardian_consent(
  p_case_id      uuid,
  p_decision     text,
  p_reason       text,
  p_valid_months integer default 12,
  p_manage_learning  boolean default true,
  p_view_progress    boolean default true,
  p_manage_profile   boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_decision text := lower(btrim(coalesce(p_decision, '')));
  v_reason   text := btrim(coalesce(p_reason, ''));
  v_case     public.guardian_verification_cases;
  v_rel      public.guardian_relationships;
  v_expires  timestamptz;
  v_policy   uuid;
begin
  if v_actor is null or not public.can_decide_guardian_consent(v_actor) then
    raise exception 'guardian:not_allowed'
      using errcode = 'insufficient_privilege',
            hint = 'governance staff or the owner decide a consent';
  end if;
  if v_decision not in ('verified', 'rejected', 'needs_information') then
    raise exception 'guardian:decision_invalid'
      using errcode = 'check_violation';
  end if;
  if length(v_reason) < 5 then
    raise exception 'guardian:reason_required'
      using errcode = 'check_violation',
            hint = 'the guardian reads the reason';
  end if;
  if p_valid_months is null or p_valid_months < 1 or p_valid_months > 36 then
    raise exception 'guardian:validity_invalid'
      using errcode = 'check_violation',
            hint = 'a verification lasts between one and thirty-six months';
  end if;

  select * into v_case from public.guardian_verification_cases where id = p_case_id;
  if not found then
    raise exception 'guardian:case_not_found' using errcode = 'no_data_found';
  end if;
  if v_case.status in ('verified', 'rejected', 'revoked') then
    raise exception 'guardian:already_decided'
      using errcode = 'check_violation';
  end if;

  select * into v_rel from public.guardian_relationships
   where id = v_case.guardian_relationship_id;
  if not found then
    raise exception 'guardian:case_not_found' using errcode = 'no_data_found';
  end if;

  select v.id into v_policy
    from public.policy_versions v
    join public.policy_documents d on d.id = v.document_id
   where d.slug = 'children' and v.status = 'in_force'
   limit 1;

  if v_decision = 'verified' then
    v_expires := now() + make_interval(months => p_valid_months);

    -- The relationship is written directly rather than left to the trigger, because
    -- the trigger does not know the lifetime and this must be one atomic fact.
    update public.guardian_relationships
       set status = 'active',
           verified_at = now(),
           consent_expires_at = v_expires,
           consent_method = coalesce(v_case.method, consent_method),
           consented_policy_version_id = coalesce(v_policy, consented_policy_version_id),
           can_manage_profile = p_manage_profile,
           can_view_progress = p_view_progress,
           can_manage_learning = p_manage_learning,
           revoked_at = null,
           revoked_reason = null
     where id = v_rel.id;

    update public.guardian_verification_cases
       set status = 'verified', reviewed_by = v_actor, reviewed_at = now(),
           decision_reason = v_reason
     where id = p_case_id;
  elsif v_decision = 'rejected' then
    update public.guardian_verification_cases
       set status = 'rejected', reviewed_by = v_actor, reviewed_at = now(),
           decision_reason = v_reason
     where id = p_case_id;

    update public.guardian_relationships
       set status = 'revoked',
           can_manage_profile = false, can_view_progress = false,
           can_manage_learning = false,
           consent_expires_at = null,
           revoked_at = now(),
           revoked_reason = v_reason
     where id = v_rel.id and status <> 'active';
  else
    update public.guardian_verification_cases
       set status = 'needs_information', reviewed_by = v_actor, reviewed_at = now(),
           decision_reason = v_reason
     where id = p_case_id;
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'guardian.consent_decided', 'guardian_verification_case', p_case_id,
          jsonb_build_object('decision', v_decision, 'months', p_valid_months,
                             'expiresAt', v_expires, 'relationship', v_rel.id,
                             'policyVersion', v_policy, 'reason', v_reason));

  return jsonb_build_object('status', v_decision, 'expiresAt', v_expires,
                            'months', p_valid_months);
end;
$$;

revoke all on function public.decide_guardian_consent(uuid, text, text, integer, boolean, boolean, boolean)
  from public, anon;
grant execute on function public.decide_guardian_consent(uuid, text, text, integer, boolean, boolean, boolean)
  to authenticated;

comment on function public.decide_guardian_consent(uuid, text, text, integer, boolean, boolean, boolean) is
  'Governance staff or the owner verify a guardian for a stated number of months, reject with a reason, or ask for more. Permissions may be narrowed and never widened by this call.';

-- ---------------------------------------------------------------------------
-- The older trigger, taught about lifetimes
-- ---------------------------------------------------------------------------
/**
 * `apply_guardian_verification_decision()` was the only way to activate a
 * relationship before this migration, and it knew nothing about how long a
 * verification lasts. It is still on the table, so it must not be able to write an
 * `active` relationship with no expiry — that would be a consent the enforced gate
 * refuses while looking, on every screen, like a live one.
 *
 * It now stamps twelve months and the case's method when it verifies, and leaves an
 * expiry already set by `decide_guardian_consent()` alone.
 */
create or replace function public.apply_guardian_verification_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.status = old.status then
    return new;
  end if;

  if new.status = 'verified' then
    update public.guardian_relationships
       set status = 'active',
           verified_at = coalesce(new.reviewed_at, now()),
           consent_expires_at = coalesce(
             consent_expires_at,
             coalesce(new.reviewed_at, now()) + interval '12 months'),
           consent_method = coalesce(consent_method, new.method)
     where id = new.guardian_relationship_id
       and status <> 'revoked';
  elsif new.status in ('rejected','revoked') then
    update public.guardian_relationships
       set status = 'revoked',
           can_manage_profile = false,
           can_view_progress = false,
           can_manage_learning = false,
           consent_expires_at = null
     where id = new.guardian_relationship_id;
  end if;
  return new;
end;
$$;

/** Owner or governance staff — the two roles that read identity evidence already. */
create or replace function public.can_decide_guardian_consent(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.has_role(p_user_id, 'platform_admin')
    or public.has_role(p_user_id, 'governance_admin'),
    false);
$$;

revoke all on function public.can_decide_guardian_consent(uuid) from public, anon;
grant execute on function public.can_decide_guardian_consent(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Withdrawing, and reading
-- ---------------------------------------------------------------------------
/**
 * The guardian withdrawing their own consent.
 *
 * Open to the guardian themselves as well as to staff, because a parent who has
 * changed their mind must not have to ask permission to say so. Revocation clears
 * every permission, records why, and leaves the deletion to the retention rule the
 * children's policy states — this function does not delete a child's work, because a
 * withdrawal and a tidy-up are not the same act and doing both silently would destroy
 * records the child may later want.
 */
create or replace function public.revoke_guardian_consent(
  p_relationship_id uuid,
  p_reason          text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_rel    public.guardian_relationships;
begin
  if v_actor is null then
    raise exception 'guardian:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;
  select * into v_rel from public.guardian_relationships where id = p_relationship_id;
  if not found then
    raise exception 'guardian:not_found' using errcode = 'no_data_found';
  end if;
  if v_rel.guardian_user_id <> v_actor and not public.can_decide_guardian_consent(v_actor) then
    raise exception 'guardian:not_allowed'
      using errcode = 'insufficient_privilege',
            hint = 'only the guardian or staff may withdraw a consent';
  end if;
  if v_rel.status = 'revoked' then
    raise exception 'guardian:already_revoked'
      using errcode = 'check_violation';
  end if;
  if length(v_reason) < 10 then
    raise exception 'guardian:reason_required'
      using errcode = 'check_violation',
            hint = 'say why — the record keeps it, and so does the child''s other guardian';
  end if;

  update public.guardian_relationships
     set status = 'revoked',
         can_manage_profile = false,
         can_view_progress = false,
         can_manage_learning = false,
         consent_expires_at = null,
         revoked_at = now(),
         revoked_reason = v_reason
   where id = p_relationship_id;

  -- Any open case dies with it: leaving one pending would have a reviewer approve a
  -- consent that no longer exists.
  update public.guardian_verification_cases
     set status = 'revoked', reviewed_by = v_actor, reviewed_at = now(),
         decision_reason = v_reason
   where guardian_relationship_id = p_relationship_id
     and status in ('pending', 'in_review', 'needs_information');

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'guardian.consent_revoked', 'learner_profile', v_rel.learner_profile_id,
          jsonb_build_object('relationship', p_relationship_id, 'reason', v_reason,
                             'byGuardian', v_rel.guardian_user_id = v_actor));

  return jsonb_build_object('status', 'revoked', 'reason', v_reason);
end;
$$;

revoke all on function public.revoke_guardian_consent(uuid, text) from public, anon;
grant execute on function public.revoke_guardian_consent(uuid, text) to authenticated;

comment on function public.revoke_guardian_consent(uuid, text) is
  'The guardian, or staff, withdraws consent. Permissions are cleared and the reason kept; deletion follows the retention rule in the children''s policy rather than happening here.';

/**
 * What the parent sees about their own children.
 *
 * One row per child, with the state said in a word, the expiry, the method, and
 * whether the children's policy has moved on since they agreed. `policyChanged` is a
 * prompt rather than a block: publishing a policy must not lock every parent out of
 * their child's account at once.
 */
create or replace function public.my_guardian_consents()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_live  uuid;
begin
  if v_actor is null then
    raise exception 'guardian:not_signed_in' using errcode = 'insufficient_privilege';
  end if;

  select v.id into v_live
    from public.policy_versions v
    join public.policy_documents d on d.id = v.document_id
   where d.slug = 'children' and v.status = 'in_force'
   limit 1;

  return jsonb_build_object(
    'enforced', public.guardian_consent_enforced(),
    'policyInForce', v_live is not null,
    'consents', coalesce((
      select jsonb_agg(jsonb_build_object(
               'relationshipId', gr.id,
               'learnerProfileId', gr.learner_profile_id,
               'learnerName', lp.display_name,
               'relationshipType', gr.relationship_type,
               'status', case
                 when gr.status = 'active'
                      and public.guardian_consent_enforced()
                      and (gr.consent_expires_at is null or gr.consent_expires_at <= now())
                   then 'lapsed'
                 else gr.status end,
               'method', gr.consent_method,
               'verifiedAt', gr.verified_at,
               'expiresAt', gr.consent_expires_at,
               'revokedAt', gr.revoked_at,
               'revokedReason', gr.revoked_reason,
               'canViewProgress', gr.can_view_progress,
               'canManageLearning', gr.can_manage_learning,
               'canManageProfile', gr.can_manage_profile,
               'policyChanged', gr.consented_policy_version_id is distinct from v_live
                                and gr.consented_policy_version_id is not null,
               'openCase', (
                 select jsonb_build_object('id', c.id, 'status', c.status,
                                           'submittedAt', c.submitted_at,
                                           'note', c.decision_reason)
                   from public.guardian_verification_cases c
                  where c.guardian_relationship_id = gr.id
                    and c.status in ('pending', 'in_review', 'needs_information')
                  order by c.submitted_at desc limit 1),
               'lastDecision', (
                 select jsonb_build_object('status', c.status, 'at', c.reviewed_at,
                                           'reason', c.decision_reason)
                   from public.guardian_verification_cases c
                  where c.guardian_relationship_id = gr.id
                    and c.reviewed_at is not null
                  order by c.reviewed_at desc limit 1))
             order by lp.display_name)
        from public.guardian_relationships gr
        join public.learner_profiles lp on lp.id = gr.learner_profile_id
       where gr.guardian_user_id = v_actor and gr.deleted_at is null), '[]'::jsonb));
end;
$$;

revoke all on function public.my_guardian_consents() from public, anon;
grant execute on function public.my_guardian_consents() to authenticated;

comment on function public.my_guardian_consents() is
  'A parent''s own consents: the state, how it was established, when it lapses, whether the children''s policy has changed, and what the reviewer said. Never the evidence.';

/**
 * The register, for the two roles that decide.
 *
 * `referenceGiven` rather than the reference: a reviewer needs to know that evidence
 * exists, and no screen needs to hand out a pointer to somebody's identity documents.
 */
create or replace function public.guardian_consent_register()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_live  uuid;
begin
  if v_actor is null or not public.can_decide_guardian_consent(v_actor) then
    raise exception 'guardian:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  select v.id into v_live
    from public.policy_versions v
    join public.policy_documents d on d.id = v.document_id
   where d.slug = 'children' and v.status = 'in_force'
   limit 1;

  return jsonb_build_object(
    'enforced', public.guardian_consent_enforced(),
    'policyInForce', v_live is not null,
    'waiting', coalesce((
      select jsonb_agg(jsonb_build_object(
               'caseId', c.id,
               'relationshipId', gr.id,
               'childName', lp.display_name,
               'ageBand', lp.age_band,
               'guardianName', up.display_name,
               'relationshipType', gr.relationship_type,
               'method', c.method,
               'statement', c.guardian_statement,
               'referenceGiven', c.evidence_reference is not null,
               'submittedAt', c.submitted_at,
               'status', c.status,
               'note', c.decision_reason,
               'waitingDays', floor(extract(epoch from (now() - c.submitted_at)) / 86400)::int)
             order by c.submitted_at)
        from public.guardian_verification_cases c
        join public.guardian_relationships gr on gr.id = c.guardian_relationship_id
        join public.learner_profiles lp on lp.id = gr.learner_profile_id
        join public.user_profiles up on up.user_id = gr.guardian_user_id
       where c.status in ('pending', 'in_review', 'needs_information')), '[]'::jsonb),
    'active', coalesce((
      select jsonb_agg(jsonb_build_object(
               'relationshipId', gr.id,
               'childName', lp.display_name,
               'guardianName', up.display_name,
               'method', gr.consent_method,
               'verifiedAt', gr.verified_at,
               'expiresAt', gr.consent_expires_at,
               'lapsed', gr.consent_expires_at is not null and gr.consent_expires_at <= now(),
               'noExpiry', gr.consent_expires_at is null,
               'policyChanged', gr.consented_policy_version_id is distinct from v_live
                                and gr.consented_policy_version_id is not null,
               'canViewProgress', gr.can_view_progress,
               'canManageLearning', gr.can_manage_learning)
             order by gr.consent_expires_at nulls first)
        from public.guardian_relationships gr
        join public.learner_profiles lp on lp.id = gr.learner_profile_id
        join public.user_profiles up on up.user_id = gr.guardian_user_id
       where gr.status = 'active' and gr.deleted_at is null), '[]'::jsonb),
    'counts', jsonb_build_object(
      'waiting', (select count(*)::int from public.guardian_verification_cases
                   where status in ('pending', 'in_review', 'needs_information')),
      'active', (select count(*)::int from public.guardian_relationships
                  where status = 'active' and deleted_at is null),
      'lapsed', (select count(*)::int from public.guardian_relationships
                  where status = 'active' and deleted_at is null
                    and consent_expires_at is not null and consent_expires_at <= now()),
      'noExpiry', (select count(*)::int from public.guardian_relationships
                    where status = 'active' and deleted_at is null
                      and consent_expires_at is null),
      'children', (select count(*)::int from public.learner_profiles
                    where learner_type = 'child' and deleted_at is null)));
end;
$$;

revoke all on function public.guardian_consent_register() from public, anon;
grant execute on function public.guardian_consent_register() to authenticated;

comment on function public.guardian_consent_register() is
  'The verification queue and every live consent with its expiry. Reports whether evidence exists, never the reference itself.';

-- ---------------------------------------------------------------------------
-- The flag, rewritten to match what now exists
-- ---------------------------------------------------------------------------
update public.platform_settings
   set preconditions = 'Built 2026-10-27: the whole consent loop. A parent submits '
        || 'from /family/guardians — relationship and case in one call, a required '
        || 'statement in their own words, a method (video call, identity document, in '
        || 'person or signed declaration) and a write-only evidence reference. '
        || 'Governance staff or the owner verify it for a stated number of months '
        || '(default 12, never more than 36) on /admin/guardians, or reject it with a '
        || 'reason, or ask for more. The verification carries an expiry, and when this '
        || 'flag is on an unexpired one is required for the guardian to reach the '
        || 'child at all — one predicate behind thirteen policies — and for any child '
        || 'enrolment. A lapse pauses access and deletes nothing; a withdrawal clears '
        || 'the permissions and records why. The children''s policy version in force is '
        || 'stored with each consent, and the screens say plainly when none is. Still '
        || 'the owner''s: the review itself is a human queue, and the evidence has to '
        || 'be held somewhere access-controlled outside the database. Turning this on '
        || 'makes every verification given before today expire at once, because those '
        || 'were approved without a lifetime',
       description = 'Manual review of guardians'
 where key = 'family.guardian_verification';
