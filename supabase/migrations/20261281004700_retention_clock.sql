-- -----------------------------------------------------------------------------
-- The two clocks that were written down and never wound
-- -----------------------------------------------------------------------------
--
-- The privacy notice answers a question the owner was asked: how long is a
-- support case kept, and how long is a safeguarding record kept. The answer, in
-- force since 2026-10-22, is three years after a case is closed and seven years
-- after the person a check concerns turns 18 (or seven years after it is made,
-- where they were already an adult).
--
-- Nothing implemented that. The sentence existed in one published draft and
-- nowhere in the schema: no column said when a record was due to go, no job
-- looked, and no query could answer "what should have been deleted already".
-- A retention period with no clock is a promise that quietly becomes a lie the
-- day the first record passes its date — and it becomes a lie in the direction
-- that is easy to miss, because nothing fails and nobody is told.
--
-- This migration winds both clocks, and states what it does not do:
--
--   * A support case is deleted three years after it closed, with its messages.
--     The period is on the row as `retention_until`, generated from `closed_at`,
--     so the rule is in the schema rather than only in a function body.
--
--   * A screening record is deleted seven years after it is due. The clock
--     starts at the check, or at the person's eighteenth birthday where that is
--     later — which is why the writer now accepts a date of birth. **Only the
--     date it implies is stored**, never the birthday itself: the register needs
--     to know when a record goes, and has no reason to keep how old anybody was.
--
--   * A case nobody closed has no clock, and there is no honest way to invent
--     one. `retention_plan()` reports those — count and oldest — rather than
--     letting them sit outside every rule forever in silence.
--
-- **The append-only rule changes by exactly one sentence.** A screening row was
-- never edited or deleted, and the trigger refused both. It still refuses every
-- edit, and it still refuses every delete that is not yet due — including one
-- attempted by the cleanup itself. What it now allows is the deletion of a row
-- whose date has passed **both** the date the caller says it is cleaning as of
-- and the date this database's own clock reads — so naming a year far ahead does
-- not make anything due. The record cannot be destroyed early, by anybody, for
-- any reason; it can only end when the policy says it ends.
--
-- Still open, and named rather than papered over: a child's learning record is
-- promised to be deleted thirty days after the guardian's account closes, and
-- that is a third clock this migration does not wind. It cannot be wound here —
-- a child's record is spread across enrolments, progress, submissions, attempts
-- and attendance, and deleting a profile row that a certificate points at needs
-- its own decisions and its own suite. It is in NEXT.md as the next debt, and
-- the privacy answer that promises it has not been changed to pretend otherwise.

-- -----------------------------------------------------------------------------
-- 1. When a screening record goes, on the row
-- -----------------------------------------------------------------------------
-- A generated column cannot carry this rule either: the clock starts at a
-- birthday the row does not store, and at a check that happened after it for
-- most adults. So the writer computes the date once and the row keeps the answer.
alter table public.teacher_screenings
  add column if not exists retention_until date,
  add column if not exists retention_basis text;

-- Rows recorded before this migration. The append-only trigger refuses an
-- update, so it is lifted for the length of the backfill and put straight back —
-- and the backfill states its own assumption instead of leaving it implicit:
-- for an adult, which is everybody this register has ever accepted, the two
-- halves of the rule are the same date, so seven years from the check is right.
drop trigger if exists teacher_screenings_append_only on public.teacher_screenings;

update public.teacher_screenings
   set retention_until = ((checked_at at time zone 'UTC') + interval '7 years')::date,
       retention_basis = 'check'
 where retention_until is null;

alter table public.teacher_screenings
  alter column retention_until set not null,
  alter column retention_basis set not null,
  alter column retention_until set default ((now() at time zone 'UTC') + interval '7 years')::date,
  alter column retention_basis set default 'check',
  add constraint teacher_screenings_retention_basis_known
    check (retention_basis in ('check', 'birthday'));

-- The default is the adult clock, and it exists so that a row written by
-- something that has never heard of retention — a fixture, an import, a future
-- writer — still carries a date instead of being refused or, worse, kept
-- forever. It cannot delete anything early: a later date is the only way this
-- default can be wrong.

