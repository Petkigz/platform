-- What a learner has memorised, and when to look at it again.
--
-- WHY THIS EXISTS
-- ---------------
-- `learning.hifz` sat in the register with one sentence against it: *"Revision
-- schedule and decay model designed. Best value on the premium list."* The
-- schedule had never been designed, so nothing was built. This is the design, in
-- SQL where the schedule has to hold whichever client asks.
--
-- WHAT A PASSAGE IS
-- -----------------
-- A **label the learner writes**, and nothing more: "Al-Fatihah 1–7", "Ayat
-- al-Kursi", "the last three of Al-Baqarah". The platform does not hold the text,
-- does not verify the memorisation and does not decide what counts as a surah —
-- a Qur'an database is a different project with its own rights questions, and a
-- hifz tracker that guessed at a verse range would be wrong in a way nobody
-- could see. The label is the learner's own words about their own work.
--
-- WHAT THE SCHEDULE IS, EXACTLY
-- -----------------------------
-- Seven rungs: **1, 3, 7, 16, 35, 75, 160 days.** Each is roughly double the one
-- before. A review the learner calls **solid** moves the passage up one rung; a
-- review they call **shaky** puts it back on the first rung and counts a lapse.
-- Nothing about the interval is inferred from how long they took, how many they
-- did, or how they compare to anybody else.
--
-- This is deliberately not SM-2, FSRS or any other named algorithm. Those model
-- retention curves from large data sets; quoting one here would be a claim about
-- evidence this platform does not have. A ladder that doubles is a rule a learner
-- can predict, and every number is visible on the page.
--
-- WHY THE LEARNER'S VERDICT IS THE ONLY INPUT
-- -------------------------------------------
-- The platform cannot hear a recitation (`learning.recitation` is CODE-gated on
-- an ASR accuracy nobody has validated), so "solid" is a self-report. That is
-- stated on the screen rather than dressed up: this records what a person says
-- about their own memory and when they would like reminding. It is not an
-- assessment and it never becomes one — no certificate is issued from it, no
-- teacher sees it, and no score is computed from lapses.
--
-- DELETION
-- --------
-- A passage is archived, never deleted, for the same reason a certificate is
-- revoked rather than removed: the reviews tied to it are a record of somebody's
-- work, and the learner may want it back. `archive_hifz_passage()` sets a date;
-- nothing is destroyed.

update public.platform_settings
   set description   = 'Memorisation tracker with spaced repetition',
       preconditions = 'Built 2026-10-29 and gated by this flag. The schedule is a fixed ladder '
                    || '(1, 3, 7, 16, 35, 75, 160 days) driven only by the learner''s own '
                    || 'solid/shaky verdict, because the platform cannot hear a recitation. '
                    || 'Turning it on gives every learner a page of their own; turning it off '
                    || 'hides it and deletes nothing. The remaining decision is the owner''s: '
                    || 'whether to offer it to children as well as adults.'
 where key = 'learning.hifz';

