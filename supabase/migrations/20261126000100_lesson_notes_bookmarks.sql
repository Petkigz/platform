-- Private lesson notes and bookmarks. The flag ships off and can be enabled
-- from the admin dashboard; the database enforces the same switch so direct
-- PostgREST calls cannot use the feature while it is disabled.

-- The register row described a feature that had never been designed. Bring the
-- description and the precondition in line with what now exists, so the admin
-- dashboard explains the real remaining decision rather than a missing table.
-- `value_text` is deliberately untouched: the flag still ships off.
update public.platform_settings
   set description   = 'Private lesson notes and bookmarks',
       preconditions = 'Retention and family-sharing policy decided before enabling. Notes and bookmarks exist; transcripts do not.'
 where key = 'learning.notes_bookmarks';

create table public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  learner_profile_id uuid not null references public.learner_profiles(id) on delete restrict,
  course_enrolment_id uuid not null references public.course_enrolments(id) on delete restrict,
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_notes_one_per_learner_lesson unique(user_id, course_enrolment_id, lesson_id)
);

create index lesson_notes_learner_updated_idx
  on public.lesson_notes(user_id, learner_profile_id, updated_at desc);

create trigger lesson_notes_set_updated_at
  before update on public.lesson_notes
  for each row execute function public.set_updated_at();

create table public.lesson_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  learner_profile_id uuid not null references public.learner_profiles(id) on delete restrict,
  course_enrolment_id uuid not null references public.course_enrolments(id) on delete restrict,
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint lesson_bookmarks_one_per_learner_lesson unique(user_id, course_enrolment_id, lesson_id)
);

create index lesson_bookmarks_learner_idx
  on public.lesson_bookmarks(user_id, learner_profile_id, created_at desc);

alter table public.lesson_notes enable row level security;
alter table public.lesson_bookmarks enable row level security;

-- One authorization predicate for RLS and the write trigger. The user id is
-- not an argument: caller identity always comes from the signed session.
create or replace function public.can_use_lesson_study_data(
  p_learner_profile_id uuid,
  p_course_enrolment_id uuid,
  p_lesson_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.setting_bool('learning.notes_bookmarks', false)
     and public.can_access_learner(p_learner_profile_id)
     and exists (
       select 1
         from public.course_enrolments ce
         join public.lessons l on l.id = p_lesson_id
         join public.course_sections cs on cs.id = l.section_id
        where ce.id = p_course_enrolment_id
          and ce.learner_profile_id = p_learner_profile_id
          and ce.deleted_at is null
          and ce.status in ('active', 'completed')
          and ce.course_version_id = cs.course_version_id
          and public.can_access_lesson(p_learner_profile_id, p_lesson_id)
     );
$$;
revoke all on function public.can_use_lesson_study_data(uuid,uuid,uuid) from public;
grant execute on function public.can_use_lesson_study_data(uuid,uuid,uuid) to authenticated;

create or replace function public.guard_lesson_study_data()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if not public.setting_bool('learning.notes_bookmarks', false) then
    raise exception 'lesson notes and bookmarks are not enabled (learning.notes_bookmarks is off)'
      using errcode = 'check_violation';
  end if;

  if v_actor is not null then
    new.user_id := v_actor;
  end if;
  if new.user_id is null then
    raise exception 'a signed-in owner is required for lesson notes and bookmarks'
      using errcode = 'insufficient_privilege';
  end if;

  if tg_op = 'UPDATE' and (
    new.user_id is distinct from old.user_id
    or new.learner_profile_id is distinct from old.learner_profile_id
    or new.course_enrolment_id is distinct from old.course_enrolment_id
    or new.lesson_id is distinct from old.lesson_id
  ) then
    raise exception 'the owner, learner, enrolment and lesson of a saved item cannot be changed'
      using errcode = 'check_violation';
  end if;

  if not public.can_use_lesson_study_data(
    new.learner_profile_id, new.course_enrolment_id, new.lesson_id
  ) then
    raise exception 'an active enrolment and access to this lesson are required'
      using errcode = 'insufficient_privilege';
  end if;

  if tg_table_name = 'lesson_notes' then
    new.body := trim(new.body);
  end if;
  return new;
end;
$$;
revoke all on function public.guard_lesson_study_data() from public;

create trigger lesson_notes_guard
  before insert or update on public.lesson_notes
  for each row execute function public.guard_lesson_study_data();
create trigger lesson_bookmarks_guard
  before insert or update on public.lesson_bookmarks
  for each row execute function public.guard_lesson_study_data();

create policy lesson_notes_read on public.lesson_notes
  for select to authenticated
  using (user_id = public.current_user_id()
         and public.can_use_lesson_study_data(learner_profile_id, course_enrolment_id, lesson_id));
create policy lesson_notes_insert on public.lesson_notes
  for insert to authenticated
  with check (user_id = public.current_user_id()
              and public.can_use_lesson_study_data(learner_profile_id, course_enrolment_id, lesson_id));
create policy lesson_notes_update on public.lesson_notes
  for update to authenticated
  using (user_id = public.current_user_id()
         and public.can_use_lesson_study_data(learner_profile_id, course_enrolment_id, lesson_id))
  with check (user_id = public.current_user_id()
              and public.can_use_lesson_study_data(learner_profile_id, course_enrolment_id, lesson_id));
create policy lesson_notes_delete on public.lesson_notes
  for delete to authenticated
  using (user_id = public.current_user_id()
         and public.can_use_lesson_study_data(learner_profile_id, course_enrolment_id, lesson_id));

create policy lesson_bookmarks_read on public.lesson_bookmarks
  for select to authenticated
  using (user_id = public.current_user_id()
         and public.can_use_lesson_study_data(learner_profile_id, course_enrolment_id, lesson_id));
create policy lesson_bookmarks_insert on public.lesson_bookmarks
  for insert to authenticated
  with check (user_id = public.current_user_id()
              and public.can_use_lesson_study_data(learner_profile_id, course_enrolment_id, lesson_id));
create policy lesson_bookmarks_delete on public.lesson_bookmarks
  for delete to authenticated
  using (user_id = public.current_user_id()
         and public.can_use_lesson_study_data(learner_profile_id, course_enrolment_id, lesson_id));

revoke all on public.lesson_notes, public.lesson_bookmarks from anon, authenticated;
grant select, insert, update, delete on public.lesson_notes to authenticated;
grant select, insert, delete on public.lesson_bookmarks to authenticated;

comment on table public.lesson_notes is
  'A signed-in learner or guardian’s private note for one lesson within an accessible enrolment; flag-gated.';
comment on table public.lesson_bookmarks is
  'A signed-in learner or guardian’s private bookmark for one lesson within an accessible enrolment; flag-gated.';
comment on function public.can_use_lesson_study_data(uuid,uuid,uuid) is
  'The current caller can use private lesson notes/bookmarks only while enabled and while the learner can access this lesson in the pinned enrolment version.';
