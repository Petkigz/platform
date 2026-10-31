-- Did the schema actually land?
--
-- Paste this whole file into the Supabase SQL editor and read the result. It is
-- one statement, so the editor shows exactly these rows and nothing else, and it
-- writes nothing: every line is a count or an existence check.
--
-- Why this exists at all: `supabase db push` (or a loop of psql) either prints a
-- wall of notices or fails at file 87 of 203, and neither tells you whether the
-- *deployment* is sound. What you want to know, in one look, is: is the schema
-- here, is the sign-up trigger attached, is there anybody who can administer it,
-- and is there anything to study.
--
-- Expected on a brand-new project, before you have signed up: tables and policies
-- in the hundreds, the trigger present, roles 10, people 0, **staff 0**, and no
-- courses. If `staff` reads 0 you have not finished — see step 3 of
-- `docs/deploy/README.md`. `supabase/tests/deploy_runbook.test.mjs` runs this file, so it
-- cannot quietly stop matching the schema it describes.

with facts as (
  select 1 as n, 'tables' as fact,
         (select count(*)::text from pg_tables where schemaname = 'public') as value,
         'the schema is here at all' as means

  union all
  select 2, 'policies',
         (select count(*)::text from pg_policies where schemaname = 'public'),
         'row level security rules; a table without any is readable by anybody holding the anon key'

  union all
  select 3, 'signup trigger',
         (select case
                   when exists (select 1 from pg_trigger where tgname = 'on_auth_user_created')
                     then 'present'
                   else 'MISSING'
                 end),
         'creates a profile when somebody signs up; without it a new account cannot be given a role'

  union all
  select 4, 'roles',
         (select count(*)::text from public.roles),
         'the role vocabulary the two writers below will accept'

  union all
  select 5, 'people',
         (select count(*)::text from public.user_profiles),
         'accounts that have a profile'

  union all
  select 6, 'staff',
         (select count(*)::text from public.user_profiles p where public.is_privileged(p.user_id)),
         'people who can administer this deployment; 0 means nobody can yet'

  union all
  select 7, 'settings',
         (select count(*)::text from public.platform_settings),
         'every flag and threshold, whether or not anybody has changed one'

  union all
  select 8, 'features on',
         (select count(*)::text from public.platform_settings
           where value_type = 'boolean' and value_text = 'true'),
         'features this deployment currently runs; everything ships off on purpose'

  union all
  select 9, 'subject areas',
         (select count(*)::text from public.subject_areas where parent_subject_id is null),
         'the shelves a course can be filed under'

  union all
  select 10, 'courses',
         (select count(*)::text from public.courses where deleted_at is null),
         'courses that exist in any state'

  union all
  select 11, 'published versions',
         (select count(*)::text from public.course_versions where version_status = 'published'),
         'what a visitor can actually find and study'

  union all
  select 12, 'audit events',
         (select count(*)::text from public.governance_audit_events),
         'the record of who changed what; a new project has only the entries its own seed wrote'
)
select fact, value, means from facts order by n;
