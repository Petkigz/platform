-- Families, and the children underneath them.
--
-- WHAT THIS FIXES
-- ---------------
-- families and family_memberships both had zero rows and no writer, and the two
-- policies that govern them make the first row impossible to create:
--
--   families_insert         with check (created_by = current_user_id())   -- fine
--   fm_write_owner          using  (is_family_owner(family_id, current_user_id()))
--
-- is_family_owner() looks for an active 'owner' row in family_memberships. So
-- inserting the first owner membership requires already being an active owner.
-- A bootstrap deadlock: the row that grants the permission can only be written
-- by someone holding the permission.
--
-- Measured, not inferred:
--
--   plain INSERT into families .................. allowed
--   INSERT into families ... RETURNING id ....... refused by RLS
--   INSERT the owner membership ................. refused by RLS
--   creator selects their own family ............ 0 rows
--
-- The RETURNING case fails for a subtler reason than the others: RETURNING has
-- to satisfy the SELECT policy, and families_read requires an active membership
-- the creator does not have. So the creator cannot even read back the family
-- they just made.
--
-- WHY THIS MATTERS BEYOND A MISSING TABLE
-- ---------------------------------------
-- D2 says a child is a learner_profile under a family, never a user. The schema
-- enforces that:
--
--   lp_no_child_login_yet   a child may not have linked_user_id
--   lp_needs_family_or_login  a profile needs a family OR a login
--
-- Together: a child profile REQUIRES a family. With no way to create a family,
-- no child could ever exist on this platform, and therefore could never be
-- enrolled. guardian_relationships has the same dependency
-- (gr_insert needs is_learner_family_member), so the parental-consent workflow
-- was blocked at the same point.
--
-- This is a correction to an earlier claim that child enrolment was wired. The
-- enrolment path was; the family it depends on could not be created.
--
-- WHAT IS BUILT
-- -------------
-- create_family() creates the family AND the owner membership in one
-- transaction, so no family ever exists without an owner. It is SECURITY
-- DEFINER because the deadlock is in the policies, but the actor still comes
-- from current_user_id(), never a parameter.

-- ---------------------------------------------------------------------------
-- Creating a family
-- ---------------------------------------------------------------------------

create or replace function public.create_family(p_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid;
  v_family  uuid;
  v_name    text;
begin
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to create a family'
      using errcode = 'insufficient_privilege';
  end if;

  v_name := nullif(btrim(coalesce(p_name, '')), '');

  insert into public.families (name, created_by, status)
  values (v_name, v_actor, 'active')
  returning id into v_family;

  -- The owner membership, in the same transaction. Without this the family
  -- would exist with no members and its creator could not see it, manage it, or
  -- add a child to it.
  insert into public.family_memberships
    (family_id, user_id, membership_type, status, joined_at, created_by)
  values
    (v_family, v_actor, 'owner', 'active', now(), v_actor);

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'family.created', 'family', v_family,
          jsonb_build_object('name', v_name));

  return v_family;
end;
$$;

revoke all on function public.create_family(text) from public;
grant execute on function public.create_family(text) to authenticated;

comment on function public.create_family(text) is
  'Creates a family and its owner membership atomically, so no family ever exists without an owner. The actor is the session, never a parameter.';

-- ---------------------------------------------------------------------------
-- Inviting and accepting
-- ---------------------------------------------------------------------------

create or replace function public.invite_family_member(
  p_family_id       uuid,
  p_user_id         uuid,
  p_membership_type text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_id    uuid;
begin
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to invite someone to a family'
      using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.families
                  where id = p_family_id and deleted_at is null) then
    raise exception 'family % not found', p_family_id
      using errcode = 'no_data_found';
  end if;

  if not public.is_family_owner(p_family_id, v_actor)
     and not public.is_privileged(v_actor) then
    raise exception 'only the owner may invite someone to this family'
      using errcode = 'insufficient_privilege';
  end if;

  if p_membership_type not in ('owner','guardian','billing_manager') then
    raise exception 'unsupported membership type: %', p_membership_type
      using errcode = 'invalid_parameter_value';
  end if;

  if not exists (select 1 from public.user_profiles where user_id = p_user_id) then
    raise exception 'no such user'
      using errcode = 'no_data_found';
  end if;

  -- One live membership per person per family. Invited counts as live, so a
  -- second invitation does not stack.
  if exists (select 1 from public.family_memberships
              where family_id = p_family_id
                and user_id = p_user_id
                and status in ('invited','active')) then
    raise exception 'that person is already a member of this family'
      using errcode = 'unique_violation';
  end if;

  -- Invited, not active. The person has to accept; being added to someone
  -- else's family without agreeing would be a way to attach an account to a
  -- household it never chose.
  insert into public.family_memberships
    (family_id, user_id, membership_type, status, created_by)
  values
    (p_family_id, p_user_id, p_membership_type, 'invited', v_actor)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'family.member_invited', 'family', p_family_id,
          jsonb_build_object('user_id', p_user_id,
                             'membership_type', p_membership_type));

  return v_id;
end;
$$;

revoke all on function public.invite_family_member(uuid, uuid, text) from public;
grant execute on function public.invite_family_member(uuid, uuid, text) to authenticated;

