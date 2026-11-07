-- Preserve reliable evidence that a legacy library asset was used as coursework.
-- No object or lesson reference is modified. Evidence only covers rows that still
-- exist at migration time and later checked writes; older lost attribution cannot
-- be reconstructed. The asset ID remains personal data and requires cleanup when
-- the corresponding object and record are genuinely removed.
create table public.legacy_coursework_provenance (
  asset_id uuid primary key references public.media_assets(id) on delete cascade
);
alter table public.legacy_coursework_provenance enable row level security;
revoke all on public.legacy_coursework_provenance from public, anon, authenticated;

-- GIN supports membership checks without unnesting or trusting malformed IDs.
create index assignment_revision_asset_ids_gin on public.assignment_submission_revisions using gin (asset_ids jsonb_path_ops);

insert into public.legacy_coursework_provenance(asset_id)
select ma.id from public.media_assets ma
where ma.purpose = 'library' and (
  exists (select 1 from public.assignment_submission_assets a where a.media_asset_id=ma.id)
  or exists (select 1 from public.assignment_submission_revisions r where r.asset_ids @> jsonb_build_array(ma.id::text))
  or exists (select 1 from public.coursework_upload_declarations d where d.asset_id=ma.id)
);

create function public.capture_legacy_coursework_attachment()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.legacy_coursework_provenance(asset_id)
    select id from public.media_assets where id=new.media_asset_id and purpose='library'
    on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.capture_legacy_coursework_attachment() from public, anon, authenticated;
create trigger capture_legacy_coursework_attachment after insert or update of media_asset_id
  on public.assignment_submission_assets for each row execute function public.capture_legacy_coursework_attachment();

create function public.capture_legacy_coursework_revision()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.legacy_coursework_provenance(asset_id)
    select ma.id from jsonb_array_elements_text(
      case when jsonb_typeof(new.asset_ids)='array' then new.asset_ids else '[]'::jsonb end
    ) item(value)
    join public.media_assets ma on ma.id = case
      when item.value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then item.value::uuid else null end
    where ma.purpose='library' order by ma.id on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.capture_legacy_coursework_revision() from public, anon, authenticated;
create trigger capture_legacy_coursework_revision after insert on public.assignment_submission_revisions
  for each row execute function public.capture_legacy_coursework_revision();

create or replace function public.is_library_delivery_asset(p_asset_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.media_assets ma where ma.id=p_asset_id and ma.purpose='library'
    and not exists (select 1 from public.legacy_coursework_provenance h where h.asset_id=ma.id)
    and not exists (select 1 from public.coursework_upload_declarations d where d.asset_id=ma.id)
    and not exists (select 1 from public.assignment_submission_assets a where a.media_asset_id=ma.id));
$$;

