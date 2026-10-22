-- ---------------------------------------------------------------------------
-- How much a teacher may upload: 50 GB of masters (decided 2026-10-22).
--
-- `platform.cost_controls` has been registered since the flag table was written
-- and its own note says what was missing: "**Nothing exists.** Unlimited teacher
-- uploads is how $250/month becomes $3,000". Per-file limits exist (an 8 GiB
-- ceiling, multipart above 32 MiB); nothing limited the total, so one teacher
-- with a camera and a fast connection could commit the platform to a storage
-- bill nobody chose.
--
-- Counted on **master bytes**, not on what is stored. The rendition ladder —
-- 1080p, 720p, 480p, 360p plus audio — stores roughly 2.1 times the master and is
-- the platform's choice, not the teacher's, so charging a teacher for copies they
-- never asked for would make the quota a surprise. The cost is still the stored
-- figure: 50 GB of masters is about 107 GB in R2, roughly $1.60 per teacher per
-- month at full utilisation, and the costing document's figures assume far less
-- than full utilisation.
--
-- Quarantined and pending masters count. A file held for review is still bytes in
-- a bucket, and a quota that could be dodged by uploading something that gets
-- quarantined would be no quota at all. A soft-deleted master does not count:
-- D7 withdrawal is what "I no longer store this" means.
--
-- ENFORCEMENT POINT. At initiate — a presigned PUT or a multipart upload — because
-- that is where a teacher can still be told, rather than at the end of a transfer
-- that already happened. The check is `media_upload_allowance()`, which the routes
-- call before they sign anything; it returns numbers rather than raising, so the
-- route can refuse with a sentence that names the space left instead of an error
-- code. `assert_media_upload_allowed()` is not a second implementation — it is the
-- same function, for callers that prefer an exception.
--
-- OFF BY DEFAULT. `platform.cost_controls` ships false, so until an admin turns it
-- on the allowance reports `enforced: false, allowed: true` and nothing changes.
-- That is the "build everything, enable it from the dashboard" rule: the rule
-- exists, the number exists, and switching it on is a decision rather than a
-- deploy.
-- ---------------------------------------------------------------------------

insert into public.platform_settings
  (key, value_type, value_text, description, gate_type, preconditions, flag_group)
values
  ('media.upload_quota_gb_per_teacher', 'integer', '50',
   'Cumulative master bytes one uploader may store, in GiB. Chosen at 50 GB on 2026-10-22 — about a day of 1080p video, which stops one account consuming the whole storage budget while remaining invisible to almost every teacher. Enforced only while platform.cost_controls is on. Counts masters, not the renditions derived from them (the ladder stores about 2.1x the master and is the platform''s choice, not the teacher''s); quarantined and pending masters count, soft-deleted ones do not.',
   'admin', null, 'Learner features')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- What one uploader already stores: masters only, live only.
-- ---------------------------------------------------------------------------

create or replace function public.media_storage_used()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(ma.byte_size), 0)::bigint
    from public.media_assets ma
   where ma.uploaded_by = public.current_user_id()
     and ma.deleted_at is null
     and ma.status <> 'deleted';
$$;

revoke all on function public.media_storage_used() from public;
grant execute on function public.media_storage_used() to authenticated;

comment on function public.media_storage_used() is
  'Master bytes the caller is storing: media_assets.byte_size where they uploaded it, it is not soft-deleted, and its status is not deleted. Renditions are not counted — they are derived by the platform, not uploaded by the teacher.';

-- ---------------------------------------------------------------------------
-- The allowance, and whether one more upload fits inside it.
-- ---------------------------------------------------------------------------

create or replace function public.media_upload_allowance(p_declared_bytes bigint default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor     uuid := public.current_user_id();
  v_declared  bigint := greatest(coalesce(p_declared_bytes, 0), 0);
  v_enforced  boolean;
  v_gb        integer;
  v_quota     bigint;
  v_used      bigint;
begin
  if v_actor is null then
    raise exception 'media:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;

  v_used := public.media_storage_used();
  v_enforced := public.setting_bool('platform.cost_controls', false);

  if not v_enforced then
    -- Off is a legitimate state and must be visibly off, not a quota of zero
    -- that happens to pass. quotaBytes and remainingBytes are null on purpose:
    -- there is no number, and 0 would read as "no space left".
    return jsonb_build_object(
      'enforced', false,
      'allowed', true,
      'quotaBytes', null,
      'usedBytes', v_used::text,
      'remainingBytes', null,
      'declaredBytes', v_declared::text);
  end if;

  v_gb := public.setting_int('media.upload_quota_gb_per_teacher', 50);

  -- A quota below 1 GiB would block every upload and is far more likely to be a
  -- typo than a decision, so it is refused loudly rather than silently blocking
  -- (or silently allowing) every transfer.
  if v_gb < 1 then
    raise exception
      'media:quota_misconfigured (media.upload_quota_gb_per_teacher is %, which allows nothing)', v_gb
      using errcode = 'invalid_parameter_value';
  end if;

  v_quota := v_gb::bigint * 1024::bigint * 1024::bigint * 1024::bigint;

  -- Money and bytes are both exact: every figure is a decimal integer string, so
  -- nothing here becomes a JavaScript number on the way out.
  return jsonb_build_object(
    'enforced', true,
    'allowed', v_used + v_declared <= v_quota,
    'quotaBytes', v_quota::text,
    'usedBytes', v_used::text,
    'remainingBytes', greatest(v_quota - v_used, 0)::text,
    'declaredBytes', v_declared::text);
end;
$$;

revoke all on function public.media_upload_allowance(bigint) from public;
revoke all on function public.media_upload_allowance(bigint) from anon;
grant execute on function public.media_upload_allowance(bigint) to authenticated;

comment on function public.media_upload_allowance(bigint) is
  'Whether one more upload of p_declared_bytes fits inside the caller''s quota. Returns enforced/allowed plus exact byte counts as decimal strings; quotaBytes and remainingBytes are null when platform.cost_controls is off, because there is no number rather than a number of zero.';

-- ---------------------------------------------------------------------------
-- The same answer as an exception, for a caller that would rather not read it.
-- ---------------------------------------------------------------------------

create or replace function public.assert_media_upload_allowed(p_declared_bytes bigint default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_allowance jsonb := public.media_upload_allowance(p_declared_bytes);
begin
  if (v_allowance ->> 'allowed')::boolean is not true then
    -- The message carries the numbers, because "quota exceeded" without a figure
    -- is a dead end for the person reading it.
    raise exception
      'media:quota_exceeded (used % of % bytes, this upload is % bytes)',
      v_allowance ->> 'usedBytes', v_allowance ->> 'quotaBytes',
      v_allowance ->> 'declaredBytes'
      using errcode = 'check_violation';
  end if;
  return v_allowance;
end;
$$;

revoke all on function public.assert_media_upload_allowed(bigint) from public;
revoke all on function public.assert_media_upload_allowed(bigint) from anon;
grant execute on function public.assert_media_upload_allowed(bigint) to authenticated;

comment on function public.assert_media_upload_allowed(bigint) is
  'media_upload_allowance() as an exception: raises media:quota_exceeded with the byte figures when the upload would not fit. Not a second implementation.';
