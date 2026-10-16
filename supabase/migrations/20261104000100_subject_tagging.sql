-- Wire subject tagging, and fix who may do it.
--
-- WHAT THIS FIXES
-- ---------------
-- subject_areas is seeded with 37 subjects and subdivisions, and the catalogue
-- has a working subject filter plus subject badges on every course card. Both
-- read course_version_subjects.
--
-- That table had zero rows and no writer. So the filter narrowed against an
-- empty set: choosing any subject returned no courses, forever, and every badge
-- was empty. A learner browsing for Quran got a blank page however many courses
-- existed. This is the thirteenth instance of the same defect, and the first one
-- a learner would actually have seen.
--
-- A SECOND PROBLEM, WHICH TURNED OUT NOT TO BE EXPLOITABLE
-- --------------------------------------------------------
-- The write policies used can_read_version() — a read predicate standing in for
-- a write gate. That is wrong in principle: tagging is an authoring act, and
-- can_read_version() is true for any published or retired version, to anyone.
--
-- An earlier draft of this header claimed it let any signed-in user tag anyone
-- else's published course. That was wrong, and testing it showed why. The two
-- states are each covered by something:
--
--   draft                 can_read_version() is false for a stranger, so RLS
--                         refused the insert.
--   published or retired  can_read_version() is true, so RLS admitted it — but
--                         lock_subject_mapping_of_locked_version() refused the
--                         write, because D5 freezes this table.
--
-- Verified by restoring the old policy and attempting the insert as a stranger
-- against a published version: refused, by the D5 lock rather than by RLS.
--
-- So this is defence in depth, not a patched hole. The predicate is still
-- corrected, because the right gate for a write is a write predicate, and
-- relying on a freeze trigger to cover for a mis-scoped policy is the kind of
-- thing that quietly stops holding if either one changes.
--
-- WHAT THIS ADDS
-- --------------
--   * policies rewritten to can_author_version()
--   * set_version_subjects() — replaces a version's subjects in one call
--
-- Subject tags ARE frozen at publication, by an existing trigger.
-- lock_subject_mapping_of_locked_version() (20261016000500) refuses any change
-- to this table once the version leaves draft, exactly as it does for sections
-- and lessons. An earlier draft of this header claimed the opposite; that was
-- wrong, and the tests found it.
--
-- So tagging happens while the version is a draft, alongside the rest of
-- authoring. The consequence is worth stating plainly: a mis-tagged published
-- course cannot be corrected without cutting a new version. That is the D5
-- tradeoff, already settled as FROZEN, and not something to quietly override
-- for one table.

-- No unique index is added here. One already exists:
-- course_version_subjects_key on (course_version_id, subject_area_id). An
-- earlier draft of this migration added a second index on the same two columns
-- and claimed nothing prevented duplicates. Both were wrong, and removing the
-- index showed it: the duplicate-insert test still failed on the pre-existing
-- one. Worth noting why it was missed -- course_version_subjects_key is a
-- unique INDEX, not a unique CONSTRAINT, so a probe filtering pg_constraint on
-- contype in ('c','u','f') does not see it.
--
-- ---------------------------------------------------------------------------
-- Tagging is authoring, not reading
-- ---------------------------------------------------------------------------
-- Replacing the policies rather than adding to them: a permissive policy is
-- unioned with the others, so leaving the can_read_version() one in place would
-- keep the hole open no matter what is added alongside it.

drop policy if exists course_version_subjects_write  on public.course_version_subjects;
drop policy if exists course_version_subjects_update on public.course_version_subjects;

create policy course_version_subjects_insert
  on public.course_version_subjects
  for insert
  to authenticated
  with check (public.can_author_version(course_version_id));

create policy course_version_subjects_update
  on public.course_version_subjects
  for update
  to authenticated
  using (public.can_author_version(course_version_id))
  with check (public.can_author_version(course_version_id));

create policy course_version_subjects_delete
  on public.course_version_subjects
  for delete
  to authenticated
  using (public.can_author_version(course_version_id));

-- ---------------------------------------------------------------------------
-- The writer
-- ---------------------------------------------------------------------------

create or replace function public.set_version_subjects(
  p_version_id    uuid,
  p_subject_codes text[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid;
  v_version  public.course_versions;
  v_ids      uuid[];
  v_missing  text;
begin
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to tag a course'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_version from public.course_versions where id = p_version_id;
  if not found then
    raise exception 'course version % not found', p_version_id
      using errcode = 'no_data_found';
  end if;

  -- Authorship, not readability. can_author_version() covers the author and
  -- privileged roles; can_read_version() would have admitted anyone at all,
  -- because it is true for every published version.
  if not public.can_author_version(p_version_id) then
    raise exception
      'only the author may tag this course version'
      using errcode = 'insufficient_privilege';
  end if;

  if p_subject_codes is null or cardinality(p_subject_codes) = 0 then
    raise exception
      'a course needs at least one subject, or it can never be found in the catalogue'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Resolve the codes up front so a typo is reported by name rather than
  -- arriving as a foreign key violation on a uuid nobody can read.
  select array_agg(id) into v_ids
    from public.subject_areas
   where code = any (p_subject_codes);

  select string_agg(c, ', ') into v_missing
    from unnest(p_subject_codes) as c
   where not exists (select 1 from public.subject_areas sa where sa.code = c);

  if v_missing is not null then
    raise exception 'no such subject area(s): %', v_missing
      using errcode = 'no_data_found';
  end if;

  -- Replace, not merge. A caller sending the full list is describing what the
  -- subjects ARE, and a merge would make removing a mistagging impossible.
  delete from public.course_version_subjects
   where course_version_id = p_version_id;

  insert into public.course_version_subjects (course_version_id, subject_area_id)
  select p_version_id, sa.id
    from public.subject_areas sa
   where sa.code = any (p_subject_codes)
  on conflict do nothing;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'course.subjects_set', 'course_version', p_version_id,
          jsonb_build_object('subjects', p_subject_codes,
                             'course', v_version.course_id));

  return cardinality(v_ids);
end;
$$;

revoke all on function public.set_version_subjects(uuid, text[]) from public;
grant execute on function public.set_version_subjects(uuid, text[]) to authenticated;

comment on function public.set_version_subjects(uuid, text[]) is
  'Replaces the subjects on a course version. Author or privileged only; requires at least one subject.';
