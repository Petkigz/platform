-- An unfinished upload stops being invisible.
--
-- THE GAP
-- -------
-- A multipart upload is opened against a key and its parts are stored as they
-- arrive, but the object does not exist until the upload is completed. So an
-- upload nobody finished — a tab closed at part 300 of 512, a browser that ran
-- out of memory, a teacher who gave up — leaves bytes in the bucket that no row
-- in this schema mentions. They are billed as storage, they cannot be served,
-- and nothing in the platform can find them: `media_assets` records the file that
-- was declared, not the transfer that stalled halfway through it.
--
-- Storage's own lifecycle deletes an incomplete multipart upload after seven
-- days, so the bytes are not permanent. Seven days of paying for a transfer
-- nobody is going to finish is still seven days, and the person who could decide
-- to end it early had no way to see it, let alone a way to record that they did.
--
-- WHY THE DECISION IS RECORDED IN SQL AND THE DELETION IS NOT
-- -----------------------------------------------------------
-- The upload id lives in storage, not here, so the pairing of a key with an
-- unfinished upload is read from storage's own listing and cannot be verified
-- against a table. What SQL can do is record that a named member of staff decided
-- to abandon a named upload of a named asset, with a reason, before anything is
-- deleted — the same shape as every other reversal here: `retry_media_rendition()`
-- and `delete_media_asset()` both require a written reason and both audit it.
--
-- The order matters and is deliberate. Recording first means the audit trail
-- never claims a deletion that was refused: if storage answers 403 or is
-- unreachable, the caller is told, the reason stands as the record of the
-- decision, and storage's seven-day lifecycle finishes the job anyway. The
-- alternative — delete, then record — would leave a deletion with no audit entry
-- whenever the write failed, which is the one gap an audit trail may not have.
--
-- The asset row is not touched. An unfinished upload says nothing about the
-- asset: it may still be `pending` and about to be resumed by the teacher who
-- owns it (the resume path reads the parts storage already holds), or it may be
-- `available` because a later attempt succeeded and this is the leftover of an
-- earlier one. Quarantining or withdrawing here would be a decision about the
-- file dressed up as a decision about the bytes, and `delete_media_asset()`
-- already exists for that decision.

create or replace function public.abandon_media_upload(
  p_asset_id  uuid,
  p_upload_id text,
  p_reason    text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_bucket text;
  v_key    text;
  v_status text;
  v_size   bigint;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff may abandon an unfinished upload'
      using errcode = 'insufficient_privilege';
  end if;

  -- Required, like every other reversal in this schema. "Cleaning up" is not a
  -- reason; what is worth reading later is why somebody decided these bytes were
  -- not going to arrive.
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'abandoning an unfinished upload needs a written reason'
      using errcode = 'invalid_parameter_value';
  end if;

  if coalesce(btrim(p_upload_id), '') = '' then
    raise exception 'an unfinished upload needs the id storage gave it'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Storage's ids are short. This is not a validation of their format, which is
  -- storage's business; it stops a request body from being recorded verbatim
  -- into the audit trail.
  if length(btrim(p_upload_id)) > 512 then
    raise exception 'that is not an upload id storage issued'
      using errcode = 'invalid_parameter_value';
  end if;

  -- No row lock: nothing here changes the asset, and locking it would hold up a
  -- teacher's resume or a staff confirmation for the duration of a cleanup.
  select ma.master_bucket, ma.master_key, ma.status, ma.byte_size
    into v_bucket, v_key, v_status, v_size
    from public.media_assets ma
   where ma.id = p_asset_id;

  if not found then
    raise exception 'no media asset %', p_asset_id
      using errcode = 'no_data_found';
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'media.upload_abandoned', 'media_asset', p_asset_id,
          jsonb_build_object(
            'upload_id', btrim(p_upload_id),
            'master_bucket', v_bucket,
            'master_key', v_key,
            'asset_status', v_status,
            'declared_byte_size', v_size,
            'reason', btrim(p_reason)));

  return true;
end;
$$;

comment on function public.abandon_media_upload(uuid, text, text) is
  'Staff-only. Records the decision to abandon an unfinished multipart upload of an asset, with a written reason, before the caller asks storage to delete the parts. Touches no row: an unfinished upload says nothing about the asset, which may still be waiting to be resumed. Storage also deletes an incomplete upload on its own lifecycle after seven days, so this is the early ending of something that was already going to end.';

revoke all on function public.abandon_media_upload(uuid, text, text) from public;
revoke all on function public.abandon_media_upload(uuid, text, text) from anon;
grant execute on function public.abandon_media_upload(uuid, text, text) to authenticated;
