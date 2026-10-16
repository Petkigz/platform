-- Catalogue visibility.
--
-- Found by supabase/tests/catalogue.test.mjs.
--
-- `courses_read` admitted any course with status = 'active', whether or not it
-- had ever had a version published. An author who set the wrapper to 'active'
-- while the first version was still in draft put the title, description and
-- slug of unpublished work on the public internet. The lessons and versions
-- were correctly hidden; the shop window was not.
--
-- The application already filtered on "has a published version" in
-- web/src/lib/catalogue.ts. That is the right filter to have, but a
-- presentation filter is not an access control: the record lists unpublished
-- courses among the sensitive domains, and one of the project's stated
-- principles is deny by default with RLS as an additional layer. If the query
-- were ever reused somewhere that forgot the filter, the rows were there to
-- leak.
--
-- The rule now enforced in the database:
--
--   * the author always sees their own course, in any state
--   * privileged roles always see it
--   * an enrolled learner always sees it, because a retired version must not
--     strand someone who already paid (D6)
--   * everyone else sees it only once it is active AND has a published version
--
-- Two named helpers rather than inlined EXISTS subqueries, so the policy reads
-- as a rule and the same two predicates can be reused by the catalogue query.

create or replace function public.has_published_version(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.course_versions cv
     where cv.course_id = p_course_id
       and cv.version_status = 'published'
  );
$$;

comment on function public.has_published_version(uuid) is
  'The course has at least one published version. The gate for public catalogue visibility.';

create or replace function public.is_enrolled_in_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.course_enrolments ce
      join public.learner_profiles lp on lp.id = ce.learner_profile_id
     where ce.course_id = p_course_id
       and ce.status = 'active'
       and public.can_access_learner(lp.id)
  );
$$;

comment on function public.is_enrolled_in_course(uuid) is
  'The viewer (or a learner they may act for) is actively enrolled. Keeps a course reachable after its version is retired — D6.';

drop policy if exists courses_read on public.courses;
create policy courses_read on public.courses
  for select to anon, authenticated
  using (
    deleted_at is null
    and (
      created_by = public.current_user_id()
      or public.is_privileged(public.current_user_id())
      or public.is_enrolled_in_course(id)
      or (status = 'active' and public.has_published_version(id))
    )
  );
