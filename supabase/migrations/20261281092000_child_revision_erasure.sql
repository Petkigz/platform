-- A child-record purge must remove private revision text before deleting its
-- submission. Ordinary callers must still never rewrite or delete snapshots.
-- A private transaction-scoped capability is created only by the internal
-- erasure writer and removed before it returns; rollback removes it on error.
create table public.child_revision_erasure_scope (
  transaction_id bigint not null,
  learner_id uuid not null,
  primary key(transaction_id,learner_id)
);
alter table public.child_revision_erasure_scope enable row level security;
revoke all on public.child_revision_erasure_scope from public,anon,authenticated;

-- Legacy or cross-learner files cannot be deleted safely as part of one child's
-- record. Preserve an owner-only review item before losing their old context.
-- These IDs remain personal data; they are not a claim of complete erasure.
create table public.coursework_erasure_review_assets (
  asset_id uuid not null references public.media_assets(id) on delete restrict,
  learner_id uuid not null references public.learner_profiles(id) on delete restrict,
  reason text not null check (reason in ('legacy_library','shared_context')),
  recorded_at timestamptz not null default now(),
  primary key(asset_id,learner_id)
);
alter table public.coursework_erasure_review_assets enable row level security;
revoke all on public.coursework_erasure_review_assets from public,anon,authenticated;

create or replace function public.guard_assignment_submission_revisions()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='DELETE' and exists (
    select 1 from public.child_revision_erasure_scope scope
    join public.assignment_submissions s on s.learner_profile_id=scope.learner_id
    where scope.transaction_id=txid_current() and s.id=old.submission_id
  ) then return old; end if;
  raise exception 'a recorded revision of marked work cannot be changed or deleted'
    using errcode='insufficient_privilege';
end;
$$;

-- A hold on a detached revision or pending declaration is as real as a hold on
-- the current attachment. This is an internal predicate, not a read oracle.
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
  );
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
    );
  perform ma.id from public.media_assets ma where ma.id=any(v_assets) order by ma.id for update;
  if public.learner_has_held_coursework(p_learner_id) then
    return jsonb_build_object('erased',false,'blockedByCourseworkHold',true);
  end if;
  -- Preserve the original validation and already-erased semantics. In particular,
  -- no snapshot is removed when this is not a child with a running clock.
  if v_kind is distinct from 'child' or v_deleted is null or v_status='erased' then
    return public.purge_learner_record_internal(p_learner_id);
  end if;

  insert into public.coursework_erasure_review_assets(asset_id,learner_id,reason)
    select ma.id,p_learner_id,
      case when ma.purpose<>'coursework' then 'legacy_library' else 'shared_context' end
    from public.media_assets ma where ma.id=any(v_assets) and (
      ma.purpose<>'coursework' or exists(select 1 from public.lesson_resources lr where lr.media_asset_id=ma.id) or exists (
        select 1 from public.assignment_submissions other
        where other.learner_profile_id<>p_learner_id and (
          exists(select 1 from public.assignment_submission_assets a where a.submission_id=other.id and a.media_asset_id=ma.id)
          or exists(select 1 from public.coursework_upload_declarations d where d.submission_id=other.id and d.asset_id=ma.id)
          or exists(select 1 from public.assignment_submission_revisions r where r.submission_id=other.id
                     and r.asset_ids @> jsonb_build_array(ma.id::text))
        )
      )
    ) on conflict (asset_id,learner_id) do nothing;
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
                      where x.asset_id=ma.id and x.learner_id=p_learner_id);

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

-- The normal cascade trigger must not tombstone a shared exception after the
-- protected parent disappears. The unforgeable scope limits this exception to
-- the actual child purge, rather than changing ordinary detachment behaviour.
create or replace function public.retire_coursework_file_on_detach()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if exists(select 1 from public.assignment_submissions where id=old.submission_id)
    or exists(select 1 from public.child_revision_erasure_scope s
      join public.coursework_erasure_review_assets r on r.learner_id=s.learner_id
      where s.transaction_id=txid_current() and r.asset_id=old.media_asset_id)
  then return old; end if;
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

