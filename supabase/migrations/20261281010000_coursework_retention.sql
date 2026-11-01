-- -----------------------------------------------------------------------------
-- A handed-in photograph now has an end date
-- -----------------------------------------------------------------------------
-- The owner answered the question the ledger had been carrying since coursework
-- files were built (2026-11-01): **a file a child hands in is kept for a year
-- after the class ends.** Until then, nothing in this schema could say when one
-- would go, and the consequence was worse than "kept a little too long":
--
--   * `run_retention_jobs()` deletes a child's submissions thirty days after the
--     guardian's account closes. `assignment_submission_assets` cascades on that
--     delete, so the rows saying *whose* file it was disappeared — and the
--     `media_assets` row and the object in the bucket stayed, now belonging to
--     nobody the database could name.
--   * `delete_media_asset()` is a soft delete whose own comment says "the master
--     object survives; retention is a scheduled decision". For coursework no such
--     decision had been made.
--   * `erase_my_account()` blanks the words of a submission and does not touch a
--     file at all.
--
-- So this migration winds a fourth clock, and states each choice it makes:
--
--   1. **The clock is a year after the later of two moments**: the class ending,
--      where the task belongs to a dated cohort, and the file being handed in.
--      A class that ends later moves the date later; a self-paced task has no
--      class, so its hand-in is the anchor.
--   2. **An erased child's record is shorter, not longer.** The children's policy
--      already promises the learning record is deleted thirty days after the
--      guardian's account closes. A photograph is part of that record, so the
--      clock takes the *earlier* of the two dates, never the later.
--   3. **A file that loses its submission is unwatchable at once.** A trigger
--      tombstones the asset when the attachment row goes, whichever path removed
--      it, because after that there is no one the database can say the file
--      belongs to. The bytes follow thirty days later.
--   4. **A safeguarding hold is the only thing that suspends deletion**, it needs
--      a written reason, and it is visible on the screen rather than a flag
--      somebody set once.
--   5. **What this database cannot do is delete the object.** There are no R2
--      credentials in any environment, so a tombstone sets `purge_due_at`, the
--      plan counts what is waiting, and a staff step records the deletion once it
--      has happened — the same shape `record_identity_removal()` already uses for
--      the sign-in. Pretending otherwise is how "deleted" comes to mean
--      "unwatchable".

-- -----------------------------------------------------------------------------
-- 1. What the storage queue needs to exist
-- -----------------------------------------------------------------------------
alter table public.media_assets
  add column if not exists purge_due_at timestamptz,
  add column if not exists purged_at   timestamptz,
  add column if not exists purged_by   uuid
    references public.user_profiles (user_id) on delete restrict;

alter table public.media_assets
  drop constraint if exists media_assets_purge_agrees,
  drop constraint if exists media_assets_purged_needs_tombstone;

alter table public.media_assets
  add constraint media_assets_purge_agrees
    check ((purged_at is null) = (purged_by is null)),
  add constraint media_assets_purged_needs_tombstone
    check (purged_at is null or deleted_at is not null);

create index if not exists media_assets_purge_due_idx
  on public.media_assets (purge_due_at)
  where purge_due_at is not null and purged_at is null;

comment on column public.media_assets.purge_due_at is
  'For a handed-in file: when the object itself is due to be deleted from storage. Set when the file is tombstoned — a year after the class for the ordinary clock, thirty days after an erased record.';
comment on column public.media_assets.purged_at is
  'When a staff step recorded that the object was actually deleted from storage. This database cannot delete it: there are no storage credentials in any environment, so the tombstone and the deletion are two different facts.';

-- -----------------------------------------------------------------------------
-- 2. A hold, with a reason and a person
-- -----------------------------------------------------------------------------
-- A safeguarding case that names a file must not find it deleted by a nightly
-- job. The hold is the only mechanism that stops the clock, it needs a written
-- reason to exist, and it needs one to end — the same rule every other release
-- in this schema follows.
create table if not exists public.coursework_retention_holds (
  asset_id uuid primary key
    references public.media_assets (id) on delete cascade,

  reason text not null check (length(btrim(reason)) >= 3),

  opened_by uuid not null
    references public.user_profiles (user_id) on delete restrict,
  opened_at timestamptz not null default now(),

  closed_at timestamptz,
  closed_by uuid
    references public.user_profiles (user_id) on delete restrict,
  closed_reason text,

  constraint crh_close_agrees check (
    (closed_at is null) = (closed_by is null)
    and (closed_at is null) = (closed_reason is null)
  )
);

