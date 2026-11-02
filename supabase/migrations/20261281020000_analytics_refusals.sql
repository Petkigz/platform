-- -----------------------------------------------------------------------------
-- Analytics records refusals, because nothing else does
-- -----------------------------------------------------------------------------
-- Seven events, and every one of them records something that *worked*: a lesson
-- opened, a course looked at, a search run, a plan viewed, a checkout started, a
-- lesson saved, a class joined. The owner asked for more than the coded set, so the
-- first question is what is worth the volume — and the answer here is not "more of
-- the same".
--
-- **A fact that matters and is already in a table does not need a second copy.**
-- Enrolments live in `course_enrolments`, completions in `lesson_progress`,
-- certificates, orders, support cases, reviews, handovers — all recorded, all
-- queryable, all already joined by the reports. Copying them into an append-only
-- store kept forever would duplicate a child's behaviour to answer questions the
-- operational tables answer better, and double the surface where the copy can be
-- wrong. So the new events are not more successes.
--
-- **What no table knows is the refusal.** A door that shut leaves no row anywhere —
-- that is what a refusal *is*: the write did not happen. Which means the platform
-- currently cannot answer the two most useful questions a solo operator has:
--
--   * The enrol button was pressed and the course did not open. How often, and why?
--   * A learner tried to keep a lesson they cannot keep. Is that Basic wanting Plus,
--     or somebody who never enrolled at all?
--
-- Two events, then, and both learner-scoped **false** on purpose. A refusal is a
-- fact about a door, not a person: the reason is the payload that matters, the actor
-- is counted, and no child's id is attached to a row that says they were turned
-- away. That also keeps the writer's `can_access_learner` check out of the path — a
-- parent refused by the very consent gate being counted should not fail to be
-- counted because the gate refused them.
--
-- The reason vocabularies are closed, and they are the vocabularies the refusing
-- code already uses, not a second list invented here:
--
--   * `enrol.refused`  — `guardian_verification_required`, `not_sold_here`,
--                        `payment_required`, `no_published_version`,
--                        `not_available`.
--   * `lesson.save_refused` — `not_entitled`, `needs_plus`, `no_media`,
--                        `not_encoded`, `feature_off`.
--
-- `already_enrolled` and `no_learner_profile` are deliberately *not* refusals inside
-- those vocabularies: one is the success case wearing a button's clothes and the
-- other is a setup step, and either would dominate a count without telling anybody
-- anything they can act on. `web/src/lib/analytics.ts` decides that, with a test.

insert into public.analytics_event_codes (code, description, subject_type, learner_scoped)
values
  ('enrol.refused',
   'Someone pressed enrol and the course did not open. properties.reason says why, from a closed list',
   'course', false),
  ('lesson.save_refused',
   'Someone tried to keep a lesson and could not. properties.reason says why — needs_plus is the plan-upgrade signal',
   'lesson', false)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Why doors closed, as a report
-- ---------------------------------------------------------------------------
-- An event nobody can read is a row nobody uses. The totals report already counts
-- these; the question these events exist for is *which* reason, so the payload has
-- to be readable — and only for these codes, because the other report that reads a
-- payload (`analytics_search_terms`) reads the one field it names and nothing else.
create or replace function public.analytics_refusal_reasons(
  p_code text,
  p_days integer default 30,
  p_limit integer default 20
)
returns table (reason text, events bigint, actors bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_code text := btrim(coalesce(p_code, ''));
begin
  if not public.is_privileged(public.current_user_id()) then
    raise exception 'only platform staff may read analytics'
      using errcode = 'insufficient_privilege';
  end if;
  if p_days is null or p_days < 1 or p_days > 3650 then
    raise exception 'ask for between 1 and 3650 days'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 then
    raise exception 'ask for between 1 and 200 reasons'
      using errcode = 'invalid_parameter_value';
  end if;

  -- A closed list of codes rather than any code with a `reason` field: this
  -- function is the only place a payload is read for grouping, and it should be
  -- unable to read one that was never meant to be grouped.
  if v_code not in ('enrol.refused', 'lesson.save_refused') then
    raise exception '% has no refusal reasons to report', coalesce(nullif(v_code, ''), '(none)')
      using errcode = 'invalid_parameter_value';
  end if;

  return query
    select coalesce(nullif(btrim(a.properties->>'reason'), ''), 'unstated') as reason,
           count(*),
           count(distinct a.actor_id)
      from public.analytics_events a
     where a.event_code = v_code
       and a.occurred_at >= now() - make_interval(days => p_days)
     group by 1
     order by count(*) desc, 1
     limit p_limit;
end;
$$;

revoke all on function public.analytics_refusal_reasons(text, integer, integer) from public, anon;
grant execute on function public.analytics_refusal_reasons(text, integer, integer) to authenticated;

comment on function public.analytics_refusal_reasons(text, integer, integer) is
  'Staff only. Groups a refusal event by the reason the refusing code gave. Reads properties.reason for enrol.refused and lesson.save_refused and refuses any other code.';
