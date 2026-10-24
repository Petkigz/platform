-- ---------------------------------------------------------------------------
-- Who is here, and who teaches
-- ---------------------------------------------------------------------------
-- Two of the fifty screens — Users (36) and Teachers (37) — have never had a
-- page. Everything else in the admin console is about work that is waiting:
-- refunds, reports, uploads. Neither of these is a queue. They answer the two
-- questions an owner asks about people, and both are asked in the first week:
--
--   "Is this family on the platform, and what have they been given?"
--   "Who teaches here, and are they teaching anything?"
--
-- The second question is not idle. `instructor` is granted only by the owner or
-- staff — teaching is by appointment — so the roster of appointments is the
-- owner's own record of a decision they made. Today it exists only as rows in
-- `user_role_assignments`, which is a table nobody outside the repository can
-- read.
--
-- Three decisions are baked into what follows.
--
--   1. AN ACCOUNT IS NOT A CHILD. A child is a `learner_profiles` row inside a
--      family, and does not get a login while child_login is off. This list is
--      accounts, so the children of the platform do not appear in it by name.
--      That is not a filter applied here; it is what the schema is.
--
--   2. IT RETURNS NO MONEY. Not a balance, not a lifetime value, not a sum. The
--      money screens exist and are gated; a directory with a currency column
--      would be the one screen where two currencies get added by eye.
--
--   3. THE TEACHER LIST IS THE OWNER'S AND GOVERNANCE'S. Support needs to find
--      an account to answer a question about it, so accounts are all staff's.
--      Who teaches, what they have published and how many learners they hold is
--      a platform decision, and `governance_admin` is the role that checks a
--      teacher's qualification before they may authorise anything.
--
-- Search matches the display name and the email address, case-insensitively.
-- The email is included in the row on purpose: "find the account for this
-- address" is the support request that produces most of these lookups, and a
-- directory that cannot be searched by the thing the person quotes is useless.
-- It is staff-only, and the refusal for anybody else is the same sentence the
-- rest of the console uses.
-- ---------------------------------------------------------------------------