comment on column public.teacher_screenings.retention_until is
  'The day this record is due to be deleted: seven years after the later of the check and the subject''s eighteenth birthday.';
comment on column public.teacher_screenings.retention_basis is
  'Which of the two clocks started: the check, or the eighteenth birthday. Stored so a record kept on the later clock can be counted without keeping a birthday.';

create index if not exists teacher_screenings_retention_idx
  on public.teacher_screenings (retention_until);

-- -----------------------------------------------------------------------------
-- 2. One place that says what is due
-- -----------------------------------------------------------------------------
-- A generated column would have been the tidiest home for "three years after it
-- closed", and PostgreSQL will not have it: the conversion of a timestamp to a
-- calendar day depends on the time it is read, so the expression is not
-- immutable and cannot be stored. The answer is a view instead — one definition
-- of "due", read by the plan, by the job and by anybody with `psql`, rather than
-- the same three-year subtraction copied into two function bodies.
--
-- The screening date is a real column, because its rule needs a birthday the row
-- does not keep. The view puts the two clocks side by side so that "what is due"
-- is one question with one answer.
create or replace view public.retention_due_records as
  select 'support_case'::text as kind,
         c.id,
         c.closed_at          as clock_started_at,
         ((c.closed_at at time zone 'UTC') + interval '3 years')::date as due_on
    from public.support_cases c
   where c.closed_at is not null
  union all
  select 'screening'::text,
         s.id,
         s.checked_at,
         s.retention_until
    from public.teacher_screenings s;

comment on view public.retention_due_records is
  'Every record with a retention date, and which clock set it. One definition of "due" for the plan, the cleanup and psql.';

-- Read by a definer function, so the view is not granted to anybody: it would
-- otherwise run as its owner and hand a support agent the whole table.
revoke all on public.retention_due_records from public, anon, authenticated;

-- The cleanup asks "closed before this instant", which is the same question as
-- the view and can use an index, so the index is on the clock itself.
create index if not exists support_cases_closed_idx
  on public.support_cases (closed_at)
  where closed_at is not null;

-- -----------------------------------------------------------------------------
-- 3. The append-only rule, with its one exception stated exactly
-- -----------------------------------------------------------------------------
-- `ayahspring.retention_purge` says *who is calling*; `ayahspring.retention_as_of`
-- says *what day they are cleaning as of*. Both are required, and the row's own
-- date is checked against the second one here rather than trusted to the caller.
-- Setting the first without the second gets a refusal, not a deletion.
create or replace function public.refuse_screening_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purge  text := coalesce(current_setting('ayahspring.retention_purge', true), '');
  v_as_of  date;
begin
  if tg_op = 'DELETE' then
    if v_purge <> 'on' then
      raise exception 'a screening record is deleted only by the retention run'
        using errcode = 'insufficient_privilege',
              hint = 'this row is due on ' || to_char(old.retention_until, 'YYYY-MM-DD');
    end if;

    begin
      v_as_of := nullif(current_setting('ayahspring.retention_as_of', true), '')::date;
    exception when others then
      v_as_of := null;
    end;

    -- Two dates have to agree before a record goes: the one the cleanup says it
    -- is cleaning as of, and the one this database's own clock reads. A caller
    -- who names the year 2099 to make everything due is refused, because the
    -- second comparison does not move.
    if v_as_of is not null
       and old.retention_until <= v_as_of
       and old.retention_until <= (now() at time zone 'UTC')::date then
      return old;
    end if;

    raise exception 'a screening record is kept until its retention date'
      using errcode = 'insufficient_privilege',
            hint = 'this row is due on ' || to_char(old.retention_until, 'YYYY-MM-DD');
  end if;

  raise exception 'a screening record is not edited; record a new check instead'
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger teacher_screenings_append_only
  before update or delete on public.teacher_screenings
  for each row execute function public.refuse_screening_change();

comment on function public.refuse_screening_change() is
  'Refuses every edit, and every deletion of a screening record that is not yet due. The one exception is the retention cleanup, which must say who it is and name the date it is cleaning as of, and still cannot take a row early.';

