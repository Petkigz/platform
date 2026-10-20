-- A failed encode stops being a dead end.
--
-- THE GAP
-- -------
-- `media_renditions` has one row per (asset, profile), written only by
-- `register_media_rendition()`, `confirm_media_rendition()` and
-- `fail_media_rendition()`. `fail` moves `pending` to `failed` and nothing moves
-- it back, and a second `register` for the same profile hits the unique index. So
-- one transient failure — the bucket unreachable for a minute, the worker killed
-- mid-encode, a font missing on the host that week — permanently removed that rung
-- from a lesson. The worker refuses a `failed` row on purpose, because retrying a
-- genuinely broken master on every run would burn a machine forever, and its own
-- header said so: "`--asset` is the escape hatch for a master that needs attention
-- and does not match the filter, such as one whose profile is stuck `failed`,
-- which nothing in the schema can retry."
--
-- The escape hatch pointed at a door that did not exist. This is the door.
--
-- WHO DECIDES
-- -----------
-- A person, not a schedule. Retrying is a judgement that the cause was transient,
-- and it is written down: the reason is required and is audited alongside the
-- reason the encode failed in the first place, so the pair can be read later
-- without guessing which one explains what.
--
-- WHY A SECOND FUNCTION RECORDS THE MEASUREMENTS
-- -----------------------------------------------
-- A `pending` row carries the measurements of the encode that opened it. When a
-- crashed run's row is recovered — or a failed one is retried — the worker encodes
-- again, and the new file is not necessarily the same size as the old one. Serving
-- it from a row that records the previous attempt's byte count would put a wrong
-- number in the quality picker and a wrong ordering in
-- `fetchPlayableRenditions()`, which sorts by `byte_size`. So the recovered path
-- re-records what it measured, through a writer that only works while the row is
-- still `pending`: an `available` row's measurements are history, and a `failed`
-- row is waiting for a person.

-- ---------------------------------------------------------------------------
-- Retry
-- ---------------------------------------------------------------------------

create or replace function public.retry_media_rendition(
  p_rendition_id uuid,
  p_reason       text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor      uuid := public.current_user_id();
  v_status     text;
  v_asset      uuid;
  v_profile    text;
  v_old_reason text;
  v_master     text;
  v_tombstoned timestamptz;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff may retry a rendition'
      using errcode = 'insufficient_privilege';
  end if;

  -- Required, like every other reversal in this schema. "Try again" is not a
  -- reason, and a retry with no reason is indistinguishable from a machine
  -- looping on a file that will never encode.
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'a retry needs a written reason'
      using errcode = 'invalid_parameter_value';
  end if;

  select r.status, r.asset_id, r.profile, r.failure_reason
    into v_status, v_asset, v_profile, v_old_reason
    from public.media_renditions r
   where r.id = p_rendition_id
     for update;

  if not found then
    raise exception 'no rendition %', p_rendition_id
      using errcode = 'no_data_found';
  end if;

  if v_status <> 'failed' then
    raise exception 'a rendition that is % is not waiting for a retry', v_status
      using errcode = 'check_violation';
  end if;

  -- The master has to be servable, or the retry cannot succeed: register refuses
  -- to encode from anything but an available master, and the worker would fail
  -- the same way twice. Say which is wrong rather than let somebody retry the
  -- rendition of a file that is held for review.
  select ma.status, ma.deleted_at into v_master, v_tombstoned
    from public.media_assets ma
   where ma.id = v_asset
     for update;

  if not found or v_tombstoned is not null then
    raise exception 'the master this rendition was encoded from has been withdrawn'
      using errcode = 'check_violation';
  end if;

  if v_master <> 'available' then
    raise exception 'the master is %, so there is nothing to encode from yet', v_master
      using errcode = 'check_violation';
  end if;

  -- Same row, same id, same derived key: the object key follows the asset and the
  -- master's mime slug, so a retry that made a new row would make a new key for
  -- the same bytes and leave the old object orphaned in the bucket.
  update public.media_renditions
     set status = 'pending',
         failure_reason = null
   where id = p_rendition_id;

  -- Both reasons, because they answer different questions: why it failed, and why
  -- somebody believed a second attempt would work.
  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'media.rendition_retried', 'media_rendition', p_rendition_id,
          jsonb_build_object(
            'asset_id', v_asset,
            'profile', v_profile,
            'reason', btrim(p_reason),
            'failed_because', v_old_reason));

  return true;
