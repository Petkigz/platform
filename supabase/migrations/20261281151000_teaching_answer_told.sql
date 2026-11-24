-- An applicant is told when their application to teach is answered.
--
-- Deciding an application wrote the decision, the role and the audit entry,
-- and told nobody. The page for applying said so: "No message is sent when it
-- comes, so look here again." Somebody who asked to teach had to keep opening
-- a page to find out.
--
-- From this migration `decide_teaching_application()` also writes one message
-- to the applicant, of a new kind, `teaching_answered`, kept as what it is
-- made of:
--
--   teaching_answered     outcome (approved | declined)
--
-- What the message does not hold: what the owner wrote. A reason is required
-- for every decision and is already shown to the applicant on the application
-- page by `my_teaching_application()`. A second copy in another table would
-- outlive the application it belongs to.
--
-- What changes, and nothing else:
--   * the closed list of kinds, in its three places (the two check
--     constraints and `set_notification_preference()`), and the list
--     `my_notification_preferences()` returns, learn the one word;
--   * `decide_teaching_application()` is its earlier definition plus the
--     message;
--   * `my_teaching_application()` is its earlier definition plus
--     `answerTold`: whether this person has the kind switched on, so the page
--     can say "you will be told" only to somebody who will be.
--
-- What does not change:
--   * Who may decide, what a decision needs, what it grants and what it
--     records. A test compares each function with the one it replaces.
--   * The kind can be switched off, like every kind that is not about money
--     failing to arrive. A message switched off is still written and is not
--     shown or counted (20261277000100).
--   * Taking an application back writes no message: the applicant did it.
--   * An application answered before this migration is given no message.
--     Writing one now would date an old answer today.
--   * No table, column or function is added; no row is changed; no role is
--     given anything; no switch is turned.

-- ---------------------------------------------------------------------------
-- The closed vocabulary learns one more word
-- ---------------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('payout_paid', 'payout_failed', 'payout_cancelled',
                  'media_encode_failed', 'live_cancelled', 'live_recording_ready',
                  'teaching_answered'));

alter table public.notification_preferences
  drop constraint if exists notification_preferences_kind_check;
alter table public.notification_preferences add constraint notification_preferences_kind_check
  check (kind in ('payout_paid', 'payout_failed', 'payout_cancelled',
                  'media_encode_failed', 'class_starting', 'plan_renewing',
                  'live_cancelled', 'live_recording_ready', 'teaching_answered'));