-- -----------------------------------------------------------------------------
-- 4. Recording a check now also records when the record goes
-- -----------------------------------------------------------------------------
-- The date of birth is an *input*, never a column: the writer turns it into the
-- day the record is due and then forgets it. A birthday that is in the future, or
-- that would make the subject older than this platform is, is refused rather than
-- stored as a date nothing sensible can be computed from.
drop function if exists public.record_teacher_screening(uuid, text, text, text, date, text);

create or replace function public.record_teacher_screening(
  p_user_id            uuid,
  p_screening_type     text,
  p_evidence_reference text,
  p_outcome            text default 'passed',
  p_valid_until        date default null,
  p_notes              text default null,
  p_subject_born_on    date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_type    text := btrim(coalesce(p_screening_type, ''));
  v_ref     text := btrim(coalesce(p_evidence_reference, ''));
  v_outcome text := lower(btrim(coalesce(p_outcome, 'passed')));
  v_id      uuid;
  v_until   date;
  v_basis   text := 'check';
begin
  if v_actor is null
     or not (public.has_role(v_actor, 'platform_admin')
             or public.has_role(v_actor, 'governance_admin')) then
    raise exception 'screening:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if length(v_type) < 2 or length(v_type) > 80 then
    raise exception 'screening:type_required'
      using errcode = 'check_violation';
  end if;
  if length(v_ref) < 2 or length(v_ref) > 200 then
    raise exception 'screening:reference_required'
      using errcode = 'check_violation';
  end if;
  if v_outcome not in ('passed', 'failed') then
    raise exception 'screening:outcome_invalid'
      using errcode = 'check_violation';
  end if;
  if p_valid_until is not null and p_valid_until < current_date then
    raise exception 'screening:validity_in_the_past'
      using errcode = 'check_violation',
            hint = 'a check recorded as already expired certifies nothing';
  end if;
  if p_subject_born_on is not null then
    if p_subject_born_on > current_date then
      raise exception 'screening:birthday_in_the_future'
        using errcode = 'check_violation';
    end if;
    if p_subject_born_on < (current_date - interval '120 years')::date then
      raise exception 'screening:birthday_implausible'
        using errcode = 'check_violation',
              hint = 'check the year before saving; the card in front of you is the authority';
    end if;
  end if;
  if not exists (select 1 from public.user_profiles where user_id = p_user_id) then
    raise exception 'screening:user_not_found' using errcode = 'no_data_found';
  end if;
  if not public.has_role(p_user_id, 'instructor') then
    raise exception 'screening:not_a_teacher'
      using errcode = 'check_violation',
            hint = 'only an appointed teacher is screened; a learner is never screened';
  end if;

  -- Seven years from the later of the check and the eighteenth birthday. For an
  -- adult that is the check; adding a birthday can only ever move the date
  -- later, never earlier, so a registration nobody recorded a birthday for is
  -- never deleted early for the want of one.
  v_until := (greatest(
    (now() at time zone 'UTC')::date,
    case when p_subject_born_on is null then null
         else (p_subject_born_on + interval '18 years')::date end
  ) + interval '7 years')::date;

  if p_subject_born_on is not null
     and (p_subject_born_on + interval '18 years')::date > (now() at time zone 'UTC')::date then
    v_basis := 'birthday';
  end if;

  insert into public.teacher_screenings
    (user_id, screening_type, evidence_reference, outcome, checked_by, valid_until, notes,
     retention_until, retention_basis)
  values (p_user_id, v_type, v_ref, v_outcome, v_actor, p_valid_until,
          nullif(btrim(coalesce(p_notes, '')), ''), v_until, v_basis)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'screening.recorded', 'user_profile', p_user_id,
          jsonb_build_object('screeningId', v_id, 'type', v_type,
                             'outcome', v_outcome, 'validUntil', p_valid_until,
                             'retainedUntil', v_until, 'clock', v_basis));

  return jsonb_build_object('id', v_id, 'outcome', v_outcome,
                            'validUntil', p_valid_until,
                            'retentionUntil', v_until, 'retentionBasis', v_basis);
end;
$$;

revoke all on function public.record_teacher_screening(uuid, text, text, text, date, text, date)
  from public, anon;
