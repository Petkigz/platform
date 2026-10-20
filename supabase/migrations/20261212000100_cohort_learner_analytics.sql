-- Cohort-scoped learner analytics: what a teacher may see about a learner.
--
-- THE DECISION THIS IMPLEMENTS
-- ----------------------------
-- `DECISIONS.md`, "What a teacher may see about a learner", settled 2026-10-19.
-- Per-learner progress, inside an opted-in cohort only. A dated cohort is a group
-- somebody joined on purpose, where a teacher knowing who is falling behind is
-- the point of the class. A self-paced catalogue enrolment is a private purchase,
-- and a child's pace is data about a child nobody agreed to share.
--
-- So an author may read enrolment and progress rows **only** for learners with an
-- active membership of one of that course's cohorts, and only for the version the
-- cohort pins. Self-paced learners keep exactly what they have today: nothing.
--
-- WHY THE PREDICATE IS IN SQL AND NOT IN A QUERY FILTER
-- ------------------------------------------------------
-- Because a filter is a thing a second caller forgets. Everything below is
-- enforced where the rows live, so a screen, an API route and an ad-hoc query all
-- get the same answer, and the answer does not depend on who remembered to add a
-- where clause.
--
-- WHY THE ROSTER IS A FUNCTION AND NOT A WIDER POLICY
-- ----------------------------------------------------
-- A teacher needs a learner's *name* for progress to mean anything, and
-- `learner_profiles` is not readable by a course author. Widening `lp_read` would
-- hand a teacher every column of a child's profile, including `family_id` and
-- `linked_user_id` — the two that connect a child to a household and an account,
-- which are nobody's business but the family's. `cohort_learner_progress()`
-- returns four columns instead, and the limit is structural: there is no query a
-- caller can write against this function that returns more.

-- ---------------------------------------------------------------------------
-- The predicate
-- ---------------------------------------------------------------------------

