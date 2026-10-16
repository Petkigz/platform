-- Authorization fixes found by supabase/tests/authorization.test.mjs.
--
-- Two defects, both contradictions of the project record's
-- security_privacy_authorization.required_access_tests:
--
--   1. A family member whose membership_type is 'billing_manager' could read
--      the child profiles in that family. is_learner_family_member() delegated
--      to is_active_family_member(), which deliberately ignores
--      membership_type — so paying for the family granted sight of the
--      children. The seeded role description says the opposite: "Handles
--      payment for a family. No automatic access to learning data."
--
--   2. A reviewer assigned to a course version could read the review
--      assignment, the requirements and the decision, but not the content.
--      can_see_review_of() covers the review tables; can_read_version() covers
--      the content, and it admits only published/retired versions, the author
--      and privileged roles. An assigned reviewer looking at a draft saw an
--      empty page. The review workflow was structurally unusable.
--
-- Both are fixed here rather than by editing the Group 1 and Group 2
-- migrations, so the history of how the schema arrived at this shape stays
-- readable.
--
-- Note on scope: the reviewer clause is added to the four SELECT policies
-- only. can_read_version() is also used by the write and update policies on
-- sections, lessons and resources; widening it would have handed reviewers
-- edit rights over content they were asked to assess.

-- ---------------------------------------------------------------------------
-- Fix 1 — paying for a family is not parenting it
-- ---------------------------------------------------------------------------
create or replace function public.is_learner_family_member(p_learner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.learner_profiles lp
      join public.family_memberships fm on fm.family_id = lp.family_id
     where lp.id = p_learner_id
       and lp.family_id is not null
       and fm.user_id = public.current_user_id()
       and fm.status = 'active'
       -- A billing-only member handles payment. Learning data stays out of
       -- their reach unless they are separately a verified guardian.
       and fm.membership_type <> 'billing_manager'
  );
$$;

comment on function public.is_learner_family_member(uuid) is
  'Active family member other than a billing-only member. Paying for a family does not grant sight of its learners.';

-- ---------------------------------------------------------------------------
-- Fix 2 — an assigned reviewer can read what they were asked to review
-- ---------------------------------------------------------------------------
create or replace function public.can_review_version(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.content_review_assignments cra
      join public.reviewer_profiles rp on rp.id = cra.reviewer_profile_id
     where cra.course_version_id = p_version_id
       and rp.user_id = public.current_user_id()
  );
$$;

comment on function public.can_review_version(uuid) is
  'Assigned to review this version. Grants read access to the content under review, never write access.';

-- SELECT only. The write and update policies keep using can_read_version().
drop policy if exists course_versions_read on public.course_versions;
create policy course_versions_read on public.course_versions
  for select to anon, authenticated
  using (public.can_read_version(id) or public.can_review_version(id));

drop policy if exists course_sections_read on public.course_sections;
create policy course_sections_read on public.course_sections
  for select to anon, authenticated
  using (
    public.can_read_version(course_version_id)
    or public.can_review_version(course_version_id)
  );

drop policy if exists lessons_read on public.lessons;
create policy lessons_read on public.lessons
  for select to anon, authenticated
  using (
    exists (
      select 1
        from public.course_sections cs
       where cs.id = lessons.section_id
         and (public.can_read_version(cs.course_version_id)
              or public.can_review_version(cs.course_version_id))
    )
    -- Anonymous visitors see preview lessons only.
    and (public.current_user_id() is not null or is_preview)
  );

drop policy if exists lesson_resources_read on public.lesson_resources;
create policy lesson_resources_read on public.lesson_resources
  for select to anon, authenticated
  using (
    exists (
      select 1
        from public.lessons l
        join public.course_sections cs on cs.id = l.section_id
       where l.id = lesson_resources.lesson_id
         and (public.can_read_version(cs.course_version_id)
              or public.can_review_version(cs.course_version_id))
    )
    and (public.current_user_id() is not null
         or access_classification = 'public_preview')
  );

-- ---------------------------------------------------------------------------
-- Fix 3 — a verified guardian could not see the child they were verified for
--
-- The guardian verification workflow (guardian_relationships plus
-- guardian_verification_cases) is the machinery behind verifiable parental
-- consent. It moved a relationship from pending_verification to active and
-- set can_view_progress — and then nothing anywhere read those columns.
-- lp_read consulted is_own_learner_profile, is_learner_family_member and
-- is_privileged; can_access_learner consulted the same three. A verified
-- guardian who was not also a family member saw an empty dashboard.
--
-- The whole workflow was decorative. Since COPPA makes verifiable parental
-- consent mandatory for US under-13s, this is not a cosmetic gap.
--
-- can_access_learner() is the single gate behind 13 policies covering
-- enrolments, progress, attempts, responses, certificates, allocations and
-- entitlements — so fixing it there restores the whole learning surface at
-- once. It is gated on can_view_progress because every table behind it is
-- progress-adjacent.
-- ---------------------------------------------------------------------------
create or replace function public.is_verified_guardian_of(p_learner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.guardian_relationships gr
     where gr.learner_profile_id = p_learner_id
       and gr.guardian_user_id = public.current_user_id()
       and gr.status = 'active'
  );
$$;

comment on function public.is_verified_guardian_of(uuid) is
  'Holds an active, verified guardian relationship for this learner.';

create or replace function public.can_access_learner(p_learner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_own_learner_profile(p_learner_id)
      or public.is_learner_family_member(p_learner_id)
      or public.is_privileged(public.current_user_id())
      -- A verified guardian, but only where the relationship carries the
      -- progress permission. A guardian approved for identity only does not
      -- inherit sight of grades and certificates.
      or exists (
        select 1
          from public.guardian_relationships gr
         where gr.learner_profile_id = p_learner_id
           and gr.guardian_user_id = public.current_user_id()
           and gr.status = 'active'
           and gr.can_view_progress
      );
$$;

comment on function public.can_access_learner(uuid) is
  'The learner themselves, a family member other than billing-only, a privileged role, or a verified guardian holding can_view_progress.';

-- The profile itself: a verified guardian sees the child they are verified
-- for, whether or not the relationship carries the progress permission.
drop policy if exists lp_read on public.learner_profiles;
create policy lp_read on public.learner_profiles
  for select to authenticated
  using (
    public.is_own_learner_profile(id)
    or public.is_learner_family_member(id)
    or public.is_verified_guardian_of(id)
    or public.is_privileged(public.current_user_id())
  );

drop policy if exists lp_update on public.learner_profiles;
create policy lp_update on public.learner_profiles
  for update to authenticated
  using (
    public.is_own_learner_profile(id)
    or public.is_learner_family_member(id)
    or public.is_verified_guardian_of(id)
    or public.is_privileged(public.current_user_id())
  )
  with check (
    public.is_own_learner_profile(id)
    or public.is_learner_family_member(id)
    or public.is_verified_guardian_of(id)
    or public.is_privileged(public.current_user_id())
  );
