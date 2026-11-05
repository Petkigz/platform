-- An open-ended cohort is not a class that ended at hand-in. Until an end is
-- recorded, the ordinary year cannot start. An erased learner's 30-day clock
-- still takes priority; a safeguarding hold still suspends cleanup.
create or replace view public.coursework_file_retention as
  select asa.media_asset_id as asset_id,
         asa.submission_id,
         s.learner_profile_id,
         ca.course_id,
         ca.cohort_id,
         co.ends_at as class_ends_at,
         s.submitted_at,
         asa.created_at as attached_at,
         lp.deleted_at as learner_record_erased_at,
         ma.status,
         ma.deleted_at as tombstoned_at,
         ma.purge_due_at,
         ma.purged_at,
         exists (select 1 from public.coursework_retention_holds h
                  where h.asset_id = asa.media_asset_id and h.closed_at is null) as held,
         least(
           case when ca.cohort_id is not null and co.ends_at is null then null
                else (greatest(co.ends_at, s.submitted_at, s.created_at, asa.created_at)
                      + interval '1 year')::date end,
           (lp.deleted_at + interval '30 days')::date
         ) as due_on,
         case
           when lp.deleted_at is not null and
             (ca.cohort_id is not null and co.ends_at is null or
              lp.deleted_at + interval '30 days' <=
                greatest(co.ends_at, s.submitted_at, s.created_at, asa.created_at) + interval '1 year')
             then 'erasure'
           when ca.cohort_id is not null and co.ends_at is null then 'missing_class_end'
           when co.ends_at is not null and co.ends_at >= greatest(s.submitted_at, s.created_at, asa.created_at)
             then 'class_end'
           else 'handed_in'
         end as basis
    from public.assignment_submission_assets asa
    join public.media_assets ma on ma.id = asa.media_asset_id and ma.purpose = 'coursework'
    join public.assignment_submissions s on s.id = asa.submission_id
    join public.course_assignments ca on ca.id = s.assignment_id
    join public.learner_profiles lp on lp.id = s.learner_profile_id
    left join public.cohorts co on co.id = ca.cohort_id;

comment on view public.coursework_file_retention is
  'Internal coursework clock. A cohort without an end has no ordinary due date; an erasure date can still apply. Self-paced work uses hand-in.';

-- Expose an actionable, bounded list only to the named safeguarding owner.
-- This does not create an end date or pretend a visual correction writer exists.
create function public.coursework_missing_class_ends(p_limit integer default 100, p_after uuid default null)
returns table (cohort_id uuid, cohort_title text, course_title text, files bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_coursework_retention_owner();
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'limit must be between 1 and 100' using errcode = 'invalid_parameter_value';
  end if;
  return query
    select c.id, c.title, cr.title, count(distinct r.asset_id)
      from public.coursework_file_retention r
      join public.cohorts c on c.id = r.cohort_id
      join public.courses cr on cr.id = r.course_id
     where r.basis = 'missing_class_end' and r.tombstoned_at is null
       and (p_after is null or c.id > p_after)
     group by c.id, c.title, cr.title
     order by c.id limit p_limit;
end;
$$;
revoke all on function public.coursework_missing_class_ends(integer, uuid) from public, anon;
grant execute on function public.coursework_missing_class_ends(integer, uuid) to authenticated;

create or replace function public.coursework_retention_plan(p_now timestamptz default now())
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_plan jsonb; v_missing integer;
begin
  perform public.require_coursework_retention_owner();
  v_plan := public.coursework_retention_plan_internal(p_now);
  select count(distinct asset_id)::int into v_missing
    from public.coursework_file_retention
   where basis = 'missing_class_end' and tombstoned_at is null;
  return jsonb_set(v_plan, '{files,missingClassEnd}', to_jsonb(v_missing), true);
end;
$$;
