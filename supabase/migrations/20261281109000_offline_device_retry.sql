-- Let the same account safely retry a device removal after a lost response.
-- Revocation ends server bookings; it cannot erase copies or recalled keys on
-- a device that the server does not control.
create or replace function public.remove_offline_device(p_device_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=public.current_user_id(); v_row public.offline_devices; v_already boolean;
begin
  if v_actor is null then raise exception 'sign in to remove a device' using errcode='insufficient_privilege'; end if;
  select d.* into v_row from public.offline_devices d where d.id=p_device_id
    and (exists(select 1 from public.learner_profiles lp where lp.id=d.learner_profile_id and lp.linked_user_id=v_actor)
      or public.is_learner_family_member(d.learner_profile_id)) for update;
  if not found then raise exception 'that device is not on this account' using errcode='no_data_found'; end if;
  v_already:=v_row.revoked_at is not null;
  if not v_already then update public.offline_devices set revoked_at=now() where id=p_device_id; end if;
  update public.offline_downloads set removed_at=now() where device_id=p_device_id and removed_at is null;
  return jsonb_build_object('removed',true,'deviceId',v_row.id,'alreadyRemoved',v_already);
end;
$$;
