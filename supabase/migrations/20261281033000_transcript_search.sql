-- The invoker query below also serves anonymous catalogue searches. Granting
-- SELECT to anon is safe because transcripts have no anon RLS policy; it lets
-- the LEFT JOIN return no transcript instead of failing the entire search.
grant select on public.lesson_transcripts to anon;


-- Keep the existing indexed title/description search intact. A separate
-- transcript match prevents evaluating entitlement for every lesson on each
-- query. Both paths are subject to their own explicit access checks.
create function public.search_lessons_base(
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

revoke all on function public.search_lessons_base(text,integer) from public;
grant execute on function public.search_lessons_base(text,integer) to anon, authenticated;

create index lesson_transcripts_search_idx on public.lesson_transcripts
  using gin (to_tsvector('english', body));

create or replace function public.search_lessons(p_query text, p_limit integer default 20)
returns table (
  lesson_id uuid, lesson_title text, section_title text, course_id uuid,
  course_slug text, course_title text, is_preview boolean, snippet text,
  matched_in text, rank real
)
language sql stable security invoker set search_path=public as $$
  with params as (
    select nullif(btrim(coalesce(p_query,'')),'') as term,
           least(greatest(coalesce(p_limit,20),1),50) as lim
  ), parsed as (
    select lim, case when term is null then null else websearch_to_tsquery('english',term) end as tsq
    from params
  ), transcript_hits as (
    select l.id as lesson_id, l.title as lesson_title, cs.title as section_title,
           c.id as course_id, c.slug as course_slug, c.title as course_title, l.is_preview,
           ts_headline('english',t.body,p.tsq,
             'StartSel=<mark>, StopSel=</mark>, MaxWords=28, MinWords=8, ShortWord=3') as snippet,
           'transcript'::text as matched_in,
           (ts_rank(to_tsvector('english',t.body),p.tsq)*0.5)::real as rank
      from parsed p
      join public.lesson_transcripts t on p.tsq is not null and to_tsvector('english',t.body) @@ p.tsq
      join public.lessons l on l.id=t.lesson_id
      join public.course_sections cs on cs.id=l.section_id
      join public.course_versions cv on cv.id=cs.course_version_id
      join public.courses c on c.id=cv.course_id
     where cv.version_status='published' and c.status='active' and c.deleted_at is null
       -- ai_support_ask runs as SECURITY DEFINER, so repeat transcript RLS
       -- explicitly. Free previews do not grant access to paid transcripts.
       and public.current_user_id() is not null
       and (public.can_author_version(cs.course_version_id)
            or public.can_review_version(cs.course_version_id)
            or public.can_access_lesson_entitlement_now(l.id))
  ), combined as (
    select * from public.search_lessons_base(p_query,p_limit)
    union all
    select * from transcript_hits
  ), dedup as (
    select *, row_number() over (partition by lesson_id order by rank desc, matched_in) as pick
      from combined
  )
  select d.lesson_id,d.lesson_title,d.section_title,d.course_id,d.course_slug,d.course_title,
         d.is_preview,d.snippet,d.matched_in,d.rank
    from dedup d where d.pick=1
   order by d.rank desc,d.lesson_title asc
   limit (select lim from parsed);
$$;
comment on function public.search_lessons(text,integer) is
  'Searches published lesson titles, visible descriptions and authorized transcripts. Transcript text cannot match or appear in a snippet unless the caller may read it.';

update public.platform_settings
   set preconditions = 'Catalogue search and lesson search exist. Lesson search includes optional author-provided transcripts only when the caller is entitled or otherwise authorized to read them; unentitled visitors cannot match or see transcript text. Review submitted transcripts as teaching content before publication.'
 where key = 'platform.search';
