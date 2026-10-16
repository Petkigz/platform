-- A family member could not get a new child's id back.
--
-- lp_read was written in terms of is_learner_family_member(p_learner_id),
-- which resolves the learner by joining family_memberships to
-- learner_profiles on family_id. That works for a row that already exists.
-- It does not work for a row being inserted, because the SELECT policy is
-- also applied to an INSERT ... RETURNING result, and at that moment the new
-- tuple is not visible to the separate SECURITY DEFINER query inside the
-- helper. The command counter has not advanced.
--
-- The effect was that a parent could insert a child profile but not read back
-- its id:
--
--   insert into learner_profiles (...) values (...)            -- allowed
--   insert into learner_profiles (...) values (...) returning id  -- refused
--
-- which is exactly the shape every client library uses, since `.insert()`
-- followed by `.select('id')` compiles to RETURNING. The family dashboard
-- would have failed at the first child added.
--
-- The fix is to give lp_read a predicate that depends only on the row's own
-- family_id and on membership rows that are already committed — no join back
-- through learner_profiles. is_family_member_of() does that.
--
-- It deliberately excludes 'billing_manager', the same way
-- is_learner_family_member() does. Paying for a family is not parenting it,
-- and widening this predicate must not quietly undo that.

-- ---------------------------------------------------------------------------
-- A family-scoped membership check
-- ---------------------------------------------------------------------------

create or replace function public.is_family_member_of(
  p_family_id uuid,
  p_user_id   uuid
) returns boolean
language sql stable security definer set search_path = public
as $$
  select p_family_id is not null
     and p_user_id is not null
     and exists (
           select 1 from public.family_memberships fm
            where fm.family_id = p_family_id
              and fm.user_id = p_user_id
              and fm.status = 'active'
              and fm.membership_type <> 'billing_manager');
$$;

comment on function public.is_family_member_of(uuid, uuid) is
  'Active, non-billing-only membership of a family, checked from a family id alone. Unlike is_learner_family_member this needs no join through learner_profiles, so it also works for a row that is being inserted.';

-- ---------------------------------------------------------------------------
-- The read policy
-- ---------------------------------------------------------------------------

drop policy if exists lp_read on public.learner_profiles;
create policy lp_read on public.learner_profiles
  for select to authenticated
  using (
    public.is_own_learner_profile(id)
    or public.is_learner_family_member(id)
    or public.is_family_member_of(family_id, public.current_user_id())
    or public.is_verified_guardian_of(id)
    or public.is_privileged(public.current_user_id())
  );

comment on policy lp_read on public.learner_profiles is
  'Own profile, a family member other than billing-only, a verified guardian with can_view_progress, or platform staff. The is_family_member_of branch is what makes INSERT ... RETURNING work for a child a family member has just added.';
