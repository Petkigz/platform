-- ---------------------------------------------------------------------------
-- What a version needs before it can publish, and who checked it
-- ---------------------------------------------------------------------------
-- Three tables described the version side of peer review and none of them had a
-- writer:
--
--   content_review_requirements  what this version needs, per subject per scope
--   technical_review_checks      the self-checks an author or reviewer performs
--   content_change_assessments   what changed since the last version, and whether
--                                it needs a fresh review
--
-- The first is not cosmetic. `enforce_publication_gate()` refuses to publish while
-- any requirement is `open`, and `validate_review_assignment()` only checks that a
-- reviewer is authorised for the subjects a version wrote down. With no writer for
-- either side, both were inert: nothing could require a review, so nothing checked
-- whether the reviewer was qualified for the subject, and any verified reviewer fit
-- any course. Publication still needed one scholarly approval — that is
-- `governance.min_approvals`, and it is not per subject — but "this version teaches
-- Tajweed, so a reviewer authorised in Tajweed must approve it" could not be said.
--
-- The other direction was inert too. A requirement, once written, could never be
-- closed: nothing set `satisfied`, so the first requirement anybody created would
-- have blocked that version forever with no visible cause. This migration is
-- therefore mostly about closing requirements honestly.
--
-- ---------------------------------------------------------------------------
-- The rule for satisfying one, stated once
-- ---------------------------------------------------------------------------
-- A requirement is satisfied when enough approvals exist, in its scope, from
-- reviewers authorised for its subject. "Enough" is `required_approval_count`.
-- "Authorised" is `is_authorised_reviewer()`, evaluated when the recount runs, and
-- it counts distinct assignments, so one reviewer approving twice is one approval.
--
-- The recount only ever moves a requirement from `open` to `satisfied`. It never
-- reopens one. Reopening is a decision a person makes and is audited as such,
-- because the automatic alternative is worse in both directions: a reviewer whose
-- authorisation expires next year would silently reopen requirements they had
-- already satisfied, and a version would stop being publishable for a reason nobody
-- chose and nothing on the screen explains. Raising `required_approval_count` is how
-- a requirement is reopened — `require_review()` sets the row back to `open` and
-- recounts, so the state always follows from the approvals and the count, and the
-- screen can show "1 of 2, and nobody else is authorised for this subject" when it
-- cannot be reached.
--
-- Waiving is separate and governance-only, with the reason in writing, because it is
-- the one act here that lets a course publish without the review somebody asked for.
--
-- One more thing worth writing down, because it is a trap that is easy to fall into
-- twice. These functions do not call `can_author_version()`. It looks like the
-- authorship test and it is not: it short-circuits on `is_privileged()`, so it answers
-- "may act as the author of this version", which every member of staff does, a support
-- agent included. The `crr_write` policy uses it and that is fine for an insert policy
-- on a table whose other rules are the gate. Here the function IS the gate, so each one
-- reads `course_versions.created_by` and compares it with the session, and says "the
-- author, or governance staff" meaning exactly those two.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Recounting what a version needs
-- ---------------------------------------------------------------------------
create or replace function public.refresh_review_requirements(
  p_course_version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requirement record;
  v_approvals   integer;
  v_satisfied   integer := 0;
  v_open        integer := 0;
  v_rows        jsonb := '[]'::jsonb;
begin
  for v_requirement in
    select crr.id, crr.subject_area_id, crr.review_scope,
           crr.required_approval_count, crr.requirement_status
      from public.content_review_requirements crr
     where crr.course_version_id = p_course_version_id
     order by crr.created_at
  loop
    if v_requirement.requirement_status = 'waived' then
      -- A waiver is a decision, not a count. Recounting past it would undo it.
      v_rows := v_rows || jsonb_build_object(
        'requirementId', v_requirement.id,
        'subjectAreaId', v_requirement.subject_area_id,
        'reviewScope', v_requirement.review_scope,
        'status', 'waived',
        'approvals', null::integer,
        'required', v_requirement.required_approval_count);
      continue;
    end if;

    select count(distinct crd.review_assignment_id) into v_approvals
      from public.content_review_decisions crd
      join public.content_review_assignments cra
        on cra.id = crd.review_assignment_id
      join public.reviewer_profiles rp
        on rp.id = cra.reviewer_profile_id
     where crd.course_version_id = p_course_version_id
       and crd.review_scope = v_requirement.review_scope
       and crd.decision = 'approved'
       and public.is_authorised_reviewer(
             rp.user_id, v_requirement.subject_area_id, v_requirement.review_scope);

    if v_approvals >= v_requirement.required_approval_count
       and v_requirement.requirement_status = 'open' then
      update public.content_review_requirements
         set requirement_status = 'satisfied'
       where id = v_requirement.id;

      insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
      values (public.current_user_id(), 'review.requirement_satisfied',
              'content_review_requirement', v_requirement.id,
              jsonb_build_object('approvals', v_approvals,
                                 'required', v_requirement.required_approval_count,
                                 'review_scope', v_requirement.review_scope));
      v_satisfied := v_satisfied + 1;
    else
      v_open := v_open + 1;
    end if;

    v_rows := v_rows || jsonb_build_object(
      'requirementId', v_requirement.id,
      'subjectAreaId', v_requirement.subject_area_id,
      'reviewScope', v_requirement.review_scope,
      'status', case when v_approvals >= v_requirement.required_approval_count
                       and v_requirement.requirement_status = 'open'
                     then 'satisfied' else v_requirement.requirement_status end,
      'approvals', v_approvals,
      'required', v_requirement.required_approval_count);
  end loop;

  return jsonb_build_object(
    'courseVersionId', p_course_version_id,
    'satisfiedNow', v_satisfied,
    'stillOpen', v_open,
    'requirements', v_rows);
end;
$$;

-- No caller gate, deliberately. It recomputes a fact from rows that are themselves
-- gated: an approval exists or it does not, and the reviewer was authorised or was
-- not. It cannot create an approval, cannot authorise anybody, and cannot waive
-- anything, so the worst a caller can do is make a version's own state current —
-- which the trigger below does on every approval anyway. It has to be callable by
-- whoever records a decision, and that is the reviewer, who is neither the author
-- nor governance staff.
revoke all on function public.refresh_review_requirements(uuid) from public;
revoke all on function public.refresh_review_requirements(uuid) from anon;
grant execute on function public.refresh_review_requirements(uuid) to authenticated;

comment on function public.refresh_review_requirements(uuid) is
  'Recounts what a version needs: satisfies open requirements whose approvals have arrived, and never reopens one. Runs on every approval and whenever a requirement changes.';

create or replace function public.satisfy_requirements_on_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.decision = 'approved' then
    perform public.refresh_review_requirements(new.course_version_id);
  end if;
  return new;
end;
$$;

-- SECURITY DEFINER because the reviewer who records the approval has no update
-- policy on content_review_requirements (crr_update is privileged only), and a
-- trigger that ran as them would fail the insert that ought to satisfy it.
create trigger crd_satisfy_requirements
  after insert on public.content_review_decisions
  for each row execute function public.satisfy_requirements_on_approval();

-- ---------------------------------------------------------------------------
-- 2. Writing down what a version needs
-- ---------------------------------------------------------------------------
create or replace function public.require_review(
  p_course_version_id         uuid,
  p_subject_area_id           uuid,
  p_review_scope              text default 'scholarly',
  p_required_approval_count   integer default 1)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor          uuid := public.current_user_id();
  v_is_staff       boolean;
  v_is_author      boolean;
  v_version_author uuid;
  v_existing       record;
  v_requirement_id uuid;
  v_count          integer;
  v_reopened       boolean := false;
  v_status         text;
begin
  if v_actor is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;

  v_is_staff := public.has_role(v_actor, 'governance_admin')
             or public.has_role(v_actor, 'platform_admin');

  select cv.created_by into v_version_author
    from public.course_versions cv where cv.id = p_course_version_id;
  if not found then
    raise exception 'no course version %', p_course_version_id
      using errcode = 'no_data_found';
  end if;
  v_is_author := v_version_author is not distinct from v_actor;

  if not (v_is_staff or v_is_author) then
    raise exception 'only the author of this version, or governance staff, may say what it needs reviewed'
      using errcode = 'insufficient_privilege';
  end if;

  if p_review_scope is null or p_review_scope not in ('technical', 'scholarly') then
    raise exception 'a review is technical or scholarly; % is neither',
      coalesce(p_review_scope, 'nothing')
      using errcode = 'check_violation';
  end if;

  if p_required_approval_count is null or p_required_approval_count < 1 then
    raise exception 'a review needs at least one approval, not %',
      coalesce(p_required_approval_count::text, 'nothing')
      using errcode = 'check_violation';
  end if;

  if not exists (select 1 from public.subject_areas sa
                  where sa.id = p_subject_area_id and sa.status = 'active') then
    raise exception 'no active subject area %', coalesce(p_subject_area_id::text, 'was given')
      using errcode = 'no_data_found';
  end if;

  select crr.id, crr.required_approval_count, crr.requirement_status,
         crr.waived_by, crr.waived_reason
    into v_existing
    from public.content_review_requirements crr
   where crr.course_version_id = p_course_version_id
     and crr.subject_area_id = p_subject_area_id
     and crr.review_scope = p_review_scope;

  if found and v_existing.requirement_status = 'waived' and not v_is_staff then
    raise exception 'this requirement was waived by somebody else; only governance staff may reopen it'
      using errcode = 'insufficient_privilege';
  end if;

  if found then
    v_requirement_id := v_existing.id;
  end if;

  if not found then
    insert into public.content_review_requirements
      (course_version_id, subject_area_id, review_scope, required_approval_count)
    values
      (p_course_version_id, p_subject_area_id, p_review_scope, p_required_approval_count)
    returning id into v_requirement_id;

    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (v_actor, 'review.requirement_created', 'content_review_requirement', v_requirement_id,
            jsonb_build_object('course_version_id', p_course_version_id,
                               'subject_area_id', p_subject_area_id,
                               'review_scope', p_review_scope,
                               'required_approval_count', p_required_approval_count));
  else
    v_count := p_required_approval_count;
    -- Raising the number of approvals needed is how a requirement is reopened, and
    -- unwaiving clears both waiver columns because crr_waiver_agrees ties them to
    -- the status. Either way the recount below decides where it lands.
    v_reopened := v_existing.requirement_status = 'waived'
                  or (v_existing.requirement_status <> 'open'
                      and v_count > v_existing.required_approval_count);

    update public.content_review_requirements
       set required_approval_count = v_count,
           requirement_status = case
             when v_existing.requirement_status = 'waived' then 'open'
             when v_count > v_existing.required_approval_count then 'open'
             else requirement_status end,
           waived_by = case when v_existing.requirement_status = 'waived' then null else waived_by end,
           waived_reason = case when v_existing.requirement_status = 'waived' then null else waived_reason end
     where id = v_requirement_id;

    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (v_actor,
            case when v_existing.requirement_status = 'waived' then 'review.requirement_reopened'
                 else 'review.requirement_updated' end,
            'content_review_requirement', v_requirement_id,
            jsonb_build_object('from_count', v_existing.required_approval_count,
                               'to_count', v_count,
                               'from_status', v_existing.requirement_status,
                               'previous_waiver', v_existing.waived_reason));
  end if;

  -- Counting is one rule and it lives in one place: a requirement written after the
  -- approvals arrived is satisfied the moment it is written, and a count raised
  -- above the approvals that exist falls back to open.
  perform public.refresh_review_requirements(p_course_version_id);

  select crr.requirement_status into v_status
    from public.content_review_requirements crr where crr.id = v_requirement_id;

  return jsonb_build_object(
    'requirementId', v_requirement_id,
    'status', v_status,
    'requiredApprovalCount', p_required_approval_count,
    'reopened', v_reopened,
    'note', case
      when v_status = 'satisfied' then 'the approvals this needed are already recorded'
      when v_reopened then 'this was satisfied or waived, and is open again until enough approvals exist'
      else null::text end);
end;
$$;

revoke all on function public.require_review(uuid, uuid, text, integer) from public;
revoke all on function public.require_review(uuid, uuid, text, integer) from anon;
grant execute on function public.require_review(uuid, uuid, text, integer) to authenticated;

comment on function public.require_review(uuid, uuid, text, integer) is
  'The author or governance staff. Writes down that a version needs N approvals in a subject and scope, raises or lowers N, reopens a satisfied or waived one, and recounts.';

-- ---------------------------------------------------------------------------
-- 3. Waiving one
-- ---------------------------------------------------------------------------
create or replace function public.waive_review_requirement(
  p_requirement_id uuid,
  p_reason         text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_row   record;
begin
  if v_actor is null or not (
       public.has_role(v_actor, 'governance_admin')
    or public.has_role(v_actor, 'platform_admin')) then
    raise exception 'only a governance admin may waive a review requirement'
      using errcode = 'insufficient_privilege';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'a waiver needs the reason in writing'
      using errcode = 'check_violation';
  end if;

  if length(trim(p_reason)) > 2000 then
    raise exception 'a waiver reason must be 2000 characters or fewer'
      using errcode = 'check_violation';
  end if;

  select crr.id, crr.course_version_id, crr.requirement_status, crr.waived_reason
    into v_row
    from public.content_review_requirements crr
   where crr.id = p_requirement_id;

  if not found then
    raise exception 'no review requirement %', p_requirement_id
      using errcode = 'no_data_found';
  end if;

  if v_row.requirement_status = 'waived' then
    return jsonb_build_object(
      'requirementId', v_row.id, 'status', 'waived', 'changed', false,
      'note', 'this requirement is already waived');
  end if;

  update public.content_review_requirements
     set requirement_status = 'waived',
         waived_by = v_actor,
         waived_reason = trim(p_reason)
   where id = p_requirement_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'review.requirement_waived', 'content_review_requirement', p_requirement_id,
          jsonb_build_object('course_version_id', v_row.course_version_id,
                             'previous_status', v_row.requirement_status,
                             'reason', trim(p_reason)));

  return jsonb_build_object(
    'requirementId', v_row.id, 'status', 'waived', 'changed', true,
    'waivedBy', v_actor, 'reason', trim(p_reason));
end;
$$;

revoke all on function public.waive_review_requirement(uuid, text) from public;
revoke all on function public.waive_review_requirement(uuid, text) from anon;
grant execute on function public.waive_review_requirement(uuid, text) to authenticated;

comment on function public.waive_review_requirement(uuid, text) is
  'Governance staff only, reason required. The one act here that lets a course publish without a review somebody asked for, so it is written down with the reason attached.';

-- ---------------------------------------------------------------------------
-- 4. The checks an author or a reviewer performs themselves
-- ---------------------------------------------------------------------------
create or replace function public.record_technical_check(
  p_course_version_id uuid,
  p_check_type        text,
  p_passed            boolean,
  p_evidence          text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor          uuid := public.current_user_id();
  v_is_staff       boolean;
  v_is_author      boolean;
  v_version_author uuid;
  v_assigned       boolean;
  v_id             uuid;
begin
  if v_actor is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;

  if p_check_type is null or p_check_type not in
     ('media_plays', 'captions_present', 'links_resolve', 'metadata_complete',
      'quiz_answers_graded', 'accessibility', 'other') then
    raise exception 'a technical check is media_plays, captions_present, links_resolve, metadata_complete, quiz_answers_graded, accessibility or other; % is none of them',
      coalesce(p_check_type, 'nothing')
      using errcode = 'check_violation';
  end if;

  if p_passed is null then
    raise exception 'say whether the check passed' using errcode = 'check_violation';
  end if;

  v_is_staff := public.has_role(v_actor, 'governance_admin')
             or public.has_role(v_actor, 'platform_admin');

  select exists (
    select 1
      from public.content_review_assignments cra
      join public.reviewer_profiles rp on rp.id = cra.reviewer_profile_id
     where cra.course_version_id = p_course_version_id
       and rp.user_id = v_actor
       and cra.assignment_status in ('accepted', 'in_progress', 'completed'))
    into v_assigned;

  select cv.created_by into v_version_author
    from public.course_versions cv where cv.id = p_course_version_id;
  if not found then
    raise exception 'no course version %', p_course_version_id
      using errcode = 'no_data_found';
  end if;
  v_is_author := v_version_author is not distinct from v_actor;

  if not (v_is_staff or v_assigned or v_is_author) then
    raise exception 'only the author of this version, a reviewer assigned to it, or governance staff may record a technical check'
      using errcode = 'insufficient_privilege';
  end if;

  if p_evidence is not null and length(trim(p_evidence)) > 2000 then
    raise exception 'evidence for a check must be 2000 characters or fewer'
      using errcode = 'check_violation';
  end if;

  insert into public.technical_review_checks
    (course_version_id, check_type, passed, evidence, performed_by)
  values
    (p_course_version_id, p_check_type, p_passed,
     nullif(trim(p_evidence), ''), v_actor)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'review.technical_check_recorded', 'technical_review_check', v_id,
          jsonb_build_object('course_version_id', p_course_version_id,
                             'check_type', p_check_type,
                             'passed', p_passed,
                             'recorded_by_author', v_is_author,
                             'recorded_by_reviewer', v_assigned));

  return jsonb_build_object(
    'checkId', v_id, 'checkType', p_check_type, 'passed', p_passed,
    'performedBy', v_actor,
    'note', case when p_passed then null
                 else 'a failed check does not block publication; it is what a reviewer reads before deciding' end);
end;
$$;

revoke all on function public.record_technical_check(uuid, text, boolean, text) from public;
revoke all on function public.record_technical_check(uuid, text, boolean, text) from anon;
grant execute on function public.record_technical_check(uuid, text, boolean, text) to authenticated;

comment on function public.record_technical_check(uuid, text, boolean, text) is
  'The author, an assigned reviewer, or governance staff. Append-only: a re-check is a new row and the screen reads the latest of each kind. Never a substitute for scholarly approval, and it does not touch the publication gate.';

-- ---------------------------------------------------------------------------
-- 5. What changed, and whether it needs a fresh review
-- ---------------------------------------------------------------------------
create or replace function public.assess_content_change(
  p_course_version_id  uuid,
  p_change_class       text,
  p_risk_level         text,
  p_requires_re_review boolean,
  p_rationale          text,
  p_from_version_id    uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor          uuid := public.current_user_id();
  v_is_staff       boolean;
  v_is_author      boolean;
  v_version_author uuid;
  v_id             uuid;
begin
  if v_actor is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;

  v_is_staff := public.has_role(v_actor, 'governance_admin')
             or public.has_role(v_actor, 'platform_admin');

  select cv.created_by into v_version_author
    from public.course_versions cv where cv.id = p_course_version_id;
  if not found then
    raise exception 'no course version %', p_course_version_id
      using errcode = 'no_data_found';
  end if;
  v_is_author := v_version_author is not distinct from v_actor;

  if not (v_is_staff or v_is_author) then
    raise exception 'only the author of this version, or governance staff, may classify what changed in it'
      using errcode = 'insufficient_privilege';
  end if;

  if p_change_class is null or p_change_class not in
     ('typographical', 'media_replacement', 'structural', 'content_minor',
      'doctrinal', 'source_change') then
    raise exception 'a change is typographical, media_replacement, structural, content_minor, doctrinal or source_change; % is none of them',
      coalesce(p_change_class, 'nothing')
      using errcode = 'check_violation';
  end if;

  if p_risk_level is null or p_risk_level not in ('low', 'medium', 'high', 'critical') then
    raise exception 'a risk is low, medium, high or critical; % is none of them',
      coalesce(p_risk_level, 'nothing')
      using errcode = 'check_violation';
  end if;

  -- cca_material_changes_are_risky says the same thing, and a caller should get a
  -- sentence rather than the name of a constraint.
  if p_change_class in ('doctrinal', 'source_change')
     and (p_risk_level not in ('high', 'critical') or p_requires_re_review is not true) then
    raise exception 'a % change is never low risk and always needs a fresh review', p_change_class
      using errcode = 'check_violation';
  end if;

  if p_requires_re_review is null then
    raise exception 'say whether this needs a fresh review' using errcode = 'check_violation';
  end if;

  if p_rationale is null or length(trim(p_rationale)) = 0 then
    raise exception 'classify a change with the reason in writing'
      using errcode = 'check_violation';
  end if;

  if length(trim(p_rationale)) > 2000 then
    raise exception 'the rationale must be 2000 characters or fewer'
      using errcode = 'check_violation';
  end if;

  if p_from_version_id is not null then
    if p_from_version_id = p_course_version_id then
      raise exception 'a version did not change from itself' using errcode = 'check_violation';
    end if;
    if not exists (
      select 1
        from public.course_versions a
        join public.course_versions b on b.id = p_from_version_id
       where a.id = p_course_version_id and a.course_id = b.course_id) then
      raise exception 'version % is not another version of the same course', p_from_version_id
        using errcode = 'check_violation';
    end if;
  end if;

  insert into public.content_change_assessments
    (course_version_id, from_version_id, change_class, risk_level,
     requires_re_review, rationale, assessed_by)
  values
    (p_course_version_id, p_from_version_id, p_change_class, p_risk_level,
     p_requires_re_review, trim(p_rationale), v_actor)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'review.change_assessed', 'content_change_assessment', v_id,
          jsonb_build_object('course_version_id', p_course_version_id,
                             'from_version_id', p_from_version_id,
                             'change_class', p_change_class,
                             'risk_level', p_risk_level,
                             'requires_re_review', p_requires_re_review,
                             'assessed_by_author', not v_is_staff));

  return jsonb_build_object(
    'assessmentId', v_id,
    'changeClass', p_change_class,
    'riskLevel', p_risk_level,
    'requiresReReview', p_requires_re_review,
    'assessedBy', v_actor,
    'note', case
      when p_requires_re_review then 'this version needs a fresh review before it can publish'
      else null end);
end;
$$;

revoke all on function public.assess_content_change(uuid, text, text, boolean, text, uuid) from public;
revoke all on function public.assess_content_change(uuid, text, text, boolean, text, uuid) from anon;
grant execute on function public.assess_content_change(uuid, text, text, boolean, text, uuid) to authenticated;

comment on function public.assess_content_change(uuid, text, text, boolean, text, uuid) is
  'The author or governance staff. Append-only, so a governance classification sits beside the author''s rather than replacing it, and the screen shows both with who said which.';
