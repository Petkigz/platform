-- Retain a clock for detached historical revisions and declared uploads, not
-- only the file attached to the current draft. Use the most recent surviving
-- attachment, declaration or revision reference as a conservative anchor, with
-- one row per (submission,asset).
-- Invalid historical JSON or unknown IDs are not interpreted as other files.
create or replace view public.coursework_file_retention as
with all_references as (
  select a.media_asset_id as asset_id,a.submission_id,a.created_at as reference_at
    from public.assignment_submission_assets a
  union all
  select d.asset_id,d.submission_id,d.declared_at
    from public.coursework_upload_declarations d
  union all
  select ma.id,r.submission_id,r.reopened_at
    from public.assignment_submission_revisions r
    cross join lateral jsonb_array_elements_text(
      case when jsonb_typeof(r.asset_ids)='array' then r.asset_ids else '[]'::jsonb end
    ) item(value)
    join public.media_assets ma on ma.id=case
      when item.value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then item.value::uuid else null end
), references_by_submission as (
  select asset_id,submission_id,max(reference_at) as attached_at
    from all_references group by asset_id,submission_id
)
select ref.asset_id,ref.submission_id,s.learner_profile_id,ca.course_id,ca.cohort_id,
       co.ends_at as class_ends_at,s.submitted_at,ref.attached_at,
       lp.deleted_at as learner_record_erased_at,ma.status,ma.deleted_at as tombstoned_at,
       ma.purge_due_at,ma.purged_at,
       exists(select 1 from public.coursework_retention_holds h where h.asset_id=ref.asset_id and h.closed_at is null) as held,
       least(case when ca.cohort_id is not null and co.ends_at is null then null
                  else (greatest(co.ends_at,s.submitted_at,s.created_at,ref.attached_at)+interval '1 year')::date end,
             (lp.deleted_at+interval '30 days')::date) as due_on,
       case when lp.deleted_at is not null and
          (ca.cohort_id is not null and co.ends_at is null or
           lp.deleted_at+interval '30 days'<=greatest(co.ends_at,s.submitted_at,s.created_at,ref.attached_at)+interval '1 year') then 'erasure'
         when ca.cohort_id is not null and co.ends_at is null then 'missing_class_end'
         when co.ends_at is not null and co.ends_at>=greatest(s.submitted_at,s.created_at,ref.attached_at) then 'class_end'
         else 'handed_in' end as basis
  from references_by_submission ref
  join public.media_assets ma on ma.id=ref.asset_id and ma.purpose='coursework'
  join public.assignment_submissions s on s.id=ref.submission_id
  join public.course_assignments ca on ca.id=s.assignment_id
  join public.learner_profiles lp on lp.id=s.learner_profile_id
  left join public.cohorts co on co.id=ca.cohort_id;

comment on view public.coursework_file_retention is
  'Internal file clock for current attachments and surviving detached declarations or revision references. References use their latest recorded timestamp as a conservative anchor; missing provenance cannot be inferred.';

-- A file used in more than one submission may have different class clocks even
-- if both submissions belong to the same learner. Do not let the first deadline
-- delete the other submission's file; flag it for individual handling instead.
create or replace function public.coursework_asset_needs_individual_review(p_asset_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.coursework_erasure_review_assets where asset_id=p_asset_id)
      or exists(select 1 from public.lesson_resources where media_asset_id=p_asset_id)
      or (select count(distinct s.id)>1 from public.assignment_submissions s
          where exists(select 1 from public.assignment_submission_assets a where a.submission_id=s.id and a.media_asset_id=p_asset_id)
             or exists(select 1 from public.coursework_upload_declarations d where d.submission_id=s.id and d.asset_id=p_asset_id)
             or exists(select 1 from public.assignment_submission_revisions r where r.submission_id=s.id
                       and r.asset_ids @> jsonb_build_array(p_asset_id::text)));
$$;

create or replace function public.purge_coursework_files(
  p_now   timestamptz default now(),
  p_limit integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_as_of    date := least((p_now at time zone 'UTC')::date,
                           (now() at time zone 'UTC')::date);
  v_id       uuid;
  v_submission uuid;
  v_changed  integer;
  v_purged   integer := 0;
  v_left     integer := 0;
  v_held     integer := 0;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'retention:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception 'retention:limit_out_of_range'
      using errcode = 'invalid_parameter_value',
            hint = 'between 1 and 5000 rows per call';
  end if;

  -- Lock the same media row as the hold writer, then re-read the retention
  -- view in a separate command. If a hold committed while this run waited for
  -- the row lock, the recheck sees it before the tombstone is written. A hold
  -- that starts after this run owns the lock cannot retroactively stop a deletion.
  for v_id, v_submission in
    select asset_id, submission_id from public.coursework_file_retention
     where due_on <= v_as_of and tombstoned_at is null and not held
       and not public.coursework_asset_needs_individual_review(asset_id)
     order by due_on, asset_id limit p_limit
  loop
    -- Submission writers lock this row before changing the revision or hand-in
    -- clock. Recheck after both locks; a concurrently removed parent is not an
    -- orphan we can safely classify from the earlier candidate list.
    perform 1 from public.assignment_submissions where id=v_submission for update;
    if not found then continue; end if;
    perform 1 from public.media_assets where id = v_id for update;
    if exists (
      select 1 from public.coursework_file_retention
       where asset_id = v_id and due_on <= v_as_of
         and tombstoned_at is null and not held
         and not public.coursework_asset_needs_individual_review(asset_id)
    ) then
      perform set_config('app.media_status_transition', 'on', true);
      update public.media_assets
         set status = 'deleted', deleted_at = now(), purge_due_at = now()
       where id = v_id and deleted_at is null;
      get diagnostics v_changed = row_count;
      v_purged := v_purged + v_changed;
      perform set_config('app.media_status_transition', '', true);
    end if;
  end loop;

  if v_purged > 0 then
    insert into public.governance_audit_events (actor, action, target_type, detail)
    values (v_actor, 'retention.coursework_files_deleted', 'retention_run',
            jsonb_build_object('asOf', v_as_of, 'files', v_purged, 'limit', p_limit));
  end if;

  select count(*)::int into v_left
    from public.coursework_file_retention
   where due_on <= v_as_of and tombstoned_at is null and not held;

  select count(*)::int into v_held
    from public.coursework_file_retention
   where held and tombstoned_at is null;

  return jsonb_build_object(
    'asOf', v_as_of,
    'deleted', v_purged,
    'remaining', v_left,
    'held', v_held,
    'awaitingStorage',
      (select count(*)::int from public.media_assets
        where purpose = 'coursework' and deleted_at is not null and purged_at is null));
end;
$$;

