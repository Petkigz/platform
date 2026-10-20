-- How full is this class?
--
-- `cohort_member_count()` was written for exactly this question — its own comment
-- says it exists "for the joiner-facing '3 of 12 places'" — and nothing ever
-- called it. Meanwhile `/courses/[slug]` offers a learner a Join button next to
-- "Up to 12 learners" with no idea how many of those places are taken, so the
-- way to find out a class is full is to press the button and be refused by
-- `join_cohort()`.
--
-- The reason it stayed unbuilt is the privacy boundary, and the boundary is
-- right: `cohort_members_read` is deliberately narrower than `cohorts_read`, so a
-- learner sees their own membership row and their family's, and never a class
-- list of other people's children. That rules out the obvious implementation —
-- counting rows client-side, which is what the teacher-facing path does, because
-- a teacher may read the roster.
--
-- So the count comes from a function instead of a query. It is SECURITY DEFINER
-- because it has to read rows the caller may not, and it returns a number and
-- nothing else: no names, no profile ids, no membership rows. One cohort's
-- fullness is one integer, and an integer about a class a caller may already read
-- discloses nobody.
--
-- A cohort the caller cannot read returns no row at all rather than a zero, so
-- "empty" and "none of your business" are different answers. The caller treats a
-- missing row as unknown, and an unknown count never fills a class: refusing a
-- joiner because a count could not be read would be worse than letting them try.

create or replace function public.cohort_places(p_cohort_ids uuid[])
returns table (cohort_id uuid, active_members integer)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, public.cohort_member_count(c.id)
    from public.cohorts c
   where c.id = any (coalesce(p_cohort_ids, '{}'))
     and public.can_read_cohort(c.id)
   order by c.starts_at;
$$;

revoke all on function public.cohort_places(uuid[]) from public, anon;
grant execute on function public.cohort_places(uuid[]) to authenticated;

comment on function public.cohort_places(uuid[]) is
  'How many active members each readable cohort has, one row per cohort, for the joiner-facing "3 of 12 places". A cohort the caller cannot read is absent rather than zero. Returns counts only: the roster stays behind can_read_cohort_member().';

comment on function public.cohort_member_count(uuid) is
  'Returns only the number of active members, not their identities; readable only by a caller who can read the cohort. The definition cohort_places() uses for each cohort.';
