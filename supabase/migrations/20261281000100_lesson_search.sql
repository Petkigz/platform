-- Search inside the courses, not only their covers.
--
-- `search_catalogue()` matches a course title, its subjects, its teacher and its
-- description. A lesson called "The conditions of prayer" inside a course called
-- "Fiqh for adults" was unfindable: the words a learner remembers are usually the
-- ones in the lesson, and the catalogue only ever searched what a course says
-- about itself.
--
-- WHAT MAY BE MATCHED, AND BY WHOM
-- --------------------------------
-- A lesson has a title and a description. The title is already public: the course
-- page prints the whole outline to anyone, signed in or not. The description is
-- not — it is the lesson's own introduction, and showing a snippet of it to
-- somebody who has not bought the course would surface text the product never
-- showed them.
--
-- So this function matches **titles for everyone** and **descriptions only where
-- `can_access_lesson_now()` says the caller may study the lesson**, plus the
-- author and the reviewers of that version, who may read it anyway. The snippet
-- is built from the visible text only, so the rule holds by construction rather
-- than by a filter somebody has to remember: there is no code path that puts a
-- hidden description into a result.
--
-- Only published versions are searched. A draft is a teacher's working copy, and
-- a search box is not a way to read one. `lessons_read` already refuses drafts to
-- strangers, and this does not rely on that alone.
--
-- The query parser is `websearch_to_tsquery`, which takes what people type —
-- quoted phrases, `or`, a stray `-` — and never raises on it. `to_tsquery` would
-- turn a harmless em dash into a 42601.

insert into public.platform_settings (key, description, value_type, value_text, gate_type, preconditions, flag_group)
values (
  'learning.lesson_search',
  'Search inside lessons, not only course covers',
  'boolean',
  'false',
  'admin',
  'None. The index and the function ship with the flag; turning it on changes only whether the catalogue shows the second result list.',
  'Learner features'
)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- The index
-- ---------------------------------------------------------------------------
-- Weighted so a title match outranks a description that happens to contain the
-- same word: somebody typing "prayer" is more likely to want the lesson called
-- "Prayer" than one that mentions prayer in passing.
create index if not exists lessons_search_idx
  on public.lessons
  using gin (
    (
      setweight(to_tsvector('english', coalesce(title, '')), 'A'::"char")
      || setweight(to_tsvector('english', coalesce(description, '')), 'B'::"char")
    )
  );

-- ---------------------------------------------------------------------------
-- The search
-- ---------------------------------------------------------------------------
create or replace function public.search_lessons(
  p_query text,
  p_limit integer default 20
)
returns table (
  lesson_id     uuid,
  lesson_title  text,
  section_title text,
  course_id     uuid,
  course_slug   text,
  course_title  text,
  snippet       text,
  /** 'title' or 'description' — which of the two actually matched. */
  matched_in    text,
  rank          real
)
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select nullif(btrim(coalesce(p_query, '')), '')      as term,
           least(greatest(coalesce(p_limit, 20), 1), 50) as lim
  ),
  parsed as (
    select params.term,
           params.lim,
           case when params.term is null then null
                else websearch_to_tsquery('english', params.term) end as tsq
      from params
  ),
  candidates as (
    select l.id,
           l.title,
           l.description,
           cs.title            as section_title,
           cs.course_version_id,
           cv.course_id,
           c.slug              as course_slug,
           c.title             as course_title,
           -- Read once per row: the same answer decides what may be shown and
           -- what the snippet may be built from.
           (public.can_access_lesson_now(l.id)
            or public.can_author_version(cs.course_version_id)
            or public.can_review_version(cs.course_version_id)) as may_read_description,
           parsed.tsq
      from parsed
      join public.lessons l
        on parsed.tsq is not null
       and (
            setweight(to_tsvector('english', coalesce(l.title, '')), 'A'::"char")
            || setweight(to_tsvector('english', coalesce(l.description, '')), 'B'::"char")
           ) @@ parsed.tsq
      join public.course_sections cs on cs.id = l.section_id
      join public.course_versions cv on cv.id = cs.course_version_id
      join public.courses c on c.id = cv.course_id
     where cv.version_status = 'published'
       and c.status = 'active'
       and c.deleted_at is null
  ),
  visible as (
    select *,
           -- The text the answer is allowed to come from.
           case when may_read_description
                then coalesce(nullif(btrim(description), ''), title)
                else title
           end as visible_text
      from candidates
  ),
  matched as (
    select *,
           case
             when setweight(to_tsvector('english', coalesce(title, '')), 'A'::"char") @@ tsq
               then 'title'
             else 'description'
           end as matched_in
      from visible
  ),
  ranked as (
    select m.*,
           ts_rank(
             setweight(to_tsvector('english', coalesce(m.title, '')), 'A'::"char")
             || setweight(
                  to_tsvector('english', m.visible_text),
                  (case when m.matched_in = 'description' then 'B' else 'C' end)::"char"
                ),
             m.tsq
           )::real as rank
      from matched m
     where m.matched_in = 'title' or m.may_read_description
  )
  select r.id,
         r.title,
         r.section_title,
         r.course_id,
         r.course_slug,
         r.course_title,
         ts_headline(
           'english',
           r.visible_text,
           r.tsq,
           'StartSel=<mark>, StopSel=</mark>, MaxWords=28, MinWords=8, ShortWord=3'
         ),
         r.matched_in,
         r.rank
    from ranked r
   order by r.rank desc, r.title asc
   limit (select lim from params);
$$;

comment on function public.search_lessons(text, integer) is
  'Lessons matching a query. Titles for anyone; a description only for somebody who may study that lesson. The snippet is built from the visible text, so hidden text cannot leak through it.';

revoke all on function public.search_lessons(text, integer) from public;
grant execute on function public.search_lessons(text, integer) to anon, authenticated;