-- Reproduced in full: PostgreSQL cannot wrap the function it replaces.
create or replace function public.set_notification_preference(
  p_kind    text,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_kind  text := nullif(btrim(coalesce(p_kind, '')), '');
begin
  if v_actor is null then
    raise exception 'sign in to choose what you are told'
      using errcode = 'insufficient_privilege';
  end if;

  if v_kind is null or v_kind not in
       ('payout_paid', 'payout_failed', 'payout_cancelled',
        'media_encode_failed', 'class_starting', 'plan_renewing',
        'live_cancelled', 'live_recording_ready', 'teaching_answered') then
    raise exception '% is not something the platform tells you about', coalesce(p_kind, 'nothing')
      using errcode = 'invalid_parameter_value';
  end if;

  if public.notification_kind_is_locked(v_kind) then
    raise exception 'being told your money did not arrive cannot be turned off'
      using errcode = 'check_violation';
  end if;

  insert into public.notification_preferences (user_id, kind, enabled, updated_at)
  values (v_actor, v_kind, coalesce(p_enabled, true), now())
  on conflict (user_id, kind) do update
    set enabled = excluded.enabled,
        updated_at = now();

  return jsonb_build_object(
    'kind',    v_kind,
    'enabled', coalesce(p_enabled, true),
    'locked',  false);
end;
$$;

-- Reproduced in full, with one more word and when it is in use.
create or replace function public.my_notification_preferences()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_out      jsonb := '[]'::jsonb;
  v_kind     text;
  v_live_on  boolean := public.setting_bool('delivery.live_classes', false);
  v_subs_on  boolean := public.setting_bool('commerce.subscriptions', false);
  -- An answer can come while applications are open, and to somebody whose
  -- application is still waiting after they were closed.
  v_teach_on boolean := public.setting_bool('teaching.applications', false)
                        or exists (select 1 from public.teaching_applications ta
                                    where ta.applicant_id = public.current_user_id()
                                      and ta.status = 'submitted');
begin
  if v_actor is null then
    raise exception 'sign in to choose what you are told'
      using errcode = 'insufficient_privilege';
  end if;

  foreach v_kind in array array[
    'payout_paid', 'payout_failed', 'payout_cancelled', 'media_encode_failed',
    'class_starting', 'plan_renewing', 'live_cancelled', 'live_recording_ready',
    'teaching_answered'
  ]::text[]
  loop
    v_out := v_out || jsonb_build_object(
      'kind',      v_kind,
      'enabled',   public.notification_enabled(v_actor, v_kind),
      'locked',    public.notification_kind_is_locked(v_kind),
      'available', case v_kind
                     when 'class_starting'       then v_live_on
                     when 'live_cancelled'       then v_live_on
                     when 'live_recording_ready' then v_live_on
                     when 'plan_renewing'        then v_subs_on
                     when 'teaching_answered'    then v_teach_on
                     else true
                   end);
  end loop;

  return v_out;
end;
$$;

-- ---------------------------------------------------------------------------
-- Deciding tells the applicant
-- ---------------------------------------------------------------------------
-- Reproduced in full from 20261281001100, with the message added before the
-- function returns.
create or replace function public.decide_teaching_application(
  p_application uuid,
  p_approve     boolean,
  p_reason      text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor      uuid := public.current_user_id();
  v_reason     text := btrim(coalesce(p_reason, ''));
  v_row        public.teaching_applications;
  v_instructor uuid;
  v_assignment uuid;
begin
  if v_actor is null or not public.can_appoint_teacher(v_actor) then
    raise exception 'teaching:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if v_reason = '' then
    raise exception 'teaching:reason_required'
      using errcode = 'check_violation';
  end if;

  select * into v_row from public.teaching_applications where id = p_application;
  if not found then
    raise exception 'teaching:not_found'
      using errcode = 'no_data_found';
  end if;
  if v_row.status <> 'submitted' then
    raise exception 'teaching:already_decided'
      using errcode = 'check_violation';
  end if;

  select id into v_instructor from public.roles where code = 'instructor';
  if v_instructor is null then
    raise exception 'teaching:role_missing'
      using errcode = 'no_data_found';
  end if;

  if p_approve then
    -- Idempotent by the same partial unique index `assign_role` relies on: a
    -- second active grant of one role says nothing.
    select id into v_assignment
      from public.user_role_assignments
     where user_id = v_row.applicant_id
       and role_id = v_instructor
       and revoked_at is null;

    if v_assignment is null then
      insert into public.user_role_assignments (user_id, role_id, assigned_by)
      values (v_row.applicant_id, v_instructor, v_actor)
      returning id into v_assignment;
    end if;

    update public.teaching_applications
       set status = 'approved',
           decision_reason = v_reason,
           decided_by = v_actor,
           decided_at = now(),
           granted_role_assignment_id = v_assignment
     where id = p_application;
  else
    update public.teaching_applications
       set status = 'declined',
           decision_reason = v_reason,
           decided_by = v_actor,
           decided_at = now()
     where id = p_application;
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor,
          case when p_approve then 'teaching.application_approved'
               else 'teaching.application_declined' end,
          'teaching_application', p_application,
          jsonb_build_object('reason', v_reason,
                             'applicantUserId', v_row.applicant_id,
                             'roleGranted', p_approve));

  if p_approve then
    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (v_actor, 'role.assigned', 'user', v_row.applicant_id,
            jsonb_build_object('role', 'instructor', 'privileged', false,
                               'reason', v_reason, 'via', 'teaching_application'));
  end if;

  -- The applicant is told. One message for one answer: an application is
  -- decided once (`already_decided` above), and the key holds that even if
  -- this is ever called again for the same row. What the owner wrote is not
  -- copied into the message: it stays on the application, where
  -- `my_teaching_application()` shows it.
  perform public.notify_user(
    v_row.applicant_id,
    'teaching_answered',
    case when p_approve then 'Your application to teach was approved'
         else 'Your application to teach was not approved' end,
    case when p_approve
         then 'Your application to teach was approved. You can teach on this site now. What was written to you with the answer is on the application page.'
         else 'Your application to teach was not approved this time. What was written to you with the answer is on the application page.' end,
    '/teach/apply',
    'info',
    'teaching-answer:' || p_application::text,
    jsonb_build_object('outcome', case when p_approve then 'approved' else 'declined' end));

  return jsonb_build_object(
    'status', case when p_approve then 'approved' else 'declined' end,
    'roleAssignmentId', case when p_approve then v_assignment else null end);
end;
$$;

comment on function public.decide_teaching_application(uuid, boolean, text) is
  'Staff decide an application with a written reason. Approving is what grants `instructor` — there is no other self-serve path. The applicant is told once, in their messages.';

-- ---------------------------------------------------------------------------
-- The applicant's own page learns whether they will be told
-- ---------------------------------------------------------------------------
-- Reproduced in full from 20261281001100, with `answerTold` added.
create or replace function public.my_teaching_application()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_row   public.teaching_applications;
begin
  if v_actor is null then
    raise exception 'teaching:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_row
    from public.teaching_applications
   where applicant_id = v_actor
   order by created_at desc
   limit 1;

  return jsonb_build_object(
    'open', public.setting_bool('teaching.applications', false),
    'isInstructor', public.has_role(v_actor, 'instructor'),
    'application', case when v_row.id is null then null else jsonb_build_object(
      'id', v_row.id,
      'headline', v_row.headline,
      'qualifications', v_row.qualifications,
      'sampleUrl', v_row.sample_url,
      'note', v_row.note,
      'status', v_row.status,
      'decisionReason', v_row.decision_reason,
      'submittedAt', v_row.created_at,
      'decidedAt', v_row.decided_at
    ) end,
    -- Whether this person will find the answer in their messages: the kind
    -- exists from this migration, and they have not switched it off.
    'answerTold', public.notification_enabled(v_actor, 'teaching_answered')
  );
end;
$$;
