-- The language a course is taught in.
--
-- WHAT THIS IS, AND WHAT IT IS NOT
-- --------------------------------
-- `learning.multi_language` was registered as CODE with four things beside it:
-- a translation workflow, per-locale content, RTL support, and a decision about
-- who translates. Three of those four need a **person who speaks the language**
-- and the fourth needs a translator too. What needs no translator is the fact a
-- learner needs first: *what language is this course in?*
--
-- So this unit builds the language of the thing being taught — declared by the
-- author, shown on the course, and filterable in the catalogue — and the
-- direction of any text that is written in an RTL script. It does **not** claim
-- an interface translation: the screens are still English, the flag says so, and
-- `/account/accessibility` tells a person the same thing.
--
-- RTL, honestly: every title, description and lesson name is rendered with
-- `dir="auto"`, so Arabic, Urdu, Persian and Hebrew text lays itself out the
-- right way round inside an English page. That is real and it is what a course
-- written in Arabic needs today.

-- ---------------------------------------------------------------------------
-- The register
-- ---------------------------------------------------------------------------
create table public.languages (
  -- BCP-47 base tags: `ar`, not `ar-EG`. A course is taught in Arabic; which
  -- Arabic is a matter for its description, not for a filter chip.
  code text primary key check (code ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),

  native_name text not null check (length(btrim(native_name)) between 2 and 60),
  english_name text not null check (length(btrim(english_name)) between 2 and 60),

  -- The direction of the script, which is what a browser needs. Not the
  -- direction of the country and not a political statement.
  direction text not null default 'ltr' check (direction in ('ltr', 'rtl')),

  -- Whether an author may choose it today. Turning one off stops new courses
  -- being filed under it; it does not rewrite a course that already is.
  is_available boolean not null default true,

  sort_order integer not null default 100
);

insert into public.languages (code, native_name, english_name, direction, sort_order) values
  ('en', 'English',  'English',  'ltr', 10),
  ('ar', 'العربية',  'Arabic',   'rtl', 20),
  ('ur', 'اردو',     'Urdu',     'rtl', 30),
  ('fa', 'فارسی',    'Persian',  'rtl', 40),
  ('tr', 'Türkçe',   'Turkish',  'ltr', 50),
  ('fr', 'Français', 'French',   'ltr', 60),
  ('sw', 'Kiswahili','Swahili',  'ltr', 70),
  ('ha', 'Hausa',    'Hausa',    'ltr', 80),
  ('so', 'Soomaali', 'Somali',   'ltr', 90),
  ('id', 'Bahasa Indonesia', 'Indonesian', 'ltr', 100),
  ('ms', 'Bahasa Melayu',    'Malay',      'ltr', 110),
  ('bn', 'বাংলা',    'Bengali',  'ltr', 120),
  ('es', 'Español',  'Spanish',  'ltr', 130),
  ('he', 'עברית',    'Hebrew',   'rtl', 140)
on conflict (code) do nothing;

alter table public.languages enable row level security;

create policy languages_read_all on public.languages
  for select to anon, authenticated
  using (true);

comment on table public.languages is
  'The languages a course may be taught in, with the direction of each script. Public: a learner filters by it and a course page names it.';

-- ---------------------------------------------------------------------------
-- Every course says which one
-- ---------------------------------------------------------------------------
alter table public.courses
  add column language_code text not null default 'en'
    references public.languages (code) on update cascade;

create index courses_language_idx on public.courses (language_code)
  where deleted_at is null;

comment on column public.courses.language_code is
  'The language the course is taught in. Not a translation of the course: a course is taught in one language.';

-- ---------------------------------------------------------------------------
-- Saying what it is
-- ---------------------------------------------------------------------------
create or replace function public.set_course_language(
  p_course_id uuid,
  p_language  text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_code  text := lower(btrim(coalesce(p_language, '')));
  v_row   public.courses;
begin
  if v_actor is null then
    raise exception 'language:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_row from public.courses where id = p_course_id and deleted_at is null;
  if not found then
    raise exception 'language:course_not_found'
      using errcode = 'no_data_found';
  end if;

  -- The author, or staff. Same pair `courses_update` already allows, asked here
  -- so the refusal has a sentence rather than a silent zero-row update.
  if v_row.created_by <> v_actor and not public.is_privileged(v_actor) then
    raise exception 'language:not_yours'
      using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1 from public.languages where code = v_code and is_available
  ) then
    raise exception 'language:not_available'
      using errcode = 'invalid_parameter_value';
  end if;

  if v_row.language_code = v_code then
    return jsonb_build_object('languageCode', v_code, 'changed', false);
  end if;

  update public.courses set language_code = v_code where id = p_course_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'course.language_changed', 'course', p_course_id,
          jsonb_build_object('from', v_row.language_code, 'to', v_code));

  return jsonb_build_object('languageCode', v_code, 'changed', true);