create table public.hifz_passages (
  id uuid primary key default gen_random_uuid(),

  -- Whose memory this is. The same predicate that guards progress and
  -- certificates decides who may add to it and read it.
  learner_profile_id uuid not null
    references public.learner_profiles (id) on delete cascade,

  -- The learner's own words. Not a surah id, not a verse range: see the header.
  label text not null check (length(trim(label)) between 1 and 200),

  -- The learner's own word for where they are, not a judgement by the platform.
  status text not null default 'learning'
    check (status in ('learning', 'memorised')),

  -- Where on the ladder this passage sits. 0 is the first rung (1 day).
  rung integer not null default 0 check (rung between 0 and 6),

  interval_days integer not null default 1 check (interval_days between 1 and 160),

  next_due_on date not null default current_date,

  last_reviewed_on date,
  review_count integer not null default 0 check (review_count >= 0),
  lapses integer not null default 0 check (lapses >= 0),

  -- Who wrote it. The learner themselves, or a guardian acting for a child.
  created_by uuid not null references public.user_profiles (user_id) on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

-- One live passage per label per learner. Two rows called "Al-Fatihah" would be
-- two different schedules for one thing, and the learner would have no way to
-- know which one the page is reminding them about.
create unique index hifz_passages_one_live_label
  on public.hifz_passages (learner_profile_id, lower(btrim(label)))
  where archived_at is null;

create index hifz_passages_due_idx
  on public.hifz_passages (learner_profile_id, next_due_on)
  where archived_at is null;

create table public.hifz_reviews (
  id uuid primary key default gen_random_uuid(),

  passage_id uuid not null
    references public.hifz_passages (id) on delete cascade,

  -- The verdict, in the learner's word. `solid` or `shaky`, nothing else.
  outcome text not null check (outcome in ('solid', 'shaky')),

  -- The schedule as it stood after this review, copied rather than recomputed:
  -- the ladder may be changed later, and an old review must keep saying what it
  -- decided at the time.
  rung integer not null check (rung between 0 and 6),
  interval_days integer not null check (interval_days between 1 and 160),
  next_due_on date not null,

  reviewed_by uuid not null references public.user_profiles (user_id) on delete restrict,
  reviewed_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index hifz_reviews_passage_idx on public.hifz_reviews (passage_id, created_at desc);

-- ---------------------------------------------------------------------------
-- The ladder, named once
-- ---------------------------------------------------------------------------
create or replace function public.hifz_ladder()
returns integer[]
language sql
immutable
as $$
  select array[1, 3, 7, 16, 35, 75, 160]::integer[];
$$;

comment on function public.hifz_ladder() is
  'The revision ladder in days: 1, 3, 7, 16, 35, 75, 160. Solid moves up one '
  'rung, shaky returns to the first. It is not SM-2 or FSRS and does not pretend '
  'to be: those model retention from data this platform does not have.';

-- ---------------------------------------------------------------------------
-- Reads
-- ---------------------------------------------------------------------------
-- RLS on, then policies. A table with a `grant select` and RLS off would let any
-- signed-in account read every learner's list — the grant is not the policy, and
-- `group1`'s "RLS is enabled on every public table" is the check that catches the
-- difference.
alter table public.hifz_passages enable row level security;
alter table public.hifz_reviews enable row level security;

create policy hifz_passages_read on public.hifz_passages
  for select to authenticated
  using (public.can_access_learner(learner_profile_id));

create policy hifz_reviews_read on public.hifz_reviews
  for select to authenticated
  using (
    exists (
      select 1
        from public.hifz_passages p
       where p.id = hifz_reviews.passage_id
         and public.can_access_learner(p.learner_profile_id)
    )
  );

-- No insert, update or delete policy: every write goes through the functions
-- below, so the ladder cannot be bypassed by a client that writes a row directly
-- and a passage cannot be deleted out from under its reviews.
revoke all on public.hifz_passages, public.hifz_reviews from anon, authenticated;
grant select on public.hifz_passages, public.hifz_reviews to authenticated;

-- ---------------------------------------------------------------------------
-- Adding a passage
-- ---------------------------------------------------------------------------
create or replace function public.add_hifz_passage(
  p_learner uuid,
  p_label   text,
  p_status  text default 'learning'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_label  text := btrim(coalesce(p_label, ''));
  v_status text := lower(btrim(coalesce(p_status, 'learning')));
  v_id     uuid;
begin
  if v_actor is null then
    raise exception 'hifz:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('learning.hifz', false) then
    raise exception 'hifz:not_enabled'
      using errcode = 'feature_not_supported';
  end if;
  if not public.can_access_learner(p_learner) then
    raise exception 'hifz:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if v_label = '' then
    raise exception 'hifz:label_required'
      using errcode = 'check_violation';
  end if;
  if length(v_label) > 200 then
    raise exception 'hifz:label_too_long'
      using errcode = 'invalid_parameter_value';
  end if;
  if v_status not in ('learning', 'memorised') then
    raise exception 'hifz:bad_status'
      using errcode = 'invalid_parameter_value';
  end if;
  if exists (
    select 1 from public.hifz_passages
     where learner_profile_id = p_learner
       and lower(btrim(label)) = lower(v_label)
       and archived_at is null
  ) then
    raise exception 'hifz:already_exists'
      using errcode = 'unique_violation';
  end if;

  insert into public.hifz_passages
    (learner_profile_id, label, status, rung, interval_days, next_due_on, created_by)
  values
    (p_learner, v_label, v_status, 0, 1, current_date, v_actor)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'hifz.passage_added', 'learner_profile', p_learner,
          jsonb_build_object('passageId', v_id, 'status', v_status));

  return v_id;
end;
$$;

revoke all on function public.add_hifz_passage(uuid, text, text) from public, anon;
grant execute on function public.add_hifz_passage(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Recording a review
-- ---------------------------------------------------------------------------
create or replace function public.review_hifz_passage(
  p_passage uuid,
  p_outcome text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_outcome  text := lower(btrim(coalesce(p_outcome, '')));
  v_passage  public.hifz_passages%rowtype;
  v_ladder   integer[] := public.hifz_ladder();
  v_rung     integer;
  v_days     integer;
  v_due      date;
begin
  if v_actor is null then
    raise exception 'hifz:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('learning.hifz', false) then
    raise exception 'hifz:not_enabled'
      using errcode = 'feature_not_supported';
  end if;
  if v_outcome not in ('solid', 'shaky') then
    raise exception 'hifz:bad_outcome'
      using errcode = 'invalid_parameter_value';
  end if;

  select * into v_passage
    from public.hifz_passages
   where id = p_passage
     and archived_at is null;

  if not found then
    raise exception 'hifz:passage_not_found'
      using errcode = 'no_data_found';
  end if;
  if not public.can_access_learner(v_passage.learner_profile_id) then
    raise exception 'hifz:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  -- solid climbs one rung and stops at the top; shaky returns to the first rung
  -- and counts a lapse. A lapse is a fact about the schedule, not a mark.
  if v_outcome = 'solid' then
    v_rung := least(v_passage.rung + 1, array_length(v_ladder, 1) - 1);
  else
    v_rung := 0;
  end if;

  v_days := v_ladder[v_rung + 1];
  v_due := current_date + v_days;

  update public.hifz_passages
     set rung = v_rung,
         interval_days = v_days,
         next_due_on = v_due,
         last_reviewed_on = current_date,
         review_count = review_count + 1,
         lapses = lapses + (case when v_outcome = 'shaky' then 1 else 0 end),
         updated_at = now()
   where id = p_passage;

  insert into public.hifz_reviews
    (passage_id, outcome, rung, interval_days, next_due_on, reviewed_by)
  values
    (p_passage, v_outcome, v_rung, v_days, v_due, v_actor);

  return jsonb_build_object(
    'passageId', p_passage,
    'outcome', v_outcome,
    'intervalDays', v_days,
    'nextDueOn', v_due,
    'rung', v_rung
  );
end;
$$;

revoke all on function public.review_hifz_passage(uuid, text) from public, anon;
grant execute on function public.review_hifz_passage(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- The learner's own word for where they are
-- ---------------------------------------------------------------------------
create or replace function public.set_hifz_passage_status(
  p_passage uuid,
  p_status  text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_status  text := lower(btrim(coalesce(p_status, '')));
  v_learner uuid;
begin
  if v_actor is null then
    raise exception 'hifz:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('learning.hifz', false) then
    raise exception 'hifz:not_enabled'
      using errcode = 'feature_not_supported';
  end if;
  if v_status not in ('learning', 'memorised') then
    raise exception 'hifz:bad_status'
      using errcode = 'invalid_parameter_value';
  end if;

  select learner_profile_id into v_learner
    from public.hifz_passages
   where id = p_passage and archived_at is null;

  if v_learner is null then
    raise exception 'hifz:passage_not_found'
      using errcode = 'no_data_found';
  end if;
  if not public.can_access_learner(v_learner) then
    raise exception 'hifz:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  update public.hifz_passages
     set status = v_status, updated_at = now()
   where id = p_passage;

  return jsonb_build_object('passageId', p_passage, 'status', v_status);
end;
$$;

revoke all on function public.set_hifz_passage_status(uuid, text) from public, anon;
grant execute on function public.set_hifz_passage_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Putting a passage away
-- ---------------------------------------------------------------------------
create or replace function public.archive_hifz_passage(p_passage uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_learner uuid;
begin
  if v_actor is null then
    raise exception 'hifz:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('learning.hifz', false) then
    raise exception 'hifz:not_enabled'
      using errcode = 'feature_not_supported';
  end if;

  select learner_profile_id into v_learner
    from public.hifz_passages
   where id = p_passage and archived_at is null;

  if v_learner is null then
    raise exception 'hifz:passage_not_found'
      using errcode = 'no_data_found';
  end if;
  if not public.can_access_learner(v_learner) then
    raise exception 'hifz:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  update public.hifz_passages
     set archived_at = now(), updated_at = now()
   where id = p_passage;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'hifz.passage_archived', 'learner_profile', v_learner,
          jsonb_build_object('passageId', p_passage));

  return true;
end;
$$;

revoke all on function public.archive_hifz_passage(uuid) from public, anon;
grant execute on function public.archive_hifz_passage(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- What the page reads
-- ---------------------------------------------------------------------------
create or replace function public.my_hifz(p_learner uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_learner uuid := p_learner;
  v_today   date := current_date;
  v_rows    jsonb;
  v_total   integer;
  v_due     integer;
  v_memory  integer;
begin
  if v_actor is null then
    raise exception 'hifz:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  -- The flag decides whether the page exists, not whether the data does. Off
  -- returns one key and nothing else, so turning it off cannot be read as
  -- "this learner has memorised nothing".
  if not public.setting_bool('learning.hifz', false) then
    return jsonb_build_object('enabled', false);
  end if;

  if v_learner is null then
    select id into v_learner
      from public.learner_profiles
     where user_id = v_actor
       and deleted_at is null
     order by created_at
     limit 1;
  end if;

  if v_learner is null then
    return jsonb_build_object('enabled', true, 'learnerId', null, 'passages', '[]'::jsonb);
  end if;

  if not public.can_access_learner(v_learner) then
    raise exception 'hifz:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  select coalesce(jsonb_agg(row_json order by due_first, label), '[]'::jsonb)
    into v_rows
    from (
      select jsonb_build_object(
               'id', p.id,
               'label', p.label,
               'status', p.status,
               'rung', p.rung,
               'intervalDays', p.interval_days,
               'nextDueOn', p.next_due_on,
               'lastReviewedOn', p.last_reviewed_on,
               'reviewCount', p.review_count,
               'lapses', p.lapses,
               -- Negative means not yet due. Kept as a number rather than a
               -- boolean so the page can say "in 4 days" as well as "due".
               'daysUntilDue', (p.next_due_on - v_today)
             ) as row_json,
             -- Due things first, then whatever is coming.
             (p.next_due_on > v_today) as due_first,
             p.label
        from public.hifz_passages p
       where p.learner_profile_id = v_learner
         and p.archived_at is null
    ) s;

  select count(*)::int,
         count(*) filter (where p.next_due_on <= v_today)::int,
         count(*) filter (where p.status = 'memorised')::int
    into v_total, v_due, v_memory
    from public.hifz_passages p
   where p.learner_profile_id = v_learner
     and p.archived_at is null;

  return jsonb_build_object(
    'enabled', true,
    'learnerId', v_learner,
    'today', v_today,
    'ladder', public.hifz_ladder(),
    'counts', jsonb_build_object('passages', v_total, 'due', v_due, 'memorised', v_memory),
    'passages', v_rows
  );
end;
$$;

revoke all on function public.my_hifz(uuid) from public, anon;
grant execute on function public.my_hifz(uuid) to authenticated;

comment on function public.my_hifz(uuid) is
  'One learner''s memorisation record, for the learner or somebody who may access '
  'them. Returns {enabled:false} when learning.hifz is off; otherwise the ladder, '
  'counts and every live passage with daysUntilDue (negative is not yet due). '
  'No score, no comparison and no certificate is derived from it.';
