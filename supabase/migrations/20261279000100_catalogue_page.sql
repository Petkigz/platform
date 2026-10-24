-- ---------------------------------------------------------------------------
-- The shelf says how many there are, and you can reach the rest
-- ---------------------------------------------------------------------------
-- The catalogue read has been two different queries pretending to be one.
--
-- **Browsing** was a PostgREST select: `status = 'active'`, not deleted, limit
-- 60, ordered by title. **Searching** went through `search_catalogue()`, which
-- builds a shelf of its own. The two disagreed, and three defects lived in the
-- gap:
--
--   1. **A suspended course stayed on the shelf.** Browsing never filtered
--      `suspended_at`; search did. Suspension is how the platform takes
--      something down, so the one screen a visitor browses was the one screen
--      that ignored it. Measured, not reasoned about.
--
--   2. **Sixty was silent.** A catalogue of 137 courses showed the first sixty
--      alphabetically and said nothing. The tail of the alphabet was simply not
--      reachable — no count, no paging, no trunctation flag. The project's own
--      rule is that a LIMIT says it is a limit; this one did not.
--
--   3. **The subject filter ran after the limit.** It was applied in
--      TypeScript to the sixty rows that came back, so a subject whose courses
--      sort after the sixtieth letter showed *nothing at all* — not "no results
--      for this subject", but an empty page for a subject that exists.
--
-- Both paths now go through one function. It answers the same question either
-- way — what is on the shelf, in what order, and how many in total — and the
-- answer is a page plus a count rather than a silent slice.
--
-- `search_catalogue()` is kept, unchanged in signature, because it is the
-- ranking primitive the tests hold and because a caller that wants only ids and
-- scores should not have to parse a page. It now delegates: one definition of
-- what matches, in one place.
-- ---------------------------------------------------------------------------

create or replace function public.catalogue_page(
  p_query    text    default null,
  p_subject  text    default null,
  p_audience text    default null,
  p_band     text    default null,
  p_limit    integer default 24,
  p_offset   integer default 0
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
           greatest(coalesce(p_offset, 0), 0)                 as off
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

comment on function public.catalogue_page(text, text, text, text, integer, integer) is
  'One page of the public catalogue and the true total behind it. Filters by subject, audience and age band in SQL so the count cannot disagree with the list, excludes suspended courses, and returns ordered course ids with their search score.';

revoke all on function public.catalogue_page(text, text, text, text, integer, integer) from public;
grant execute on function public.catalogue_page(text, text, text, text, integer, integer)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- The ranking primitive, now a view of the same definition
-- ---------------------------------------------------------------------------
-- Kept because it is what the search tests hold and because a caller that wants
-- only ids and scores should not have to read a page envelope. It no longer
-- decides anything: everything below comes from `catalogue_page`.

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
  select (entry ->> 'courseId')::uuid,
         coalesce((entry ->> 'score')::integer, 0)
    from jsonb_array_elements(
           public.catalogue_page(
             p_query, p_subject, p_audience, null,
             least(greatest(coalesce(p_limit, 60), 1), 100),
             0
           ) -> 'ordered'
         ) with ordinality as hits(entry, n)
   order by n;
$$;

revoke all on function public.search_catalogue(text, text, text, integer) from public;
grant execute on function public.search_catalogue(text, text, text, integer)
  to anon, authenticated;
