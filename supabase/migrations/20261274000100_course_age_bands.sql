-- ---------------------------------------------------------------------------
-- A course says who it is for
-- ---------------------------------------------------------------------------
-- `courses.audience` has said child, adult or both since the first schema, and
-- `learner_profiles.age_band` has said 5-7 through 18+ since the family tables.
-- Nothing has ever joined them: a course could say "young learners" and mean a
-- six-year-old and a fifteen-year-old equally, and a parent browsing for a
-- seven-year-old got the same shelf as one browsing for a sixteen-year-old.
--
-- `age_bands` is the missing half. A course declares the bands it suits, and an
-- empty array means **any band the audience allows** — which is what every
-- course written before today means, so nothing existing changes meaning.
--
-- The audience and the bands cannot disagree. `child` may not claim `18+`;
-- `adult` may not claim a child band. That is not pedantry: `audience` is a
-- safeguarding signal — child content requires the guardian machinery — and a
-- row that said both would make the signal useless at exactly the moment
-- somebody relied on it.
--
-- Who may set it: the author, or the platform or governance admins. It is an
-- editorial decision about a course, and it is audited, because a published
-- course changing its audience is a change to who is being sold what.
-- ---------------------------------------------------------------------------

alter table public.courses
  add column if not exists age_bands text[] not null default '{}';

alter table public.courses
  drop constraint if exists courses_age_bands_known;
alter table public.courses
  add constraint courses_age_bands_known check (
    age_bands <@ array['5-7', '8-10', '11-13', '14-17', '18+']::text[]
  );

comment on column public.courses.age_bands is
  'The age bands this course suits. Empty means every band its audience allows — which is what a course written before 2026-10-24 means.';

create index if not exists courses_age_bands_idx on public.courses using gin (age_bands);

-- ---------------------------------------------------------------------------
-- Which bands an audience allows
-- ---------------------------------------------------------------------------
-- One function, so the writer, the form and any future reader agree about what
-- "young learners" covers. A child course may be aimed at 5-7 as easily as at
-- 14-17; it may never be aimed at 18+.
create or replace function public.age_bands_for_audience(p_audience text)
returns text[]
language sql
immutable
as $$
  select case lower(coalesce(p_audience, ''))
           when 'child' then array['5-7', '8-10', '11-13', '14-17']::text[]
           when 'adult' then array['18+']::text[]
           when 'both'  then array['5-7', '8-10', '11-13', '14-17', '18+']::text[]
           else null
         end;
$$;

comment on function public.age_bands_for_audience(text) is
  'The age bands one audience may claim. Child never includes 18+; adult never includes a child band.';

-- ---------------------------------------------------------------------------
-- The writer
-- ---------------------------------------------------------------------------
create or replace function public.set_course_audience(
  p_course_id uuid,
  p_audience  text,
  p_age_bands text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_course   public.courses;
  v_audience text := lower(btrim(coalesce(p_audience, '')));
  v_allowed  text[];
  v_bands    text[];
  v_bad      text;
begin
  if v_actor is null then
    raise exception 'sign in to say who a course is for'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_course from public.courses where id = p_course_id;
  if v_course.id is null then
    raise exception 'no such course' using errcode = 'P0002';
  end if;

  if v_course.created_by <> v_actor
     and not public.has_role(v_actor, 'platform_admin')
     and not public.has_role(v_actor, 'governance_admin') then
    raise exception 'only the author, the platform admin or a governance admin may change who a course is for'
      using errcode = 'insufficient_privilege';
  end if;

  if v_audience not in ('child', 'adult', 'both') then
    raise exception 'an audience is child, adult or both — not %', coalesce(nullif(v_audience, ''), 'nothing')
      using errcode = 'invalid_parameter_value';
  end if;

  v_allowed := public.age_bands_for_audience(v_audience);

  -- Normalise: no nulls, no duplicates, and the canonical order rather than
  -- whatever order the checkboxes arrived in. Two rows that mean the same thing
  -- should look the same in the database.
  select coalesce(array_agg(b order by array_position(
           array['5-7', '8-10', '11-13', '14-17', '18+']::text[], b)), '{}'::text[])
    into v_bands
    from (select distinct unnest(coalesce(p_age_bands, '{}'::text[])) as b) s;

  -- The unknown-band refusal names the band. "Invalid value" sends the author
  -- to read SQL; "9-11 is not a band" sends them to the checkbox.
  select b into v_bad
    from unnest(v_bands) as b
   where b is null
      or not (b = any(coalesce(v_allowed, '{}'::text[])))
   limit 1;

  if v_bad is not null then
    raise exception '% is not a band the % audience may claim', v_bad, v_audience
      using errcode = 'check_violation';
  end if;

  if v_course.audience = v_audience and v_course.age_bands = v_bands then
    return jsonb_build_object(
      'courseId', p_course_id, 'audience', v_audience,
      'ageBands', to_jsonb(v_bands), 'changed', false);
  end if;

  update public.courses
     set audience = v_audience,
         age_bands = v_bands
   where id = p_course_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'course.audience_changed', 'course', p_course_id,
          jsonb_build_object(
            'from_audience', v_course.audience,
            'to_audience', v_audience,
            'from_age_bands', to_jsonb(v_course.age_bands),
            'to_age_bands', to_jsonb(v_bands)));

  return jsonb_build_object(
    'courseId', p_course_id, 'audience', v_audience,
    'ageBands', to_jsonb(v_bands), 'changed', true);
end;
$$;

revoke all on function public.set_course_audience(uuid, text, text[]) from public, anon;
grant execute on function public.set_course_audience(uuid, text, text[]) to authenticated;

comment on function public.set_course_audience(uuid, text, text[]) is
  'Say who a course is for: an audience and, optionally, the age bands it suits. Refuses an audience and a band that disagree, and audits the change.';
