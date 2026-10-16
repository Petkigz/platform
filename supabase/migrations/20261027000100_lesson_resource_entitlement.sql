-- Any signed-in user could read the resources of any published course.
--
-- lesson_resources_read was gated on can_read_version(), which is true for
-- ANY authenticated user once a version is published — that is what makes the
-- public catalogue work. The only additional condition was
-- `current_user_id() is not null or access_classification = 'public_preview'`,
-- which asks whether you are logged in, not whether you are entitled.
--
-- So, measured rather than reasoned:
--
--   enrolled learner              -> saw the resource URL
--   signed-in stranger, no grant  -> saw the same URL
--   anonymous                     -> saw nothing
--   can_access_lesson(stranger)   -> false
--
-- The entitlement function gave the right answer and the policy never asked
-- it. That is the whole of Groups 4 and 5 — products, pricing, subscriptions,
-- promotions, entitlement grants, orders, payments, refunds — sidestepped by
-- creating a free account and reading a column. It is the same class of
-- defect as the free-enrolment hole fixed in
-- 20261023000100_enrolment_gate.sql: the gate existed and nothing consulted
-- it.
--
-- The write policies have the same shape, and are deliberately left alone:
-- lock_lesson_resource_of_locked_version already refuses writes to any
-- non-draft version (verified — a stranger's insert comes back "cannot modify
-- lesson resources of course version ..."), and on a draft can_read_version()
-- is author-or-privileged, so there is no hole to close there.

-- ---------------------------------------------------------------------------
-- Entitlement, resolved from the session
-- ---------------------------------------------------------------------------
--
-- can_access_lesson() takes a learner profile id, not a user id, so it cannot
-- be used in a policy directly. This resolves the profiles the current user
-- may act for — their own, plus any family member they can access — and asks
-- about each.

create or replace function public.can_access_lesson_now(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.learner_profiles lp
     where lp.deleted_at is null
       and (lp.linked_user_id = public.current_user_id()
            or public.is_learner_family_member(lp.id))
       and public.can_access_lesson(lp.id, p_lesson_id)
  );
$$;

comment on function public.can_access_lesson_now(uuid) is
  'can_access_lesson() for the current session, across the learner profiles this user may act for. Exists because the underlying function is keyed on a learner profile and an RLS policy only has a user.';

-- ---------------------------------------------------------------------------
-- The read policy
-- ---------------------------------------------------------------------------

drop policy if exists lesson_resources_read on public.lesson_resources;
create policy lesson_resources_read on public.lesson_resources
  for select to anon, authenticated
  using (
    exists (
      select 1
        from public.lessons l
        join public.course_sections cs on cs.id = l.section_id
       where l.id = lesson_resources.lesson_id
         -- Still requires the version to be one you may read at all, so
         -- drafts stay hidden and reviewers keep their access.
         and (public.can_read_version(cs.course_version_id)
              or public.can_review_version(cs.course_version_id))
         and (
           -- A preview resource is public by design; that is what the
           -- classification is for.
           lesson_resources.access_classification = 'public_preview'
           -- The author, platform staff, and an assigned reviewer.
           or public.can_author_version(cs.course_version_id)
           or public.can_review_version(cs.course_version_id)
           -- Everyone else has to actually be entitled to the lesson.
           or public.can_access_lesson_now(l.id)
         )
    )
  );

comment on policy lesson_resources_read on public.lesson_resources is
  'Readable if the version is readable AND the resource is a public preview, or you authored the version, or you are staff, or you are the assigned reviewer, or you are entitled to the lesson. Being signed in is not enough — that was the defect.';
