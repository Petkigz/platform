-- ---------------------------------------------------------------------------
-- Anyone signed in could file a guardian request against any child.
--
-- gr_insert allowed a request whenever the caller named themselves as the
-- guardian:
--
--     guardian_user_id = current_user_id()
--       or is_learner_family_member(learner_profile_id)
--       or is_privileged(current_user_id())
--
-- The first branch is satisfied by any session, for any child. Measured as a
-- real authenticated stranger against a child in somebody else's family:
--
--     stranger files a guardian request -> ACCEPTED
--       state: {"status":"pending_verification","unverified":true}
--       is_verified_guardian_of(child) -> false
--
-- So it is not an access leak, and that distinction is the reason this went
-- unnoticed: the relationship is created unverified and grants nothing, and
-- is_verified_guardian_of() correctly says false. Nothing was exposed.
--
-- What it is, is an abuse vector on a legal review queue. Every request lands
-- in the guardian verification queue that a human has to work through, and the
-- queue is the COPPA verifiable-parental-consent process. A signed-in account
-- could queue unlimited claims against any child in the system — noise at best,
-- a way to bury or harass a real family's request at worst, and a way to make a
-- consent queue that has a retention obligation attached fill up with junk that
-- then has to be retained.
--
-- The fix drops the self-nomination branch and keeps the two that carry
-- meaning:
--
--   * a member of the child's family may create the relationship, for
--     themselves or by nominating another adult — which is how a parent adds a
--     grandparent
--   * privileged staff may do either
--
-- The legitimate case still works, because a parent who creates the family and
-- the child profile is a member of that family. What no longer works is asking
-- about a child you have no connection to at all.
--
-- Note that is_learner_family_member() excludes billing-only members. That is
-- deliberate and unchanged: being the person who pays is not being the person
-- who parents, and conflating them here would be exactly the mistake the
-- family model exists to avoid.
--
-- gr_read keeps its original shape. A stranger can no longer create a row, so
-- the branch is unreachable for them; leaving it alone means a nominating
-- family member can still see the request they filed for someone else.
-- ---------------------------------------------------------------------------

drop policy if exists gr_insert on public.guardian_relationships;

create policy gr_insert on public.guardian_relationships
  for insert to authenticated
  with check (
    public.is_privileged(public.current_user_id())
    or public.is_learner_family_member(learner_profile_id)
  );

comment on policy gr_insert on public.guardian_relationships is
  'A guardian relationship may be created by a member of the child''s family '
  '(for themselves, or by nominating another adult) or by privileged staff. '
  'Self-nomination by an unrelated user was removed: it granted no access, but '
  'it let any signed-in account fill the COPPA consent review queue with '
  'claims against any child.';
