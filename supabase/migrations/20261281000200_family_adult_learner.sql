-- An adult in a family account is also a learner.
--
-- WHAT WAS WRONG
-- --------------
-- A family could hold children and nothing else. `claim_own_learner_profile()`
-- creates the signed-in adult's own profile with `family_id` null, and
-- `add_child_to_family()` writes `learner_type = 'child'` unconditionally. So a
-- parent who ran a family account had two disconnected identities:
--
--   * the family, holding their children, with the plan and the seats;
--   * their own learner profile, outside it, invisible on /family.
--
-- `allocate_subscription_learner()` already expected the other world. It has an
-- `'adult'` slot type and the rule "an adult slot may only be assigned to your
-- own learner profile" — a seat for the parent, which no screen could fill
-- because the parent's profile was never in the family.
--
-- WHY IT COULD NOT JUST BE AN UPDATE
-- ----------------------------------
-- `guard_learner_profile_identity()` refuses any change to `family_id` from
-- anybody but staff. That guard is right: it stops an owner turning a child's
-- profile into an adult linked to an account of their choosing. But it made
-- "put my own profile in my own family" impossible too.
--
-- So the guard learns exactly one exception, and it is written in terms of rows
-- rather than of a caller's intent, because a trigger cannot see intent:
--
--   an **adult** profile whose `linked_user_id` is the actor may move to
--   `null`, or to a family the actor is an active member of.
--
-- Nothing else moves. `learner_type` and `linked_user_id` are still frozen for
-- everybody but staff, a child's `family_id` is still frozen, and a profile may
-- not be moved into a family it does not belong to. An adult moving their own
-- learning beside their children is not a privilege escalation: they already
-- own that profile, and membership of the target family is checked.
--
-- One more condition, also in the guard so it holds on every path: a profile
-- may not leave a family while it holds an active plan seat. Otherwise the
-- family would keep paying for a learner who is no longer in it, and the
-- allocation row would name a person the family cannot see.
--
-- WHAT IS BUILT
-- -------------
--   claim_family_adult_learner(family)   join yourself to a family you belong to
--   release_family_adult_learner(family) take yourself out again
--
-- Both are SECURITY DEFINER for one reason only: the audit row and the
-- profile write must land together. The actor is still `current_user_id()`,
-- never a parameter, and every rule above is re-checked inside them.

-- ---------------------------------------------------------------------------
-- The one exception in the identity guard
-- ---------------------------------------------------------------------------
create or replace function public.guard_learner_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_is_own_adult boolean;
  v_stays_put boolean;
begin
  -- Staff may correct anything, in writing, and the audit trail is theirs to read.
  if v_actor is null or public.is_privileged(v_actor) then
    return new;
  end if;

  -- Nothing about *who this profile is* may change, in any case.
  if (new.learner_type, new.linked_user_id)
     is distinct from
     (old.learner_type, old.linked_user_id) then
    raise exception
      'a learner profile cannot change how it is linked: a profile becoming a different person is not an edit'
      using errcode = 'insufficient_privilege';
  end if;

  if new.family_id is not distinct from old.family_id then
    return new;
  end if;

  -- The family is changing. Which changes are allowed?
  v_is_own_adult := old.learner_type = 'adult'
                    and old.linked_user_id = v_actor;

  if not v_is_own_adult then
    raise exception
      'a learner profile cannot change how it is linked: a profile becoming a different person is not an edit'
      using errcode = 'insufficient_privilege';
  end if;

  -- Out of a family, or into one the actor is actually a member of.
  v_stays_put := new.family_id is null
                 or public.is_active_family_member(new.family_id, v_actor);

  if not v_stays_put then
    raise exception
      'you may only move your own learning into a family you are a member of'
      using errcode = 'insufficient_privilege';
  end if;

  -- A seat is paid for by the family. Leaving it while holding one would leave
  -- the family paying for a learner it can no longer see.
  if exists (
    select 1
      from public.family_plan_allocations fpa
     where fpa.learner_profile_id = old.id
       and fpa.status = 'active'
  ) then
    raise exception
      'this learning holds a seat on a family plan, so it cannot leave the family until that seat is released'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

comment on function public.guard_learner_profile_identity() is
  'Refuses a change to learner_type or linked_user_id by anybody but staff. family_id may change only for the actor''s own adult profile, only to a family they belong to or to null, and never while it holds an active plan seat.';

