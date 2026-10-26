-- Search inside lessons, with the destination in the answer.
--
-- `search_lessons()` shipped in 20261281 with everything the catalogue needed to
-- *show* a match and nothing it needed to *open* one. A lesson result linked to
-- its course page, which is right for a lesson behind a paywall and wrong for a
-- preview: a preview lesson opens on its own address
-- (`/courses/<slug>/preview/<lessonId>`), and sending a visitor to the outline to
-- hunt for the lesson a search just found is a worse answer than the search.
--
-- So the function now says whether the lesson is a preview. The return type
-- changed, which PostgreSQL will not do in place, so the function is dropped and
-- recreated and the grants are re-issued below — the door stays the same width.
--
-- Nothing about matching changed: titles for anyone who may read the version,
-- descriptions only where `can_access_lesson_now()` (or authorship or review)
-- allows it, the snippet built from the visible text, published versions of
-- active courses only.

drop function if exists public.search_lessons(text, integer);

create function public.search_lessons(
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
  -- Whether the lesson can be opened by somebody who is not enrolled. It
  -- decides the destination on the catalogue: a preview opens as a lesson, and
  -- anything else opens as its course.
  is_preview    boolean,
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
           l.is_preview,
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
         r.is_preview,
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
  'Lessons matching a query. Titles for anyone; a description only for somebody who may study that lesson. The snippet is built from the visible text, so hidden text cannot leak through it. is_preview says whether the lesson opens on its own address.';

revoke all on function public.search_lessons(text, integer) from public, anon;
grant execute on function public.search_lessons(text, integer) to authenticated;
grant execute on function public.search_lessons(text, integer) to anon;
