-- Wire role assignment.
--
-- WHAT THIS FIXES
-- ---------------
-- The authorisation model here is capability-based: ten seeded roles, four of
-- them privileged, and every check in the schema reads them. The trigger
-- protect_privileged_role_assignment() is genuinely careful — it refuses a
-- self-grant, refuses a null assigner, and requires the assigner to hold a
-- privileged role right now.
--
-- And user_role_assignments had zero rows and no writer. Not in SQL, not in the
-- web app. The test harness grants roles with a direct INSERT, which is exactly
-- the fixture state that hides a missing application path: every suite passed
-- while there was no way, through the product, to make anyone an instructor, a
-- reviewer, or an admin.
--
-- That is the twelfth instance of the same defect, and the most foundational
-- one. Nothing else in the platform can be staffed until this exists.
--
-- WHAT THIS ADDS
-- --------------
--   assign_role(user, role_code, actor, reason)
--   revoke_role(user, role_code, actor, reason)
--   a lockout guard so the last privileged account cannot be removed
--
-- Revocation is soft (D7): revoked_at plus a reason, never a deleted row. A
-- role someone once held is part of who could do what, and that history is
-- governance history.

-- ---------------------------------------------------------------------------
-- The assignment trigger, restated with an explicit revocation guard
-- ---------------------------------------------------------------------------
-- CORRECTION: an earlier draft of this migration claimed the trigger misfired on
-- revocation. That was wrong, and it is worth recording why.
--
-- ura_protect_privileged_assignment_update is declared
--   BEFORE UPDATE OF revoked_at ... WHEN (old.revoked_at IS NOT NULL
--                                         AND new.revoked_at IS NULL)
-- so it fires only when a revocation is CLEARED — a reinstatement — and never
-- when a role is taken away. Verified by removing the guard below and
-- observing identical behaviour: revoking a self-assigned bootstrap row is
-- allowed either way.
--
-- The guard is kept because it is cheap and it makes the intent explicit inside
-- the function rather than depending on a WHEN clause three files away. It is
-- defence in depth, not a bug fix, and no test can distinguish it.

create or replace function public.protect_privileged_role_assignment()
returns trigger
language plpgsql
as $$
declare
  v_role_privileged boolean;
  v_bootstrap       text;
begin
  select r.is_privileged into v_role_privileged
    from public.roles r
   where r.id = new.role_id;

  if not coalesce(v_role_privileged, false) then
    return new;
  end if;

  -- A revocation is not an assignment, so none of the grant rules below apply.
  -- The UPDATE trigger's WHEN clause already excludes this case; this makes it
  -- explicit here too, so the function does not silently depend on it.
  if new.revoked_at is not null then
    return new;
  end if;

  v_bootstrap := current_setting('app.bootstrap_privileged_roles', true);
  if v_bootstrap = 'on' then
    return new;
  end if;

  if new.assigned_by is null then
    raise exception 'a privileged role requires an explicit assigner'
      using errcode = '42501';
  end if;

  if new.assigned_by = new.user_id then
    raise exception 'a user may not assign a privileged role to themselves'
      using errcode = '42501';
  end if;

  if not exists (
        select 1
          from public.user_role_assignments ura
          join public.roles r on r.id = ura.role_id
         where ura.user_id = new.assigned_by
           and r.is_privileged
           and ura.revoked_at is null
       ) then
    raise exception 'assigner does not currently hold a privileged role'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function public.protect_privileged_role_assignment() is
  'Guards the GRANT of a privileged role. Skips revocations explicitly; the UPDATE trigger already only fires on reinstatement.';

-- ---------------------------------------------------------------------------
-- Assign
-- ---------------------------------------------------------------------------