-- ---------------------------------------------------------------------------
-- Joining
-- ---------------------------------------------------------------------------
create or replace function public.claim_family_adult_learner(p_family_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_existing public.learner_profiles;
  v_name     text;
  v_id       uuid;
  v_joined   boolean := false;
begin
  if v_actor is null then
    raise exception 'sign in to learn as yourself in a family'
      using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.families
                  where id = p_family_id and deleted_at is null) then
    raise exception 'family % not found', p_family_id
      using errcode = 'no_data_found';
  end if;

  if not public.is_active_family_member(p_family_id, v_actor) then
    raise exception 'you are not a member of this family'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_existing
    from public.learner_profiles lp
   where lp.linked_user_id = v_actor
     and lp.deleted_at is null;

  if found then
    if v_existing.learner_type <> 'adult' then
      raise exception 'this account already has a child profile, which cannot learn as the account'
        using errcode = 'check_violation';
    end if;

    if v_existing.family_id = p_family_id then
      -- Already done. The second click gets the same answer.
      return jsonb_build_object(
        'learnerProfileId', v_existing.id,
        'created', false,
        'joined', false,
        'displayName', v_existing.display_name
      );
    end if;

    if v_existing.family_id is not null then
      raise exception
        'your learning already belongs to another family; leave that family first'
        using errcode = 'check_violation';
    end if;

    -- Out of nowhere and into this family, keeping the same profile: the same
    -- progress, the same certificates, the same enrolments.
    update public.learner_profiles
       set family_id = p_family_id
     where id = v_existing.id;

    v_id := v_existing.id;
    v_joined := true;
    v_name := v_existing.display_name;
  else
    select nullif(btrim(up.display_name), '')
      into v_name
      from public.user_profiles up
     where up.user_id = v_actor;

    v_name := coalesce(v_name, 'My learning');

    insert into public.learner_profiles
      (family_id, linked_user_id, display_name, learner_type, age_band, status)
    values
      (p_family_id, v_actor, v_name, 'adult', '18+', 'active')
    returning id into v_id;
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'family.adult_learner_joined', 'family', p_family_id,
          jsonb_build_object('learner_profile_id', v_id,
                             'created', not v_joined,
                             'linked', v_joined));

  return jsonb_build_object(
    'learnerProfileId', v_id,
    'created', not v_joined,
    'joined', v_joined,
    'displayName', v_name
  );
end;
$$;

revoke all on function public.claim_family_adult_learner(uuid) from public, anon;
grant  execute on function public.claim_family_adult_learner(uuid) to authenticated;

comment on function public.claim_family_adult_learner(uuid) is
  'Puts the signed-in adult''s own learner profile inside a family they are an active member of, creating it there if they have none. Idempotent. Keeps the same profile — and therefore the same progress — when one already existed outside any family.';

-- ---------------------------------------------------------------------------
-- Leaving
-- ---------------------------------------------------------------------------
create or replace function public.release_family_adult_learner(p_family_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_id    uuid;
begin
  if v_actor is null then
    raise exception 'sign in first'
      using errcode = 'insufficient_privilege';
  end if;

  select lp.id into v_id
    from public.learner_profiles lp
   where lp.linked_user_id = v_actor
     and lp.family_id = p_family_id
     and lp.learner_type = 'adult'
     and lp.deleted_at is null;

  if not found then
    raise exception 'this account does not learn inside that family'
      using errcode = 'no_data_found';
  end if;

  -- The guard raises if a seat is held; this makes the message specific.
  if exists (select 1 from public.family_plan_allocations fpa
              where fpa.learner_profile_id = v_id and fpa.status = 'active') then
    raise exception
      'this learning holds a seat on the family plan. Ask whoever manages the plan to release the seat first.'
      using errcode = 'insufficient_privilege';
  end if;

  update public.learner_profiles
     set family_id = null
   where id = v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'family.adult_learner_released', 'family', p_family_id,
          jsonb_build_object('learner_profile_id', v_id));

  return jsonb_build_object('learnerProfileId', v_id, 'released', true);
end;
$$;

revoke all on function public.release_family_adult_learner(uuid) from public, anon;
grant  execute on function public.release_family_adult_learner(uuid) to authenticated;

comment on function public.release_family_adult_learner(uuid) is
  'Takes the signed-in adult''s own learner profile out of a family. The profile itself survives with all its progress; it simply stops being part of the family. Refused while it holds an active plan seat.';

-- ---------------------------------------------------------------------------
-- Which adult learners are in this family
-- ---------------------------------------------------------------------------
-- Read by /family so the page can say "you learn here" without a second query
-- per family, and without the page deriving it from a list it then has to
-- filter. RLS decides whether the caller may see the row; this only answers the
-- question the page actually asks.
--
-- The filter is written out rather than delegated to `lp_read`, because a
-- SECURITY DEFINER function reads the table as its owner and RLS does not apply
-- inside it. Relying on the policy here would have been a comment, not a rule.
create or replace function public.family_adult_learners(p_family_id uuid)
returns table (
  learner_profile_id uuid,
  display_name       text,
  linked_user_id     uuid,
  age_band           text,
  status             text,
  is_me              boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select lp.id, lp.display_name, lp.linked_user_id, lp.age_band, lp.status,
         lp.linked_user_id = public.current_user_id()
    from public.learner_profiles lp
   where lp.family_id = p_family_id
     and lp.learner_type = 'adult'
     and lp.deleted_at is null
     and (public.is_learner_family_member(lp.id)
          or lp.linked_user_id = public.current_user_id()
          or public.is_privileged(public.current_user_id()))
   order by lp.display_name;
$$;

revoke all on function public.family_adult_learners(uuid) from public, anon;
grant  execute on function public.family_adult_learners(uuid) to authenticated;

comment on function public.family_adult_learners(uuid) is
  'The adult learner profiles inside a family. A billing-only member sees their own and nobody else''s; the policy for that is the same one lp_read uses.';
