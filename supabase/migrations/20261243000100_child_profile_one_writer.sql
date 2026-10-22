-- A learner profile's identity has one writer.
--
-- `add_child_to_family()` has existed since the family tables did: it checks that the
-- caller owns the family, validates the age band, inserts a child with no login and
-- audits the addition. `lp_insert` nevertheless let **any** active family member insert
-- a child directly — and the screen did exactly that, so a child added through `/family`
-- left no audit row, a billing manager could create a profile they could not then read,
-- and the owner-only rule lived in a function nobody called.
--
-- Two paths to one outcome is how a rule ends up enforced in one of them. So:
--
--   * a **child** is created by `add_child_to_family()`;
--   * an **adult** is created by `claim_own_learner_profile()`;
--   * the table itself admits inserts from staff only. Both writers are definer
--     functions, so neither needs a table-level insert policy to work.
--
-- The same reasoning applies to updating a profile's *identity*. `lp_update` lets a
-- family member edit the row, which a rename needs. It also let them rewrite
-- `learner_type`, `linked_user_id` and `family_id` — so an owner could turn a child's
-- profile into an adult profile linked to an account of their choosing, and with it hand
-- that child's progress and certificates to somebody else. A rename is an edit; a
-- profile becoming a different person is not, and no screen asks for it.

drop policy if exists lp_insert on public.learner_profiles;

create policy lp_insert on public.learner_profiles
  for insert to authenticated
  with check (public.is_privileged(public.current_user_id()));

comment on policy lp_insert on public.learner_profiles is
  'Staff only. A child is created by add_child_to_family() and an adult by claim_own_learner_profile(); both are definer functions and neither needs this policy.';

-- ---------------------------------------------------------------------------
-- What may change about a learner
-- ---------------------------------------------------------------------------
create or replace function public.guard_learner_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  -- Staff may correct anything, in writing, and the audit trail is theirs to read.
  if v_actor is null or public.is_privileged(v_actor) then
    return new;
  end if;

  if (new.learner_type, new.linked_user_id, new.family_id)
     is distinct from
     (old.learner_type, old.linked_user_id, old.family_id) then
    raise exception
      'a learner profile cannot change how it is linked: a profile becoming a different person is not an edit'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

comment on function public.guard_learner_profile_identity() is
  'Refuses a change to learner_type, linked_user_id or family_id by anybody but staff. A display name or an age band may still be corrected.';

drop trigger if exists learner_profiles_identity_guard on public.learner_profiles;
create trigger learner_profiles_identity_guard
  before update on public.learner_profiles
  for each row execute function public.guard_learner_profile_identity();
