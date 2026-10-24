-- ---------------------------------------------------------------------------
-- What is in a course, and what it costs me
-- ---------------------------------------------------------------------------
-- The catalogue showed a title, a description and four badges. Two questions a
-- buyer asks before opening anything were answered only on the course page:
-- **how much is in it**, and **what would it cost me**. So a shelf of forty
-- courses was forty clicks to find out whether anything on it was a two-hour
-- introduction or a thirty-lesson course, and whether it was free.
--
-- This is one call for the whole shelf rather than one per card. A page that
-- asked `course_price_for_me()` sixty times would be sixty round trips, and the
-- first slow catalogue would be the reason somebody rewrote it badly.
--
-- Three things are deliberate.
--
--   1. THE PRICE COMES FROM THE SAME RESOLVER THE ORDER USES. It calls
--      `course_price_for_me()` per course rather than reimplementing the market
--      lookup, because a shelf that computes its own price is a shelf that can
--      disagree with the button on the next page. The extra cost is one small
--      lookup per card, which is the price of never being wrong about money.
--
--   2. IT ANSWERS ONLY ABOUT COURSES THE PUBLIC SHELF WOULD SHOW. The lesson
--      count has to be read with the definer's privileges — an anonymous
--      visitor may see only preview lessons, so an invoker function would
--      report "1 lesson" for a twenty-lesson course. To stop that privilege
--      becoming an oracle for drafts, a course that is not active, not deleted,
--      not suspended, or has no published version is **not answered at all** —
--      the id is silently skipped, exactly as `search_catalogue()` treats a
--      course it will not rank.
--
--   3. NOTHING IS SUMMED. Each card carries its own offering in its own
--      currency. There is no total, no "from", and no cross-currency figure
--      anywhere in the reply, because two prices in two currencies do not add
--      up to a third number.
-- ---------------------------------------------------------------------------

create or replace function public.catalogue_cards(
  p_course_ids uuid[],
  p_country    text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_out     jsonb := '[]'::jsonb;
  v_id      uuid;
  v_version uuid;
  v_lessons integer;
  v_sections integer;
  v_minutes integer;
  v_timed   integer;
begin
  if p_course_ids is null or coalesce(array_length(p_course_ids, 1), 0) = 0 then
    return v_out;
  end if;

  if array_length(p_course_ids, 1) > 100 then
    raise exception 'a shelf is at most 100 courses'
      using errcode = 'invalid_parameter_value';
  end if;

  for v_id in select distinct unnest(p_course_ids) loop
    -- On the shelf? Everything else is skipped rather than answered, so this
    -- function cannot be used to count lessons in somebody's draft.
    select v.id into v_version
      from public.courses c
      join public.course_versions v on v.course_id = c.id
     where c.id = v_id
       and c.status = 'active'
       and c.deleted_at is null
       and c.suspended_at is null
       and v.version_status = 'published'
     order by v.version_number desc
     limit 1;

    continue when v_version is null;

    select count(*)::int into v_sections
      from public.course_sections cs
     where cs.course_version_id = v_version;

    -- Duration is optional on a lesson and often absent for text and
    -- interactive lessons, so a total that includes the gaps would understate
    -- the course. It is reported only when at least one lesson declares a
    -- length, and the reply says how many do — a caller that wants to say
    -- "3h 20m of video" can, and a caller that must not imply more can stay
    -- quiet.
    select count(*)::int,
           coalesce((sum(l.duration_seconds) / 60)::int, 0),
           count(l.duration_seconds)::int
      into v_lessons, v_minutes, v_timed
      from public.course_sections cs
      join public.lessons l on l.section_id = cs.id
     where cs.course_version_id = v_version;

    if v_minutes = 0 or not exists (
         select 1
           from public.course_sections cs
           join public.lessons l on l.section_id = cs.id
          where cs.course_version_id = v_version
            and l.duration_seconds is not null
            and l.duration_seconds > 0)
    then
      v_minutes := null;
    end if;

    v_out := v_out || jsonb_build_object(
      'courseId', v_id,
      -- The same reader the course page uses, unmodified.
      'offering', public.course_price_for_me(v_id, p_country),
      'sections', v_sections,
      'lessons',  v_lessons,
      'minutes',  v_minutes,
      -- How many of those lessons actually declared a length. Kept so a screen
      -- can say "20+ min" rather than implying the total covers every lesson.
      'timedLessons', v_timed);
  end loop;

  return v_out;
end;
$$;

comment on function public.catalogue_cards(uuid[], text) is
  'What each course on a shelf contains and what it would cost this caller: one offering per card from course_price_for_me(), a section and lesson count, a duration only when at least one lesson declares one, and how many lessons declared it. Answers only for courses the public catalogue would show, and sums nothing.';

revoke all on function public.catalogue_cards(uuid[], text) from public;
grant execute on function public.catalogue_cards(uuid[], text) to anon, authenticated;
