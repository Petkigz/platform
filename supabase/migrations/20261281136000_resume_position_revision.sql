-- Foundation for conflict-aware resume. This is additive: existing clients still
-- use record_lesson_position and are NOT protected from overwriting each other.
-- Roll out the corresponding client and retire the old write paths together.

alter table public.lesson_progress
  add column position_revision uuid not null default gen_random_uuid();

-- All progress writes rotate the opaque revision, including writes from older
-- APIs and direct RLS-authorized updates. Rotating on unrelated progress edits
-- can cause a harmless extra conflict, but cannot hide a position change.
create function public.rotate_lesson_progress_revision()
returns trigger language plpgsql set search_path = public as $$
begin
  new.position_revision := gen_random_uuid();
  return new;
end;
$$;
create trigger lesson_progress_rotate_revision
  before insert or update on public.lesson_progress
  for each row execute function public.rotate_lesson_progress_revision();

create function public.resume_position_snapshot(p_enrolment_id uuid, p_lesson_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  e public.course_enrolments;
  p public.lesson_progress;
begin
  if public.current_user_id() is null then
    raise exception 'sign in to keep your place' using errcode = 'insufficient_privilege';
  end if;
  select * into e from public.course_enrolments where id = p_enrolment_id;
  if e.id is null then raise exception 'no such enrolment' using errcode = 'P0002'; end if;
  if not public.can_access_learner(e.learner_profile_id) then
    raise exception 'that is not your learning' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.lessons l join public.course_sections s on s.id = l.section_id
                 where l.id = p_lesson_id and s.course_version_id = e.course_version_id) then
    raise exception 'that lesson is not in the version this learner is on' using errcode = 'check_violation';
  end if;
  select * into p from public.lesson_progress
    where course_enrolment_id = p_enrolment_id and lesson_id = p_lesson_id;
  return jsonb_build_object('seconds', p.last_video_position, 'revision', p.position_revision);
end;
$$;
revoke all on function public.resume_position_snapshot(uuid, uuid) from public, anon;
grant execute on function public.resume_position_snapshot(uuid, uuid) to authenticated;

-- Compare a previously observed revision while holding the row lock. NULL means
-- no progress row existed at the snapshot. A conflicting insert by another
-- path may raise a unique violation; that is a failure, never an overwrite.
create function public.compare_record_lesson_position(
  p_enrolment_id uuid, p_lesson_id uuid, p_seconds integer, p_revision uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  snapshot jsonb;
  p public.lesson_progress;
  seconds integer := greatest(0, least(coalesce(p_seconds, 0), 86400));
begin
  -- Perform the same learner and pinned-version checks as the read helper.
  snapshot := public.resume_position_snapshot(p_enrolment_id, p_lesson_id);
  -- Serialize empty-row inserts among callers of this function as well.
  perform pg_advisory_xact_lock(hashtextextended(p_enrolment_id::text || ':' || p_lesson_id::text, 0));
  select * into p from public.lesson_progress
    where course_enrolment_id = p_enrolment_id and lesson_id = p_lesson_id for update;
  if p.position_revision is distinct from p_revision then
    return jsonb_build_object('ok', false, 'seconds', p.last_video_position, 'revision', p.position_revision);
  end if;
  if p.id is null then
    insert into public.lesson_progress
      (course_enrolment_id, lesson_id, status, last_video_position, started_at, last_seen_at)
    values (p_enrolment_id, p_lesson_id, case when seconds > 0 then 'in_progress' else 'not_started' end,
            seconds, now(), now()) returning * into p;
  else
    update public.lesson_progress set last_video_position = seconds, last_seen_at = now(),
      started_at = coalesce(started_at, now()),
      status = case when status in ('completed', 'skipped') then status
                    when seconds > 0 then 'in_progress' else status end
    where id = p.id returning * into p;
  end if;
  return jsonb_build_object('ok', true, 'seconds', p.last_video_position, 'revision', p.position_revision);
end;
$$;
revoke all on function public.compare_record_lesson_position(uuid, uuid, integer, uuid) from public, anon;
grant execute on function public.compare_record_lesson_position(uuid, uuid, integer, uuid) to authenticated;
