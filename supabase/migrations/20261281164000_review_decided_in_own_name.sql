-- A review is decided by the reviewer it was given to, in their own name.
--
-- WHY THIS EXISTS
-- ---------------
-- Found on 2026-11-27 while the reviewer's assignment page was being read for
-- translation, and measured on a database built from the 370 migrations
-- before this one (so the hosted test project behaves the same until this is
-- applied there). Signed in as an ordinary account, through the API:
--
--   1. `set_course_version_status(version, status, actor, reason)` believed
--      the `actor` it was handed. An account with no role moved a submitted
--      version to `approved` by naming an administrator, whose id is on every
--      assignment that administrator made and every version they decided. By
--      the same call an author approved their own course. Publishing was
--      refused by the publication gate, which counts approvals itself.
--      Retiring a published version by the same call was not tried; the
--      function's own rule for it asks only that the named actor be staff.
--   2. `re_pin_enrolment(...)` asks whether the actor it is handed is staff
--      and nothing about the caller (read, not tried): any account could
--      move anybody's enrolment to another published version of its course.
--   3. Anybody holding the reviewer role could approve or return any
--      submitted version, with no assignment and no decision recorded.
--   4. The reviewer named on an assignment could rewrite it: point it at
--      another course version (and so read that version and play its
--      lessons, or record an approval of a course they wrote themselves,
--      which the check made when an assignment is created exists to stop),
--      change a technical review into a scholarly one, change who assigned
--      it and when it is due, and reopen one that staff had cancelled or
--      that they had declined. `cra_update` says whose row it is and nothing
--      about which columns.
--   5. A decision could be recorded on an assignment that was only offered,
--      or declined, or cancelled, and more than one on the same assignment.
--      An approval recorded that way was counted towards publication.
--   6. A reviewer who declared a conflict about a course could still decide
--      it. The page they declare on says the declaration bars them at once;
--      only a NEW assignment was refused.
--
-- WHAT THIS DOES
-- --------------
--   * Both functions refuse a signed-in caller who names somebody else.
--     Called with no session (the server's own key, a migration) they
--     believe the parameter as before; nothing a browser holds can do that.
--   * A signed-in reviewer who is not staff moves a submitted version only
--     with a decision of their own on it that says the same thing, recorded
--     since the version was submitted.
--   * An assignment keeps its course version, its reviewer and its scope for
--     any signed-in person, staff included: cancel it and make another, so
--     the checks made when one is created are always made. The reviewer may
--     accept or decline an offer and mark an accepted review in progress,
--     and nothing else; the times are written by the database.
--   * A decision by a signed-in reviewer needs a review that was accepted
--     and is still open, and nobody records one while a conflict they
--     declared about that course (or about themselves) is unheard or was
--     found disqualifying. Recording a decision completes the assignment, so
--     the second is refused with the first.
--
-- WHAT IT DOES NOT DO
-- -------------------
-- It adds no table and no column, gives no role anything, and changes no row
-- (an assignment that already holds a decision is left in the state it is
-- in). It does not undo anything done through these holes; there is no
-- record that anything was. It does not look at the other functions that
-- answer a question about a user id they are handed (`is_privileged(uuid)`,
-- `has_role(uuid, text)` and the like): those disclose a fact and write
-- nothing.

-- ---------------------------------------------------------------------------
-- 1. The actor is the caller
-- ---------------------------------------------------------------------------
create or replace function public.set_course_version_status(
  p_version_id  uuid,
  p_new_status  text,
  p_actor_id    uuid,
  p_reason      text default null
)
returns public.course_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.course_versions;
  v_allowed boolean := false;
  v_is_author boolean;
  v_is_reviewer boolean;
  v_is_priv boolean;
  v_audience text;
  v_gate jsonb;
  v_caller uuid := public.current_user_id();
begin
  -- Whoever is signed in acts in their own name. Until this migration the
  -- actor was whoever the caller said it was.
  if v_caller is not null and v_caller is distinct from p_actor_id then
    raise exception
      'a course version is moved in your own name, not in the name of %', p_actor_id
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_old from public.course_versions where id = p_version_id for update;
  if not found then
    raise exception 'course version % not found', p_version_id using errcode = 'no_data_found';
  end if;

  v_is_author   := (p_actor_id = v_old.created_by);
  v_is_priv     := public.is_privileged(p_actor_id);
  v_is_reviewer := public.has_role(p_actor_id, 'reviewer') or v_is_priv;

  v_allowed :=
    (v_old.version_status = 'draft'     and p_new_status = 'submitted' and v_is_author) or
    (v_old.version_status = 'submitted' and p_new_status = 'approved'  and v_is_reviewer) or
    (v_old.version_status = 'submitted' and p_new_status = 'rejected'  and v_is_reviewer) or
    (v_old.version_status = 'approved'  and p_new_status = 'published' and v_is_priv) or
    (v_old.version_status = 'approved'  and p_new_status = 'rejected'  and v_is_priv) or
    (v_old.version_status = 'rejected'  and p_new_status = 'draft'     and v_is_author) or
    (v_old.version_status = 'published' and p_new_status = 'retired'   and v_is_priv);

  if not v_allowed then
    raise exception
      'transition % -> % on course version % is not permitted for actor %',
      v_old.version_status, p_new_status, p_version_id, p_actor_id
      using errcode = 'insufficient_privilege';
  end if;

  if p_new_status = 'approved' and v_is_author then
    raise exception
      'the author of course version % may not approve it themselves', p_version_id
      using errcode = 'insufficient_privilege';
  end if;

  -- A reviewer moves a version with the decision they recorded on it, not
  -- with the role alone: until this migration anybody holding the reviewer
  -- role could approve or return any submitted version, assigned or not, and
  -- leave no decision behind. Staff are not asked for one, and neither is the
  -- server's own key.
  if v_caller is not null and not v_is_priv
     and v_old.version_status = 'submitted'
     and p_new_status in ('approved', 'rejected')
     and not exists (
       select 1
         from public.content_review_decisions d
        where d.course_version_id = p_version_id
          and d.decided_by = v_caller
          and d.decided_at >= coalesce(v_old.submitted_at, '-infinity'::timestamptz)
          and ((p_new_status = 'approved' and d.decision = 'approved')
            or (p_new_status = 'rejected' and d.decision in ('revision_requested', 'rejected')))
     ) then
    raise exception
      'a reviewer approves or returns course version % with a decision of their own, recorded on it since it was submitted', p_version_id
      using errcode = 'insufficient_privilege';
  end if;

  -- The safeguarding gate: the owner's decision of 2026-10-30. It is checked at
  -- publication, on the **author** rather than on whoever presses the button,
  -- and only for a course a child may be shown. Off, the gate is absent.
  if p_new_status = 'published'
     and public.setting_bool('platform.safeguarding', false) then
    select c.audience into v_audience
      from public.courses c
     where c.id = v_old.course_id;

    if v_audience in ('child', 'both') then
      v_gate := public.may_teach_children(v_old.created_by);
      if not (v_gate -> 'allowed')::boolean then
        raise exception 'safeguarding:author_not_cleared'
          using errcode = 'insufficient_privilege',
                hint = v_gate ->> 'reason';
      end if;
    end if;
  end if;

  perform set_config('app.bypassing_version_lock', 'on', true);

  if p_new_status = 'published' then
    if not exists (select 1 from public.course_sections cs
                    join public.lessons l on l.section_id = cs.id
                    where cs.course_version_id = p_version_id) then
      raise exception
        'course version % has no lessons and cannot be published', p_version_id
        using errcode = 'check_violation';
    end if;

    update public.course_versions
       set version_status = 'retired',
           retired_at     = now(),
           decision_by    = p_actor_id,
           decision_reason = 'superseded by version ' || v_old.version_number
     where course_id = v_old.course_id
       and language  = v_old.language
       and version_status = 'published';
  end if;

  update public.course_versions
     set version_status  = p_new_status,
         submitted_at    = case when p_new_status = 'submitted' then now() else submitted_at end,
         published_at    = case when p_new_status = 'published' then now() else published_at end,
         retired_at      = case when p_new_status = 'retired'   then now() else retired_at end,
         decision_by     = case when p_new_status in ('approved','rejected') then p_actor_id else decision_by end,
         decision_reason = case when p_new_status in ('approved','rejected','retired') then p_reason else decision_reason end
   where id = p_version_id
  returning * into v_old;

  perform set_config('app.bypassing_version_lock', 'off', true);

  return v_old;
end;
$$;

revoke execute on function public.set_course_version_status(uuid, text, uuid, text) from public;
revoke execute on function public.set_course_version_status(uuid, text, uuid, text) from anon;
grant  execute on function public.set_course_version_status(uuid, text, uuid, text) to authenticated;

comment on function public.set_course_version_status(uuid, text, uuid, text) is
  'The only way to move a course version between states. A signed-in caller acts in their own name; a reviewer who is not staff needs a decision of their own on the version; the author never approves; publication is gated on safeguarding clearance when that control is on.';

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
  v_caller    uuid := public.current_user_id();
begin
  -- Whoever is signed in acts in their own name; the check below is then a
  -- check of the caller, which until this migration it was not.
  if v_caller is not null and v_caller is distinct from p_actor_id then
    raise exception
      'an enrolment is re-pinned in your own name, not in the name of %', p_actor_id
      using errcode = 'insufficient_privilege';
  end if;

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

comment on function public.re_pin_enrolment(uuid, uuid, uuid, text, text) is
  'The only way to move an enrolment between versions. Privileged only, in the caller''s own name, reason mandatory, history written.';

-- ---------------------------------------------------------------------------
-- 2. What may change on an assignment once it is made
-- ---------------------------------------------------------------------------
create or replace function public.guard_review_assignment_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := public.current_user_id();
begin
  -- No session: the server's own key, a migration, two accounts being merged.
  if v_caller is null then
    return new;
  end if;

  -- What an assignment IS. The checks of independence, authorisation and
  -- conflict are made when one is created, against these three.
  if new.course_version_id is distinct from old.course_version_id
     or new.reviewer_profile_id is distinct from old.reviewer_profile_id
     or new.review_scope is distinct from old.review_scope then
    raise exception
      'an assignment keeps its course version, its reviewer and its scope; cancel it and make another'
      using errcode = 'check_violation';
  end if;

  if public.is_privileged(v_caller) then
    return new;
  end if;

  -- From here on the caller is the reviewer the assignment names: the update
  -- policy admits nobody else.
  if new.assigned_by is distinct from old.assigned_by
     or new.assigned_at is distinct from old.assigned_at
     or new.due_at is distinct from old.due_at then
    raise exception
      'who assigned a review, when, and when it is due are for staff to set'
      using errcode = 'insufficient_privilege';
  end if;

  if new.assignment_status = old.assignment_status then
    if new.accepted_at is distinct from old.accepted_at
       or new.completed_at is distinct from old.completed_at then
      raise exception
        'the times on an assignment are written when its state changes'
        using errcode = 'insufficient_privilege';
    end if;
    return new;
  end if;

  if old.assignment_status = 'offered' and new.assignment_status = 'accepted' then
    new.accepted_at := now();
  elsif old.assignment_status = 'offered' and new.assignment_status = 'declined' then
    new.accepted_at := null;
  elsif old.assignment_status = 'accepted' and new.assignment_status = 'in_progress' then
    new.accepted_at := old.accepted_at;
  elsif old.assignment_status in ('accepted', 'in_progress') and new.assignment_status = 'completed' then
    if not exists (
      select 1 from public.content_review_decisions d
       where d.review_assignment_id = old.id
    ) then
      raise exception
        'a review is completed by recording a decision on it'
        using errcode = 'check_violation';
    end if;
    new.accepted_at := old.accepted_at;
  else
    raise exception
      'a review that is % is not made % by its reviewer', old.assignment_status, new.assignment_status
      using errcode = 'insufficient_privilege';
  end if;

  new.completed_at := case when new.assignment_status = 'completed' then now() else old.completed_at end;
  return new;
end;
$$;
revoke all on function public.guard_review_assignment_update() from public, anon, authenticated;

comment on function public.guard_review_assignment_update() is
  'An assignment keeps its version, reviewer and scope for anybody signed in. Its reviewer may accept or decline an offer and mark an accepted review in progress; a decision completes it; the rest is for staff.';

create trigger cra_guard_update
  before update on public.content_review_assignments
  for each row execute function public.guard_review_assignment_update();

-- ---------------------------------------------------------------------------
-- 3. When a decision may be recorded, and what recording one does
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER from here on, so that what it reads does not depend on what
-- the reviewer's own policies let them see. It still only refuses or lets
-- through; it writes nothing.
create or replace function public.validate_review_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment public.content_review_assignments;
  v_reviewer_user uuid;
  v_caller uuid := public.current_user_id();
begin
  -- Locked, so that two decisions sent at once are judged one after the
  -- other and the second sees the assignment the first one completed.
  select * into v_assignment from public.content_review_assignments
   where id = new.review_assignment_id
     for update;

  if v_assignment.course_version_id <> new.course_version_id
     or v_assignment.review_scope <> new.review_scope then
    raise exception
      'decision % does not match the version and scope of its assignment', new.id
      using errcode = 'check_violation';
  end if;

  select rp.user_id into v_reviewer_user
    from public.reviewer_profiles rp where rp.id = v_assignment.reviewer_profile_id;

  if v_reviewer_user <> new.decided_by then
    raise exception
      'decisions must be recorded by the assigned reviewer, not by %', new.decided_by
      using errcode = 'insufficient_privilege';
  end if;

  -- An offer nobody accepted, a review that was declined or cancelled, and a
  -- review already decided are not open. With no session (the server's own
  -- key) the state is not asked about, as it was not before.
  if v_caller is not null
     and v_assignment.assignment_status not in ('accepted', 'in_progress') then
    raise exception
      'a decision is recorded on a review that was accepted and is still open; this one is %',
      v_assignment.assignment_status
      using errcode = 'check_violation';
  end if;

  -- The same question that is asked when an assignment is made, asked again
  -- when it is decided: a conflict declared since then bars the decision.
  if exists (
    select 1 from public.reviewer_conflict_declarations rcd
     where rcd.reviewer_profile_id = v_assignment.reviewer_profile_id
       and (rcd.course_version_id = new.course_version_id or rcd.course_version_id is null)
       and rcd.status in ('declared', 'under_assessment', 'disqualifying')
  ) then
    raise exception
      'reviewer % has an unresolved conflict declaration against course version %; no decision is recorded until it is heard',
      v_assignment.reviewer_profile_id, new.course_version_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
revoke all on function public.validate_review_decision() from public, anon, authenticated;

comment on function public.validate_review_decision() is
  'A decision comes from the reviewer its assignment names, on that version and scope, while the review is accepted and open, and not while a conflict they declared is unheard or disqualifying.';

create or replace function public.complete_assignment_on_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.content_review_assignments
     set assignment_status = 'completed',
         completed_at = now()
   where id = new.review_assignment_id
     and assignment_status in ('accepted', 'in_progress');
  return new;
end;
$$;
revoke all on function public.complete_assignment_on_decision() from public, anon, authenticated;

comment on function public.complete_assignment_on_decision() is
  'Recording a decision completes the assignment it answers. The lessons stop playing for the reviewer at that moment, and a second decision on it is refused.';

create trigger crd_complete_assignment
  after insert on public.content_review_decisions
  for each row execute function public.complete_assignment_on_decision();