create or replace function public.assign_role(
  p_user_id   uuid,
  p_role_code text,
  p_reason    text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role       public.roles;
  v_existing   uuid;
  v_actor      uuid;
begin
  -- The actor comes from the session, never from an argument. Taking it as a
  -- parameter would let any signed-in user pass a privileged user's id and
  -- satisfy the check below -- the exact hole that was just closed in the
  -- earnings and entitlement writers. Role assignment is always a human
  -- acting, so there is no system path that needs an explicit actor.
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to assign a role'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.is_privileged(v_actor) then
    raise exception 'only staff may assign roles'
      using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.user_profiles where user_id = p_user_id) then
    raise exception 'user % not found', p_user_id
      using errcode = 'no_data_found';
  end if;

  select * into v_role from public.roles where code = p_role_code;
  if not found then
    raise exception 'no such role: %', p_role_code
      using errcode = 'no_data_found';
  end if;

  -- A privileged role is the power to change what other people may do. It
  -- needs a written reason in the audit trail, not just a click.
  if v_role.is_privileged and coalesce(trim(p_reason), '') = '' then
    raise exception
      'granting the privileged role % requires a written reason', p_role_code
      using errcode = 'invalid_parameter_value';
  end if;

  -- Idempotent. ura_one_active_per_role_key is a partial unique index, so a
  -- second active grant would collide; holding a role twice means nothing.
  select id into v_existing
    from public.user_role_assignments
   where user_id = p_user_id and role_id = v_role.id and revoked_at is null;

  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.user_role_assignments (user_id, role_id, assigned_by)
  values (p_user_id, v_role.id, v_actor)
  returning id into v_existing;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'role.assigned', 'user', p_user_id,
          jsonb_build_object('role', v_role.code,
                             'privileged', v_role.is_privileged,
                             'reason', nullif(trim(coalesce(p_reason, '')), '')));

  return v_existing;
end;
$$;

revoke all on function public.assign_role(uuid, text, text) from public;
grant execute on function public.assign_role(uuid, text, text) to authenticated;

comment on function public.assign_role(uuid, text, text) is
  'Grants a role to a user. Privileged actor only; a privileged role needs a written reason. Idempotent.';

-- ---------------------------------------------------------------------------
-- Revoke
-- ---------------------------------------------------------------------------

create or replace function public.revoke_role(
  p_user_id   uuid,
  p_role_code text,
  p_reason    text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role        public.roles;
  v_assignment  public.user_role_assignments;
  v_remaining   integer;
  v_actor       uuid;
begin
  -- From the session, not an argument. See assign_role().
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to revoke a role'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.is_privileged(v_actor) then
    raise exception 'only staff may revoke roles'
      using errcode = 'insufficient_privilege';
  end if;

  -- D7: a role someone held is governance history. Taking it back needs a
  -- reason on the record, and ura_revocation_reason_required enforces it too.
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'revoking a role requires a written reason'
      using errcode = 'invalid_parameter_value';
  end if;

  select * into v_role from public.roles where code = p_role_code;
  if not found then
    raise exception 'no such role: %', p_role_code
      using errcode = 'no_data_found';
  end if;

  select * into v_assignment
    from public.user_role_assignments
   where user_id = p_user_id and role_id = v_role.id and revoked_at is null
   for update;

  if not found then
    -- Nothing to revoke is not an error; a retry or a stale screen must not
    -- fail for the operator.
    return false;
  end if;

  -- Lockout guard. If this is the last active privileged account, removing it
  -- leaves nobody who can appoint anyone, and the platform cannot be staffed
  -- again without direct database access. That is a one-way door, so it is
  -- refused here rather than discovered later.
  if v_role.is_privileged then
    select count(distinct ura.user_id) into v_remaining
      from public.user_role_assignments ura
      join public.roles r on r.id = ura.role_id
     where r.is_privileged
       and ura.revoked_at is null
       and ura.user_id <> p_user_id;

    if coalesce(v_remaining, 0) = 0 then
      raise exception
        'refusing to revoke the last privileged account; appoint someone else first'
        using errcode = 'check_violation';
    end if;
  end if;

  update public.user_role_assignments
     set revoked_at = now(),
         revocation_reason = trim(p_reason)
   where id = v_assignment.id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'role.revoked', 'user', p_user_id,
          jsonb_build_object('role', v_role.code,
                             'privileged', v_role.is_privileged,
                             'reason', trim(p_reason)));

  return true;
end;
$$;

revoke all on function public.revoke_role(uuid, text, text) from public;
grant execute on function public.revoke_role(uuid, text, text) to authenticated;

comment on function public.revoke_role(uuid, text, text) is
  'Soft-revokes a role with a written reason. Refuses to remove the last privileged account.';
