-- Catalogue search: one function decides what "matches" means.
--
-- The catalogue could already take a `q`, but only against `title` and `description`,
-- with no ranking and no notion of the two things a buyer most often types:
--
--   * a **subject** — a course filed under Fiqh was unfindable unless the word also
--     happened to appear in its blurb;
--   * a **teacher's name** — nobody could search for the person they follow.
--
-- This function is the single definition of a match, so the search box, any future
-- search screen and any other caller cannot drift into three ideas of relevance. It
-- searches, in this order of weight:
--
--   1. the course title — a title that *starts* with the term wins outright,
--   2. the subject names on the published version,
--   3. the teacher's display name,
--   4. the description.
--
-- Every word must match somewhere. A query is an AND, not an OR: "fiqh marriage"
-- should not return every course that mentions marriage.
--
-- `strpos()` is used rather than `like` on purpose. There are no wildcards to escape,
-- so a `%` typed into a search box is a character that matches nothing rather than a
-- pattern that matches everything.
--
-- The function is `security invoker`, so it can only see what the caller may already
-- read — the course read policy, the published-version policy and the teacher-profile
-- policy all still apply. That has one consequence worth stating: a teacher is
-- findable by name only when their teacher profile is published and public, which is
-- the same condition that gives them a public page. A private profile is not a search
-- result, and a hidden course is not one either.

create or replace function public.search_catalogue(
  p_query    text default null,
  p_subject  text default null,
  p_audience text default null,
  p_limit    integer default 60
)
returns table (course_id uuid, score integer)
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select nullif(btrim(lower(coalesce(p_query, ''))), '')          as term,
           nullif(btrim(lower(coalesce(p_subject, ''))), '')        as subject,
           nullif(btrim(lower(coalesce(p_audience, ''))), '')       as audience,
           least(greatest(coalesce(p_limit, 60), 1), 100)           as lim
  ),
  terms as (
    select distinct w
      from params,
           regexp_split_to_table(coalesce(params.term, ''), '\s+') as w
     where length(w) > 0
  ),

  -- One row per course: its newest published version. A course with no published
  -- version is not on the shelf and must not be searchable.
  shelf as (
    select distinct on (c.id)
           c.id, c.title, c.description, c.audience, c.created_by,
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

  scored as (
    select h.id,
           h.title,
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
  )
  select s.id, s.score::integer
    from scored s
   order by s.score desc, s.title asc, s.id asc
   limit (select lim from params);
$$;

revoke all on function public.search_catalogue(text, text, text, integer) from public;
grant execute on function public.search_catalogue(text, text, text, integer)
  to anon, authenticated;

comment on function public.search_catalogue(text, text, text, integer) is
  'The single definition of a catalogue match: title, subject, teacher and description, ranked, with every word required. Security invoker, so it sees only what the caller may read.';

-- ---------------------------------------------------------------------------
-- The register said there was no search infrastructure. There is now.
--
-- `platform.search` stays in the register because it is a real promise about a
-- different feature — searching the *text of lessons*, which needs an index over lesson
-- bodies and a decision about whether a paid lesson's words may be searched before it is
-- bought. Leaving the old precondition in place would tell the next person to build the
-- catalogue search that already exists.
-- ---------------------------------------------------------------------------
update public.platform_settings
   set preconditions =
       'Catalogue search is built and deliberately not gated (2026-10-22): search_catalogue() ranks title, subject, a public teacher''s name and the description, requires every word, and is security invoker so it shows only what the caller may read. The flag remains for lesson-content search, which is not built: that needs an index over lesson bodies and a decision about whether a paid lesson''s text may be searched before it is bought'
 where key = 'platform.search';