end;
$$;

revoke all on function public.set_course_language(uuid, text) from public, anon;
grant execute on function public.set_course_language(uuid, text) to authenticated;

/**
 * What a chip row may offer: the languages somebody has actually used, plus
 * English when nothing has been published yet. A row of fourteen chips where
 * eleven return nothing is a filter that makes the site look empty.
 */
create or replace function public.course_languages()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'code', l.code,
           'nativeName', l.native_name,
           'englishName', l.english_name,
           'direction', l.direction,
           'courses', coalesce(n.n, 0)) order by l.sort_order, l.code), '[]'::jsonb)
    from public.languages l
    left join (
      select c.language_code as code, count(*)::int as n
        from public.courses c
        join public.course_versions v on v.course_id = c.id and v.version_status = 'published'
       where c.status = 'active' and c.deleted_at is null and c.suspended_at is null
       group by c.language_code
    ) n on n.code = l.code
   where l.is_available
     and (coalesce(n.n, 0) > 0 or l.code = 'en');
$$;

revoke all on function public.course_languages() from public;
grant execute on function public.course_languages() to anon, authenticated;

comment on function public.course_languages() is
  'Languages that at least one live course is taught in — a chip row that cannot offer a filter returning nothing.';

-- ---------------------------------------------------------------------------
-- The catalogue filter, appended so positional callers keep their arguments
-- ---------------------------------------------------------------------------
create or replace function public.catalogue_page(
  p_query    text    default null,
  p_subject  text    default null,
  p_audience text    default null,
  p_band     text    default null,
  p_limit    integer default 24,
  p_offset   integer default 0,
  -- Appended, never inserted: search_catalogue() and the sitemap call this
  -- positionally, and moving a parameter would silently change what they ask for.
  p_language text    default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select nullif(btrim(lower(coalesce(p_query, ''))), '')    as term,
           nullif(btrim(lower(coalesce(p_subject, ''))), '')  as subject,
           nullif(btrim(lower(coalesce(p_audience, ''))), '') as audience,
           nullif(btrim(coalesce(p_band, '')), '')            as band,
           least(greatest(coalesce(p_limit, 24), 1), 100)     as lim,
           greatest(coalesce(p_offset, 0), 0)                 as off,
           nullif(btrim(lower(coalesce(p_language, ''))), '') as language
  ),

  terms as (
    select distinct w
      from params,
           regexp_split_to_table(coalesce(params.term, ''), '\s+') as w
     where length(w) > 0
  ),

  -- One row per course: its newest published version. A course with no
  -- published version is not on the shelf. A suspended one is not either —
  -- this is the line the browse path never had.
  shelf as (
    select distinct on (c.id)
           c.id, c.title, c.description, c.audience, c.age_bands, c.created_by,
           c.language_code,
           v.id as version_id
      from public.courses c
      join public.course_versions v
        on v.course_id = c.id
       and v.version_status = 'published'
     where c.status = 'active'
       and c.deleted_at is null
       and c.suspended_at is null
     order by c.id, v.version_number desc
  ),

  haystack as (
    select s.*,
           (select coalesce(string_agg(sa.name, ' '), '')
              from public.course_version_subjects cvs
              join public.subject_areas sa on sa.id = cvs.subject_area_id
             where cvs.course_version_id = s.version_id)  as subjects,
           (select coalesce(string_agg(sa.code, ' '), '')
              from public.course_version_subjects cvs
              join public.subject_areas sa on sa.id = cvs.subject_area_id
             where cvs.course_version_id = s.version_id)  as subject_codes,
           (select coalesce(string_agg(ipp.display_name, ' '), '')
              from public.instructor_public_profiles ipp
             where ipp.user_id = s.created_by
               and ipp.status = 'published')              as teacher
      from shelf s
  ),

  -- With no term every score is zero and the ordering falls through to the
  -- title, which is exactly what browsing wants: one order clause, both modes.
  scored as (
    select h.id,
           h.title,
           h.audience,
           h.age_bands,
           (case when p.term is not null and strpos(lower(h.title), p.term) = 1
                 then 40 else 0 end)
         + 6 * (select count(*) from terms t where strpos(lower(h.title), t.w) > 0)
         + 4 * (select count(*) from terms t where strpos(lower(h.subjects), t.w) > 0)
         + 3 * (select count(*) from terms t where strpos(lower(h.teacher), t.w) > 0)
         + 1 * (select count(*) from terms t
                 where strpos(lower(coalesce(h.description, '')), t.w) > 0)
           as score
      from haystack h, params p
     where (p.term is null
            or not exists (
                 select 1 from terms t
                  where strpos(lower(h.title), t.w) = 0
                    and strpos(lower(h.subjects), t.w) = 0
                    and strpos(lower(h.teacher), t.w) = 0
                    and strpos(lower(coalesce(h.description, '')), t.w) = 0))
       and (p.subject is null
            or p.subject = 'all'
            or p.subject = any (string_to_array(lower(h.subject_codes), ' ')))
       and (p.audience is null
            or p.audience = 'all'
            or h.audience = p.audience
            or h.audience = 'both')
       -- A band filter is the same rule the doors use in TypeScript: a course
       -- that states no band is open to every age, and asking for a band a
       -- course does not state excludes it. Enforced here so the count agrees
       -- with the list — filtering a page after it was chosen is how the old
       -- subject bug happened.
       and (p.band is null
            or h.age_bands is null
            or cardinality(h.age_bands) = 0
            or p.band = any (h.age_bands))
       -- Language is a property of the course, not of a translation of it: a
       -- course is taught in one language, and a course that has not said is
       -- filed as English because that is the platform's own default and the
       -- column's.
       and (p.language is null
            or p.language = 'all'
            or h.language_code = p.language)
  ),

  counted as (select count(*)::int as total from scored),

  -- `ord` is assigned over the whole matched set, before the slice, so it stays
  -- monotonic across pages; the page is then aggregated in that order rather
  -- than hoping a subquery's ORDER BY survives a CTE.
  windowed as (
    select s.id, s.score,
           row_number() over (order by s.score desc, s.title asc, s.id asc) as ord
      from scored s
     order by s.score desc, s.title asc, s.id asc
     limit (select lim from params)
    offset (select off from params)
  )

  select jsonb_build_object(
    'total',  (select total from counted),
    'shown',  (select count(*)::int from windowed),
    'offset', (select off from params),
    'limit',  (select lim from params),
    'ordered', coalesce(
      (select jsonb_agg(jsonb_build_object('courseId', w.id, 'score', w.score) order by w.ord)
         from windowed w),
      '[]'::jsonb)
  );
