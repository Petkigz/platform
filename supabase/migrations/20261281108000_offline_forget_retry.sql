-- A response can be lost after the server has marked a save removed. Allow the
-- same learner or family to retry without treating the previous write as failure.
create or replace function public.forget_offline_lesson(p_download_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=public.current_user_id(); v_row public.offline_downloads; v_already boolean;
begin
  if v_actor is null then raise exception 'sign in to remove a saved lesson' using errcode='insufficient_privilege'; end if;
  select od.* into v_row from public.offline_downloads od join public.offline_devices d on d.id=od.device_id
   where od.id=p_download_id and (exists(select 1 from public.learner_profiles lp where lp.id=d.learner_profile_id and lp.linked_user_id=v_actor)
     or public.is_learner_family_member(d.learner_profile_id)) for update of od;
  if not found then raise exception 'that saved lesson is not on this account' using errcode='no_data_found'; end if;
  v_already:=v_row.removed_at is not null;
  if not v_already then update public.offline_downloads set removed_at=now() where id=p_download_id; end if;
  return jsonb_build_object('removed',true,'downloadId',v_row.id,'alreadyRemoved',v_already);
end;
$$;
