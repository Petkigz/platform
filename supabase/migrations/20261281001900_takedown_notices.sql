-- A takedown: stop the distribution first, decide afterwards.
--
-- `platform.takedown` said the honest thing and then named the gap: *"the notice
-- process is written as a draft in the register… Not built: the withholding action
-- itself on a course or a lesson, which needs a code change."* This is that change.
--
-- The design is one seam. Every learner-facing read of course content already goes
-- through `can_read_version()`, and it is the only predicate the catalogue, the
-- lesson policies and the resource policies share. So a hold is not a flag sprinkled
-- through thirty queries: it is one clause in that function, which means a held
-- version disappears from the catalogue, from enrolment, from the player, and from
-- the offline key in the same moment — and the author, reviewers and staff keep
-- reading it, because a takedown that also hides the thing from the person who has
-- to answer it is a takedown nobody can answer.
--
-- Three things are deliberately not decided here:
--
--   * **what a valid notice is.** A claimant's name, an address, the work, and the
--     material are all written by a person; no minimum legal form is invented.
--   * **how long a hold lasts.** There is a review date the staff member sets, and
--     the register says when it passes. It does not lift itself: a hold that expires
--     on a timer would put contested material back up while everybody was asleep.
--   * **what happens to the money.** A hold is not a refund, and nothing here
--     touches an order or a teacher's earnings. `DECISIONS.md` records that.
--
-- Deletion was the obvious alternative and it is wrong: deleting the material
-- destroys the evidence the decision needs, and it cannot be appealed.

-- ---------------------------------------------------------------------------
-- The notice
-- ---------------------------------------------------------------------------
create table public.takedown_notices (
  id uuid primary key default gen_random_uuid(),

  reference text not null unique,

  -- The version the claim is about. A version rather than a course, because a
  -- takedown is about a specific work as published, and retiring one version does
  -- not tell anybody whether a later one still contains it.
  course_version_id uuid not null
    references public.course_versions (id) on delete restrict,

  status text not null default 'held'
    check (status in ('held', 'upheld', 'rejected', 'withdrawn')),

  -- Who is complaining, and how to reach them. Typed, never inferred.
  claimant_name  text not null check (length(btrim(claimant_name)) between 2 and 120),
  claimant_email text check (claimant_email is null or claimant_email ~ '^[^@\s]+@[^@\s]+$'),
  -- owner of the work, an agent acting for them, or somebody reporting on their behalf.
  claimant_role text not null default 'owner'
    check (claimant_role in ('owner', 'agent', 'representative')),

  -- What they own, and where in the material it appears.
  work_description     text not null check (length(btrim(work_description)) >= 5),
  material_description text not null check (length(btrim(material_description)) >= 10),

  -- The claim as it would be read aloud, and what the teacher is told. Held as
  -- written so an appeal reads the same words as the original.
  notice_text text not null check (length(btrim(notice_text)) >= 40),

  -- The staff member's review date. Passes; does nothing on its own. See header.
  review_by date,

  -- The teacher's answer, if they gave one.
  response text,
  response_at timestamptz,
  responded_by uuid references public.user_profiles (user_id) on delete set null,

  -- The decision. Required together: an outcome without a reason is a rumour.
  decided_outcome text check (decided_outcome in ('upheld', 'rejected', 'withdrawn')),
  decision_reason text check (decision_reason is null or length(btrim(decision_reason)) >= 10),
  decided_by uuid references public.user_profiles (user_id) on delete set null,
  decided_at timestamptz,

  opened_by uuid not null references public.user_profiles (user_id) on delete restrict,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  -- A decided notice has all three of outcome, reason and time; a held one has none.
  constraint takedown_decided_is_complete check (
    (status = 'held')
    = (decided_outcome is null and decided_at is null and decision_reason is null)),
  constraint takedown_outcome_matches_status check (
    status = 'held' or status = decided_outcome),
  -- A response is a body and a time, or neither.
  constraint takedown_response_is_complete check (
    (response is null) = (response_at is null))
);