alter table public.coursework_retention_holds enable row level security;
revoke all on public.coursework_retention_holds from anon, authenticated;

comment on table public.coursework_retention_holds is
  'A written reason a handed-in file is not to be deleted yet. The only thing that suspends the coursework clock; no policy at all, so it is read through the staff functions below.';

create or replace function public.hold_coursework_file(
  p_asset_id uuid,
  p_reason   text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_purpose text;
  v_open   uuid;
begin
  if v_actor is null
     or not (public.has_role(v_actor, 'platform_admin')
             or public.has_role(v_actor, 'governance_admin')) then
    raise exception 'only governance staff or the owner may hold a file'
      using errcode = 'insufficient_privilege';
  end if;

  if length(v_reason) < 3 then
    raise exception 'holding a file back needs a written reason'
      using errcode = 'check_violation';
  end if;

  select purpose into v_purpose from public.media_assets where id = p_asset_id;
  if not found then
    raise exception 'that file does not exist' using errcode = 'no_data_found';
  end if;
  if v_purpose <> 'coursework' then
    raise exception 'only a handed-in file can be held against deletion'
      using errcode = 'check_violation';
  end if;

  select asset_id into v_open
    from public.coursework_retention_holds
   where asset_id = p_asset_id and closed_at is null;
  if found then
    raise exception 'that file is already held' using errcode = 'unique_violation';
  end if;

  insert into public.coursework_retention_holds (asset_id, reason, opened_by)
  values (p_asset_id, v_reason, v_actor);

  -- A file held after it was already due would otherwise be counted as waiting.
  -- The hold says "not yet", so the date it was waiting for is cleared; release
  -- puts a new one back rather than restoring a date in the past.
  update public.media_assets
     set purge_due_at = null
   where id = p_asset_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'coursework.held', 'media_asset', p_asset_id,
          jsonb_build_object('reason', v_reason));

  return p_asset_id;
end;
$$;

revoke all on function public.hold_coursework_file(uuid, text) from public, anon;
grant execute on function public.hold_coursework_file(uuid, text) to authenticated;

create or replace function public.release_coursework_hold(
  p_asset_id uuid,
  p_reason   text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_tombstoned timestamptz;
begin
  if v_actor is null
     or not (public.has_role(v_actor, 'platform_admin')
             or public.has_role(v_actor, 'governance_admin')) then
    raise exception 'only governance staff or the owner may release a hold'
      using errcode = 'insufficient_privilege';
  end if;

  if length(v_reason) < 3 then
    raise exception 'releasing a hold needs a written reason'
      using errcode = 'check_violation';
  end if;

  update public.coursework_retention_holds
     set closed_at = now(), closed_by = v_actor, closed_reason = v_reason
   where asset_id = p_asset_id and closed_at is null;

  if not found then
    raise exception 'that file is not held' using errcode = 'no_data_found';
  end if;

  -- If the file was already unwatchable when the hold went on, it does not come
  -- back: the submission it belonged to is gone. Its bytes are due now, plus the
  -- same thirty days a withdrawn file gets, so the release does not destroy
  -- evidence the moment somebody closes a case.
  select deleted_at into v_tombstoned from public.media_assets where id = p_asset_id;
  if v_tombstoned is not null then
    update public.media_assets
       set purge_due_at = greatest(now() + interval '30 days', coalesce(purge_due_at, now()))
     where id = p_asset_id;
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'coursework.hold_released', 'media_asset', p_asset_id,
          jsonb_build_object('reason', v_reason));

  return p_asset_id;
end;
$$;

revoke all on function public.release_coursework_hold(uuid, text) from public, anon;
grant execute on function public.release_coursework_hold(uuid, text) to authenticated;

comment on function public.release_coursework_hold(uuid, text) is
  'Ends a hold with a written reason. A file that was already tombstoned while held becomes due thirty days after the release, not immediately — closing a case is not the same act as destroying its evidence.';