grant execute on function public.record_teacher_screening(uuid, text, text, text, date, text, date)
  to authenticated;

comment on function public.record_teacher_screening(uuid, text, text, text, date, text, date) is
  'Owner or governance staff record that a check on an adult who teaches happened, when it lapsed and when the record itself is due to be deleted. The evidence reference is write-only; a date of birth passed in is converted to a deletion date and not stored.';

-- -----------------------------------------------------------------------------
-- 5. What is due, and what has no clock at all
-- -----------------------------------------------------------------------------
create or replace function public.retention_plan(p_now timestamptz default now())
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor      uuid := public.current_user_id();
  v_as_of      date := (p_now at time zone 'UTC')::date;
  v_case       integer;
  v_case_old   date;
  v_case_next  date;
  v_stuck      integer;
  v_stuck_old  timestamptz;
  v_screen     integer;
  v_screen_old date;
  v_screen_next date;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'retention:not_allowed'
      using errcode = 'insufficient_privilege',
            hint = 'deleting a record before its time is destroying evidence; only the platform admin runs the clock';
  end if;

  select count(*)::int, min(due_on)
    into v_case, v_case_old
    from public.retention_due_records
   where kind = 'support_case' and due_on <= v_as_of;

  select min(due_on) into v_case_next
    from public.retention_due_records
   where kind = 'support_case' and due_on > v_as_of;

  -- A case nobody closed has no clock. Saying "0 due" without saying this would
  -- describe a queue of cases that are kept forever as if the rule covered them.
  select count(*)::int, min(created_at)
    into v_stuck, v_stuck_old
    from public.support_cases
   where closed_at is null
     and created_at <= p_now - interval '3 years';

  select count(*)::int, min(due_on)
    into v_screen, v_screen_old
    from public.retention_due_records
   where kind = 'screening' and due_on <= v_as_of;

  select min(due_on) into v_screen_next
    from public.retention_due_records
   where kind = 'screening' and due_on > v_as_of;

  return jsonb_build_object(
    'asOf', v_as_of,
    'policies', jsonb_build_object(
      'supportCase', jsonb_build_object(
        'years', 3,
        'clock', 'three years after the case closed',
        'source', 'privacy notice: "A support case is kept for three years after it is closed."'),
      'screening', jsonb_build_object(
        'years', 7,
        'clock', 'seven years after the later of the check and the subject''s eighteenth birthday',
        'source', 'privacy notice: "A safeguarding or screening record is kept for seven years after the person it concerns turns 18, or for seven years after it is made where they were already an adult."')),
    'supportCases', jsonb_build_object(
      'due', v_case,
      'oldestDue', v_case_old,
      'nextDue', v_case_next,
      'waiting', jsonb_build_object(
        'count', v_stuck,
        'oldestCreatedAt', v_stuck_old,
        'note', 'Cases that were never closed. The three years have not started because nothing ended them, and this job will not delete a case somebody might still be answering.')),
    'screenings', jsonb_build_object(
      'due', v_screen,
      'oldestDue', v_screen_old,
      'nextDue', v_screen_next));
end;
$$;

revoke all on function public.retention_plan(timestamptz) from public, anon;
grant execute on function public.retention_plan(timestamptz) to authenticated;

comment on function public.retention_plan(timestamptz) is
  'What the retention clocks say is due, what is due next, and what has no clock running at all. Deletes nothing; the owner reads it before pressing anything.';

