-- Withdrawing an upload needs a written reason, like everything else that ends
-- access to something.
--
-- THE INCONSISTENCY
-- -----------------
-- quarantine_media_upload() has always required a reason and recorded it in the
-- audit detail. delete_media_asset() wrote '{}' — so the trail for a takedown
-- said who withdrew a master and when, but not why, and a rights complaint or a
-- safeguarding report six months later would have nothing to read.
--
-- That is backwards. Quarantining holds a file for review; withdrawing ends its
-- use. The more consequential of the two was the one that captured less.
--
-- Every comparable action in this schema already requires a reason: a refund
-- reversal, a failed rendition, a declined refund, a guardian rejection. This
-- makes the media path agree with them.
--
-- The old one-argument signature is dropped rather than replaced, because
-- adding a parameter to a plpgsql function creates an overload — and an
-- overload here would leave a way to withdraw a master without saying why,
-- which is the exact thing being closed.

drop function if exists public.delete_media_asset(uuid);

create or replace function public.delete_media_asset(
  p_asset_id uuid,
  p_reason   text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
begin
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to delete an upload'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required to withdraw an upload'
      using errcode = 'invalid_parameter_value';
  end if;

  -- The uploader may withdraw their own file. Staff may withdraw anyone's.
  if not (public.is_privileged(v_actor)
          or exists (select 1 from public.media_assets
                      where id = p_asset_id and uploaded_by = v_actor)) then
    raise exception 'you may only delete your own uploads'
      using errcode = 'insufficient_privilege';
  end if;

  perform set_config('app.media_status_transition', 'on', true);

  update public.media_assets
     set deleted_at = now(),
         status = 'deleted'
   where id = p_asset_id
     and deleted_at is null;

  if not found then
    return false;
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'media.upload_deleted', 'media_asset', p_asset_id,
          jsonb_build_object('reason', trim(p_reason)));

  return true;
end;
$$;

revoke all on function public.delete_media_asset(uuid, text) from public;
revoke all on function public.delete_media_asset(uuid, text) from anon;
grant execute on function public.delete_media_asset(uuid, text) to authenticated;

comment on function public.delete_media_asset(uuid, text) is
  'Soft delete per D7, with a written reason recorded in the governance audit trail. The master object survives; retention is a scheduled decision. The uploader may withdraw their own file; staff may withdraw anyone''s.';