create or replace function public.can_read_learner_course_progress(
  p_learner_profile_id uuid,
  p_course_version_id  uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_learner_profile_id is not null
     and p_course_version_id is not null

     -- Both switches, checked here rather than in a screen. `learning.cohorts`
     -- is the opt-in mechanism and `delivery.analytics` is the reporting
     -- feature; turning either off closes this immediately, without a deploy.
     and public.setting_bool('learning.cohorts', false)
     and public.setting_bool('delivery.analytics', false)

     -- The author of that version, or platform staff. Not "any teacher", and
     -- not "anybody who can see the course".
     and public.can_author_version(p_course_version_id)

     -- And the learner must be an active member of a cohort that pins exactly
     -- this version. The membership is the opt-in; the pin is the scope, so a
     -- learner who moved to a copied version stops being visible under the old
     -- cohort and is only visible again under a cohort that pins the new one.
     --
     -- No condition on the cohort's status: a class that has ended is still the
     -- teacher's class, and `can_read_cohort()` already lets its creator read it.
     -- A learner who left, however, stops being visible at once — `status` and
     -- `left_at` are checked, because a child who leaves a class is exactly the
     -- case where continuing to watch their pace would be wrong.
     and exists (
       select 1
         from public.cohorts c
         join public.cohort_members m on m.cohort_id = c.id
        where c.course_version_id = p_course_version_id
          and c.deleted_at is null
          and m.learner_profile_id = p_learner_profile_id
          and m.status = 'active'
          and m.left_at is null
     );
$$;

revoke all on function public.can_read_learner_course_progress(uuid, uuid) from public;
revoke all on function public.can_read_learner_course_progress(uuid, uuid) from anon;
grant execute on function public.can_read_learner_course_progress(uuid, uuid) to authenticated;

comment on function public.can_read_learner_course_progress(uuid, uuid) is
  'May the caller read this learner''s enrolment and progress for this course version? Only the version''s author or staff, only while both cohort and analytics flags are on, and only for a learner with an active membership of a cohort pinning that version. Decided 2026-10-19: per-learner, inside an opted-in cohort only.';

-- ---------------------------------------------------------------------------
-- Reading enrolments and progress
-- ---------------------------------------------------------------------------
-- Both policies keep their existing branch exactly as it was, so nothing a
-- learner, a parent or a guardian could read becomes unreadable. The new branch
-- is additive, and it is the predicate above.

drop policy if exists course_enrolments_read on public.course_enrolments;
create policy course_enrolments_read on public.course_enrolments
  for select to authenticated
  using (
    deleted_at is null
    and (
      public.can_access_learner(learner_profile_id)
      or public.can_read_learner_course_progress(learner_profile_id, course_version_id)
    )
  );

comment on policy course_enrolments_read on public.course_enrolments is
  'The learner, their family or a guardian — and, since 2026-10-20, the author of the version for a learner in one of that version''s cohorts. A tombstoned enrolment is readable by nobody here.';

drop policy if exists lesson_progress_read on public.lesson_progress;
create policy lesson_progress_read on public.lesson_progress
  for select to authenticated
  using (exists (
    select 1
      from public.course_enrolments ce
     where ce.id = lesson_progress.course_enrolment_id
       and (
         public.can_access_learner(ce.learner_profile_id)
         or (ce.deleted_at is null
             and public.can_read_learner_course_progress(
                   ce.learner_profile_id, ce.course_version_id))
       )
  ));

comment on policy lesson_progress_read on public.lesson_progress is
  'Progress follows the enrolment. The teacher branch is new and additive; the learner, family and guardian branch is unchanged, including for a tombstoned enrolment.';

-- No change to the insert or update policies on either table. A teacher may read
-- a cohort learner's progress and may not write it: marking is a separate act
-- with its own path, and progress is the learner's own record of what they did.

-- ---------------------------------------------------------------------------
-- The roster, with progress
-- ---------------------------------------------------------------------------

create or replace function public.cohort_learner_progress(p_cohort_id uuid)
returns table (
  learner_profile_id  uuid,
  display_name        text,
  learner_type        text,
  age_band            text,
  joined_at           timestamptz,
  enrolment_id        uuid,
  enrolment_status    text,
  lessons_completed   integer,
  lessons_in_progress integer,
  lessons_in_version  integer,
  last_seen_at        timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select lp.id,
         lp.display_name,
         lp.learner_type,
         lp.age_band,
         m.joined_at,
         ce.id,
         ce.status,
         coalesce(s.lessons_done, 0)::integer,
         coalesce(p.in_progress, 0),
         coalesce(s.lessons_total, 0)::integer,
         p.last_seen
    from public.cohorts c
    join public.cohort_members m
      on m.cohort_id = c.id
     and m.status = 'active'
     and m.left_at is null
    join public.learner_profiles lp
      on lp.id = m.learner_profile_id
     and lp.deleted_at is null
    left join public.course_enrolments ce
      on ce.learner_profile_id = lp.id
     and ce.course_version_id = c.course_version_id
     and ce.deleted_at is null
    -- The completion number a teacher sees comes from the same function that
    -- decides whether a course is complete, so the two cannot disagree: a roster
    -- that said "3 of 10" while the certificate engine said otherwise would be
    -- worse than no roster.
    left join lateral public.enrolment_progress_summary(ce.id) s on true
    left join lateral (
      select count(*) filter (where lpr.status = 'in_progress')::integer as in_progress,
             max(lpr.last_seen_at) as last_seen
        from public.lesson_progress lpr
       where lpr.course_enrolment_id = ce.id
    ) p on true
   where c.id = p_cohort_id
     and c.deleted_at is null
     -- The teacher who opened this cohort, or staff. Reused rather than
     -- restated: this is the same question the roster already answers.
     and public.can_manage_cohort(p_cohort_id)
     -- And, per learner, the predicate that decides the whole feature. A cohort
     -- this caller manages but whose version they did not author returns nothing,
     -- which is the safe direction.
     and public.can_read_learner_course_progress(lp.id, c.course_version_id)
   order by lp.display_name, lp.id;
$$;

revoke all on function public.cohort_learner_progress(uuid) from public;
revoke all on function public.cohort_learner_progress(uuid) from anon;
grant execute on function public.cohort_learner_progress(uuid) to authenticated;

comment on function public.cohort_learner_progress(uuid) is
  'The cohort roster with each member''s progress in the version the cohort pins: name, type, age band, enrolment status, lessons completed and in progress out of the total, and when they were last seen. SECURITY DEFINER because a course author may not read learner_profiles, and it returns four columns of it rather than the row — family_id and linked_user_id stay out of a teacher''s reach.';

-- ---------------------------------------------------------------------------
-- The flag, corrected
-- ---------------------------------------------------------------------------
-- `delivery.analytics` was seeded before this decision existed, and its
-- preconditions listed a privacy review that has since been done and recorded.
-- Leaving the stale text would tell an admin that a blocker remains when it does
-- not, and hide the one that does.

update public.platform_settings
   set description = 'Teachers see per-learner progress for the cohorts they opened',
       preconditions = 'Privacy boundary decided and recorded 2026-10-19 (per-learner, inside an '
                       'opted-in cohort only) and enforced by '
                       'can_read_learner_course_progress(); `learning.cohorts` must also be on. '
                       'What is still open: retention — how long progress is kept after a cohort '
                       'ends or a learner leaves — and event instrumentation beyond lesson progress'
 where key = 'delivery.analytics';