-- -----------------------------------------------------------------------------
-- 3. A file that loses its submission is unwatchable at once
-- -----------------------------------------------------------------------------
-- The row that ties a file to a person is the attachment. Once the *submission*
-- goes, nothing in this database can say whose photograph it is, and keeping the
-- object readable would be keeping it for nobody. So a submission's deletion —
-- whichever path caused it, the child clock included — tombstones every file that
-- was attached to it.
--
-- A file merely detached from a submission that still exists is a different
-- thing: the learner still owns the upload and may hand it in again, and
-- `may_watch_master()` deliberately lets an uploader see their own file. The
-- trigger returns without touching that case.
--
-- `may_watch_master()` already refuses any asset with `deleted_at` set, so this
-- is the whole of "unwatchable": no route change, no second permission check.
create or replace function public.retire_coursework_file_on_detach()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Detached is not the same as orphaned. A learner who takes a file back before
  -- handing it in — or a teacher removing one from a draft — still owns the
  -- upload, and it may be attached again; `may_watch_master()` gives the uploader
  -- their own file precisely so that a mistake is recoverable. Only when the
  -- submission itself has gone does the file lose the person it belongs to.
  if exists (select 1 from public.assignment_submissions s where s.id = old.submission_id) then
    return old;
  end if;

  -- The platform's own transition. The status guard exists to stop an uploader
  -- promoting their own file, and a SECURITY DEFINER function bypasses RLS but
  -- not triggers.
  perform set_config('app.media_status_transition', 'on', true);

  update public.media_assets
     set status = 'deleted',
         deleted_at = coalesce(deleted_at, now()),
         purge_due_at = case
           when exists (select 1 from public.coursework_retention_holds h
                         where h.asset_id = old.media_asset_id and h.closed_at is null)
             then null
           else coalesce(purge_due_at, now() + interval '30 days')
         end
   where id = old.media_asset_id
     and purpose = 'coursework'
     and deleted_at is null;

  return old;
end;
$$;

drop trigger if exists assignment_submission_assets_retire_file
  on public.assignment_submission_assets;
create trigger assignment_submission_assets_retire_file
  after delete on public.assignment_submission_assets
  for each row execute function public.retire_coursework_file_on_detach();

comment on function public.retire_coursework_file_on_detach() is
  'When a handed-in file loses its submission, the file is tombstoned and its bytes fall due thirty days later — unless a safeguarding hold is open. Unwatchable at once, because the database can no longer say whose file it was.';

-- -----------------------------------------------------------------------------
-- 4. One definition of when a handed-in file goes
-- -----------------------------------------------------------------------------
-- Same shape as `retention_due_records`: one place computes the date, and the
-- plan, the job and `psql` all read it. The view is revoked from everybody
-- because it runs as its owner; the readers below are the way in.
create or replace view public.coursework_file_retention as
  select asa.media_asset_id                          as asset_id,
         asa.submission_id,
         s.learner_profile_id,
         ca.course_id,
         ca.cohort_id,
         co.ends_at                                  as class_ends_at,
         s.submitted_at,
         asa.created_at                              as attached_at,
         lp.deleted_at                               as learner_record_erased_at,
         ma.status,
         ma.deleted_at                               as tombstoned_at,
         ma.purge_due_at,
         ma.purged_at,
         exists (select 1 from public.coursework_retention_holds h
                  where h.asset_id = asa.media_asset_id and h.closed_at is null) as held,
         -- GREATEST and LEAST ignore NULLs, which is exactly the behaviour the
         -- two anchors need: a class with no end date contributes nothing, and a
         -- record that was never erased contributes no second clock.
         least(
           (greatest(co.ends_at, s.submitted_at, s.created_at, asa.created_at)
              + interval '1 year')::date,
           ((lp.deleted_at + interval '30 days')::date)
         )                                            as due_on,
         case
           when lp.deleted_at is not null
            and (lp.deleted_at + interval '30 days')
                <= greatest(co.ends_at, s.submitted_at, s.created_at, asa.created_at) + interval '1 year'
             then 'erasure'
           when co.ends_at is not null
            and co.ends_at >= greatest(s.submitted_at, s.created_at, asa.created_at)
             then 'class_end'
           else 'handed_in'
         end                                          as basis
    from public.assignment_submission_assets asa
    join public.media_assets ma         on ma.id = asa.media_asset_id and ma.purpose = 'coursework'
    join public.assignment_submissions s on s.id = asa.submission_id
    join public.course_assignments ca    on ca.id = s.assignment_id
    join public.learner_profiles lp      on lp.id = s.learner_profile_id
    left join public.cohorts co          on co.id = ca.cohort_id;