create index takedown_notices_version_idx on public.takedown_notices (course_version_id, received_at desc);
create index takedown_notices_held_idx on public.takedown_notices (status) where status = 'held';

comment on table public.takedown_notices is
  'A claim against one published version, and what was decided. The material is withheld by rewriting can_read_version(), never deleted — the evidence the decision needs has to survive the decision.';

create sequence public.takedown_reference_seq;

create or replace function public.next_takedown_reference(p_year integer default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := coalesce(p_year, extract(year from current_date)::int);
begin
  return format('TD-%s-%s', v_year,
                lpad(nextval('public.takedown_reference_seq')::text, 4, '0'));
end;
$$;

revoke all on function public.next_takedown_reference(integer) from public, anon, authenticated;

-- The paper trail: hold, notice sent, response, decision, release.
create table public.takedown_events (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.takedown_notices (id) on delete cascade,
  kind text not null
    check (kind in ('received', 'held', 'response', 'decision', 'released')),
  body text not null check (length(btrim(body)) >= 3),
  actor uuid references public.user_profiles (user_id) on delete set null,
  created_at timestamptz not null default now()
);

create index takedown_events_notice_idx on public.takedown_events (notice_id, created_at);

comment on table public.takedown_events is
  'What happened to a notice, in order. Append-only, like the incident log, and for the same reason.';

create or replace function public.refuse_takedown_event_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'takedown:event_append_only'
    using errcode = 'insufficient_privilege',
          hint = 'add another entry; the history of a notice is not a document';
end;
$$;

create trigger takedown_events_append_only
  before update or delete on public.takedown_events
  for each row execute function public.refuse_takedown_event_change();

-- ---------------------------------------------------------------------------
-- The seam: a held version is not readable by a learner
-- ---------------------------------------------------------------------------
-- Same body as before, with one clause added. Authors, reviewers and staff are
-- unaffected — the author has to be able to read the material they are accused of
-- publishing, and the reviewer's `can_review_version()` is untouched.
create or replace function public.can_read_version(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.course_versions cv
     where cv.id = p_version_id
       and (
         cv.created_by = public.current_user_id()
         or public.is_privileged(public.current_user_id())
         or (
           cv.version_status in ('published', 'retired')
           and not exists (
             select 1
               from public.takedown_notices n
              where n.course_version_id = cv.id
                and n.status in ('held', 'upheld'))
         )
       )
  );
$$;

revoke all on function public.can_read_version(uuid) from public, anon;
grant execute on function public.can_read_version(uuid) to anon, authenticated;

comment on function public.can_read_version(uuid) is
  'Published/retired to everyone — except a version under a takedown hold, which only its author, reviewers and staff may read. Drafts stay with their author and privileged roles.';

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.takedown_notices enable row level security;
alter table public.takedown_events enable row level security;

-- Staff, and the teacher whose work it is. The second half is the point: an author
-- must be able to read the claim against them without asking for it.
create policy takedown_notices_read on public.takedown_notices
  for select to authenticated
  using (
    public.is_privileged(public.current_user_id())
    or exists (
      select 1 from public.course_versions cv
       where cv.id = takedown_notices.course_version_id
         and cv.created_by = public.current_user_id())
  );

create policy takedown_events_read on public.takedown_events
  for select to authenticated
  using (
    public.is_privileged(public.current_user_id())
    or exists (
      select 1
        from public.takedown_notices n
        join public.course_versions cv on cv.id = n.course_version_id
       where n.id = takedown_events.notice_id
         and cv.created_by = public.current_user_id())
  );

-- No insert, update or delete policy: the functions are the only way in, and they
-- read the actor from the session.

-- ---------------------------------------------------------------------------
-- Opening one: the hold happens with the notice, not after it
-- ---------------------------------------------------------------------------
create or replace function public.open_takedown_notice(
  p_version_id           uuid,
  p_claimant_name        text,
  p_claimant_email       text,
  p_work_description     text,
  p_material_description text,
  p_notice_text          text,
  p_claimant_role        text default 'owner',
  p_review_by            date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_cv       public.course_versions;
  v_name     text := btrim(coalesce(p_claimant_name, ''));
  v_email    text := nullif(btrim(coalesce(p_claimant_email, '')), '');
  v_work     text := btrim(coalesce(p_work_description, ''));
  v_material text := btrim(coalesce(p_material_description, ''));
  v_text     text := btrim(coalesce(p_notice_text, ''));
  v_role     text := lower(btrim(coalesce(p_claimant_role, 'owner')));
  v_ref      text;
  v_id       uuid;
begin
  if v_actor is null
     or not (public.has_role(v_actor, 'platform_admin')
             or public.has_role(v_actor, 'governance_admin')) then
    raise exception 'takedown:not_allowed'
      using errcode = 'insufficient_privilege',
            hint = 'a notice is taken by the owner or governance staff';
  end if;

  select * into v_cv from public.course_versions where id = p_version_id;
  if not found then
    raise exception 'takedown:version_not_found' using errcode = 'no_data_found';
  end if;
  -- Only material that is actually published can be taken down. Holding a draft
  -- would hide nothing and decide nothing.
  if v_cv.version_status not in ('published', 'retired') then
    raise exception 'takedown:not_published'
      using errcode = 'check_violation',
            hint = 'a draft is not distributed, so there is nothing to withhold';
  end if;

  if exists (select 1 from public.takedown_notices
              where course_version_id = p_version_id and status = 'held') then
    raise exception 'takedown:already_held'
      using errcode = 'check_violation',
            hint = 'this version is already under a hold; decide that one first';
  end if;

  if length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'takedown:claimant_required' using errcode = 'check_violation';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+$' then
    raise exception 'takedown:email_invalid' using errcode = 'check_violation';
  end if;
  if length(v_work) < 5 then
    raise exception 'takedown:work_required'
      using errcode = 'check_violation',
            hint = 'what work is claimed — a title, an author, a registration number';
  end if;
  if length(v_material) < 10 then
    raise exception 'takedown:material_required'
      using errcode = 'check_violation',
            hint = 'where in the material it appears, so the teacher can look';
  end if;
  if length(v_text) < 40 then
    raise exception 'takedown:notice_required'
      using errcode = 'check_violation',
            hint = 'the claim in the words it was sent, so an appeal reads the same words';
  end if;
  if v_role not in ('owner', 'agent', 'representative') then
    raise exception 'takedown:role_invalid' using errcode = 'check_violation';
  end if;
  if p_review_by is not null and p_review_by < current_date then
    raise exception 'takedown:review_in_the_past'
      using errcode = 'check_violation',
            hint = 'the review date is when somebody will look at it, not when it lapsed';
  end if;

  v_ref := public.next_takedown_reference(extract(year from current_date)::int);

  insert into public.takedown_notices
    (reference, course_version_id, claimant_name, claimant_email, claimant_role,
     work_description, material_description, notice_text, review_by, opened_by)
  values (v_ref, p_version_id, v_name, v_email, v_role, v_work, v_material, v_text,
          p_review_by, v_actor)
  returning id into v_id;

  insert into public.takedown_events (notice_id, kind, body, actor)
  values (v_id, 'held',
          format('Held from distribution on receipt of a notice (%s).', v_ref), v_actor);

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'takedown.held', 'course_version', p_version_id,
          jsonb_build_object('reference', v_ref, 'notice', v_id,
                             'claimant', v_name, 'reviewBy', p_review_by));

  return jsonb_build_object('id', v_id, 'reference', v_ref, 'status', 'held',
                            'held', true, 'reviewBy', p_review_by);
end;
$$;

revoke all on function public.open_takedown_notice(uuid, text, text, text, text, text, text, date)
  from public, anon;
grant execute on function public.open_takedown_notice(uuid, text, text, text, text, text, text, date)
  to authenticated;

comment on function public.open_takedown_notice(uuid, text, text, text, text, text, text, date) is
  'Take a published version out of distribution and record the claim against it. The hold takes effect with the notice; nothing here decides the claim.';

-- ---------------------------------------------------------------------------
-- The teacher's answer
-- ---------------------------------------------------------------------------
/**
 * The author's reply, recorded against the notice.
 *
 * Open to the author of that version as well as to staff: the person accused is the
 * one who knows whether the claim is right, and a process that makes them submit
 * their answer by email makes it invisible.
 */
create or replace function public.record_takedown_response(
  p_notice_id uuid,
  p_response  text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_row    public.takedown_notices;
  v_cv     public.course_versions;
  v_text   text := btrim(coalesce(p_response, ''));
  v_staff  boolean;
begin
  if v_actor is null then
    raise exception 'takedown:not_signed_in' using errcode = 'insufficient_privilege';
  end if;

  select * into v_row from public.takedown_notices where id = p_notice_id;
  if not found then
    raise exception 'takedown:not_found' using errcode = 'no_data_found';
  end if;
  select * into v_cv from public.course_versions where id = v_row.course_version_id;

  v_staff := public.has_role(v_actor, 'platform_admin')
             or public.has_role(v_actor, 'governance_admin');

  if not v_staff and v_cv.created_by <> v_actor then
    raise exception 'takedown:not_allowed'
      using errcode = 'insufficient_privilege',
            hint = 'only the teacher whose version it is can answer this notice';
  end if;
  if v_row.status <> 'held' then
    raise exception 'takedown:already_decided'
      using errcode = 'check_violation',
            hint = 'the decision is made; an answer now belongs in a new notice';
  end if;
  if length(v_text) < 20 then
    raise exception 'takedown:response_required'
      using errcode = 'check_violation',
            hint = 'say what the material is and why it may be used';
  end if;
  if v_row.response is not null then
    raise exception 'takedown:already_answered'
      using errcode = 'check_violation',
            hint = 'send a further note through support; the first answer is kept as given';
  end if;

  update public.takedown_notices
     set response = v_text, response_at = now(), responded_by = v_actor
   where id = p_notice_id;

  insert into public.takedown_events (notice_id, kind, body, actor)
  values (p_notice_id, 'response', v_text, v_actor);

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'takedown.answered', 'takedown_notice', p_notice_id,
          jsonb_build_object('reference', v_row.reference));

  return jsonb_build_object('answered', true, 'at', now());
end;
$$;

revoke all on function public.record_takedown_response(uuid, text) from public, anon;
grant execute on function public.record_takedown_response(uuid, text) to authenticated;

comment on function public.record_takedown_response(uuid, text) is
  'The teacher''s answer to a notice, or staff recording one they received. One answer per notice, kept as given.';

-- ---------------------------------------------------------------------------
-- Deciding it
-- ---------------------------------------------------------------------------
/**
 * Uphold it, reject it, or record that the claimant withdrew.
 *
 * **Upheld** keeps the hold: the version stays out of distribution, and the author
 * is told. **Rejected** and **withdrawn** lift it, and the material reappears to
 * learners the moment the status changes, because `can_read_version()` asks the
 * notice rather than a copy of its answer.
 *
 * Nobody may decide a notice they opened — separation of duty, the same rule the
 * appeals queue follows. And a decision needs a reason, because the two people it
 * affects are a claimant who believes their work was stolen and a teacher who
 * believes it was not.
 */
create or replace function public.decide_takedown_notice(
  p_notice_id uuid,
  p_outcome   text,
  p_reason    text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_outcome text := lower(btrim(coalesce(p_outcome, '')));
  v_reason  text := btrim(coalesce(p_reason, ''));
  v_row     public.takedown_notices;
  v_cv      public.course_versions;
  v_co      text;
  v_title   text;
begin
  if v_actor is null
     or not (public.has_role(v_actor, 'platform_admin')
             or public.has_role(v_actor, 'governance_admin')) then
    raise exception 'takedown:not_allowed'
      using errcode = 'insufficient_privilege',
            hint = 'the owner or governance staff decide a notice';
  end if;

  select * into v_row from public.takedown_notices where id = p_notice_id;
  if not found then
    raise exception 'takedown:not_found' using errcode = 'no_data_found';
  end if;
  if v_row.status <> 'held' then
    raise exception 'takedown:already_decided'
      using errcode = 'check_violation';
  end if;
  if v_outcome not in ('upheld', 'rejected', 'withdrawn') then
    raise exception 'takedown:outcome_invalid' using errcode = 'check_violation';
  end if;
  if length(v_reason) < 10 then
    raise exception 'takedown:reason_required'
      using errcode = 'check_violation',
            hint = 'the reason is read by the claimant and by the teacher';
  end if;
  if v_row.opened_by = v_actor then
    raise exception 'takedown:self_decision'
      using errcode = 'check_violation',
            hint = 'somebody else decides a notice you took';
  end if;

  select * into v_cv from public.course_versions where id = v_row.course_version_id;
  select c.title, c.slug into v_title, v_co
    from public.courses c where c.id = v_cv.course_id;

  update public.takedown_notices
     set status = v_outcome,
         decided_outcome = v_outcome,
         decision_reason = v_reason,
         decided_by = v_actor,
         decided_at = now()
   where id = p_notice_id;

  insert into public.takedown_events (notice_id, kind, body, actor)
  values (p_notice_id,
          case when v_outcome = 'upheld' then 'decision' else 'released' end,
          format('%s: %s', v_outcome, v_reason),
          v_actor);

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'takedown.decided', 'takedown_notice', p_notice_id,
          jsonb_build_object('reference', v_row.reference, 'outcome', v_outcome,
                             'course', v_co, 'version', v_cv.id,
                             'released', v_outcome <> 'upheld'));

  return jsonb_build_object('status', v_outcome, 'released', v_outcome <> 'upheld',
                            'course', v_title);
end;
$$;

revoke all on function public.decide_takedown_notice(uuid, text, text) from public, anon;
grant execute on function public.decide_takedown_notice(uuid, text, text) to authenticated;

comment on function public.decide_takedown_notice(uuid, text, text) is
  'Uphold (the hold stays), reject or record a withdrawal (the material returns). The person who took the notice does not decide it.';

-- ---------------------------------------------------------------------------
-- Reading it
-- ---------------------------------------------------------------------------
/**
 * The register: what is held, what is waiting, and what the candidate list is.
 *
 * `candidates` is every published version, so the console can offer the one thing it
 * actually needs — a choice of what to take down — without anybody typing a UUID.
 */
create or replace function public.takedown_register()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if v_actor is null
     or not (public.has_role(v_actor, 'platform_admin')
             or public.has_role(v_actor, 'governance_admin')
             or public.has_role(v_actor, 'support_agent')) then
    raise exception 'takedown:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  return (
    with rows as (
      select n.*,
             c.title as course_title,
             c.slug  as course_code,
             cv.version_number,
             up.display_name as teacher_name,
             (select count(*)::int from public.takedown_events e where e.notice_id = n.id) as events
        from public.takedown_notices n
        join public.course_versions cv on cv.id = n.course_version_id
        join public.courses c on c.id = cv.course_id
        left join public.user_profiles up on up.user_id = cv.created_by
    )
    select jsonb_build_object(
      'notices', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', r.id,
                 'reference', r.reference,
                 'courseTitle', r.course_title,
                 'courseCode', r.course_code,
                 'versionNumber', r.version_number,
                 'teacher', r.teacher_name,
                 'status', r.status,
                 'claimant', r.claimant_name,
                 'claimantRole', r.claimant_role,
                 'work', r.work_description,
                 'material', r.material_description,
                 'noticeText', r.notice_text,
                 'receivedAt', r.received_at,
                 'reviewBy', r.review_by,
                 'overdueReview', r.review_by is not null and r.review_by < current_date
                                 and r.status = 'held',
                 'daysHeld', floor(extract(epoch from (coalesce(r.decided_at, now()) - r.received_at)) / 86400)::int,
                 'answered', r.response is not null,
                 'response', r.response,
                 'responseAt', r.response_at,
                 'outcome', r.decided_outcome,
                 'reason', r.decision_reason,
                 'openedByMe', r.opened_by = v_actor) order by
                   case r.status when 'held' then 0 else 1 end,
                   r.received_at desc)
          from rows r), '[]'::jsonb),
      'candidates', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'versionId', cv.id,
                 'courseTitle', c.title,
                 'courseCode', c.slug,
                 'versionNumber', cv.version_number,
                 'teacher', up.display_name) order by c.title, cv.version_number desc)
          from public.course_versions cv
          join public.courses c on c.id = cv.course_id
          left join public.user_profiles up on up.user_id = cv.created_by
         where cv.version_status in ('published', 'retired')
           and not exists (select 1 from public.takedown_notices n
                            where n.course_version_id = cv.id and n.status = 'held')),
        '[]'::jsonb),
      'counts', jsonb_build_object(
        'held', (select count(*)::int from rows where status = 'held'),
        'upheld', (select count(*)::int from rows where status = 'upheld'),
        'released', (select count(*)::int from rows where status in ('rejected', 'withdrawn')),
        'unanswered', (select count(*)::int from rows where status = 'held' and response is null),
        'reviewOverdue', (select count(*)::int from rows
                           where status = 'held' and review_by is not null and review_by < current_date))));
