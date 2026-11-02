-- A course report, as a file a teacher can keep.
--
-- The report page has shown events, lessons, enrolments and certificates since
-- 2026-10-21, and the class list beside it has been downloadable since the day
-- after. So the one thing a teacher takes to a meeting — *how is my course doing*
-- — was the one thing that could not leave the platform, and the half-built
-- ledger said so in as many words: "the course report has no file yet, only the
-- class roster does."
--
-- Two decisions are in this file rather than in the route.
--
-- ONE. **The copy is recorded in the same transaction that makes it.** The class
-- roster route logs first and builds the file second, because `log_cohort_roster_export`
-- has nothing else to answer with. Here the report is already a function, so the
-- audit and the numbers can be written together: `export_course_report()` asks
-- `teacher_course_analytics()` for the report, records what it got, and returns
-- it. A file whose download could not be audited is not produced, and the number
-- in `governance_audit_events` is the number in the spreadsheet rather than a
-- second count that might disagree.
--
-- TWO. **It refuses nothing of its own.** Who may read a course report is a rule
-- that already exists — the author, or staff — and so is the switch that turns
-- analytics on. Repeating either here would be a second answer that drifts the
-- first time one of them changes. So this function calls the report and lets it
-- refuse; a raise from there writes no audit row and sends no file.
--
-- What the file is *not*: it is not a list of learners. The report is aggregates
-- by construction (`aggregateOnly: true` travels in the JSON), the CSV builder
-- prints only what is in it, and the row this function writes says
-- `"aggregate_only": true` beside the counts so that a year from now the audit
-- trail itself records which kind of document left.

create or replace function public.export_course_report(
  p_course_id uuid,
  p_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_report   jsonb;
  v_events   bigint;
  v_learners bigint;
begin
  -- One call, so the report and the audit share a snapshot. `teacher_course_analytics()`
  -- raises for a signed-out caller, a stranger's course, and analytics being off —
  -- three sentences the page already prints, which is why they are not rewritten here.
  v_report := public.teacher_course_analytics(p_course_id, p_days);

  v_events   := coalesce((v_report ->> 'events')::bigint, 0);
  v_learners := coalesce((v_report ->> 'learners')::bigint, 0);

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (
    v_actor,
    'course.report_exported',
    'course',
    p_course_id,
    jsonb_build_object(
      'days',          (v_report ->> 'days')::integer,
      'events',        v_events,
      'learners',      v_learners,
      'format',        'csv',
      'aggregate_only', true
    )
  );

  return v_report;
end;
$$;

revoke all on function public.export_course_report(uuid, integer) from public, anon;
grant execute on function public.export_course_report(uuid, integer) to authenticated;

comment on function public.export_course_report(uuid, integer) is
  'The course report, recorded as taken off the platform before it is handed over. Asks teacher_course_analytics() for every figure — including who may read it and whether analytics is on — so there is one rule rather than two, and returns exactly what it audited.';
