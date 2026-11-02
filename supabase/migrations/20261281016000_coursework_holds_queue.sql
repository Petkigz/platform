-- -----------------------------------------------------------------------------
-- Who is holding a child's file, and why
-- -----------------------------------------------------------------------------
-- The retention clock (`20261281010000`) gave a handed-in file an end date and one
-- way to stop the clock: a written hold. It built the writer and the refusal, and
-- it built the *storage* queue a person can act on. What it did not build is the
-- one list the person who can hold a file actually needs.
--
-- The permissions make the gap precise rather than theoretical:
--
--   * `coursework_retention_plan()` and `coursework_bytes_awaiting()` are
--     `platform_admin` — the owner — because they name what is due to be deleted and
--     the bucket key of every file waiting in storage.
--   * `hold_coursework_file()` and `release_coursework_hold()` are governance staff
--     **or** the owner, because a safeguarding hold is a governance act and does not
--     need the owner awake.
--
-- So a governance admin could place a hold and could not read one back. Two people
-- could hold two files and neither could see the other, and a hold nobody can review
-- is a hold nobody can release — which turns "not yet" into "for ever", which is the
-- failure the clock was built to end.
--
-- This is the read side, at the same permission as the writers, and it carries the
-- two facts a person needs before releasing one: what the reason was, and whether
-- the file is *still there*. A hold on a file whose submission was erased is holding
-- nothing, and saying so is better than leaving somebody to guess.

-- -----------------------------------------------------------------------------
-- A file may be held twice in its life, and only once at a time
-- -----------------------------------------------------------------------------
-- The hold table's primary key is `asset_id`, which says a file may be held once
-- *ever*. `hold_coursework_file()` disagrees: it refuses only an **open** hold, so
-- a released file is meant to be holdable again — and the second attempt died on a
-- primary-key violation instead, which is a refusal nobody wrote and nobody could
-- read. A safeguarding concern can be raised twice about one file a year apart;
-- what must not happen is two open holds, because that is two reasons for one
-- decision and the second release would leave the file still held.
alter table public.coursework_retention_holds
  drop constraint if exists coursework_retention_holds_pkey;

alter table public.coursework_retention_holds
  add column if not exists id uuid not null default gen_random_uuid();

alter table public.coursework_retention_holds
  add constraint coursework_retention_holds_pkey primary key (id);

create unique index if not exists coursework_retention_holds_one_open
  on public.coursework_retention_holds (asset_id)
  where closed_at is null;

comment on index public.coursework_retention_holds_one_open is
  'One open hold per file. A file may be held again after a release — a concern can be raised twice — but never twice at once.';

create or replace function public.coursework_holds(p_limit integer default 50)
returns table (
  asset_id      uuid,
  display_name  text,
  master_bucket text,
  master_key    text,
  reason        text,
  opened_by     uuid,
  opened_by_name text,
  opened_at     timestamptz,
  still_readable boolean,
  due_on        date
)
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
    raise exception 'coursework:not_allowed'
      using errcode = 'insufficient_privilege',
            hint = 'a hold on a child''s file is governance work, or the owner''s';
  end if;

  return query
    select h.asset_id,
           coalesce(ma.display_name, ma.master_key),
           ma.master_bucket,
           ma.master_key,
           h.reason,
           h.opened_by,
           coalesce(up.display_name, 'a member of staff whose name is gone'),
           h.opened_at,
           -- Still there means still readable. A tombstoned file is not being kept
           -- by this hold; the hold is keeping nothing at all.
           (ma.deleted_at is null),
           r.due_on
      from public.coursework_retention_holds h
      join public.media_assets ma on ma.id = h.asset_id
      left join public.user_profiles up on up.user_id = h.opened_by
      left join public.coursework_file_retention r on r.asset_id = h.asset_id
     where h.closed_at is null
     order by h.opened_at, h.asset_id
     limit greatest(coalesce(p_limit, 50), 1);
end;
$$;

revoke all on function public.coursework_holds(integer) from public, anon;
grant execute on function public.coursework_holds(integer) to authenticated;

comment on function public.coursework_holds(integer) is
  'Every handed-in file held back from deletion, with the written reason, who wrote it, and whether the file is still there to be saved. The read side of hold_coursework_file(), at the same permission.';

-- -----------------------------------------------------------------------------
-- One count for the top of a screen, at the same permission as the list
-- -----------------------------------------------------------------------------
-- `coursework_retention_plan()` is the owner's, because it names what is about to
-- be deleted. A governance admin needs one number from it — how many files are
-- held — and asking for the whole plan would either leak the rest or fail. This is
-- the small answer to the small question.
create or replace function public.coursework_hold_count()
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
    raise exception 'coursework:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  return jsonb_build_object(
    'held', (select count(*)::int from public.coursework_retention_holds
              where closed_at is null),
    'holdingNothing', (
      select count(*)::int
        from public.coursework_retention_holds h
        join public.media_assets ma on ma.id = h.asset_id
       where h.closed_at is null and ma.deleted_at is not null));
end;
$$;

revoke all on function public.coursework_hold_count() from public, anon;
grant execute on function public.coursework_hold_count() to authenticated;

comment on function public.coursework_hold_count() is
  'How many files are held from deletion, and how many of those holds are on a file that has already gone. The second number is the one that sends somebody to the register.';
