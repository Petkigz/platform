-- Applying to teach.
--
-- WHAT WAS MISSING
-- ----------------
-- `teaching.applications` was registered as CODE-gated with one instruction
-- beside it: "build the queue, keep it closed". The reason it stayed closed is
-- the one the register wrote down: there was no vetting process, no rejection
-- handling, and no place for a person to say what they know.
--
-- The owner's answer (2026-10-26) is that people **may** apply — with their
-- qualifications and a sample lesson — and nothing is granted automatically.
--
-- WHAT THIS DELIBERATELY DOES NOT CHANGE
-- --------------------------------------
-- Teaching stays **by appointment**. A submitted application grants nothing: no
-- role, no course, no profile, no page. Only the owner or staff approving it
-- creates the `instructor` role, and the approval is a written decision with a
-- name against it. There is no self-serve teaching path here and no screen that
-- says otherwise.
--
-- The other half of the appointment rule is unchanged too: an approved teacher
-- still has to satisfy the publication gate before anything goes live — review,
-- scholarly approval, and the version workflow that already exists.

create table public.teaching_applications (
  id uuid primary key default gen_random_uuid(),

  applicant_id uuid not null
    references public.user_profiles (user_id) on delete cascade,

  -- What they would teach, in their own words, in one line. This is what the
  -- queue reads first.
  headline text not null check (length(btrim(headline)) between 4 and 160),

  -- What they know and who they learned it from. Deliberately free text: a
  -- dropdown of qualifications would be the platform inventing a schema for
  -- somebody else's ijazah.
  qualifications text not null check (length(btrim(qualifications)) >= 20),

  -- A lesson they have already taught or recorded. A link, because that is
  -- something an owner can actually watch before deciding, and because a
  -- platform with no media pipeline cannot accept the file itself.
  sample_url text not null
    check (sample_url ~* '^https?://[^\s]+$' and length(sample_url) <= 500),

  -- Optional: anything else worth reading — timezone, languages, availability.
  note text check (note is null or length(note) <= 1000),

  status text not null default 'submitted'
    check (status in ('submitted', 'approved', 'declined', 'withdrawn')),

  decision_reason text,
  decided_by uuid references public.user_profiles (user_id) on delete set null,
  decided_at timestamptz,

  -- Set when an approval created the role, so "why may they teach" has an
  -- answer that is not a guess.
  granted_role_assignment_id uuid
    references public.user_role_assignments (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ta_decision_agrees check (
    (status in ('approved', 'declined'))
      = (decided_at is not null and decided_by is not null)
  )
);

-- One open application at a time. A declined one may be sent again — people
-- improve, and a second look is cheaper than losing a teacher — but two open
-- asks is one person twice in a queue somebody has to read.
create unique index teaching_applications_one_open
  on public.teaching_applications (applicant_id)
  where status = 'submitted';

create index teaching_applications_status_idx
  on public.teaching_applications (status, created_at);

create trigger teaching_applications_set_updated_at
  before update on public.teaching_applications
  for each row execute function public.set_updated_at();

comment on table public.teaching_applications is
  'Somebody asking to teach here. Submitting grants nothing: only an approval by staff creates the instructor role, with a written decision.';

-- ---------------------------------------------------------------------------
-- Who appoints
-- ---------------------------------------------------------------------------
-- `is_privileged()` is the right test for "may read administrative data" and the
-- wrong test for this one: a support agent handles tickets, and appointing a
-- teacher is not a ticket. The owner and governance administer who may teach —
-- the same pair the teacher roster already gates on — so the appointment names
-- them rather than accepting every staff badge.
create or replace function public.can_appoint_teacher(p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(p_actor, 'platform_admin')
      or public.has_role(p_actor, 'governance_admin');
$$;

comment on function public.can_appoint_teacher(uuid) is
  'The owner or governance may appoint a teacher. Support, finance and reviewers may not.';

alter table public.teaching_applications enable row level security;

create policy teaching_applications_read_own on public.teaching_applications
  for select to authenticated
  using (
    applicant_id = public.current_user_id()
    or public.can_appoint_teacher(public.current_user_id())
  );

-- ---------------------------------------------------------------------------
-- Asking
-- ---------------------------------------------------------------------------
create or replace function public.submit_teaching_application(
  p_headline       text,
  p_qualifications text,
  p_sample_url     text,
  p_note           text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := public.current_user_id();
  v_id       uuid;
begin
  if v_actor_id is null then
    raise exception 'teaching:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('teaching.applications', false) then
    raise exception 'teaching:applications_closed'
      using errcode = 'feature_not_supported';
  end if;

  if public.has_role(v_actor_id, 'instructor') then
    raise exception 'teaching:already_teaching'
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.teaching_applications ta
     where ta.applicant_id = v_actor_id and ta.status = 'submitted'
  ) then
    raise exception 'teaching:already_applied'
      using errcode = 'unique_violation';
  end if;

  insert into public.teaching_applications
    (applicant_id, headline, qualifications, sample_url, note)
  values
    (v_actor_id, btrim(p_headline), btrim(p_qualifications),
     btrim(p_sample_url), nullif(btrim(coalesce(p_note, '')), ''))
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor_id, 'teaching.application_submitted', 'teaching_application', v_id, '{}'::jsonb);

  return jsonb_build_object('applicationId', v_id, 'status', 'submitted');
end;
$$;

comment on function public.submit_teaching_application(text, text, text, text) is
  'Send an application to teach. Grants nothing — not a role, not a course, not a profile.';

-- ---------------------------------------------------------------------------
-- Reading your own
-- ---------------------------------------------------------------------------
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
    ) end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Withdrawing
