-- Group 2 · lesson progress
--
-- Recorded rule: "Use composite foreign keys or transaction invariants for
-- version compatibility." Progress is only meaningful against the version the
-- learner is pinned to, so the invariant is checked on every write rather
-- than trusted to the caller.
--
-- Progress rows are never deleted by a re-pin. A learner who moves to a new
-- version keeps the record of what they did against the old one.

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),

  course_enrolment_id uuid not null
    references public.course_enrolments (id) on delete restrict,

  lesson_id uuid not null
    references public.lessons (id) on delete restrict,

  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed', 'skipped')),

  progress_percent numeric(5,2) not null default 0
    check (progress_percent >= 0 and progress_percent <= 100),

  -- Resume position, in seconds. Only meaningful for timed media.
  last_video_position integer check (last_video_position is null or last_video_position >= 0),

  started_at   timestamptz,
  completed_at timestamptz,
  last_seen_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Completion must be internally consistent, or a completion report will
  -- disagree with a progress bar.
  constraint lp_completed_is_consistent check (
    (status = 'completed') = (completed_at is not null)
  ),
  constraint lp_completed_means_full check (
    status <> 'completed' or progress_percent = 100
  ),
  constraint lp_started_before_completed check (
    started_at is null or completed_at is null or started_at <= completed_at
  )
);

alter table public.lesson_progress
  add constraint lesson_progress_one_row_per_lesson
  unique (course_enrolment_id, lesson_id);

create index lesson_progress_enrolment_idx on public.lesson_progress (course_enrolment_id);

create trigger lesson_progress_set_updated_at
  before update on public.lesson_progress
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- version compatibility
-- ---------------------------------------------------------------------------
create or replace function public.enforce_progress_version_match()
returns trigger
language plpgsql
as $$
declare
  v_lesson_version uuid;
  v_pinned_version uuid;
begin
  select cs.course_version_id into v_lesson_version
    from public.lessons l
    join public.course_sections cs on cs.id = l.section_id
   where l.id = new.lesson_id;

  select course_version_id into v_pinned_version
    from public.course_enrolments
   where id = new.course_enrolment_id;

  if v_lesson_version is null or v_pinned_version is null then
    raise exception 'progress row references a missing lesson or enrolment'
      using errcode = 'foreign_key_violation';
  end if;

  if v_lesson_version <> v_pinned_version then
    raise exception
      'lesson % belongs to version % but enrolment % is pinned to version %; progress must be recorded against the pinned version',
      new.lesson_id, v_lesson_version, new.course_enrolment_id, v_pinned_version
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger lesson_progress_version_match
  before insert or update of course_enrolment_id, lesson_id on public.lesson_progress
  for each row execute function public.enforce_progress_version_match();

-- ---------------------------------------------------------------------------
-- read helper, used by completion evaluation
-- ---------------------------------------------------------------------------
create or replace function public.enrolment_progress_summary(p_enrolment_id uuid)
returns table (
  lessons_total   bigint,
  lessons_done    bigint,
  percent_complete numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(l.id)                                        as lessons_total,
    count(lp.id) filter (where lp.status = 'completed') as lessons_done,
    case when count(l.id) = 0 then 0::numeric
         else round(100.0 * count(lp.id) filter (where lp.status = 'completed') / count(l.id), 2)
    end                                                as percent_complete
  from public.course_enrolments ce
  join public.course_sections cs on cs.course_version_id = ce.course_version_id
  join public.lessons l          on l.section_id = cs.id
  left join public.lesson_progress lp
         on lp.lesson_id = l.id
        and lp.course_enrolment_id = ce.id
  where ce.id = p_enrolment_id
  group by ce.id;
$$;

comment on table public.lesson_progress is
  'Per-lesson progress against a pinned version. Never deleted by a re-pin.';
comment on function public.enrolment_progress_summary(uuid) is
  'Completion input for the policy engine. Counts lessons of the pinned version only.';
