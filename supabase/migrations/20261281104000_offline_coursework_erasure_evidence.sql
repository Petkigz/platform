-- A saved-lesson record is evidence of a possible device copy, not proof that
-- bytes were saved, remain, or were removed. Preserve that evidence before a
-- child purge deletes its offline rows. Historical copies without surviving
-- records remain unknowable. Neither the database nor an acknowledgement can
-- delete or verify bytes on an external device.
alter table public.coursework_erasure_review_assets
  add column offline_copy_recorded boolean not null default false,
  add column offline_copy_reviewed_at timestamptz;

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
      join public.coursework_retention_holds h on h.asset_id=od.media_asset_id and h.closed_at is null
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
    ) or (exists(select 1 from public.offline_downloads od where od.learner_profile_id=p_learner_id and od.media_asset_id=ma.id)
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
      exists(select 1 from public.offline_downloads od where od.media_asset_id=ma.id)
    from public.media_assets ma where ma.id=any(v_assets) and (
      ma.purpose<>'coursework' or exists(select 1 from public.offline_downloads od where od.media_asset_id=ma.id) or exists(select 1 from public.coursework_erasure_review_assets prior where prior.asset_id=ma.id) or exists(select 1 from public.lesson_resources lr where lr.media_asset_id=ma.id) or exists (
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
       where od.media_asset_id=ma.id and (lp.family_id=any(coalesce(v_families,'{}'::uuid[])) or lp.linked_user_id=v_actor))
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
  select exists(select 1 from public.coursework_erasure_review_assets where asset_id=p_asset_id)
      or exists(select 1 from public.lesson_resources where media_asset_id=p_asset_id)
      or exists(select 1 from public.offline_downloads where media_asset_id=p_asset_id)
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
      exists(select 1 from public.offline_downloads od where od.media_asset_id=ma.id)
      or exists(select 1 from public.coursework_erasure_review_assets r where r.asset_id=ma.id and r.offline_copy_recorded and r.offline_copy_reviewed_at is null)
      or exists(select 1 from public.media_assets other where other.id<>ma.id
             and other.master_bucket=ma.master_bucket and other.master_key=ma.master_key)
      or exists(select 1 from public.media_renditions r where r.asset_id=ma.id
                or (r.bucket=ma.master_bucket and r.object_key=ma.master_key))
    )
  );
$$;

-- Versioned owner page retains the older RPC contract for deployed clients.
create function public.coursework_erasure_review_with_offline_page(p_after_asset uuid default null,p_after_learner uuid default null,p_limit integer default 51)
returns table(asset_id uuid,learner_id uuid,display_name text,reason text,recorded_at timestamptz,offline_copy_recorded boolean,offline_copy_reviewed_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  if not public.coursework_active_actor() then raise exception 'coursework:not_allowed' using errcode='insufficient_privilege'; end if;
  if p_limit is null or p_limit<1 or p_limit>100 or ((p_after_asset is null)<>(p_after_learner is null)) then
    raise exception 'invalid erasure review page' using errcode='invalid_parameter_value'; end if;
  return query select r.asset_id,r.learner_id,ma.display_name,r.reason,r.recorded_at,r.offline_copy_recorded,r.offline_copy_reviewed_at
    from public.coursework_erasure_review_assets r join public.media_assets ma on ma.id=r.asset_id
   where p_after_asset is null or (r.asset_id,r.learner_id)>(p_after_asset,p_after_learner)
   order by r.asset_id,r.learner_id limit p_limit;
end;
$$;
revoke all on function public.coursework_erasure_review_with_offline_page(uuid,uuid,integer) from public,anon;
grant execute on function public.coursework_erasure_review_with_offline_page(uuid,uuid,integer) to authenticated;

-- Acknowledgement records the uncertainty, not deletion or resolution of any
-- device copy. Surviving offline rows continue to block routine cleanup.
create function public.acknowledge_coursework_offline_evidence(p_asset_id uuid,p_learner_id uuid,p_note text,p_confirm text)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_changed integer;
begin
  perform public.lock_coursework_erasure_review_owner();
  if p_confirm is distinct from 'I understand device copies cannot be verified or removed here'
    or length(trim(coalesce(p_note,''))) not between 3 and 1000 then
    raise exception 'confirm the limits and give a review note' using errcode='invalid_parameter_value'; end if;
  perform 1 from public.media_assets where id=p_asset_id for update;
  update public.coursework_erasure_review_assets set offline_copy_reviewed_at=now()
    where asset_id=p_asset_id and learner_id=p_learner_id and offline_copy_recorded and offline_copy_reviewed_at is null;
  get diagnostics v_changed=row_count;
  if v_changed=1 then
    insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
      values(public.current_user_id(),'coursework.offline_evidence_acknowledged','media_asset',p_asset_id,
       jsonb_build_object('learnerId',p_learner_id,'note',trim(p_note),'deviceDeletionVerified',false));
  end if;
  return v_changed=1;
end;
$$;
revoke all on function public.acknowledge_coursework_offline_evidence(uuid,uuid,text,text) from public,anon;
grant execute on function public.acknowledge_coursework_offline_evidence(uuid,uuid,text,text) to authenticated;

-- List surviving offline booking evidence even where there is no erasure entry.
create function public.coursework_offline_evidence_page(p_after uuid default null,p_limit integer default 51)
returns table(asset_id uuid,display_name text,asset_status text,recorded_saves bigint,unreviewed_erasure boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  if not public.coursework_active_actor() then raise exception 'coursework:not_allowed' using errcode='insufficient_privilege'; end if;
  if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'invalid offline evidence page' using errcode='invalid_parameter_value'; end if;
  return query select ma.id,ma.display_name,ma.status::text,
    (select count(*) from public.offline_downloads od where od.media_asset_id=ma.id),
    exists(select 1 from public.coursework_erasure_review_assets r where r.asset_id=ma.id and r.offline_copy_recorded and r.offline_copy_reviewed_at is null)
    from public.media_assets ma
   where (p_after is null or ma.id>p_after)
     and (ma.purpose='coursework' or exists(select 1 from public.legacy_coursework_provenance p where p.asset_id=ma.id))
     and (exists(select 1 from public.offline_downloads od where od.media_asset_id=ma.id)
       or exists(select 1 from public.coursework_erasure_review_assets r where r.asset_id=ma.id and r.offline_copy_recorded))
   order by ma.id limit p_limit;
end;
$$;
revoke all on function public.coursework_offline_evidence_page(uuid,integer) from public,anon;
grant execute on function public.coursework_offline_evidence_page(uuid,integer) to authenticated;