comment on function public.invite_family_member(uuid, uuid, text) is
  'Owner or privileged. Creates an invited membership; the invited person must accept it before it becomes active.';

create or replace function public.accept_family_membership(p_membership_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid;
  v_user   uuid;
  v_status text;
begin
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to accept a family invitation'
      using errcode = 'insufficient_privilege';
  end if;

  select user_id, status into v_user, v_status
    from public.family_memberships
   where id = p_membership_id
   for update;

  if not found then
    raise exception 'invitation % not found', p_membership_id
      using errcode = 'no_data_found';
  end if;

  -- Only the person invited may accept. An owner accepting on someone's behalf
  -- would defeat the point of asking.
  if v_user <> v_actor then
    raise exception 'only the invited person may accept this invitation'
      using errcode = 'insufficient_privilege';
  end if;

  if v_status = 'active' then
    return false;
  end if;

  if v_status = 'revoked' then
    raise exception 'that invitation was withdrawn'
      using errcode = 'invalid_parameter_value';
  end if;

  update public.family_memberships
     set status = 'active',
         joined_at = now()
   where id = p_membership_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'family.member_joined', 'family',
          (select family_id from public.family_memberships where id = p_membership_id),
          jsonb_build_object('membership_id', p_membership_id));

  return true;
end;
$$;

revoke all on function public.accept_family_membership(uuid) from public;
grant execute on function public.accept_family_membership(uuid) to authenticated;

comment on function public.accept_family_membership(uuid) is
  'Only the invited person may accept. Idempotent for an already-active membership.';

create or replace function public.revoke_family_membership(
  p_membership_id uuid,
  p_reason        text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid;
  v_family  uuid;
  v_type    text;
  v_status  text;
  v_owners  integer;
begin
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to remove a family member'
      using errcode = 'insufficient_privilege';
  end if;

  select family_id, membership_type, status into v_family, v_type, v_status
    from public.family_memberships
   where id = p_membership_id
   for update;

  if not found then
    raise exception 'membership % not found', p_membership_id
      using errcode = 'no_data_found';
  end if;

  if not public.is_family_owner(v_family, v_actor)
     and not public.is_privileged(v_actor) then
    raise exception 'only the owner may remove a family member'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'a reason is required to remove a family member'
      using errcode = 'invalid_parameter_value';
  end if;

  if v_status = 'revoked' then
    return false;
  end if;

  -- Lockout guard, as with privileged roles: a family with no owner would be
  -- unmanageable, and its children would be stranded.
  if v_type = 'owner' then
    select count(*) into v_owners
      from public.family_memberships
     where family_id = v_family
       and membership_type = 'owner'
       and status = 'active';

    if v_owners <= 1 then
      raise exception
        'a family needs at least one owner; appoint another before removing this one'
        using errcode = 'check_violation';
    end if;
  end if;

  -- Soft revoke per D7.
  update public.family_memberships
     set status = 'revoked',
         revoked_at = now()
   where id = p_membership_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'family.member_removed', 'family', v_family,
          jsonb_build_object('membership_id', p_membership_id,
                             'membership_type', v_type,
                             'reason', btrim(p_reason)));

  return true;
end;
$$;

revoke all on function public.revoke_family_membership(uuid, text) from public;
grant execute on function public.revoke_family_membership(uuid, text) to authenticated;

comment on function public.revoke_family_membership(uuid, text) is
  'Soft revoke per D7, written reason required. Refuses to remove the last active owner, because a family with no owner would strand its children.';

-- ---------------------------------------------------------------------------
-- Adding a child
-- ---------------------------------------------------------------------------

create or replace function public.add_child_to_family(
  p_family_id    uuid,
  p_display_name text,
  p_age_band     text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_id    uuid;
begin
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to add a child'
      using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.families
                  where id = p_family_id and deleted_at is null) then
    raise exception 'family % not found', p_family_id
      using errcode = 'no_data_found';
  end if;

  if not public.is_family_owner(p_family_id, v_actor)
     and not public.is_privileged(v_actor) then
    raise exception 'only the owner may add a child to this family'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(btrim(p_display_name), '') = '' then
    raise exception 'a child needs a name'
      using errcode = 'invalid_parameter_value';
  end if;

  -- A child profile has no login (lp_no_child_login_yet) and an adult profile
  -- is not a child. The bands below are the ones a child can have.
  if p_age_band not in ('5-7','8-10','11-13','14-17') then
    raise exception
      'unsupported age band for a child: %. An adult should sign up instead',
      coalesce(p_age_band, '<null>')
      using errcode = 'invalid_parameter_value';
  end if;

  insert into public.learner_profiles
    (family_id, linked_user_id, display_name, learner_type, age_band, status)
  values
    (p_family_id, null, btrim(p_display_name), 'child', p_age_band, 'active')
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'family.child_added', 'family', p_family_id,
          jsonb_build_object('learner_profile_id', v_id,
                             'age_band', p_age_band));

  return v_id;
end;
$$;

revoke all on function public.add_child_to_family(uuid, text, text) from public;
grant execute on function public.add_child_to_family(uuid, text, text) to authenticated;

comment on function public.add_child_to_family(uuid, text, text) is
  'Creates a child learner_profile under the family, with no login, per D2. Owner or privileged.';
