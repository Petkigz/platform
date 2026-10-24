-- ---------------------------------------------------------------------------
-- A lesson remembers where you were
-- ---------------------------------------------------------------------------
-- `lesson_progress` has carried `last_video_position` since the first week and
-- nothing has ever written it. Every player in the product starts at zero, so a
-- learner who closes a forty-minute recitation at minute thirty-one finds minute
-- one again the next evening. For a Qur'an course that is not an inconvenience;
-- it is the difference between memorising a passage and never getting past its
-- opening.
--
-- The column is already the right shape — "resume position, in seconds, only
-- meaningful for timed media" — so this is a writer, a reader, and nothing else.
-- What it is NOT is the progress percentage: moving a player does not complete a
-- lesson, and a completed lesson does not become unfinished because somebody
-- reopened it and listened to the first minute again.
--
-- Three rules in the writer.
--
--   1. THE LEARNER, NOT THE BUTTON. `can_access_learner()` is the same helper the
--      table's RLS policy uses, called explicitly because a definer function does
--      not run under RLS. A position is a small thing to leak, but it is still a
--      record of what a child was doing at nine o'clock in the evening.
--
--   2. THE PINNED VERSION, NOT ANY LESSON. A lesson id from another version is
--      refused, for the same reason progress is pinned: a learner is enrolled in
--      one version of a course, and a position against a lesson that version does
--      not contain is a row that cannot be explained later.
--
--   3. NOTHING GOES BACKWARDS. Completion stays completion. Reopening a finished
--      lesson records where the player is and leaves the status alone; a progress
--      bar that drops to 40% because somebody rewatched the introduction is a bug
--      report waiting to happen.
-- ---------------------------------------------------------------------------

create or replace function public.record_lesson_position(
  p_enrolment_id uuid,
  p_lesson_id    uuid,
  p_seconds      integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor     uuid := public.current_user_id();
  v_enrolment public.course_enrolments;
  v_seconds   integer := greatest(0, least(coalesce(p_seconds, 0), 86400));
  v_row       public.lesson_progress;
begin
  if v_actor is null then
    raise exception 'sign in to keep your place'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_enrolment from public.course_enrolments where id = p_enrolment_id;
  if v_enrolment.id is null then
    raise exception 'no such enrolment' using errcode = 'P0002';
  end if;

  if not public.can_access_learner(v_enrolment.learner_profile_id) then
    raise exception 'that is not your learning' using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1
      from public.lessons l
      join public.course_sections sec on sec.id = l.section_id
     where l.id = p_lesson_id
       and sec.course_version_id = v_enrolment.course_version_id
  ) then
    raise exception 'that lesson is not in the version this learner is on'
      using errcode = 'check_violation';
  end if;

  insert into public.lesson_progress
    (course_enrolment_id, lesson_id, status, last_video_position, started_at, last_seen_at)
  values
    (p_enrolment_id, p_lesson_id,
     case when v_seconds > 0 then 'in_progress' else 'not_started' end,
     v_seconds, now(), now())
  on conflict (course_enrolment_id, lesson_id) do update
    set last_video_position = excluded.last_video_position,
        last_seen_at        = now(),
        started_at          = coalesce(public.lesson_progress.started_at, now()),
        -- A finished lesson stays finished; anything else becomes in progress.
        -- `skipped` is left alone too: it was a decision, not a place.
        status = case
                   when public.lesson_progress.status in ('completed', 'skipped')
                     then public.lesson_progress.status
                   when excluded.last_video_position > 0 then 'in_progress'
                   else public.lesson_progress.status
                 end
  returning * into v_row;

  return jsonb_build_object(
    'lessonId', p_lesson_id,
    'seconds',  v_row.last_video_position,
    'status',   v_row.status,
    'savedAt',  v_row.last_seen_at);
end;
$$;

revoke all on function public.record_lesson_position(uuid, uuid, integer) from public, anon;
grant execute on function public.record_lesson_position(uuid, uuid, integer) to authenticated;

comment on function public.record_lesson_position(uuid, uuid, integer) is
  'Remember where a learner stopped in one lesson. Never completes a lesson, never un-completes one, and refuses a lesson from a version the learner is not on.';

-- ---------------------------------------------------------------------------
-- The whole enrolment at once
-- ---------------------------------------------------------------------------
-- The lesson list wants to say "resume at 12:31" beside every lesson, which is a
-- question about twenty rows, not one. A per-lesson call would be twenty round
-- trips to paint a sidebar, so this returns the map in one.
create or replace function public.lesson_positions(p_enrolment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor     uuid := public.current_user_id();
  v_enrolment public.course_enrolments;
begin
  if v_actor is null then
    raise exception 'sign in to see where you were'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_enrolment from public.course_enrolments where id = p_enrolment_id;
  if v_enrolment.id is null then
    raise exception 'no such enrolment' using errcode = 'P0002';
  end if;

  if not public.can_access_learner(v_enrolment.learner_profile_id) then
    raise exception 'that is not your learning' using errcode = 'insufficient_privilege';
  end if;

  return coalesce((
    select jsonb_object_agg(lp.lesson_id::text, lp.last_video_position)
      from public.lesson_progress lp
     where lp.course_enrolment_id = p_enrolment_id
       and lp.last_video_position is not null
       and lp.last_video_position > 0), '{}'::jsonb);
end;
$$;

revoke all on function public.lesson_positions(uuid) from public, anon;
grant execute on function public.lesson_positions(uuid) to authenticated;

comment on function public.lesson_positions(uuid) is
  'Where this learner stopped, for every lesson in one enrolment, in one call — so a lesson list can offer to resume without a query per row.';
