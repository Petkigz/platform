-- A teacher could not create a course.
--
-- WHAT HAPPENED
-- -------------
-- `createCourse()` in `web/src/lib/authoring.ts` creates a course and its first
-- version together — a course with no version has nowhere to put content and
-- nothing to publish — and it asks the database for the version's id in the same
-- call, because the next thing the screen does is navigate to that version's
-- editor:
--
--     const { data, error } = await supabase
--       .from('course_versions')
--       .insert({ course_id: courseId, version_number: 1, created_by: args.userId })
--       .select('id')
--       .single();
--
-- That is an `INSERT ... RETURNING`, and PostgreSQL requires the returned row to
-- pass the table's **SELECT** policy as well as its INSERT policy.
-- `course_versions_read` was `can_read_version(id) OR can_review_version(id)`,
-- and `can_read_version` is a STABLE function that looks the row up in
-- `course_versions` — a query that runs on the snapshot taken when the statement
-- began, **which cannot contain the row the statement is inserting**. So the
-- read-back failed with
--
--     new row violates row-level security policy for table "course_versions"
--
-- while the insert itself was fine. The visible result: the course row was
-- already committed, the version never appeared, and the teacher was shown a
-- refusal that sounds like "you are not allowed to do this" — on the first
-- thing a new teacher does. There was then a course on `/admin` that nobody
-- could open, publish or delete, because a course with no version has no editor.
--
-- WHY NOTHING CAUGHT IT
-- ---------------------
-- Every database suite creates courses through the harness as the superuser;
-- every web test passes a fake client. The one path that runs as a teacher —
-- insert, then read back through two policies — had never been executed. It is
-- exactly the class of defect a journey finds and a feature suite cannot: the
-- insert policy was right, the select policy was right, and the two together
-- were wrong.
--
-- THE FIX
-- -------
-- `can_read_version` already admits `created_by = current_user_id()` as its first
-- clause. Restating that one clause as a direct policy expression lets the
-- RETURNING check decide on the row in hand rather than by looking it up. For an
-- existing row this changes nothing at all — the same author was already
-- admitted by the function — and for a row being inserted it can only be the
-- caller's own.
--
-- This is deliberately not a second copy of the rule: the rule is still
-- `can_read_version`, which still owns publication, retirement and takedown. It
-- is the one clause of it that has to be evaluated **on the row** because the
-- function cannot see a row that does not exist yet.

drop policy if exists course_versions_read on public.course_versions;

create policy course_versions_read on public.course_versions
  for select to anon, authenticated
  using (
    created_by = public.current_user_id()
    or public.can_read_version(id)
    or public.can_review_version(id)
  );

comment on policy course_versions_read on public.course_versions is
  'The author reads their own row directly and everybody else goes through can_read_version()/can_review_version(). The first clause is what makes INSERT … RETURNING work: a function looking the row up cannot see a row the same statement is creating. Anonymous readers are still admitted to published versions through can_read_version(), which is what makes the catalogue and anonymous lesson search work.';