-- Keyset pagination keeps every unresolved exception visible to the owner.
create function public.coursework_erasure_review_page(p_after_asset uuid default null,p_after_learner uuid default null,p_limit integer default 51)
returns table(asset_id uuid,learner_id uuid,display_name text,reason text,recorded_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  if not public.coursework_active_actor() then
    raise exception 'coursework:not_allowed' using errcode='insufficient_privilege';
  end if;
  if p_limit is null or p_limit<1 or p_limit>100 or ((p_after_asset is null)<>(p_after_learner is null)) then
    raise exception 'invalid erasure review page' using errcode='invalid_parameter_value';
  end if;
  return query select r.asset_id,r.learner_id,ma.display_name,r.reason,r.recorded_at
    from public.coursework_erasure_review_assets r join public.media_assets ma on ma.id=r.asset_id
   where p_after_asset is null or (r.asset_id,r.learner_id)>(p_after_asset,p_after_learner)
   order by r.asset_id,r.learner_id limit p_limit;
end;
$$;
revoke all on function public.coursework_erasure_review_page(uuid,uuid,integer) from public,anon;
grant execute on function public.coursework_erasure_review_page(uuid,uuid,integer) to authenticated;

-- Ordinary retention also runs while a child's record is held. It must not
-- tombstone a shared object before the child-purge writer can record its review.
create function public.coursework_asset_needs_individual_review(p_asset_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.coursework_erasure_review_assets where asset_id=p_asset_id)
      or exists(select 1 from public.lesson_resources where media_asset_id=p_asset_id)
      or (select count(distinct s.learner_profile_id)>1 from public.assignment_submissions s
          where exists(select 1 from public.assignment_submission_assets a where a.submission_id=s.id and a.media_asset_id=p_asset_id)
             or exists(select 1 from public.coursework_upload_declarations d where d.submission_id=s.id and d.asset_id=p_asset_id)
             or exists(select 1 from public.assignment_submission_revisions r where r.submission_id=s.id
                       and r.asset_ids @> jsonb_build_array(p_asset_id::text)));
$$;
revoke all on function public.coursework_asset_needs_individual_review(uuid) from public,anon,authenticated;

create or replace function public.purge_coursework_files(
  p_now   timestamptz default now(),
  p_limit integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_as_of    date := least((p_now at time zone 'UTC')::date,
                           (now() at time zone 'UTC')::date);
  v_id       uuid;
  v_changed  integer;
  v_purged   integer := 0;
  v_left     integer := 0;
  v_held     integer := 0;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'retention:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception 'retention:limit_out_of_range'
      using errcode = 'invalid_parameter_value',
            hint = 'between 1 and 5000 rows per call';
  end if;

  -- Lock the same media row as the hold writer, then re-read the retention
  -- view in a separate command. If a hold committed while this run waited for
  -- the row lock, the recheck sees it before the tombstone is written. A hold
  -- that starts after this run owns the lock cannot retroactively stop a deletion.
  for v_id in
    select asset_id from public.coursework_file_retention
     where due_on <= v_as_of and tombstoned_at is null and not held
       and not public.coursework_asset_needs_individual_review(asset_id)
     order by due_on, asset_id limit p_limit
  loop
    perform 1 from public.media_assets where id = v_id for update;
    if exists (
      select 1 from public.coursework_file_retention
       where asset_id = v_id and due_on <= v_as_of
         and tombstoned_at is null and not held
         and not public.coursework_asset_needs_individual_review(asset_id)
    ) then
      perform set_config('app.media_status_transition', 'on', true);
      update public.media_assets
         set status = 'deleted', deleted_at = now(), purge_due_at = now()
       where id = v_id and deleted_at is null;
      get diagnostics v_changed = row_count;
      v_purged := v_purged + v_changed;
      perform set_config('app.media_status_transition', '', true);
    end if;
  end loop;

  if v_purged > 0 then
    insert into public.governance_audit_events (actor, action, target_type, detail)
    values (v_actor, 'retention.coursework_files_deleted', 'retention_run',
            jsonb_build_object('asOf', v_as_of, 'files', v_purged, 'limit', p_limit));
  end if;

  select count(*)::int into v_left
    from public.coursework_file_retention
   where due_on <= v_as_of and tombstoned_at is null and not held;

  select count(*)::int into v_held
    from public.coursework_file_retention
   where held and tombstoned_at is null;

  return jsonb_build_object(
    'asOf', v_as_of,
    'deleted', v_purged,
    'remaining', v_left,
    'held', v_held,
    'awaitingStorage',
      (select count(*)::int from public.media_assets
        where purpose = 'coursework' and deleted_at is not null and purged_at is null));
end;
$$;