end;
$$;

comment on function public.retry_media_rendition(uuid, text) is
  'Staff-only. Moves a failed rendition back to pending so the worker will encode it again, keeping the same row and the same derived object key. Needs a written reason, refuses unless the master is still available, and records both the retry reason and the reason it had failed.';

revoke all on function public.retry_media_rendition(uuid, text) from public;
revoke all on function public.retry_media_rendition(uuid, text) from anon;
grant execute on function public.retry_media_rendition(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Recording what an encode actually produced
-- ---------------------------------------------------------------------------

create or replace function public.record_media_rendition_encode(
  p_rendition_id     uuid,
  p_mime_type        text,
  p_byte_size        bigint,
  p_width            integer default null,
  p_height           integer default null,
  p_bitrate_kbps     integer default null,
  p_duration_seconds integer default null,
  p_checksum         text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_status text;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff may record a rendition encode'
      using errcode = 'insufficient_privilege';
  end if;

  -- The same shape checks register_media_rendition() makes, because a recorded
  -- measurement that could not have been registered is a measurement nobody can
  -- trust when the player sorts by it.
  if coalesce(btrim(p_mime_type), '') = '' then
    raise exception 'a rendition needs a type'
      using errcode = 'invalid_parameter_value';
  end if;

  if p_byte_size is null or p_byte_size < 0 then
    raise exception 'a rendition needs a size in bytes'
      using errcode = 'invalid_parameter_value';
  end if;

  if (p_width is null) <> (p_height is null) then
    raise exception 'a rendition has both dimensions or neither'
      using errcode = 'invalid_parameter_value';
  end if;

  if p_checksum is not null and p_checksum !~ '^[a-f0-9]{64}$' then
    raise exception 'the checksum must be a 64-character lowercase hex SHA-256 digest'
      using errcode = 'invalid_parameter_value';
  end if;

  select status into v_status
    from public.media_renditions
   where id = p_rendition_id
     for update;

  if not found then
    raise exception 'no rendition %', p_rendition_id
      using errcode = 'no_data_found';
  end if;

  -- Pending only. An available row is being served, so its measurements are the
  -- record of the object a learner is watching; a failed row is waiting for a
  -- person to decide, and re-measuring it would look like a retry that nobody
  -- authorised.
  if v_status <> 'pending' then
    raise exception 'the measurements of a rendition that is % are history', v_status
      using errcode = 'check_violation';
  end if;

  update public.media_renditions
     set mime_type        = btrim(p_mime_type),
         byte_size        = p_byte_size,
         width            = p_width,
         height           = p_height,
         bitrate_kbps     = p_bitrate_kbps,
         duration_seconds = p_duration_seconds,
         checksum         = lower(p_checksum)
   where id = p_rendition_id;

  -- No audit event: register and confirm write none either, and this changes
  -- nothing a learner can reach. A row that is pending is not servable.
  return true;
end;
$$;

comment on function public.record_media_rendition_encode(uuid,text,bigint,integer,integer,integer,integer,text) is
  'Staff-only. Re-records what an encode produced into a rendition that is still pending, so a recovered or retried row carries the measurements of the bytes actually in the bucket rather than a previous attempt''s. Refuses an available or failed row.';

revoke all on function public.record_media_rendition_encode(uuid,text,bigint,integer,integer,integer,integer,text) from public;
revoke all on function public.record_media_rendition_encode(uuid,text,bigint,integer,integer,integer,integer,text) from anon;
grant execute on function public.record_media_rendition_encode(uuid,text,bigint,integer,integer,integer,integer,text) to authenticated;

-- ---------------------------------------------------------------------------
-- The worker's own note, corrected
-- ---------------------------------------------------------------------------
-- `register_media_rendition()`'s comment said the transcode worker did not exist.
-- It does, and it now has a retry path, so the comment is corrected here rather
-- than left to describe a state of the repository that ended two units ago.

comment on function public.register_media_rendition(uuid,text,text,bigint,integer,integer,integer,integer,text) is
  'Staff-only. Opens a pending rendition of an available master and derives its bucket and object key from the asset and the master''s own mime slug. Called by the transcode worker after it has encoded and measured, so the row opens with the real numbers; one row per (asset, profile), and a failed one is reopened by retry_media_rendition(), never by a second register.';