-- ---------------------------------------------------------------------------
create or replace function public.withdraw_teaching_application()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_id    uuid;
begin
  select id into v_id
    from public.teaching_applications
   where applicant_id = v_actor and status = 'submitted'
   for update;

  if v_id is null then
    raise exception 'teaching:nothing_to_withdraw'
      using errcode = 'no_data_found';
  end if;

  update public.teaching_applications
     set status = 'withdrawn'
   where id = v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'teaching.application_withdrawn', 'teaching_application', v_id, '{}'::jsonb);

  return jsonb_build_object('status', 'withdrawn');
end;
$$;

-- ---------------------------------------------------------------------------
-- Deciding
-- ---------------------------------------------------------------------------
-- The role is granted here rather than by a second action on another screen.
-- One decision, one audit entry, and no state where an application is approved
-- but its approval was never carried out.
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

  return jsonb_build_object(
    'status', case when p_approve then 'approved' else 'declined' end,
    'roleAssignmentId', case when p_approve then v_assignment else null end);
end;
$$;

comment on function public.decide_teaching_application(uuid, boolean, text) is
  'Staff decide an application with a written reason. Approving is what grants `instructor` — there is no other self-serve path.';

-- ---------------------------------------------------------------------------
-- The queue
-- ---------------------------------------------------------------------------
create or replace function public.teaching_application_queue()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if v_actor is null or not public.can_appoint_teacher(v_actor) then
    raise exception 'teaching:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  return jsonb_build_object(
    'open', public.setting_bool('teaching.applications', false),
    'waiting', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', ta.id,
               'name', up.display_name,
               'email', u.email,
               'headline', ta.headline,
               'qualifications', ta.qualifications,
               'sampleUrl', ta.sample_url,
               'note', ta.note,
               'submittedAt', ta.created_at) order by ta.created_at)
        from public.teaching_applications ta
        join public.user_profiles up on up.user_id = ta.applicant_id
        left join auth.users u on u.id = ta.applicant_id
       where ta.status = 'submitted'), '[]'::jsonb),
    'decided', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', ta.id,
               'name', up.display_name,
               'headline', ta.headline,
               'status', ta.status,
               'reason', ta.decision_reason,
               'decidedAt', ta.decided_at) order by ta.decided_at desc)
        from (
          select * from public.teaching_applications
           where status in ('approved', 'declined')
           order by decided_at desc
           limit 25
        ) ta
        join public.user_profiles up on up.user_id = ta.applicant_id), '[]'::jsonb),
    'counts', jsonb_build_object(
      'waiting',  (select count(*)::int from public.teaching_applications where status = 'submitted'),
      'approved', (select count(*)::int from public.teaching_applications where status = 'approved'),
      'declined', (select count(*)::int from public.teaching_applications where status = 'declined')));
end;
$$;

revoke all on function public.submit_teaching_application(text, text, text, text) from public, anon;
grant execute on function public.submit_teaching_application(text, text, text, text) to authenticated;

revoke all on function public.my_teaching_application() from public, anon;
grant execute on function public.my_teaching_application() to authenticated;

revoke all on function public.withdraw_teaching_application() from public, anon;
grant execute on function public.withdraw_teaching_application() to authenticated;

revoke all on function public.decide_teaching_application(uuid, boolean, text) from public, anon;
grant execute on function public.decide_teaching_application(uuid, boolean, text) to authenticated;

revoke all on function public.can_appoint_teacher(uuid) from public, anon;
grant execute on function public.can_appoint_teacher(uuid) to authenticated;

revoke all on function public.teaching_application_queue() from public, anon;
grant execute on function public.teaching_application_queue() to authenticated;

-- ---------------------------------------------------------------------------
-- The switch
-- ---------------------------------------------------------------------------
update public.platform_settings
   set gate_type = 'admin',
       description = 'Applying to teach: send your qualifications and a sample lesson, and the owner reads it.',
       preconditions = 'None blocking. Vetting is the queue itself — the owner or staff read the application and answer with a written reason; rejection handling is that the reason is shown to the applicant and they may apply again; and nothing is granted by submitting. Teaching stays by appointment: approving is what creates the `instructor` role, and an approved teacher still has to pass the publication gate before a course goes live.'
 where key = 'teaching.applications';