create or replace function public.staff_directory(
  p_kind   text,
  p_search text default null,
  p_limit  integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_kind    text := lower(coalesce(btrim(p_kind), 'accounts'));
  v_search  text := nullif(btrim(coalesce(p_search, '')), '');
  v_pattern text;
  v_limit   integer := least(200, greatest(1, coalesce(p_limit, 50)));
  v_rows    jsonb;
  v_total   integer;
begin
  if v_actor is null then
    raise exception 'sign in to see who is here'
      using errcode = 'insufficient_privilege';
  end if;

  if v_kind not in ('accounts', 'teachers') then
    raise exception 'a directory is accounts or teachers — not %', coalesce(p_kind, 'nothing')
      using errcode = 'invalid_parameter_value';
  end if;

  if not public.is_privileged(v_actor) then
    raise exception 'only platform staff can see the directory'
      using errcode = 'insufficient_privilege';
  end if;

  -- Who teaches is the owner's question and governance's. Support's is who has
  -- an account, which is the list above.
  if v_kind = 'teachers'
     and not (public.has_role(v_actor, 'platform_admin')
              or public.has_role(v_actor, 'governance_admin')) then
    raise exception 'only the platform admin or a governance admin can see the teacher roster'
      using errcode = 'insufficient_privilege';
  end if;

  -- Escape the LIKE metacharacters: a search for "100%" is a search for a name
  -- with a percent sign in it, not a search for everything.
  v_pattern := case when v_search is null then null
                    else '%' || replace(replace(replace(v_search,
                           '\', '\\'), '%', '\%'), '_', '\_') || '%' end;

  if v_kind = 'accounts' then
    select count(*)::int into v_total
      from public.user_profiles p
      join auth.users u on u.id = p.user_id
     where p.deleted_at is null
       and (v_pattern is null
            or p.display_name ilike v_pattern
            or u.email ilike v_pattern);

    select coalesce(jsonb_agg(row_to_json(r)::jsonb order by r."joinedAt" desc), '[]'::jsonb)
      into v_rows
      from (
        select p.user_id                                   as "userId",
               p.display_name                              as "name",
               u.email                                     as "email",
               p.account_status                            as "status",
               p.country_code                              as "country",
               p.created_at                                as "joinedAt",
               coalesce((
                 select jsonb_agg(rr.code order by rr.is_privileged desc, rr.code)
                   from public.user_role_assignments a
                   join public.roles rr on rr.id = a.role_id
                  where a.user_id = p.user_id and a.revoked_at is null), '[]'::jsonb)
                                                           as "roles",
               (select count(*)::int from public.learner_profiles lp
                 where lp.linked_user_id = p.user_id and lp.deleted_at is null)
                                                           as "learnerProfiles",
               (select count(*)::int from public.courses c
                 where c.created_by = p.user_id and c.status <> 'retired')
                                                           as "courses"
          from public.user_profiles p
          join auth.users u on u.id = p.user_id
         where p.deleted_at is null
           and (v_pattern is null
                or p.display_name ilike v_pattern
                or u.email ilike v_pattern)
         order by p.created_at desc
         limit v_limit
      ) r;

  else
    select count(*)::int into v_total
      from public.user_profiles p
      join auth.users u on u.id = p.user_id
      join public.user_role_assignments a on a.user_id = p.user_id and a.revoked_at is null
      join public.roles ro on ro.id = a.role_id and ro.code = 'instructor'
     where p.deleted_at is null
       and (v_pattern is null
            or p.display_name ilike v_pattern
            or u.email ilike v_pattern);

    select coalesce(jsonb_agg(row_to_json(r)::jsonb order by r."publishedCourses" desc, r."name"), '[]'::jsonb)
      into v_rows
      from (
        select p.user_id       as "userId",
               p.display_name  as "name",
               u.email         as "email",
               p.created_at    as "joinedAt",
               ipp.slug        as "slug",
               ipp.status      as "profileStatus",
               ipp.headline    as "headline",
               -- A course is published when at least one of its versions is:
               -- the wrapper's own status is a lifecycle, not a publication.
               (select count(distinct c.id)::int
                  from public.courses c
                  join public.course_versions v on v.course_id = c.id
                 where c.created_by = p.user_id
                   and c.status <> 'retired'
                   and v.version_status = 'published')
                               as "publishedCourses",
               (select count(*)::int from public.courses c
                 where c.created_by = p.user_id and c.status <> 'retired')
                               as "courses",
               -- Distinct learners across all their courses. A number, never a
               -- list: who is enrolled is the teacher's own cohort screen.
               (select count(distinct e.learner_profile_id)::int
                  from public.course_enrolments e
                  join public.courses c on c.id = e.course_id
                 where c.created_by = p.user_id)
                               as "learners"
          from public.user_profiles p
          join auth.users u on u.id = p.user_id
          join public.user_role_assignments a
            on a.user_id = p.user_id and a.revoked_at is null
          join public.roles ro on ro.id = a.role_id and ro.code = 'instructor'
          left join public.instructor_public_profiles ipp on ipp.user_id = p.user_id
         where p.deleted_at is null
           and (v_pattern is null
                or p.display_name ilike v_pattern
                or u.email ilike v_pattern)
         order by 8 desc, p.display_name
         limit v_limit
      ) r;
  end if;

  return jsonb_build_object(
    'generatedAt', now(),
    'kind',        v_kind,
    'query',       v_search,
    'total',       v_total,
    -- Shown apart from the total so the screen can say "showing 50 of 120"
    -- rather than pretending the list is the platform.
    'shown',       jsonb_array_length(v_rows),
    'truncated',   v_total > jsonb_array_length(v_rows),
    'rows',        v_rows);
end;
$$;

revoke all on function public.staff_directory(text, text, integer) from public, anon;
grant execute on function public.staff_directory(text, text, integer) to authenticated;

comment on function public.staff_directory(text, text, integer) is
  'Two screens that are not queues: who has an account (all staff), and who teaches with what they have published (owner or governance). Accounts, not children; counts, not money.';