end;
$$;

revoke all on function public.takedown_register() from public, anon;
grant execute on function public.takedown_register() to authenticated;

comment on function public.takedown_register() is
  'Every notice, what is still held, what nobody has answered, and every published version a notice could be taken against.';

/** What a teacher sees: the claims against their own versions, and the form to answer. */
create or replace function public.my_takedown_notices()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if v_actor is null then
    raise exception 'takedown:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;

  return jsonb_build_object(
    'notices', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', n.id,
               'reference', n.reference,
               'courseTitle', c.title,
               'versionNumber', cv.version_number,
               'status', n.status,
               'claimant', n.claimant_name,
               'claimantRole', n.claimant_role,
               'work', n.work_description,
               'material', n.material_description,
               'noticeText', n.notice_text,
               'receivedAt', n.received_at,
               'reviewBy', n.review_by,
               'answered', n.response is not null,
               'response', n.response,
               'outcome', n.decided_outcome,
               'reason', n.decision_reason) order by n.received_at desc)
        from public.takedown_notices n
        join public.course_versions cv on cv.id = n.course_version_id
        join public.courses c on c.id = cv.course_id
       where cv.created_by = v_actor), '[]'::jsonb),
    'held', (select count(*)::int
               from public.takedown_notices n
               join public.course_versions cv on cv.id = n.course_version_id
              where cv.created_by = v_actor and n.status = 'held'));
