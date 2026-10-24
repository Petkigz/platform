-- ---------------------------------------------------------------------------
-- Every course, and who it is for
-- ---------------------------------------------------------------------------
-- U72 gave a course an audience and a set of age bands, and gave the author a
-- picker on their own course page. The database also lets the platform admin
-- and a governance admin set it — which is the safety hatch for the case this
-- migration is about: a course is behind the wrong door, its author is
-- unreachable, and the person who can see the problem has no screen that shows
-- the problem.
--
-- That is the role rule the owner set: every routine change must be doable in a
-- visual format, on the screen of whoever is allowed to make it. A power that
-- exists only as a function that exists only in a migration is not a screen.
--
-- So this is the shelf. It lists every course with the three things needed to
-- decide: who wrote it, who it says it is for, and whether anybody is actually
-- studying it.
--
-- Four decisions are baked in.
--
--   1. IT IS THE OWNER'S AND GOVERNANCE'S. The same two who may change an
--      audience. Support finding a course to answer a question about it is a
--      different question and has the catalogue; finance has no business here.
--
--   2. IT COUNTS LEARNERS, IT DOES NOT LIST THEM. "Is this course being taken"
--      is a fact about the course. Who is taking it is a fact about people, and
--      a shelf that returned a learner id would be one join away from a list of
--      children. The count is distinct learner profiles with a live enrolment.
--
--   3. NO MONEY. Not a price, not revenue, not a lifetime value. Earnings are
--      per currency and have their own screens; a shelf with an amount column
--      would be the third place two currencies get added by eye.
--
--   4. RETIRED COURSES STAY IN THE LIST. A course that was retired and still
--      claims the wrong audience is exactly the kind of thing nobody finds by
--      browsing the catalogue, because the catalogue does not show it. The
--      lifecycle status travels with the row instead of being filtered away.
--
-- Search matches the title, the slug and the author's display name, so "the
-- tajweed course", "the course at that address" and "what did Fatima write" are
-- all the same box. The limit is capped and the result says how many there are,
-- because a list of fifty that does not admit it was cut off becomes "we have
-- fifty courses" in somebody's head by the end of the week.
-- ---------------------------------------------------------------------------

create or replace function public.course_shelf(
  p_search   text default null,
  p_audience text default null,
  p_limit    integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_search   text := nullif(btrim(coalesce(p_search, '')), '');
  v_audience text := nullif(lower(btrim(coalesce(p_audience, ''))), '');
  v_pattern  text;
  v_limit    integer := least(200, greatest(1, coalesce(p_limit, 50)));
  v_rows     jsonb;
  v_total    integer;
begin
  if v_actor is null then
    raise exception 'sign in to see every course'
      using errcode = 'insufficient_privilege';
  end if;

  if v_audience is not null and v_audience not in ('child', 'adult', 'both') then
    raise exception 'an audience is child, adult or both — not %', coalesce(p_audience, 'nothing')
      using errcode = 'invalid_parameter_value';
  end if;

  -- The same two people who may change an audience. A shelf that anyone could
  -- read would be a list of every unpublished course on the platform.
  if not (public.has_role(v_actor, 'platform_admin')
          or public.has_role(v_actor, 'governance_admin')) then
    raise exception 'only the platform admin or a governance admin can see every course'
      using errcode = 'insufficient_privilege';
  end if;

  -- Escape the LIKE metacharacters: a search for "100%" means a title with a
  -- percent sign in it, not everything.
  v_pattern := case when v_search is null then null
                    else '%' || replace(replace(replace(v_search,
                           '\', '\\'), '%', '\%'), '_', '\_') || '%' end;

  select count(*)::int into v_total
    from public.courses c
    left join public.user_profiles p on p.user_id = c.created_by
   where c.deleted_at is null
     and (v_audience is null or c.audience = v_audience)
     and (v_pattern is null
          or c.title ilike v_pattern
          or c.slug ilike v_pattern
          or p.display_name ilike v_pattern);

  select coalesce(jsonb_agg(row_to_json(r)::jsonb order by r."createdAt" desc), '[]'::jsonb)
    into v_rows
    from (
      select c.id                                          as "courseId",
             c.slug,
             c.title,
             c.audience,
             -- `age_bands` is never null on a new row, but a course written
             -- before the column existed reads as an array like any other.
             coalesce(c.age_bands, '{}'::text[])           as "ageBands",
             c.status,
             coalesce(p.display_name, 'a former account')  as "author",
             c.created_by                                  as "authorId",
             -- A course is published when at least one version is; the
             -- wrapper's own status is a lifecycle, not a publication.
             (select count(*)::int
                from public.course_versions v
               where v.course_id = c.id and v.version_status = 'published')
                                                           as "publishedVersions",
             (select max(v.published_at)
                from public.course_versions v
               where v.course_id = c.id and v.version_status = 'published')
                                                           as "lastPublishedAt",
             -- Distinct live enrolments. A number, never a list.
             (select count(distinct e.learner_profile_id)::int
                from public.course_enrolments e
               where e.course_id = c.id
                 and e.deleted_at is null
                 and e.status in ('active', 'completed'))
                                                           as "learners",
             c.created_at                                  as "createdAt"
        from public.courses c
        left join public.user_profiles p on p.user_id = c.created_by
       where c.deleted_at is null
         and (v_audience is null or c.audience = v_audience)
         and (v_pattern is null
              or c.title ilike v_pattern
              or c.slug ilike v_pattern
              or p.display_name ilike v_pattern)
       order by c.created_at desc
       limit v_limit
    ) r;

  return jsonb_build_object(
    'generatedAt', now(),
    'query',       v_search,
    'audience',    v_audience,
    'total',       v_total,
    'shown',       jsonb_array_length(v_rows),
    -- Shown apart from the total so the screen can say "showing 50 of 120".
    'truncated',   v_total > jsonb_array_length(v_rows),
    'rows',        v_rows);
end;
$$;

revoke all on function public.course_shelf(text, text, integer) from public, anon;
grant execute on function public.course_shelf(text, text, integer) to authenticated;

comment on function public.course_shelf(text, text, integer) is
  'Every course with who wrote it, who it says it is for, and how many live learners it has — for the two people who may change an audience. Counts learners, never lists them, and carries no money.';