-- -----------------------------------------------------------------------------
-- 6. The run that actually deletes
-- -----------------------------------------------------------------------------
-- Batched on purpose. A first run on a project that has been quiet for a year
-- must not hold a lock behind somebody''s support queue, so each call takes a
-- bounded number of rows and reports what is left. Two runs drain a backlog; a
-- scheduler that runs daily drains it without ever being asked to hurry.
create or replace function public.run_retention_jobs(
  p_now   timestamptz default now(),
  p_limit integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor       uuid := public.current_user_id();
  -- The date is a parameter so the run can be replayed and tested. It cannot be
  -- talked into the future: asking to clean as of 2040 cleans as of today, and
  -- the plan is what answers the question about 2040.
  v_as_of       date := least((p_now at time zone 'UTC')::date,
                              (now() at time zone 'UTC')::date);
  v_case_ids    uuid[];
  v_screen_ids  uuid[];
  v_cases       integer := 0;
  v_messages    integer := 0;
  v_screenings  integer := 0;
  v_cases_left  integer := 0;
  v_screen_left integer := 0;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'retention:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception 'retention:limit_out_of_range'
      using errcode = 'invalid_parameter_value',
            hint = 'between 1 and 5000 rows per call';
  end if;

  -- Cases, and the messages inside them. The messages go first because the
  -- foreign key refuses to leave one behind, and a case whose replies survived
  -- would be the record this job exists to remove.
  select array_agg(id) into v_case_ids
    from (select id from public.retention_due_records
           where kind = 'support_case' and due_on <= v_as_of
           order by due_on, id
           limit p_limit) picked;

  if v_case_ids is not null then
    delete from public.support_case_messages where case_id = any(v_case_ids);
    get diagnostics v_messages = row_count;

    delete from public.support_cases where id = any(v_case_ids);
    get diagnostics v_cases = row_count;
  end if;

  -- Screenings. The trigger refuses a delete unless the caller says it is the
  -- cleanup and names the date it is cleaning as of — and it re-checks the row''s
  -- own date, so saying so is not enough to take one early.
  select array_agg(id) into v_screen_ids
    from (select id from public.retention_due_records
           where kind = 'screening' and due_on <= v_as_of
           order by due_on, id
           limit p_limit) picked;

  if v_screen_ids is not null then
    perform set_config('ayahspring.retention_purge', 'on', true);
    perform set_config('ayahspring.retention_as_of', v_as_of::text, true);
    delete from public.teacher_screenings where id = any(v_screen_ids);
    get diagnostics v_screenings = row_count;
    perform set_config('ayahspring.retention_purge', '', true);
    perform set_config('ayahspring.retention_as_of', '', true);
  end if;

  select count(*)::int into v_cases_left
    from public.retention_due_records
   where kind = 'support_case' and due_on <= v_as_of;
  select count(*)::int into v_screen_left
    from public.retention_due_records
   where kind = 'screening' and due_on <= v_as_of;

  -- The run is recorded when it did something. A daily no-op entry would bury
  -- the days that mattered, and the plan already answers "nothing is due".
  if v_cases + v_screenings > 0 then
    insert into public.governance_audit_events (actor, action, target_type, detail)
    values (v_actor, 'retention.purged', 'retention_run',
            jsonb_build_object('asOf', v_as_of, 'supportCases', v_cases,
                               'supportCaseMessages', v_messages,
                               'screenings', v_screenings, 'limit', p_limit));
  end if;

  return jsonb_build_object(
    'asOf', v_as_of,
    'deleted', jsonb_build_object(
      'supportCases', v_cases,
      'supportCaseMessages', v_messages,
      'screenings', v_screenings),
    'remaining', jsonb_build_object(
      'supportCases', v_cases_left,
      'screenings', v_screen_left),
    'audited', v_cases + v_screenings > 0);
end;
$$;

revoke all on function public.run_retention_jobs(timestamptz, integer) from public, anon;
grant execute on function public.run_retention_jobs(timestamptz, integer) to authenticated;

comment on function public.run_retention_jobs(timestamptz, integer) is
  'Deletes what the clocks say is due — closed support cases past three years, screening records past seven — in bounded batches, and writes one audit event when it removed anything.';

-- -----------------------------------------------------------------------------
-- 7. The two readers now say when a record goes
-- -----------------------------------------------------------------------------
-- A record that disappears on a date its own screen never mentioned reads as a
-- bug. The teacher is told when their check ceases to exist, and so is the
-- register the owner reads.
create or replace function public.my_screening_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_row   public.teacher_screenings;
  v_gate  jsonb;
begin
  if v_actor is null then
    raise exception 'screening:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;

  v_gate := public.may_teach_children(v_actor);

  select * into v_row from public.teacher_screenings
   where user_id = v_actor
   order by checked_at desc
   limit 1;

  if not found then
    return jsonb_build_object(
      'recorded', false,
      'conductAcknowledged', v_gate -> 'conductAcknowledged',
      'mayTeachChildren', (v_gate -> 'allowed')::boolean,
      'gateReason', v_gate -> 'reason',
      'lead', v_gate -> 'lead',
      'required', public.setting_bool('platform.safeguarding', false));
  end if;

  return jsonb_build_object(
    'recorded', true,
    'outcome', v_row.outcome,
    'type', v_row.screening_type,
    'checkedAt', v_row.checked_at,
    'validUntil', v_row.valid_until,
    'expired', v_row.valid_until is not null and v_row.valid_until < current_date,
    -- New: a record that disappears on a date its own screen never mentioned
    -- reads as a bug, so the teacher is told when it goes and which clock set it.
    'retentionUntil', v_row.retention_until,
    'retentionBasis', v_row.retention_basis,
    'conductAcknowledged', v_gate -> 'conductAcknowledged',
    'mayTeachChildren', (v_gate -> 'allowed')::boolean,
    'gateReason', v_gate -> 'reason',
    'lead', v_gate -> 'lead',
    'required', public.setting_bool('platform.safeguarding', false));
end;
$$;

revoke all on function public.my_screening_status() from public, anon;
grant execute on function public.my_screening_status() to authenticated;

comment on function public.my_screening_status() is
  'A teacher''s own last screening, whether they have read the conduct policy, whether they may publish for children today, and the day the record is deleted. Never the evidence reference.';

create or replace function public.screening_register()
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
             or public.has_role(v_actor, 'governance_admin')) then
    raise exception 'screening:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  -- One derived table, so the list and the counts cannot disagree about what
  -- "checked" means: the latest recorded check decides, and an expiry date that
  -- has passed makes it lapsed rather than current.
  return (
    with latest as (
      select ura.user_id,
             up.display_name,
             s.id as last_id,
             s.outcome,
             s.valid_until,
             s.screening_type,
             s.checked_at,
             s.retention_until,
             s.retention_basis,
             cb.display_name as checked_by_name,
             case
               when s.id is null then 'none'
               when s.outcome = 'failed' then 'failed'
               when s.valid_until is not null and s.valid_until < current_date then 'expired'
               else 'checked' end as status
        from public.user_role_assignments ura
        join public.roles r on r.id = ura.role_id and r.code = 'instructor'
        join public.user_profiles up on up.user_id = ura.user_id
        left join lateral (
          select * from public.teacher_screenings ts
           where ts.user_id = ura.user_id
           order by ts.checked_at desc
           limit 1) s on true
        left join public.user_profiles cb on cb.user_id = s.checked_by
       where ura.revoked_at is null
    )
    select jsonb_build_object(
      'teachers', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'userId', l.user_id,
                 'name', l.display_name,
                 'status', l.status,
                 'type', l.screening_type,
                 'checkedAt', l.checked_at,
                 'validUntil', l.valid_until,
                 'retentionUntil', l.retention_until,
                 'retentionBasis', l.retention_basis,
                 'checkedByName', l.checked_by_name) order by l.display_name)
          from latest l), '[]'::jsonb),
      'counts', jsonb_build_object(
        'teachers', (select count(*)::int from latest),
        'none', (select count(*)::int from latest where status = 'none'),
        'checked', (select count(*)::int from latest where status = 'checked'),
        'expired', (select count(*)::int from latest where status = 'expired'),
        'failed', (select count(*)::int from latest where status = 'failed'))));
end;
$$;

revoke all on function public.screening_register() from public, anon;
grant execute on function public.screening_register() to authenticated;

comment on function public.screening_register() is
  'Every appointed teacher and whether a check is on file: checked, expired, failed or none, and the day the record is due to be deleted. Never the evidence reference — it is write-only.';

-- The register itself stays readable by staff, and `retention_until` is not
-- secret: it is a date on a record they may already read. `retention_basis` says
-- whether the clock started at the check or at a birthday, which says something
-- about whether the person was a minor — so it is granted deliberately rather
-- than swept in with the rest.
grant select (retention_until, retention_basis) on public.teacher_screenings to authenticated;