end;
$$;

revoke all on function public.my_takedown_notices() from public, anon;
grant execute on function public.my_takedown_notices() to authenticated;

comment on function public.my_takedown_notices() is
  'The claims against a teacher''s own published versions, with the text they were sent and their answer if they gave one.';

-- ---------------------------------------------------------------------------
-- The flag, rewritten to match what now exists
-- ---------------------------------------------------------------------------
-- Still CODE: the claim form is not public (a claimant cannot file one from the
-- site), the material is withheld but not removed, and a decision does not tell the
-- claimant anything because there is no email provider. The named agent and the
-- time a notice has before it is decided are still the owner's.
update public.platform_settings
   set preconditions = 'Built 2026-10-27: the withholding action itself. A notice '
        || 'taken by the owner or governance staff holds the version it names out of '
        || 'distribution the moment it is recorded — the catalogue, enrolment, the '
        || 'player and offline keys all ask can_read_version(), so one clause stops '
        || 'all of them — while the author, reviewers and staff keep reading it. The '
        || 'teacher answers inside the product; the decision is uphold (the hold '
        || 'stays), reject or withdrawal (the material returns), with a written '
        || 'reason, and the person who took the notice does not decide it. The '
        || 'timeline is append-only. Not built: a public claim form, so a notice '
        || 'arrives by whatever route the owner publishes and staff enter it; telling '
        || 'the claimant the outcome, because there is no email provider; and '
        || 'removing material, which is deliberately not done — the evidence a '
        || 'decision needs cannot be deleted before the decision. The owner decides: '
        || 'the agent a notice is sent to, how long a notice has before it is decided, '
        || 'and what a hold does to money already taken'
 where key = 'platform.takedown';
