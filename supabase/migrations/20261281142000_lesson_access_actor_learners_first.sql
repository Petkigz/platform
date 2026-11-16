-- can_access_lesson_now() scanned every learner profile and called
-- is_learner_family_member() and can_access_lesson() for each row, even for a
-- caller with no learners at all. That made every lesson-resource and
-- rendition policy check pay for the whole learner table. The actor's own
-- learners are now materialized first (linked account, or an active
-- non-billing family membership — exactly what is_learner_family_member()
-- checks), and can_access_lesson() runs only for those. The predicate is
-- unchanged; the materialized set also stops the planner from evaluating
-- can_access_lesson() for learners the caller cannot act for.
create or replace function public.can_access_lesson_now(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with mine as materialized (
    select lp.id
      from public.learner_profiles lp
     where lp.deleted_at is null
       and (lp.linked_user_id = public.current_user_id()
            or lp.family_id in (
              select fm.family_id
                from public.family_memberships fm
               where fm.user_id = public.current_user_id()
                 and fm.status = 'active'
                 and fm.membership_type <> 'billing_manager'))
  )
  select exists (
    select 1 from mine where public.can_access_lesson(mine.id, p_lesson_id)
  );
$$;