revoke all on public.coursework_file_retention from public, anon, authenticated;

comment on view public.coursework_file_retention is
  'When each handed-in file is due to be deleted, and which clock set it: the class ending, the hand-in itself, or an erased learning record, whichever is soonest. Internal.';

-- -----------------------------------------------------------------------------
-- 5. The plan the owner reads before pressing anything
-- -----------------------------------------------------------------------------
create or replace function public.coursework_retention_plan(p_now timestamptz default now())
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor      uuid := public.current_user_id();
  v_as_of      date := (p_now at time zone 'UTC')::date;
  v_due        integer;
  v_oldest     date;
  v_next       date;
  v_held       integer;
  v_held_oldest date;
  v_awaiting   integer;
  v_awaiting_oldest timestamptz;
  v_erased     integer;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'retention:not_allowed'
      using errcode = 'insufficient_privilege',
            hint = 'a child''s file is deleted by the owner or the cleanup they schedule';
  end if;

  select count(*)::int, min(due_on) into v_due, v_oldest
    from public.coursework_file_retention
   where due_on <= v_as_of
     and tombstoned_at is null
     and not held;

  select min(due_on) into v_next
    from public.coursework_file_retention
   where due_on > v_as_of
     and tombstoned_at is null
     and not held;

  select count(*)::int, min(due_on) into v_held, v_held_oldest
    from public.coursework_file_retention
   where held and tombstoned_at is null;

  -- Tombstoned and not yet confirmed deleted from storage. This database cannot
  -- close these itself; the number is here so it is never mistaken for zero.
  select count(*)::int, min(purge_due_at) into v_awaiting, v_awaiting_oldest
    from public.media_assets
   where purpose = 'coursework'
     and deleted_at is not null
     and purged_at is null;

  select count(*)::int into v_erased
    from public.coursework_file_retention
   where basis = 'erasure';

  return jsonb_build_object(
    'asOf', v_as_of,
    'policies', jsonb_build_object(
      'courseworkFile', jsonb_build_object(
        'years', 1,
        'days', null,
        'clock', 'one year after the later of the class ending and the file being handed in',
        'source', 'The owner''s answer of 2026-11-01: "a year after the class ends."'),
      'erasedRecord', jsonb_build_object(
        'years', null,
        'days', 30,
        'clock', 'thirty days after the learner''s record was erased, where that is sooner',
        'source', 'The children''s policy: a child''s learning record is deleted thirty days after the guardian''s account closes.')),
    'files', jsonb_build_object(
      'due', v_due,
      'oldestDue', v_oldest,
      'nextDue', v_next,
      'erasedToDate', v_erased,
      'held', jsonb_build_object(
        'count', v_held,
        'oldestDue', v_held_oldest,
        'note', 'Files somebody held on purpose. Deletion stops while a hold is open and needs a written reason to end.')),
    'storage', jsonb_build_object(
      'awaiting', v_awaiting,
      'oldestDue', v_awaiting_oldest,
      'note', 'Unwatchable already, and the object is still in the bucket. This database holds no storage credential, so a staff step records the deletion once it has happened.'));
end;
$$;

revoke all on function public.coursework_retention_plan(timestamptz) from public, anon;
grant execute on function public.coursework_retention_plan(timestamptz) to authenticated;

comment on function public.coursework_retention_plan(timestamptz) is
  'How many handed-in files are past their date, which is next, how many are held on purpose, and how many are already unwatchable but still in storage. Deletes nothing.';

