-- A record that an adult who teaches children has been checked.
--
-- The safeguarding policy draft said the honest thing: *"A teacher who works with
-- children is expected to have been checked. Screening is not built into this
-- platform yet, and that is said plainly rather than implied by a badge."* This
-- builds the record, and nothing more than the record.
--
-- What it deliberately does **not** do is decide what a check is, who may perform
-- one, or how long it lasts. Those are the owner's, and the register lets them say
-- so: `screening_type` is free text written by the person recording it, and
-- `valid_until` is their number.
--
-- Nor does it gate teaching. Requiring a valid check before a course with children
-- in its audience can publish is a policy the owner has not set, and a publication
-- gate switched on by guesswork would be worse than an honest gap. `platform.safeguarding`
-- says exactly that in FLAGS.md.
--
-- The evidence reference is **write-only**: it records where the document is held,
-- and no client can read it back — not the teacher, not staff, not support. That is
-- the same rule `reviewer_qualifications.evidence_reference` follows, and for the
-- same reason: a table read must not hand anybody a way to fetch identity papers.

create table public.teacher_screenings (
  id uuid primary key default gen_random_uuid(),

  -- The adult being checked. Not a learner: a child is never screened.
  user_id uuid not null
    references public.user_profiles (user_id) on delete restrict,

  -- What kind of check it was. Free text on purpose — the standard is the owner's,
  -- and a closed list would be this migration deciding it.
  screening_type text not null
    check (length(btrim(screening_type)) between 2 and 80),

  -- Where the document lives. Write-only; see the note above.
  evidence_reference text not null
    check (length(btrim(evidence_reference)) between 2 and 200),

  outcome text not null default 'passed'
    check (outcome in ('passed', 'failed')),

  checked_by uuid not null
    references public.user_profiles (user_id) on delete restrict,
  checked_at timestamptz not null default now(),

  -- Null means no stated expiry. A date in the past is refused by the writer, not
  -- by a check here, so the message can say why.
  valid_until date,

  -- Staff commentary. Write-only, like the reviewer register's internal notes.
  notes text,

  created_at timestamptz not null default now()
);

create index teacher_screenings_user_idx
  on public.teacher_screenings (user_id, checked_at desc);

comment on table public.teacher_screenings is
  'One recorded check on one adult who teaches. Append-only: a new check supersedes the last, and a row is never edited or deleted, because it is a record of what somebody was told and when.';

-- Append-only, enforced rather than promised. A screening row is evidence that a
-- check happened; editing it after the fact is exactly what it must not allow.
create or replace function public.refuse_screening_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'a screening record is not edited or deleted; record a new check instead'
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger teacher_screenings_append_only
  before update or delete on public.teacher_screenings
  for each row execute function public.refuse_screening_change();

-- ---------------------------------------------------------------------------
-- Row level security, by column
-- ---------------------------------------------------------------------------
alter table public.teacher_screenings enable row level security;

-- Staff read the register. The teacher reads their own status through
-- `my_screening_status()`, which is a narrower projection than the row.
create policy teacher_screenings_read_staff on public.teacher_screenings
  for select to authenticated
  using (
    public.has_role(public.current_user_id(), 'platform_admin')
    or public.has_role(public.current_user_id(), 'governance_admin')
  );

-- No insert, update or delete policy: `record_teacher_screening()` is the only
-- writer, and it reads the session's actor rather than trusting the request.

revoke select on public.teacher_screenings from authenticated;
grant select (id, user_id, screening_type, outcome, checked_by, checked_at,
              valid_until, created_at)
  on public.teacher_screenings to authenticated;

