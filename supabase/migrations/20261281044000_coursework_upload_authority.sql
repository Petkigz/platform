-- The generic learner-access predicate also admits staff and, depending on the
-- platform flag, unverified family members. It is not an upload authority for
-- private coursework. Apply the same conservative rule to all ages: the learner
-- or a currently verified guardian with progress permission, never staff merely
-- because they are staff. This does not attest to file bytes or scan them.
create function public.coursework_hand_in_authorized(p_learner_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_actor uuid := public.current_user_id();
begin
  if v_actor is null then return false; end if;
  -- Hold the identity or guardian row until the statement's transaction ends,
  -- so a simultaneous change cannot pass the check on stale authority.
  perform 1 from public.learner_profiles lp
   where lp.id = p_learner_id and lp.linked_user_id = v_actor and lp.deleted_at is null
   for share;
  if found then return true; end if;
  perform 1 from public.guardian_relationships gr
    join public.learner_profiles lp on lp.id = gr.learner_profile_id
   where gr.learner_profile_id = p_learner_id and lp.deleted_at is null
     and gr.guardian_user_id = v_actor and gr.status = 'active' and gr.deleted_at is null
     and gr.verified_at is not null and gr.verified_at <= now()
     and gr.can_view_progress and gr.consent_expires_at is not null and gr.consent_expires_at > now()
   for share of gr, lp;
  return found;
end;
$$;
revoke all on function public.coursework_hand_in_authorized(uuid) from public, anon, authenticated;

-- Registration returns a storage upload target. Refuse before the transaction
-- commits or the web route can sign it, even when the general guardian flag is
-- off. No existing declaration is edited or retroactively legitimised.
create function public.guard_coursework_declaration()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_learner uuid; v_uploader uuid;
begin
  select s.learner_profile_id, ma.uploaded_by into v_learner, v_uploader
    from public.assignment_submissions s
    join public.media_assets ma on ma.id = new.asset_id
   where s.id = new.submission_id and ma.purpose = 'coursework';
  if not found or new.declared_by is distinct from public.current_user_id()
     or v_uploader is distinct from public.current_user_id()
     or not public.coursework_hand_in_authorized(v_learner) then
    raise exception 'only the learner or a currently verified guardian with progress permission can hand in this file'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_coursework_declaration() from public, anon, authenticated;
create trigger coursework_declaration_authority before insert on public.coursework_upload_declarations
  for each row execute function public.guard_coursework_declaration();

-- The old attachment RPC remains callable, so enforce the same rule at the
-- shared write boundary, including after a guardian's consent has expired.
create or replace function public.require_declared_coursework_attachment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_purpose text; v_uploader uuid; v_learner uuid;
begin
  select ma.purpose, ma.uploaded_by into v_purpose, v_uploader
    from public.media_assets ma where ma.id = new.media_asset_id for update;
  if not found or v_purpose <> 'coursework' or not exists (
    select 1 from public.coursework_upload_declarations d
     where d.asset_id = new.media_asset_id and d.submission_id = new.submission_id
  ) then
    raise exception 'assignment files must be declared coursework for this submission; upload the file using the coursework form'
      using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.lesson_resources lr where lr.media_asset_id = new.media_asset_id) then
    raise exception 'a lesson resource cannot also be a coursework attachment'
      using errcode = 'check_violation';
  end if;
  select s.learner_profile_id into v_learner from public.assignment_submissions s where s.id = new.submission_id;
  if new.attached_by is distinct from public.current_user_id()
     or v_uploader is distinct from public.current_user_id()
     or not public.coursework_hand_in_authorized(v_learner) then
    raise exception 'only the uploader who is the learner or a currently verified guardian with progress permission can attach this file'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

-- Wrap the existing checked state machine, preserving its lock, limits, audit and
-- idempotency. Its previous staff bypass and the idempotent early return must not
-- skip the actor and current-authority check. The internal function is not a
-- PostgREST door for authenticated callers.
alter function public.confirm_coursework_upload(uuid) rename to confirm_coursework_upload_internal;
revoke all on function public.confirm_coursework_upload_internal(uuid) from public, anon, authenticated;
create function public.confirm_coursework_upload(p_asset_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_actor uuid := public.current_user_id(); v_asset public.media_assets;
        v_declared uuid; v_learner uuid;
begin
  if v_actor is null then raise exception 'sign in to hand in a file' using errcode = 'insufficient_privilege'; end if;
  select * into v_asset from public.media_assets where id = p_asset_id for update;
  if not found then raise exception 'media asset not found' using errcode = 'no_data_found'; end if;
  if v_asset.purpose <> 'coursework' then
    raise exception 'that file was not handed in as coursework' using errcode = 'check_violation';
  end if;
  if v_asset.uploaded_by is distinct from v_actor then
    raise exception 'only the uploader can confirm this file' using errcode = 'insufficient_privilege';
  end if;
  select d.declared_by, s.learner_profile_id into v_declared, v_learner
    from public.coursework_upload_declarations d
    join public.assignment_submissions s on s.id = d.submission_id
   where d.asset_id = p_asset_id;
  if not found or v_declared is distinct from v_actor or not public.coursework_hand_in_authorized(v_learner) then
    raise exception 'only the learner or a currently verified guardian with progress permission can confirm this file'
      using errcode = 'insufficient_privilege';
  end if;
  return public.confirm_coursework_upload_internal(p_asset_id);
end;
$$;
revoke all on function public.confirm_coursework_upload(uuid) from public, anon;
grant execute on function public.confirm_coursework_upload(uuid) to authenticated;
comment on function public.confirm_coursework_upload(uuid) is
  'The actual uploader may confirm their declared coursework only while they remain the learner or a currently verified guardian with progress permission. The web route checks storage size; direct RPC calls cannot verify bytes or scan files.';

-- The generic staff confirmation must not promote a coursework file without
-- its declaration and attachment. Preserve ordinary library behaviour.
alter function public.confirm_media_upload(uuid) rename to confirm_media_upload_internal;
revoke all on function public.confirm_media_upload_internal(uuid) from public, anon, authenticated;
create function public.confirm_media_upload(p_asset_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_actor uuid := public.current_user_id(); v_id uuid;
begin
  if v_actor is null then raise exception 'sign in to confirm an upload' using errcode = 'insufficient_privilege'; end if;
  if not public.is_privileged(v_actor) then raise exception 'only staff may confirm an upload' using errcode = 'insufficient_privilege'; end if;
  select ma.id into v_id from public.media_assets ma where ma.id = p_asset_id for update;
  if found and not public.is_library_delivery_asset(v_id) then
    raise exception 'only library uploads can use staff media confirmation' using errcode = 'check_violation';
  end if;
  return public.confirm_media_upload_internal(p_asset_id);
end;
$$;
revoke all on function public.confirm_media_upload(uuid) from public, anon;
grant execute on function public.confirm_media_upload(uuid) to authenticated;
comment on function public.confirm_media_upload(uuid) is
  'Staff confirmation for library media only. Coursework uses its separate uploader-authorized confirmation.';

-- Future-dated verification is not yet a verified guardian for master reads.
create or replace function public.may_read_coursework_master(p_asset_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with contexts as (
    select d.submission_id from public.coursework_upload_declarations d where d.asset_id = p_asset_id
    union
    select a.submission_id from public.assignment_submission_assets a where a.media_asset_id = p_asset_id
  )
  select public.current_user_id() is not null and (
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
            and exists (select 1 from public.assignment_submission_assets asa
                        where asa.media_asset_id = ma.id and asa.submission_id = s.id)
          )
        )
      )
    )
  );
$$;