$$;

comment on function public.catalogue_page(text, text, text, text, integer, integer, text) is
  'One page of the public catalogue and the true total behind it. Filters by subject, audience, age band and language in SQL so the count cannot disagree with the list, excludes suspended courses, and returns ordered course ids with their search score.';

revoke all on function public.catalogue_page(text, text, text, text, integer, integer, text) from public;
grant execute on function public.catalogue_page(text, text, text, text, integer, integer, text)
  to anon, authenticated;

-- The old six-argument signature is gone; a caller that still names six
-- parameters is served by the defaults on the seventh.
drop function if exists public.catalogue_page(text, text, text, text, integer, integer);

-- ---------------------------------------------------------------------------
-- The switch
-- ---------------------------------------------------------------------------
update public.platform_settings
   set gate_type = 'admin',
       description = 'Courses say which language they are taught in, and the catalogue can be narrowed to one.',
       preconditions = 'None blocking. What is built: a course carries a language code, its author picks it on the course page, the catalogue filters by it in SQL so the count and the list agree, and every title and description is rendered with dir="auto" so Arabic, Urdu, Persian and Hebrew lay themselves out correctly inside the English page. What is not built: an interface translation. The screens are English, and translating them needs translators rather than code — the flag says so and so does /account/accessibility.'
 where key = 'learning.multi_language';