-- -----------------------------------------------------------------------------
-- 6. The press
-- -----------------------------------------------------------------------------
-- Tombstoning is the deletion this platform can perform on its own: the row stops
-- being readable by anybody, including staff, and `may_watch_master()` refuses
-- it. The bytes are queued, with a date, and counted until somebody records that
-- they went.
create or replace function public.purge_coursework_files(
  p_now   timestamptz default now(),
  p_limit integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_as_of    date := least((p_now at time zone 'UTC')::date,
                           (now() at time zone 'UTC')::date);
  v_ids      uuid[];
  v_purged   integer := 0;
  v_left     integer := 0;
  v_held     integer := 0;
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

  select array_agg(asset_id) into v_ids
    from (select asset_id
            from public.coursework_file_retention
           where due_on <= v_as_of
             and tombstoned_at is null
             and not held
           order by due_on, asset_id
           limit p_limit) picked;

  if v_ids is not null then
    perform set_config('app.media_status_transition', 'on', true);

    update public.media_assets
       set status = 'deleted',
           deleted_at = now(),
           -- The bytes are due now, not in another thirty days: the year this
           -- date came from has already passed.
           purge_due_at = now()
     where id = any(v_ids)
       and deleted_at is null;

    get diagnostics v_purged = row_count;
    perform set_config('app.media_status_transition', '', true);

    insert into public.governance_audit_events (actor, action, target_type, detail)
    values (v_actor, 'retention.coursework_files_deleted', 'retention_run',
            jsonb_build_object('asOf', v_as_of, 'files', v_purged, 'limit', p_limit));
  end if;

  select count(*)::int into v_left
    from public.coursework_file_retention
   where due_on <= v_as_of and tombstoned_at is null and not held;

  select count(*)::int into v_held
    from public.coursework_file_retention
   where held and tombstoned_at is null;

  return jsonb_build_object(
    'asOf', v_as_of,
    'deleted', v_purged,
    'remaining', v_left,
    'held', v_held,
    'awaitingStorage',
      (select count(*)::int from public.media_assets
        where purpose = 'coursework' and deleted_at is not null and purged_at is null));
end;
$$;

revoke all on function public.purge_coursework_files(timestamptz, integer) from public, anon;
grant execute on function public.purge_coursework_files(timestamptz, integer) to authenticated;

comment on function public.purge_coursework_files(timestamptz, integer) is
  'Deletes the handed-in files whose date has passed, by tombstoning them: nobody can watch one afterwards, including staff. Never a file on hold. The object in storage is queued and counted separately, because this database cannot delete it.';

-- -----------------------------------------------------------------------------
-- 7. The queue this database cannot empty, and the step that empties it
-- -----------------------------------------------------------------------------
create or replace function public.coursework_bytes_awaiting(p_limit integer default 50)
returns table (
  asset_id      uuid,
  master_bucket text,
  master_key    text,
  display_name  text,
  tombstoned_at timestamptz,
  purge_due_at  timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'retention:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  return query
    select ma.id, ma.master_bucket, ma.master_key,
           coalesce(ma.display_name, ma.master_key),
           ma.deleted_at, ma.purge_due_at
      from public.media_assets ma
     where ma.purpose = 'coursework'
       and ma.deleted_at is not null
       and ma.purged_at is null
     order by coalesce(ma.purge_due_at, ma.deleted_at), ma.id
     limit greatest(coalesce(p_limit, 50), 1);
end;
$$;

revoke all on function public.coursework_bytes_awaiting(integer) from public, anon;
grant execute on function public.coursework_bytes_awaiting(integer) to authenticated;

comment on function public.coursework_bytes_awaiting(integer) is
  'The handed-in objects that are unwatchable and still in the bucket, with the key needed to delete one. The list exists because "awaiting storage" with no key to act on is a number nobody can clear.';

create or replace function public.record_coursework_purge(p_asset_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_asset public.media_assets;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'retention:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_asset from public.media_assets where id = p_asset_id;
  if not found then
    raise exception 'that file does not exist' using errcode = 'no_data_found';
  end if;
  if v_asset.deleted_at is null then
    raise exception 'that file is still readable; nothing has been deleted to record'
      using errcode = 'check_violation',
            hint = 'a tombstone comes first — recording a deletion that has not happened is how a screen stops being true';
  end if;
  if v_asset.purged_at is not null then
    return false;
  end if;

  update public.media_assets
     set purged_at = now(),
         purged_by = v_actor
   where id = p_asset_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'retention.coursework_bytes_deleted', 'media_asset', p_asset_id,
          jsonb_build_object('bucket', v_asset.master_bucket));

  return true;
end;
$$;

revoke all on function public.record_coursework_purge(uuid) from public, anon;
grant execute on function public.record_coursework_purge(uuid) to authenticated;

comment on function public.record_coursework_purge(uuid) is
  'Records that the object was deleted from storage. Refuses while the file is still readable, because "recorded" drifting from "done" is the failure this queue exists to prevent.';

-- -----------------------------------------------------------------------------
-- 8. The whole cleanup now includes the fourth clock
-- -----------------------------------------------------------------------------
-- Reproduced in full: PostgreSQL cannot wrap the function it replaces. Two
-- changes: one line calling the coursework arm, and its counts in the audit and
-- the reply. The existing three arms are unchanged, including the order they run
-- in — a child's record is purged after the cases and screenings so a failure in
-- one arm does not take the others with it.
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
  v_as_of       date := least((p_now at time zone 'UTC')::date,
                              (now() at time zone 'UTC')::date);
  v_case_ids    uuid[];
  v_screen_ids  uuid[];
  v_cases       integer := 0;
  v_messages    integer := 0;
  v_screenings  integer := 0;
  v_learners    integer := 0;
  v_cases_left  integer := 0;
  v_screen_left integer := 0;
  v_learner_left integer := 0;
  v_files       integer := 0;
  v_files_left  integer := 0;
  v_files_held  integer := 0;
  v_coursework  jsonb;
  v_one         uuid;
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

  for v_one in
    select id from public.retention_due_records
     where kind = 'learner_record' and due_on <= v_as_of
     order by due_on, id
     limit p_limit
  loop
    perform public.purge_learner_record(v_one);
    v_learners := v_learners + 1;
  end loop;

  -- The fourth clock. It runs after the child's record for the same reason the
  -- cases run first: a file the record clock detached has already been tombstoned
  -- by the trigger, and this arm cleans up the ordinary ones whose year is up.
  v_coursework := public.purge_coursework_files(p_now, p_limit);
  v_files := coalesce((v_coursework -> 'deleted')::int, 0);
  v_files_left := coalesce((v_coursework -> 'remaining')::int, 0);
  v_files_held := coalesce((v_coursework -> 'held')::int, 0);

  select count(*)::int into v_cases_left
    from public.retention_due_records
   where kind = 'support_case' and due_on <= v_as_of;
  select count(*)::int into v_screen_left
    from public.retention_due_records
   where kind = 'screening' and due_on <= v_as_of;
  select count(*)::int into v_learner_left
    from public.retention_due_records
   where kind = 'learner_record' and due_on <= v_as_of;

  if v_cases + v_screenings + v_learners > 0 then
    insert into public.governance_audit_events (actor, action, target_type, detail)
    values (v_actor, 'retention.purged', 'retention_run',
            jsonb_build_object('asOf', v_as_of, 'supportCases', v_cases,
                               'supportCaseMessages', v_messages,
                               'screenings', v_screenings,
                               'learnerRecords', v_learners,
                               'courseworkFiles', v_files, 'limit', p_limit));
  end if;

  return jsonb_build_object(
    'asOf', v_as_of,
    'deleted', jsonb_build_object(
      'supportCases', v_cases,
      'supportCaseMessages', v_messages,
      'screenings', v_screenings,
      'learnerRecords', v_learners,
      'courseworkFiles', v_files),
    'remaining', jsonb_build_object(
      'supportCases', v_cases_left,
      'screenings', v_screen_left,
      'learnerRecords', v_learner_left,
      'courseworkFiles', v_files_left),
    'held', jsonb_build_object('courseworkFiles', v_files_held),
    'audited', v_cases + v_screenings + v_learners + v_files > 0);
end;
$$;

revoke all on function public.run_retention_jobs(timestamptz, integer) from public, anon;
grant execute on function public.run_retention_jobs(timestamptz, integer) to authenticated;

comment on function public.run_retention_jobs(timestamptz, integer) is
  'Deletes what the four clocks say is due — closed support cases past three years, screening records past seven, children''s learning records past thirty days, and handed-in files past a year — in bounded batches, and writes one audit event when it removed anything.';
