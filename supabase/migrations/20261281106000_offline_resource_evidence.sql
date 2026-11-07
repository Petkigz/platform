-- A booking may be refreshed to a different lesson resource. Retain every
-- recorded association while the booking exists; it is evidence of a possible
-- copy, not proof that bytes were fetched or remain on a device.
create table public.offline_download_asset_history (
  download_id uuid not null references public.offline_downloads(id) on delete cascade,
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  first_recorded_at timestamptz not null default now(),
  primary key(download_id,asset_id)
);
create index offline_download_asset_history_asset_idx on public.offline_download_asset_history(asset_id);
alter table public.offline_download_asset_history enable row level security;
revoke all on public.offline_download_asset_history from public,anon,authenticated;
insert into public.offline_download_asset_history(download_id,asset_id,first_recorded_at)
  select id,media_asset_id,saved_at from public.offline_downloads where media_asset_id is not null
  on conflict do nothing;
-- This ungranted transaction scope skips the temporary first-resource booking
-- made inside the resource-specific wrapper. The selected asset is captured by
-- its subsequent update. An exception rolls the entire scope back.
create table public.offline_resource_booking_scope (transaction_id bigint primary key);
alter table public.offline_resource_booking_scope enable row level security;
revoke all on public.offline_resource_booking_scope from public,anon,authenticated;
create function public.capture_offline_asset_history()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.media_asset_id is not null and not exists(select 1 from public.offline_resource_booking_scope where transaction_id=txid_current()) then
    insert into public.offline_download_asset_history(download_id,asset_id)
      values(new.id,new.media_asset_id) on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.capture_offline_asset_history() from public,anon,authenticated;
create trigger offline_download_capture_asset after insert or update of media_asset_id on public.offline_downloads
  for each row execute function public.capture_offline_asset_history();

