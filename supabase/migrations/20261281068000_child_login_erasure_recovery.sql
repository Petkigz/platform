-- When a child's learning record is purged, do not retain the attempt and
-- removal rows tied to the learner and guardian. A provider request may still
-- complete after a timeout, so preserve a private pseudonymous recovery marker
-- and address fingerprint instead of losing the only way to find that identity.
-- A fingerprint is still personal data: it is not a claim of full erasure.
create table public.child_login_erasure_recovery (
  source_kind text not null check (source_kind in ('attempt','legacy_removal')),
  source_id uuid not null,
  attempt_marker uuid,
  identity_id uuid,
  address_hash text not null check (address_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  primary key (source_kind, source_id),
  check ((source_kind='attempt' and attempt_marker=source_id)
      or (source_kind='legacy_removal' and attempt_marker is null and identity_id is not null))
);
alter table public.child_login_erasure_recovery enable row level security;
revoke all on public.child_login_erasure_recovery from public, anon, authenticated;
comment on table public.child_login_erasure_recovery is
  'Private pseudonymous identity-recovery evidence after child learning-record purge. Hashes and IDs are still personal data; a pending provider call can create an identity later.';

-- Keep all existing hold checks and the original purge. Only after a successful
-- purge, in the same transaction, archive recovery evidence before deleting the
-- source rows. A hold or failed purge changes neither attempts nor tasks.
alter function public.purge_learner_record(uuid) rename to purge_learner_record_with_holds;
revoke all on function public.purge_learner_record_with_holds(uuid) from public, anon, authenticated;
create function public.purge_learner_record(p_learner_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb; v_count integer;
begin
  v_result := public.purge_learner_record_with_holds(p_learner_id);
  if coalesce((v_result->>'erased')::boolean,false) is not true then return v_result; end if;

  insert into public.child_login_erasure_recovery(source_kind,source_id,attempt_marker,identity_id,address_hash,created_at)
  select 'attempt', a.id, a.id, a.user_id,
         public.identity_hash(a.username || '@learners.ayahspring.com'), a.created_at
    from public.child_login_attempts a where a.learner_profile_id=p_learner_id
  on conflict (source_kind,source_id) do nothing;

  -- A legacy detachment has no trusted attempt marker; do not lose the provider
  -- ID, but never treat an address match as proof that it is safe to delete.
  insert into public.child_login_erasure_recovery(source_kind,source_id,attempt_marker,identity_id,address_hash,created_at)
  select 'legacy_removal', t.id, null, t.child_user_id,
         public.identity_hash(t.username || '@learners.ayahspring.com'), t.created_at
    from public.child_login_removal_tasks t
   where t.learner_profile_id=p_learner_id and not exists (
     select 1 from public.child_login_attempts a where a.id=t.attempt_id and a.learner_profile_id=p_learner_id)
  on conflict (source_kind,source_id) do nothing;

  select count(*)::integer into v_count from public.child_login_attempts
   where learner_profile_id=p_learner_id;
  v_count := v_count + (select count(*)::integer from public.child_login_removal_tasks t
    where t.learner_profile_id=p_learner_id and not exists (
      select 1 from public.child_login_attempts a where a.id=t.attempt_id and a.learner_profile_id=p_learner_id));
  delete from public.child_login_removal_tasks where learner_profile_id=p_learner_id;
  delete from public.child_login_attempts where learner_profile_id=p_learner_id;
  -- The receipt must not imply no identifying information survives.
  if v_count > 0 then
    v_result := jsonb_set(v_result,'{nothingLeft}','false'::jsonb,true);
  end if;
  return v_result || jsonb_build_object('identityRecoveryMarkersAdded',v_count);
end;
$$;
revoke all on function public.purge_learner_record(uuid) from public, anon, authenticated;

-- Private owner visibility does not use or reveal a child or guardian name. No
-- matching Auth row is not proof that an in-flight request cannot create one.
create function public.child_login_erasure_recovery_queue(p_limit integer default 50)
returns table(source_kind text, source_id uuid, identity_id uuid, created_at timestamptz,
              identity_present boolean, trusted_marker_matches boolean, matched_identity_ids uuid[])
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  return query select r.source_kind, r.source_id, r.identity_id, r.created_at,
    exists(select 1 from auth.users u where u.id=r.identity_id
      or (r.attempt_marker is not null and u.raw_app_meta_data->>'ayahspring_child_attempt'=r.attempt_marker::text
          and public.identity_hash(u.email)=r.address_hash)),
    exists(select 1 from auth.users u where r.attempt_marker is not null
      and u.raw_app_meta_data->>'ayahspring_child_attempt'=r.attempt_marker::text
      and public.identity_hash(u.email)=r.address_hash),
    array(select u.id from auth.users u where u.id=r.identity_id
      or (r.attempt_marker is not null and u.raw_app_meta_data->>'ayahspring_child_attempt'=r.attempt_marker::text
          and public.identity_hash(u.email)=r.address_hash) order by u.id)
  from public.child_login_erasure_recovery r
  order by r.created_at, r.source_kind, r.source_id
  limit greatest(1,least(coalesce(p_limit,50),200));
end;
$$;
revoke all on function public.child_login_erasure_recovery_queue(integer) from public, anon;
grant execute on function public.child_login_erasure_recovery_queue(integer) to authenticated;
