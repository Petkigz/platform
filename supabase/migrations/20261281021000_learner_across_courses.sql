-- -----------------------------------------------------------------------------
-- One learner, every course — the same rows, in one shape
-- -----------------------------------------------------------------------------
-- The owner asked, on 2026-11-02, for the view that had been refused: a learner's
-- courses read together rather than one at a time. That refusal was recorded on
-- 2026-10-19 and it was about a different question, so the reversal is narrow and
-- this header is where the difference is written down.
--
-- **What stays refused.** A course author seeing a learner across courses. A teacher
-- reads a learner only inside a cohort that pins the version the teacher authored —
-- `can_read_learner_course_progress()`, which also requires both switches on. If a
-- learner is enrolled in three courses by three authors, no one author learns that
-- the other two exist. Nothing here widens that predicate, and this function does not
-- call it: for a caller who is not the learner, their family or their guardian, this
-- function returns nothing at all, because the only branch it has is
-- `can_access_learner()`.
--
-- **What stops being refused.** The household reading one child's learning across
-- every course. A parent can already open each course's page and read the same
-- enrolment and progress rows one at a time; what they could not do is see the list.
-- That is not a new permission, it is a missing query — and the proof is that every
-- column returned here is a column `course_enrolments` or `lesson_progress` already
-- hands them, under the policies they already hold.
--
-- **The rule this is built on, because it is the rule that makes the reversal safe:**
-- *a view may add shape, never reach.* This function returns rows only where
-- `can_access_learner()` is true for the caller and the learner, which is the same
-- predicate behind thirteen policies; the learner's own id is the only argument, so a
-- caller cannot point it at somebody else's household.
--
-- **Two things it deliberately does not fold in:**
--
--   1. An adult learning share (`may_read_shared_learning`) has a *scope* — progress,
--      achievements, or both — and a view that merged them would hand a
--      progress-only grantee the certificate numbers. `/account/sharing` already
--      renders that view with the scope respected, and this function does not.
--   2. A teacher's cohort roster already exists and carries the name and the age band
--      (`cohort_learner_progress`). A single-learner report for a teacher would be a
--      second route to the same rows, and the second route is where the guard gets
--      forgotten.

create or replace function public.learner_across_courses(p_learner_profile_id uuid)
returns table (
  enrolment_id      uuid,
  course_id         uuid,
  course_slug       text,
  course_title      text,
  enrolment_status  text,
  enrolled_at       timestamptz,
  lessons_completed integer,
  lessons_in_version integer,
  percent_complete  numeric,
  last_activity_at  timestamptz,
  certificate_number text,
  certificate_status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if v_actor is null then
    raise exception 'sign in to read a learner''s courses'
      using errcode = 'insufficient_privilege';
  end if;

  -- The same predicate thirteen policies read, and the same one that decides a
  -- guardian's reach. A learner with no profile, a stranger's child and an id that
  -- does not exist all get the same answer, so the refusal cannot be used to learn
  -- that somebody exists.
  if p_learner_profile_id is null
     or not public.can_access_learner(p_learner_profile_id) then
    raise exception 'you cannot read that learner''s learning'
      using errcode = 'insufficient_privilege';
  end if;

  return query
    select ce.id,
           c.id,
           c.slug::text,
           c.title::text,
           ce.status::text,
           ce.enrolled_at,
           coalesce(s.lessons_done, 0)::integer,
           coalesce(s.lessons_total, 0)::integer,
           s.percent_complete,
           p.last_seen,
           cert.certificate_number::text,
           cert.status::text
      from public.course_enrolments ce
      join public.courses c
        on c.id = ce.course_id
       and c.deleted_at is null
      -- The completion number comes from the same function the certificate engine
      -- and the cohort roster use, so three screens cannot disagree about "3 of 10".
      left join lateral public.enrolment_progress_summary(ce.id) s on true
      left join lateral (
        select max(lpr.last_seen_at) as last_seen
          from public.lesson_progress lpr
         where lpr.course_enrolment_id = ce.id
      ) p on true
      left join lateral (
        select ct.certificate_number, ct.status
          from public.certificates ct
         where ct.course_enrolment_id = ce.id
         order by ct.issued_at desc
         limit 1
      ) cert on true
     where ce.learner_profile_id = p_learner_profile_id
       and ce.deleted_at is null
     -- A withdrawn enrolment is history rather than learning; a completed one is
     -- the most interesting row on the page. Suspended and expired are shown,
     -- because a course that stopped is a fact the household should see rather
     -- than a row that quietly vanished.
       and ce.status in ('active', 'completed', 'suspended', 'expired')
     order by coalesce(p.last_seen, ce.enrolled_at) desc, c.title;
end;
$$;

revoke all on function public.learner_across_courses(uuid) from public, anon;
grant execute on function public.learner_across_courses(uuid) to authenticated;

comment on function public.learner_across_courses(uuid) is
  'One learner''s live enrolments across every course, with completion from the same summary the certificate engine uses. Only for a caller can_access_learner() already admits — the view adds shape, never reach. A course author reads a learner through can_read_learner_course_progress() and the cohort roster, not here.';

-- -----------------------------------------------------------------------------
-- The screen behind it needs the learner's name, and already has a way to get it
-- -----------------------------------------------------------------------------
-- No new function: `learner_profiles`' own read policy admits the learner, their
-- family, a verified guardian and staff, which is exactly the set this view serves.
-- The page reads the profile row under RLS and then calls the function above; a
-- teacher is redirected because they cannot read the profile, and their screen is
-- the class roster.
