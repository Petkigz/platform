-- Quarantine must not permanently strand a hand-in, nor may a recovery turn an
-- unverified pending upload into an available one. Record the previous state at
-- the transition itself. Historic quarantines have no trustworthy previous
-- state and are intentionally left for individual review.
create table public.coursework_quarantine_state (
  asset_id uuid primary key references public.media_assets(id) on delete cascade,
  previous_status text not null check (previous_status in ('pending','available')),
  quarantined_at timestamptz not null default now()
);
alter table public.coursework_quarantine_state enable row level security;
revoke all on public.coursework_quarantine_state from public, anon, authenticated;

create function public.capture_coursework_quarantine_state()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'quarantined' and old.status in ('pending','available')
     and (old.purpose = 'coursework' or exists (
       select 1 from public.assignment_submission_assets a where a.media_asset_id = old.id
     ) or exists (
       select 1 from public.coursework_upload_declarations d where d.asset_id = old.id
     )) then
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
revoke all on function public.capture_coursework_quarantine_state() from public, anon, authenticated;
create trigger coursework_capture_quarantine after update of status on public.media_assets
  for each row when (old.status is distinct from new.status)
  execute function public.capture_coursework_quarantine_state();

create function public.coursework_quarantine_queue(p_limit integer default 50, p_after uuid default null)
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
       and (ma.purpose='coursework' or exists (select 1 from public.assignment_submission_assets a where a.media_asset_id=ma.id)
            or exists (select 1 from public.coursework_upload_declarations d where d.asset_id=ma.id))
       and (p_after is null or ma.id > p_after)
     order by ma.id limit p_limit;
end;
$$;
revoke all on function public.coursework_quarantine_queue(integer,uuid) from public, anon;
grant execute on function public.coursework_quarantine_queue(integer,uuid) to authenticated;

create function public.release_coursework_quarantine(p_asset_id uuid, p_confirm text)
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
  if v_asset.purpose <> 'coursework' and not exists (
    select 1 from public.assignment_submission_assets a where a.media_asset_id=p_asset_id
  ) and not exists (select 1 from public.coursework_upload_declarations d where d.asset_id=p_asset_id) then
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
revoke all on function public.release_coursework_quarantine(uuid,text) from public, anon;
grant execute on function public.release_coursework_quarantine(uuid,text) to authenticated;
