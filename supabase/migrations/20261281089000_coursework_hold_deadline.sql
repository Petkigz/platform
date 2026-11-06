-- Preserve an existing byte-deletion deadline across a newly opened hold.
-- Old holds were created without this evidence; do not invent their dates.
alter table public.coursework_retention_holds
  add column previous_purge_due_at timestamptz;

create function public.capture_coursework_hold_deadline()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select purge_due_at into new.previous_purge_due_at
    from public.media_assets where id = new.asset_id;
  return new;
end;
$$;
revoke all on function public.capture_coursework_hold_deadline() from public, anon, authenticated;

create trigger coursework_hold_capture_deadline
  before insert on public.coursework_retention_holds
  for each row execute function public.capture_coursework_hold_deadline();

-- The public wrapper still enforces the owner check and locks the media row.
create or replace function public.release_coursework_hold_internal(
  p_asset_id uuid,
  p_reason   text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_tombstoned timestamptz;
  v_previous_due timestamptz;
begin
  if v_actor is null
     or not (public.has_role(v_actor, 'platform_admin')
             or public.has_role(v_actor, 'governance_admin')) then
    raise exception 'only governance staff or the owner may release a hold'
      using errcode = 'insufficient_privilege';
  end if;

  if length(v_reason) < 3 then
    raise exception 'releasing a hold needs a written reason'
      using errcode = 'check_violation';
  end if;

  update public.coursework_retention_holds
     set closed_at = now(), closed_by = v_actor, closed_reason = v_reason
   where asset_id = p_asset_id and closed_at is null
   returning previous_purge_due_at into v_previous_due;

  if not found then
    raise exception 'that file is not held' using errcode = 'no_data_found';
  end if;

  -- Restore a known deadline even when it is already overdue. Older holds and
  -- holds opened before any byte deadline have no reliable date to restore.
  select deleted_at into v_tombstoned from public.media_assets where id = p_asset_id;
  if v_tombstoned is not null then
    update public.media_assets
       set purge_due_at = coalesce(v_previous_due, purge_due_at, now() + interval '30 days')
     where id = p_asset_id;
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'coursework.hold_released', 'media_asset', p_asset_id,
          jsonb_build_object('reason', v_reason));

  return p_asset_id;
end;
$$;