create or replace function public.may_read_coursework_master(p_asset_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with contexts as (
    select d.submission_id from public.coursework_upload_declarations d where d.asset_id = p_asset_id
    union
    select a.submission_id from public.assignment_submission_assets a where a.media_asset_id = p_asset_id
    union
    select r.submission_id from public.assignment_submission_revisions r
     where r.asset_ids @> jsonb_build_array(p_asset_id::text)
  )
  select public.coursework_active_actor() and (
    (public.has_role(public.current_user_id(), 'platform_admin') and exists (
      select 1 from public.safeguarding_owner so
       where so.singleton and so.owner_user_id = public.current_user_id()
    ))
    or (
      -- Legacy files associated with different submissions are ambiguous: only
      -- the owner can open them until an operator has reviewed their history.
      (select count(*) from contexts) = 1
      and exists (
        select 1 from contexts c
        join public.assignment_submissions s on s.id = c.submission_id
        join public.learner_profiles lp on lp.id = s.learner_profile_id
        join public.course_assignments ca on ca.id = s.assignment_id
        join public.media_assets ma on ma.id = p_asset_id
        where (
          lp.linked_user_id = public.current_user_id()
          or exists (
            select 1 from public.guardian_relationships gr
             where gr.learner_profile_id = lp.id
               and gr.guardian_user_id = public.current_user_id()
               and gr.status = 'active' and gr.deleted_at is null
               and gr.verified_at is not null and gr.verified_at <= now() and gr.can_view_progress
               -- The owner's choice is verified guardian even if the general
               -- guardian verification switch has been turned off.
               and gr.consent_expires_at is not null and gr.consent_expires_at > now()
          )
          or (
            ca.created_by = public.current_user_id() and ma.status = 'available'
            and (exists (select 1 from public.assignment_submission_assets asa
                          where asa.media_asset_id = ma.id and asa.submission_id = s.id)
                 or exists (select 1 from public.assignment_submission_revisions r
                             where r.submission_id=s.id and r.asset_ids @> jsonb_build_array(ma.id::text)))
          )
        )
      )
    )
  );
$$;

create or replace function public.delete_media_asset(p_asset_id uuid, p_reason text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_purpose text; v_uploader uuid; v_actor uuid := public.current_user_id();
begin
  if v_actor is null then
    raise exception 'sign in to delete an upload' using errcode = 'insufficient_privilege';
  end if;
  -- Attachment and hold writers use the same asset lock. Inspect the current
  -- attachment state after obtaining it, rather than authorizing a stale row.
  select ma.purpose, ma.uploaded_by into v_purpose, v_uploader
    from public.media_assets ma where ma.id = p_asset_id for update;
  if v_purpose = 'coursework' or exists (select 1 from public.legacy_coursework_provenance h where h.asset_id=p_asset_id) or exists (select 1 from public.coursework_upload_declarations d where d.asset_id=p_asset_id) or exists (
    select 1 from public.assignment_submission_assets asa where asa.media_asset_id = p_asset_id
  ) then
    -- An unrelated caller gets the same result as for an unknown asset; a
    -- guessed UUID must not reveal that another learner handed in a file.
    if v_uploader is distinct from v_actor and not coalesce(public.may_watch_master(p_asset_id), false) then
      if public.is_privileged(v_actor) then return false; end if;
      raise exception 'you may only delete your own uploads' using errcode = 'insufficient_privilege';
    end if;
    raise exception 'coursework cannot be withdrawn through the media library; contact privacy@ayahspring.com for review'
      using errcode = 'insufficient_privilege';
  end if;
  return public.delete_media_asset_internal(p_asset_id, p_reason);
end;
$$;

create or replace function public.lesson_resource_library_only()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_purpose text;
begin
  if new.media_asset_id is null then return new; end if;
  select ma.purpose into v_purpose from public.media_assets ma
   where ma.id = new.media_asset_id for update;
  if v_purpose = 'coursework' or not public.is_library_delivery_asset(new.media_asset_id) then
    raise exception 'a file handed in as coursework cannot be taught from; upload it to the media library instead'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create or replace function public.capture_coursework_quarantine_state()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'quarantined' and old.status in ('pending','available')
     and not public.is_library_delivery_asset(old.id) then
    insert into public.coursework_quarantine_state(asset_id,previous_status,quarantined_at)
      values (old.id,old.status,now())
      on conflict (asset_id) do update set previous_status=excluded.previous_status,
                                            quarantined_at=excluded.quarantined_at;
  elsif old.status = 'quarantined' and new.status <> 'quarantined' then
    delete from public.coursework_quarantine_state where asset_id=old.id;
  end if;
  return new;
end;
$$;

create or replace function public.coursework_quarantine_queue(p_limit integer default 50, p_after uuid default null)
returns table(asset_id uuid, display_name text, previous_status text, quarantined_at timestamptz, recorded_reason text)
language plpgsql security definer set search_path = public as $$
begin
  perform public.require_coursework_retention_owner();
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'limit must be between 1 and 100' using errcode='invalid_parameter_value';
  end if;
  return query
    select ma.id, ma.display_name, cq.previous_status, cq.quarantined_at,
           (select e.detail->>'reason' from public.governance_audit_events e
             where e.target_type='media_asset' and e.target_id=ma.id and e.action='media.upload_quarantined'
             order by e.occurred_at desc, e.id desc limit 1)
      from public.media_assets ma
      left join public.coursework_quarantine_state cq on cq.asset_id=ma.id
     where ma.status='quarantined' and ma.deleted_at is null
       and not public.is_library_delivery_asset(ma.id)
       and (p_after is null or ma.id > p_after)
     order by ma.id limit p_limit;
end;
$$;

create or replace function public.release_coursework_quarantine(p_asset_id uuid, p_confirm text)
returns text language plpgsql security definer set search_path = public as $$
declare v_actor uuid := public.current_user_id(); v_asset public.media_assets;
        v_previous text; v_transition text := current_setting('app.media_status_transition',true);
begin
  perform public.require_coursework_retention_owner();
  -- Match the named-owner lifecycle lock used by account closure and transfer.
  perform 1 from public.user_profiles where user_id=v_actor for update;
  perform 1 from public.safeguarding_owner where singleton and owner_user_id=v_actor for share;
  perform ura.id from public.user_role_assignments ura
    join public.roles r on r.id=ura.role_id
   where ura.user_id=v_actor and r.code='platform_admin' for share of ura, r;
  -- Read again after waiting, using this volatile function's fresh statement
  -- snapshot rather than a stable helper's outer-statement snapshot.
  if not exists (
    select 1 from public.user_profiles p
    join public.safeguarding_owner so on so.singleton and so.owner_user_id=p.user_id
    join public.user_role_assignments ura on ura.user_id=p.user_id and ura.revoked_at is null
    join public.roles r on r.id=ura.role_id and r.code='platform_admin'
    where p.user_id=v_actor and p.account_status='active' and p.deleted_at is null
  ) then raise exception 'coursework:not_allowed' using errcode='insufficient_privilege'; end if;
  if p_confirm is distinct from 'I reviewed this quarantine and its release' then
    raise exception 'confirm the quarantine review before release' using errcode='check_violation';
  end if;
  select * into v_asset from public.media_assets where id=p_asset_id for update;
  if not found or v_asset.deleted_at is not null or v_asset.status <> 'quarantined' then
    raise exception 'file is not currently quarantined' using errcode='check_violation';
  end if;
  if public.is_library_delivery_asset(p_asset_id) then
    raise exception 'file is no longer attributable to coursework' using errcode='check_violation';
  end if;
  select previous_status into v_previous from public.coursework_quarantine_state where asset_id=p_asset_id;
  if v_previous is null then
    raise exception 'previous state is unknown; review this older quarantine individually' using errcode='check_violation';
  end if;
  perform set_config('app.media_status_transition','on',true);
  update public.media_assets set status=v_previous where id=p_asset_id;
  perform set_config('app.media_status_transition',coalesce(v_transition,''),true);
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
    values(v_actor,'coursework.quarantine_released','media_asset',p_asset_id,
           jsonb_build_object('restored_status',v_previous,'review_attested',true));
  return v_previous;
end;
$$;

-- A private review register, not a deletion queue: a legacy asset may also be a
-- lesson resource and the original attachment context may have been erased.
create function public.legacy_coursework_review_page(p_after uuid default null, p_limit integer default 50)
returns table(asset_id uuid, display_name text, asset_status text, tombstoned boolean,
  in_lesson boolean, attached boolean, in_revision boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  if not public.coursework_active_actor() then
    raise exception 'coursework:not_allowed' using errcode='insufficient_privilege';
  end if;
  if p_limit is null or p_limit<1 or p_limit>100 then
    raise exception 'legacy review page limit must be between 1 and 100' using errcode='invalid_parameter_value';
  end if;
  return query select ma.id,ma.display_name,ma.status,ma.deleted_at is not null,
    exists(select 1 from public.lesson_resources lr where lr.media_asset_id=ma.id),
    exists(select 1 from public.assignment_submission_assets a where a.media_asset_id=ma.id),
    exists(select 1 from public.assignment_submission_revisions r where r.asset_ids @> jsonb_build_array(ma.id::text))
  from public.legacy_coursework_provenance h join public.media_assets ma on ma.id=h.asset_id
  where (p_after is null or ma.id>p_after)
  order by ma.id limit p_limit;
end;
$$;
revoke all on function public.legacy_coursework_review_page(uuid,integer) from public,anon;
grant execute on function public.legacy_coursework_review_page(uuid,integer) to authenticated;
