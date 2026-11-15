-- Additive foundation only. It is not used by the current player. Roll out
-- resource-aware API, UI, recovery, erasure/export review and tests together.
-- Never infer which resource an older lesson-level position belongs to.

create table public.lesson_resource_positions (
  lesson_progress_id uuid not null references public.lesson_progress(id) on delete cascade,
  lesson_resource_id uuid not null references public.lesson_resources(id) on delete cascade,
  seconds integer not null check (seconds between 0 and 86400),
  revision uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now(),
  primary key (lesson_progress_id, lesson_resource_id)
);
alter table public.lesson_resource_positions enable row level security;
-- No direct client access. Explicitly revoke defaults on hosted Supabase too.
revoke all on public.lesson_resource_positions from public, anon, authenticated;

-- Definer access repeats the existing lesson/resource visibility rules rather
-- than relying on a definer's bypass of RLS. This snapshot never converts or
-- returns the ambiguous old lesson-level position.
create function public.resume_resource_snapshot(p_enrolment_id uuid, p_lesson_id uuid, p_resource_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  e public.course_enrolments;
  checked jsonb;
  place public.lesson_resource_positions;
begin
  checked := public.resume_position_snapshot(p_enrolment_id, p_lesson_id);
  select * into e from public.course_enrolments where id = p_enrolment_id;
  if not public.can_access_lesson(e.learner_profile_id, p_lesson_id) then
    raise exception 'this learner cannot access that lesson' using errcode = 'insufficient_privilege';
  end if;
  if not exists (
    select 1 from public.lesson_resources r
    join public.lessons l on l.id = r.lesson_id
    join public.course_sections s on s.id = l.section_id
    where r.id = p_resource_id and l.id = p_lesson_id
      and (public.can_read_version(s.course_version_id) or public.can_review_version(s.course_version_id))
      and (public.can_author_version(s.course_version_id)
        or public.can_review_version(s.course_version_id)
        or public.can_access_lesson_entitlement_now(l.id)
        or (r.access_classification = 'public_preview' and l.is_preview and public.setting_bool('learning.previews', false)))
  ) then
    raise exception 'that resource is not available in this lesson' using errcode = 'insufficient_privilege';
  end if;
  select rp.* into place from public.lesson_resource_positions rp
    join public.lesson_progress p on p.id = rp.lesson_progress_id
    where p.course_enrolment_id = p_enrolment_id and p.lesson_id = p_lesson_id
      and rp.lesson_resource_id = p_resource_id;
  return jsonb_build_object('seconds', place.seconds, 'revision', place.revision);
end;
$$;
revoke all on function public.resume_resource_snapshot(uuid, uuid, uuid) from public, anon;
grant execute on function public.resume_resource_snapshot(uuid, uuid, uuid) to authenticated;

-- Serializes on enrolment+lesson and the parent progress row; independent
-- resource revisions still avoid false conflicts between different recordings.
-- Status-only direct inserts can race the parent creation, so use ON CONFLICT
-- DO NOTHING and then lock the actual row. Auth, entitlement and resource checks
-- are repeated after acquiring relevant locks; authorization revocation races
-- are not fully solved merely by these checks.
create function public.compare_record_resource_position(
  p_enrolment_id uuid, p_lesson_id uuid, p_resource_id uuid, p_seconds integer, p_revision uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  checked jsonb;
  parent public.lesson_progress;
  place public.lesson_resource_positions;
  e public.course_enrolments;
  v_seconds integer := greatest(0, least(coalesce(p_seconds, 0), 86400));
begin
  checked := public.resume_resource_snapshot(p_enrolment_id, p_lesson_id, p_resource_id);
  select * into e from public.course_enrolments where id = p_enrolment_id for share;
  if e.id is null then raise exception 'no such enrolment' using errcode = 'P0002'; end if;
  perform 1 from public.lesson_resources where id = p_resource_id and lesson_id = p_lesson_id for share;
  checked := public.resume_resource_snapshot(p_enrolment_id, p_lesson_id, p_resource_id);
  perform pg_advisory_xact_lock(hashtextextended(p_enrolment_id::text || ':' || p_lesson_id::text, 0));
  checked := public.resume_resource_snapshot(p_enrolment_id, p_lesson_id, p_resource_id);
  select * into parent from public.lesson_progress
    where course_enrolment_id = p_enrolment_id and lesson_id = p_lesson_id for update;
  if parent.id is null and p_revision is not null then
    return jsonb_build_object('ok', false, 'seconds', null, 'revision', null);
  end if;
  if parent.id is null then
    insert into public.lesson_progress (course_enrolment_id, lesson_id, status)
      values (p_enrolment_id, p_lesson_id, 'not_started')
      on conflict (course_enrolment_id, lesson_id) do nothing;
    select * into parent from public.lesson_progress
      where course_enrolment_id = p_enrolment_id and lesson_id = p_lesson_id for update;
  end if;
  select * into place from public.lesson_resource_positions
    where lesson_progress_id = parent.id and lesson_resource_id = p_resource_id for update;
  if place.revision is distinct from p_revision then
    return jsonb_build_object('ok', false, 'seconds', place.seconds, 'revision', place.revision);
  end if;
  if place.revision is null then
    insert into public.lesson_resource_positions(lesson_progress_id, lesson_resource_id, seconds)
      values (parent.id, p_resource_id, v_seconds) returning * into place;
  else
    update public.lesson_resource_positions set seconds = v_seconds, revision = gen_random_uuid(), updated_at = now()
      where lesson_progress_id = parent.id and lesson_resource_id = p_resource_id returning * into place;
  end if;
  update public.lesson_progress set last_seen_at = now(), started_at = coalesce(started_at, now()),
    status = case when status in ('completed','skipped') then status
                  when v_seconds > 0 then 'in_progress' else status end
    where id = parent.id;
  return jsonb_build_object('ok', true, 'seconds', place.seconds, 'revision', place.revision);
end;
$$;
revoke all on function public.compare_record_resource_position(uuid, uuid, uuid, integer, uuid) from public, anon;
grant execute on function public.compare_record_resource_position(uuid, uuid, uuid, integer, uuid) to authenticated;
