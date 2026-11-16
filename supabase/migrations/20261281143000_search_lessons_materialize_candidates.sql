-- search_lessons_base() evaluated its candidates CTE once per downstream
-- reference (visible, matched, ranked), so every access check and every
-- RLS-filtered join ran several times per search. Materializing candidates
-- computes the access decision once per matching lesson. The predicate,
-- ranking, snippet and limit are unchanged.
create or replace function public.search_lessons_base(
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
  candidates as materialized (
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

revoke all on function public.search_lessons_base(text,integer) from public;
grant execute on function public.search_lessons_base(text,integer) to anon, authenticated;