-- The existing entitlement, device and expiry checks remain authoritative.
-- Book the resource the browser actually requested, not merely the first one.
create function public.save_offline_lesson_for_resource(p_lesson_id uuid,p_resource_id uuid,p_device_key text,p_device_label text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb; v_asset public.media_assets;
begin
  insert into public.offline_resource_booking_scope(transaction_id) values(txid_current());
  v_result:=public.save_offline_lesson(p_lesson_id,p_device_key,p_device_label);
  delete from public.offline_resource_booking_scope where transaction_id=txid_current();
  if coalesce((v_result->>'saved')::boolean,false) is not true then return v_result; end if;
  select ma.* into v_asset from public.lesson_resources lr join public.media_assets ma on ma.id=lr.media_asset_id
   where lr.id=p_resource_id and lr.lesson_id=p_lesson_id for update of ma;
  if not found or v_asset.purpose<>'library' or v_asset.status<>'available' or v_asset.deleted_at is not null
     or exists(select 1 from public.legacy_coursework_provenance p where p.asset_id=v_asset.id)
     or exists(select 1 from public.coursework_upload_declarations d where d.asset_id=v_asset.id)
     or exists(select 1 from public.assignment_submission_assets a where a.media_asset_id=v_asset.id)
     or exists(select 1 from public.assignment_submission_revisions r where r.asset_ids @> jsonb_build_array(v_asset.id::text)) then
    raise exception 'this lesson resource cannot be saved until its media is reviewed' using errcode='check_violation'; end if;
  update public.offline_downloads set media_asset_id=v_asset.id where id=(v_result->>'downloadId')::uuid;
  if not found then raise exception 'the save could not be recorded' using errcode='check_violation'; end if;
  return jsonb_set(v_result,'{mediaAssetId}',to_jsonb(v_asset.id),true);
end;
$$;
revoke all on function public.save_offline_lesson_for_resource(uuid,uuid,text,text) from public,anon;
grant execute on function public.save_offline_lesson_for_resource(uuid,uuid,text,text) to authenticated;

-- A signed offline URL is issued only against a live booking for this exact
-- resource and an entitled learner belonging to this session, not merely a row
-- visible through privileged staff RLS. This checks a booking, not downloaded bytes.
create function public.offline_booking_matches_resource(p_download_id uuid,p_lesson_id uuid,p_resource_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.current_user_id() is not null and public.setting_bool('learning.offline',false)
    and public.may_download_lesson(p_lesson_id) and exists (
      select 1 from public.offline_downloads od
      join public.offline_devices d on d.id=od.device_id and d.learner_profile_id=od.learner_profile_id
      join public.learner_profiles lp on lp.id=od.learner_profile_id
      join public.lessons l on l.id=od.lesson_id
      join public.course_sections cs on cs.id=l.section_id
      join public.lesson_resources lr on lr.id=p_resource_id and lr.lesson_id=l.id and lr.media_asset_id=od.media_asset_id
      join public.media_assets ma on ma.id=lr.media_asset_id
      where od.id=p_download_id and od.lesson_id=p_lesson_id and od.removed_at is null and od.expires_at>now()
        and d.revoked_at is null and lp.deleted_at is null and lp.status='active'
        and (lp.linked_user_id=public.current_user_id() or public.is_learner_family_member(lp.id))
        and public.can_access_course_version(lp.id,cs.course_version_id)
        and exists(select 1 from public.entitlement_grants eg where eg.learner_profile_id=lp.id
          and eg.scope_type='feature' and eg.feature_code='offline_downloads' and eg.status='active' and eg.effective_from<=now())
        and ma.purpose='library' and ma.status='available' and ma.deleted_at is null
        and not exists(select 1 from public.legacy_coursework_provenance p where p.asset_id=ma.id)
        and not exists(select 1 from public.coursework_upload_declarations a where a.asset_id=ma.id)
        and not exists(select 1 from public.assignment_submission_assets a where a.media_asset_id=ma.id)
        and not exists(select 1 from public.assignment_submission_revisions r where r.asset_ids @> jsonb_build_array(ma.id::text))
    );
$$;
revoke all on function public.offline_booking_matches_resource(uuid,uuid,uuid) from public,anon;
grant execute on function public.offline_booking_matches_resource(uuid,uuid,uuid) to authenticated;

create or replace function public.learner_has_held_coursework(p_learner_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.assignment_submissions s
    join public.coursework_retention_holds h on h.closed_at is null
    where s.learner_profile_id=p_learner_id and (
      exists (select 1 from public.assignment_submission_assets a
               where a.submission_id=s.id and a.media_asset_id=h.asset_id)
      or exists (select 1 from public.coursework_upload_declarations d
                  where d.submission_id=s.id and d.asset_id=h.asset_id)
      or exists (select 1 from public.assignment_submission_revisions r
                  where r.submission_id=s.id and r.asset_ids @> jsonb_build_array(h.asset_id::text))
    )
  ) or exists(select 1 from public.offline_downloads od
      join public.coursework_retention_holds h on h.closed_at is null and (h.asset_id=od.media_asset_id or exists(select 1 from public.offline_download_asset_history oh where oh.download_id=od.id and oh.asset_id=h.asset_id))
      where od.learner_profile_id=p_learner_id);
$$;


create or replace function public.purge_learner_record_with_holds(p_learner_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_kind text; v_status text; v_deleted timestamptz;
  v_prior text := current_setting('app.child_coursework_erasure',true);
  v_media_transition text := current_setting('app.media_status_transition',true);
  v_result jsonb; v_assets uuid[]; v_review integer;
begin
  -- Serialize with record changes and with revision/attachment writes before
  -- locking assets. Hold writers take the same asset locks. Recheck afterwards.
  select learner_type,status,deleted_at into v_kind,v_status,v_deleted
    from public.learner_profiles where id=p_learner_id for update;
  perform s.id from public.assignment_submissions s
    where s.learner_profile_id=p_learner_id order by s.id for update;
  select coalesce(array_agg(ma.id order by ma.id),'{}'::uuid[]) into v_assets
    from public.media_assets ma where exists (
      select 1 from public.assignment_submissions s where s.learner_profile_id=p_learner_id and (
        exists (select 1 from public.assignment_submission_assets a where a.submission_id=s.id and a.media_asset_id=ma.id)
        or exists (select 1 from public.coursework_upload_declarations d where d.submission_id=s.id and d.asset_id=ma.id)
        or exists (select 1 from public.assignment_submission_revisions r where r.submission_id=s.id
                    and r.asset_ids @> jsonb_build_array(ma.id::text))
      )
    ) or (exists(select 1 from public.offline_downloads od where od.learner_profile_id=p_learner_id and (od.media_asset_id=ma.id or exists(select 1 from public.offline_download_asset_history oh where oh.download_id=od.id and oh.asset_id=ma.id)))
          and (ma.purpose='coursework' or exists(select 1 from public.legacy_coursework_provenance p where p.asset_id=ma.id)));
  perform ma.id from public.media_assets ma where ma.id=any(v_assets) order by ma.id for update;
  if public.learner_has_held_coursework(p_learner_id) then
    return jsonb_build_object('erased',false,'blockedByCourseworkHold',true);
  end if;
  -- Preserve the original validation and already-erased semantics. In particular,
  -- no snapshot is removed when this is not a child with a running clock.
  if v_kind is distinct from 'child' or v_deleted is null or v_status='erased' then
    return public.purge_learner_record_internal(p_learner_id);
  end if;

  insert into public.coursework_erasure_review_assets(asset_id,learner_id,reason,offline_copy_recorded)
    select ma.id,p_learner_id,
      case when ma.purpose<>'coursework' then 'legacy_library' else 'shared_context' end,
      exists(select 1 from public.offline_downloads od where od.media_asset_id=ma.id or exists(select 1 from public.offline_download_asset_history oh where oh.download_id=od.id and oh.asset_id=ma.id))
    from public.media_assets ma where ma.id=any(v_assets) and (
      ma.purpose<>'coursework' or exists(select 1 from public.coursework_detach_review_assets dr where dr.asset_id=ma.id) or exists(select 1 from public.offline_downloads od where od.media_asset_id=ma.id or exists(select 1 from public.offline_download_asset_history oh where oh.download_id=od.id and oh.asset_id=ma.id)) or exists(select 1 from public.coursework_erasure_review_assets prior where prior.asset_id=ma.id) or exists(select 1 from public.lesson_resources lr where lr.media_asset_id=ma.id) or exists (
        select 1 from public.assignment_submissions other
        where other.learner_profile_id<>p_learner_id and (
          exists(select 1 from public.assignment_submission_assets a where a.submission_id=other.id and a.media_asset_id=ma.id)
          or exists(select 1 from public.coursework_upload_declarations d where d.submission_id=other.id and d.asset_id=ma.id)
          or exists(select 1 from public.assignment_submission_revisions r where r.submission_id=other.id
                     and r.asset_ids @> jsonb_build_array(ma.id::text))
        )
      )
    ) on conflict (asset_id,learner_id) do update
      set offline_copy_recorded=public.coursework_erasure_review_assets.offline_copy_recorded or excluded.offline_copy_recorded,
          offline_copy_reviewed_at=case when excluded.offline_copy_recorded then null else public.coursework_erasure_review_assets.offline_copy_reviewed_at end;
  -- Transfer an older detach marker into the child-specific erasure register;
  -- leaving both would make each review action block the other indefinitely.
  delete from public.coursework_detach_review_assets d where d.asset_id=any(v_assets)
    and exists(select 1 from public.coursework_erasure_review_assets r where r.asset_id=d.asset_id and r.learner_id=p_learner_id);
  select count(*)::integer into v_review from public.coursework_erasure_review_assets
    where learner_id=p_learner_id;

  -- Queue exclusively attributable coursework bytes immediately. This is a
  -- tombstone and a deadline, not a verified deletion from object storage.
  perform set_config('app.media_status_transition','on',true);
  update public.media_assets ma
     set status='deleted', deleted_at=coalesce(ma.deleted_at,now()),
         purge_due_at=least(coalesce(ma.purge_due_at,now()),now())
   where ma.id=any(v_assets) and ma.purpose='coursework' and ma.purged_at is null
     and not exists (select 1 from public.coursework_erasure_review_assets x
                      where x.asset_id=ma.id);

  insert into public.child_revision_erasure_scope(transaction_id,learner_id)
    values(txid_current(),p_learner_id) on conflict do nothing;
  delete from public.assignment_submission_revisions r
   using public.assignment_submissions s
   where r.submission_id=s.id and s.learner_profile_id=p_learner_id;
  perform set_config('app.child_coursework_erasure','on',true);
  v_result := public.purge_learner_record_internal(p_learner_id);
  delete from public.child_revision_erasure_scope
   where transaction_id=txid_current() and learner_id=p_learner_id;
  perform set_config('app.child_coursework_erasure',coalesce(v_prior,''),true);
  perform set_config('app.media_status_transition',coalesce(v_media_transition,''),true);
  if v_review>0 then v_result := jsonb_set(v_result,'{nothingLeft}','false'::jsonb,true); end if;
  return v_result || jsonb_build_object('courseworkAssetsNeedingReview',v_review);
end;
$$;


create or replace function public.erase_my_account_internal(p_confirm text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=public.current_user_id(); v_name text; v_status text; v_deleted timestamptz;
  v_families uuid[];
begin
  -- The public wrapper already locks this profile. Preserve its validation,
  -- its idempotent response and the original error for an incorrect name.
  select display_name,account_status,deleted_at into v_name,v_status,v_deleted
    from public.user_profiles where user_id=v_actor for update;
  if not found or v_deleted is not null or v_status='closed'
     or btrim(coalesce(p_confirm,''))<>btrim(v_name) then
    return public.erase_my_account_before_revision_hold_guard(p_confirm);
  end if;
  select array_agg(distinct family_id) into v_families from public.family_memberships
   where user_id=v_actor and status='active';
  perform f.id from public.families f where f.id=any(coalesce(v_families,'{}'::uuid[])) order by f.id for update;
  perform m.id from public.family_memberships m where m.family_id=any(coalesce(v_families,'{}'::uuid[])) order by m.id for update;
  perform lp.id from public.learner_profiles lp
   where lp.family_id=any(coalesce(v_families,'{}'::uuid[])) or lp.linked_user_id=v_actor order by lp.id for update;
  -- Lock submission rows before calculating the asset set. Writers cannot add a
  -- child revision or attachment during the check. Holds take asset locks; the
  -- final predicate is deliberately a new statement after acquiring them.
  perform s.id from public.assignment_submissions s join public.learner_profiles lp on lp.id=s.learner_profile_id
   where lp.family_id=any(coalesce(v_families,'{}'::uuid[])) or lp.linked_user_id=v_actor order by s.id for update of s;
  perform ma.id from public.media_assets ma where exists (
    select 1 from public.assignment_submissions s join public.learner_profiles lp on lp.id=s.learner_profile_id
    where (lp.family_id=any(coalesce(v_families,'{}'::uuid[])) or lp.linked_user_id=v_actor) and (
      exists(select 1 from public.assignment_submission_assets a where a.submission_id=s.id and a.media_asset_id=ma.id)
      or exists(select 1 from public.coursework_upload_declarations d where d.submission_id=s.id and d.asset_id=ma.id)
      or exists(select 1 from public.assignment_submission_revisions r where r.submission_id=s.id and r.asset_ids @> jsonb_build_array(ma.id::text))
    )
  ) or exists(select 1 from public.offline_downloads od join public.learner_profiles lp on lp.id=od.learner_profile_id
       where (od.media_asset_id=ma.id or exists(select 1 from public.offline_download_asset_history oh where oh.download_id=od.id and oh.asset_id=ma.id)) and (lp.family_id=any(coalesce(v_families,'{}'::uuid[])) or lp.linked_user_id=v_actor))
  order by ma.id for update;
  if exists(select 1 from public.learner_profiles lp
    where lp.deleted_at is null and lp.learner_type='child'
      and (lp.linked_user_id=v_actor or (
        lp.family_id=any(coalesce(v_families,'{}'::uuid[])) and not exists (
          select 1 from public.family_memberships m where m.family_id=lp.family_id
            and m.user_id<>v_actor and m.status='active')))
      and public.learner_has_held_coursework(lp.id)
  ) then
    raise exception 'this account is linked to a separate child login or held coursework that needs individual review; contact privacy@ayahspring.com to close your account'
      using errcode='check_violation';
  end if;
  return public.erase_my_account_before_revision_hold_guard(p_confirm);
end;
$$;
revoke all on function public.erase_my_account_internal(text) from public,anon,authenticated;


create or replace function public.coursework_asset_needs_individual_review(p_asset_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.coursework_detach_review_assets where asset_id=p_asset_id)
      or exists(select 1 from public.coursework_erasure_review_assets where asset_id=p_asset_id)
      or exists(select 1 from public.lesson_resources where media_asset_id=p_asset_id)
      or (exists(select 1 from public.offline_downloads where media_asset_id=p_asset_id) or exists(select 1 from public.offline_download_asset_history where asset_id=p_asset_id))
      or (select count(distinct s.id)>1 from public.assignment_submissions s
          where exists(select 1 from public.assignment_submission_assets a where a.submission_id=s.id and a.media_asset_id=p_asset_id)
             or exists(select 1 from public.coursework_upload_declarations d where d.submission_id=s.id and d.asset_id=p_asset_id)
             or exists(select 1 from public.assignment_submission_revisions r where r.submission_id=s.id
                       and r.asset_ids @> jsonb_build_array(p_asset_id::text)));
$$;



create or replace function public.coursework_storage_needs_individual_review(p_asset_id uuid)
returns boolean language sql volatile security definer set search_path=public as $$
  select exists (
    select 1 from public.media_assets ma where ma.id=p_asset_id and (
      exists(select 1 from public.coursework_detach_review_assets x where x.asset_id=ma.id)
      or exists(select 1 from public.offline_downloads od where od.media_asset_id=ma.id or exists(select 1 from public.offline_download_asset_history oh where oh.download_id=od.id and oh.asset_id=ma.id))
      or exists(select 1 from public.coursework_erasure_review_assets r where r.asset_id=ma.id and r.offline_copy_recorded and r.offline_copy_reviewed_at is null)
      or exists(select 1 from public.media_assets other where other.id<>ma.id
             and other.master_bucket=ma.master_bucket and other.master_key=ma.master_key)
      or exists(select 1 from public.media_renditions r where r.asset_id=ma.id
                or (r.bucket=ma.master_bucket and r.object_key=ma.master_key))
    )
  );
$$;



create or replace function public.retire_coursework_file_on_detach()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if exists(select 1 from public.assignment_submissions where id=old.submission_id)
    or exists(select 1 from public.coursework_erasure_review_assets r where r.asset_id=old.media_asset_id)
  then return old; end if;
  -- The parent is gone, but the same historical file can still serve another
  -- submission, a lesson, an offline booking or a prior child-erasure review.
  -- Lock before the fresh checks, as the other writers lock this asset too.
  perform 1 from public.media_assets where id=old.media_asset_id for update;
  if not exists(select 1 from public.child_revision_erasure_scope s where s.transaction_id=txid_current())
     and exists(select 1 from public.media_assets ma where ma.id=old.media_asset_id and ma.purpose='coursework')
     and (exists(select 1 from public.assignment_submission_assets a where a.media_asset_id=old.media_asset_id and a.submission_id<>old.submission_id)
       or exists(select 1 from public.coursework_upload_declarations d where d.asset_id=old.media_asset_id and d.submission_id<>old.submission_id)
       or exists(select 1 from public.assignment_submission_revisions r where r.submission_id<>old.submission_id and r.asset_ids @> jsonb_build_array(old.media_asset_id::text))
       or exists(select 1 from public.lesson_resources lr where lr.media_asset_id=old.media_asset_id)
       or (exists(select 1 from public.offline_downloads od where od.media_asset_id=old.media_asset_id) or exists(select 1 from public.offline_download_asset_history oh where oh.asset_id=old.media_asset_id))) then
    insert into public.coursework_detach_review_assets(asset_id) values(old.media_asset_id) on conflict do nothing;
    return old;
  end if;
  perform set_config('app.media_status_transition','on',true);
  update public.media_assets set status='deleted',deleted_at=coalesce(deleted_at,now()),
    purge_due_at=case
      when exists(select 1 from public.coursework_retention_holds h where h.asset_id=old.media_asset_id and h.closed_at is null) then null
      when current_setting('app.child_coursework_erasure',true)='on' then now()
      else coalesce(purge_due_at,now()+interval '30 days') end
    where id=old.media_asset_id and purpose='coursework' and deleted_at is null;
  return old;
end;
$$;



create or replace function public.coursework_detach_review_page(p_after uuid default null,p_limit integer default 51)
returns table(asset_id uuid,display_name text,asset_status text,recorded_at timestamptz,
  submission_use boolean,lesson_use boolean,offline_evidence boolean,erasure_review boolean,held boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  if not public.coursework_active_actor() then raise exception 'coursework:not_allowed' using errcode='insufficient_privilege'; end if;
  if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'invalid detached review page' using errcode='invalid_parameter_value'; end if;
  return query select ma.id,ma.display_name,ma.status::text,x.recorded_at,
    (exists(select 1 from public.assignment_submission_assets a where a.media_asset_id=ma.id)
     or exists(select 1 from public.coursework_upload_declarations d where d.asset_id=ma.id)
     or exists(select 1 from public.assignment_submission_revisions r where r.asset_ids @> jsonb_build_array(ma.id::text))),
    exists(select 1 from public.lesson_resources lr where lr.media_asset_id=ma.id),
    exists(select 1 from public.offline_downloads od where od.media_asset_id=ma.id or exists(select 1 from public.offline_download_asset_history oh where oh.download_id=od.id and oh.asset_id=ma.id)),
    exists(select 1 from public.coursework_erasure_review_assets e where e.asset_id=ma.id),
    exists(select 1 from public.coursework_retention_holds h where h.asset_id=ma.id and h.closed_at is null)
    from public.coursework_detach_review_assets x join public.media_assets ma on ma.id=x.asset_id
   where p_after is null or ma.id>p_after order by ma.id limit p_limit;
end;
$$;
revoke all on function public.coursework_detach_review_page(uuid,integer) from public,anon;
grant execute on function public.coursework_detach_review_page(uuid,integer) to authenticated;


create or replace function public.coursework_offline_evidence_page(p_after uuid default null,p_limit integer default 51)
returns table(asset_id uuid,display_name text,asset_status text,recorded_saves bigint,unreviewed_erasure boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  if not public.coursework_active_actor() then raise exception 'coursework:not_allowed' using errcode='insufficient_privilege'; end if;
  if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'invalid offline evidence page' using errcode='invalid_parameter_value'; end if;
  return query select ma.id,ma.display_name,ma.status::text,
    (select count(*) from public.offline_downloads od where od.media_asset_id=ma.id or exists(select 1 from public.offline_download_asset_history oh where oh.download_id=od.id and oh.asset_id=ma.id)),
    exists(select 1 from public.coursework_erasure_review_assets r where r.asset_id=ma.id and r.offline_copy_recorded and r.offline_copy_reviewed_at is null)
    from public.media_assets ma
   where (p_after is null or ma.id>p_after)
     and (ma.purpose='coursework' or exists(select 1 from public.legacy_coursework_provenance p where p.asset_id=ma.id))
     and (exists(select 1 from public.offline_downloads od where od.media_asset_id=ma.id or exists(select 1 from public.offline_download_asset_history oh where oh.download_id=od.id and oh.asset_id=ma.id))
       or exists(select 1 from public.coursework_erasure_review_assets r where r.asset_id=ma.id and r.offline_copy_recorded))
   order by ma.id limit p_limit;
end;
$$;
revoke all on function public.coursework_offline_evidence_page(uuid,integer) from public,anon;
grant execute on function public.coursework_offline_evidence_page(uuid,integer) to authenticated;
