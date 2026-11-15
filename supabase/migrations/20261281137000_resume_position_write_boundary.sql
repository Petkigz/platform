-- Coordinate rollout with the versioned player. Legacy position writes must
-- fail rather than silently overwrite a position reviewed in another player.
-- Privileged owners/service roles still need an operational policy: this is a
-- boundary for PUBLIC, anon and authenticated, not a defence against owners.

revoke all on function public.record_lesson_position(uuid, uuid, integer)
  from public, anon, authenticated;

-- PostgreSQL table-level UPDATE/INSERT grants override column restrictions.
-- Remove both table and pre-existing column grants before allowing only the
-- fields used by ordinary completion/status writes. Identity keys cannot be
-- updated: moving a row would move its position without comparing a revision.
revoke insert, update, delete on public.lesson_progress from public, anon, authenticated;
revoke insert (id, course_enrolment_id, lesson_id, status, progress_percent,
  last_video_position, started_at, completed_at, last_seen_at, created_at, updated_at, position_revision)
  on public.lesson_progress from public, anon, authenticated;
revoke update (id, course_enrolment_id, lesson_id, status, progress_percent,
  last_video_position, started_at, completed_at, last_seen_at, created_at, updated_at, position_revision)
  on public.lesson_progress from public, anon, authenticated;
grant insert (course_enrolment_id, lesson_id, status, progress_percent, started_at,
  completed_at, last_seen_at) on public.lesson_progress to authenticated;
grant update (status, progress_percent, started_at, completed_at, last_seen_at)
  on public.lesson_progress to authenticated;

-- A pin change and a position update must not cross after validation. Lock the
-- enrolment before checking the snapshot; the re-pin writer updates that row.
-- Recheck the pinned lesson after acquiring the lock, including for an already
-- existing progress row (the insert/update version trigger alone is not enough).
create or replace function public.compare_record_lesson_position(
  p_enrolment_id uuid, p_lesson_id uuid, p_seconds integer, p_revision uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  snapshot jsonb;
  p public.lesson_progress;
  e public.course_enrolments;
  seconds integer := greatest(0, least(coalesce(p_seconds, 0), 86400));
begin
  if public.current_user_id() is null then
    raise exception 'sign in to keep your place' using errcode = 'insufficient_privilege';
  end if;
  -- Check access before locking a row, then check again after the lock in case
  -- the pinned version changed while we were waiting.
  snapshot := public.resume_position_snapshot(p_enrolment_id, p_lesson_id);
  select * into e from public.course_enrolments where id = p_enrolment_id for share;
  if e.id is null then raise exception 'no such enrolment' using errcode = 'P0002'; end if;
  snapshot := public.resume_position_snapshot(p_enrolment_id, p_lesson_id);
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