-- ---------------------------------------------------------------------------
-- Recording a check
-- ---------------------------------------------------------------------------
create or replace function public.record_teacher_screening(
  p_user_id            uuid,
  p_screening_type     text,
  p_evidence_reference text,
  p_outcome            text default 'passed',
  p_valid_until        date default null,
  p_notes              text default null
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
  if not exists (select 1 from public.user_profiles where user_id = p_user_id) then
    raise exception 'screening:user_not_found' using errcode = 'no_data_found';
  end if;
  if not public.has_role(p_user_id, 'instructor') then
    raise exception 'screening:not_a_teacher'
      using errcode = 'check_violation',
            hint = 'only an appointed teacher is screened; a learner is never screened';
  end if;

  insert into public.teacher_screenings
    (user_id, screening_type, evidence_reference, outcome, checked_by, valid_until, notes)
  values (p_user_id, v_type, v_ref, v_outcome, v_actor, p_valid_until,
          nullif(btrim(coalesce(p_notes, '')), ''))
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'screening.recorded', 'user_profile', p_user_id,
          jsonb_build_object('screeningId', v_id, 'type', v_type,
                             'outcome', v_outcome, 'validUntil', p_valid_until));

  return jsonb_build_object('id', v_id, 'outcome', v_outcome,
                            'validUntil', p_valid_until);
end;
$$;

revoke all on function public.record_teacher_screening(uuid, text, text, text, date, text)
  from public, anon;
grant execute on function public.record_teacher_screening(uuid, text, text, text, date, text)
  to authenticated;

comment on function public.record_teacher_screening(uuid, text, text, text, date, text) is
  'Owner or governance staff record that a check on an adult who teaches happened, when it was done and when it lapses. The evidence itself stays outside the platform; the reference is write-only.';

-- ---------------------------------------------------------------------------
-- Reading it
-- ---------------------------------------------------------------------------
/** What a teacher is told about their own check. Nothing about the evidence. */
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
begin
  if v_actor is null then
    raise exception 'screening:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_row from public.teacher_screenings
   where user_id = v_actor
   order by checked_at desc
   limit 1;

  if not found then
    return jsonb_build_object('recorded', false);
  end if;

  return jsonb_build_object(
    'recorded', true,
    'outcome', v_row.outcome,
    'type', v_row.screening_type,
    'checkedAt', v_row.checked_at,
    'validUntil', v_row.valid_until,
    'expired', v_row.valid_until is not null and v_row.valid_until < current_date);
end;
$$;

revoke all on function public.my_screening_status() from public, anon;
grant execute on function public.my_screening_status() to authenticated;

comment on function public.my_screening_status() is
  'A teacher''s own last screening: what kind, when, whether it still holds. Never the reference or the notes — those are write-only.';

/** The register: every teacher, and whether a check is on file. Staff only. */
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
  'Every appointed teacher and whether a check is on file: checked, expired, failed or none. Never the evidence reference — it is write-only.';

-- ---------------------------------------------------------------------------
-- The flag, rewritten to match what now exists
-- ---------------------------------------------------------------------------
-- `platform.safeguarding` stays CODE because the missing part is still code: no
-- course is refused for being taught by an adult with no current check, and that
-- enforcement needs the standard first. What changed is that "Nothing exists" is no
-- longer true, and a precondition list that says so would be a lie in the register
-- the owner reads before switching anything on.
update public.platform_settings
   set preconditions = 'The policy, the route and the screening record exist as of '
        || '2026-10-27. Built: the screening register on /admin/screenings (what kind '
        || 'of check, when, when it lapses, who recorded it, with the evidence '
        || 'reference write-only and the row append-only); the conduct policy as a draft '
        || 'in the register; and no private teacher-to-learner channel anywhere in the '
        || 'product. Not built: refusing a child-facing course from an adult with no '
        || 'current check, which is the enforcement and needs the standard first. The '
        || 'owner decides: what a check is, who performs it, how long it lasts, and who '
        || 'is the named safeguarding lead'
 where key = 'platform.safeguarding';

update public.platform_settings
   set preconditions = 'Built: the screening record on /admin/screenings (type, date, '
        || 'expiry, who recorded it, reference write-only, rows append-only) and the '
        || 'conduct policy as a draft in the register. Not built: a conduct '
        || 'acknowledgement a teacher signs inside the product, and any refusal that '
        || 'turns on it. The owner decides: what a check is, who performs it, and '
        || 'whether teaching requires an acknowledgement at all'
 where key = 'teaching.screening';
