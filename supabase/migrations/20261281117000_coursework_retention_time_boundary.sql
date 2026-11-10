-- Date-only comparisons could tombstone a file before the actual one-year
-- anniversary. Keep the date column for existing displays, but compare exact
-- instants in every coursework retention decision. This does not delete bytes.
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
       (clock.due_at at time zone 'UTC')::date as due_on,
       case when lp.deleted_at is not null and
          (clock.ordinary_due_at is null or lp.deleted_at + interval '720 hours' <= clock.ordinary_due_at) then 'erasure'
         when ca.cohort_id is not null and co.ends_at is null then 'missing_class_end'
         when co.ends_at is not null and co.ends_at>=greatest(s.submitted_at,s.created_at,ref.attached_at) then 'class_end'
         else 'handed_in' end as basis,
       clock.due_at
  from references_by_submission ref
  join public.media_assets ma on ma.id=ref.asset_id and ma.purpose='coursework'
  join public.assignment_submissions s on s.id=ref.submission_id
  join public.course_assignments ca on ca.id=s.assignment_id
  join public.learner_profiles lp on lp.id=s.learner_profile_id
  left join public.cohorts co on co.id=ca.cohort_id
  cross join lateral (select case when ca.cohort_id is not null and co.ends_at is null then null
      else ((greatest(co.ends_at,s.submitted_at,s.created_at,ref.attached_at) at time zone 'UTC')
            + interval '1 year') at time zone 'UTC' end as ordinary_due_at) ordinary
  cross join lateral (select ordinary.ordinary_due_at,
      least(ordinary.ordinary_due_at, lp.deleted_at + interval '720 hours') as due_at) clock;


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
  v_as_of_time timestamptz := least(p_now, now());
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
     where due_at <= v_as_of_time and tombstoned_at is null and not held
       and not public.coursework_asset_needs_individual_review(asset_id)
     order by due_at, asset_id limit p_limit
  loop
    -- Submission writers lock this row before changing the revision or hand-in
    -- clock. Recheck after both locks; a concurrently removed parent is not an
    -- orphan we can safely classify from the earlier candidate list.
    perform 1 from public.assignment_submissions where id=v_submission for update;
    if not found then continue; end if;
    perform 1 from public.media_assets where id = v_id for update;
    if exists (
      select 1 from public.coursework_file_retention
       where asset_id = v_id and due_at <= v_as_of_time
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

  select count(distinct asset_id)::int into v_left
    from public.coursework_file_retention
   where due_at <= v_as_of_time and tombstoned_at is null and not held;

  select count(*)::int into v_held from public.coursework_retention_holds h
    join public.media_assets ma on ma.id=h.asset_id
   where h.closed_at is null and ma.deleted_at is null;

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


create or replace function public.coursework_retention_plan_internal(p_now timestamptz default now())
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor      uuid := public.current_user_id();
  v_as_of      date := (p_now at time zone 'UTC')::date;
  v_due        integer;
  v_oldest     date;
  v_next       date;
  v_held       integer;
  v_held_oldest date;
  v_awaiting   integer;
  v_awaiting_oldest timestamptz;
  v_erased     integer;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'retention:not_allowed'
      using errcode = 'insufficient_privilege',
            hint = 'a child''s file is deleted by the owner or the cleanup they schedule';
  end if;

  select count(distinct asset_id)::int, min(due_on) into v_due, v_oldest
    from public.coursework_file_retention
   where due_at <= p_now
     and tombstoned_at is null
     and not held;

  select min(due_on) into v_next
    from public.coursework_file_retention
   where due_at > p_now
     and tombstoned_at is null
     and not held;

  select count(*)::int, min((select min(r.due_on) from public.coursework_file_retention r where r.asset_id=h.asset_id))
    into v_held,v_held_oldest
    from public.coursework_retention_holds h join public.media_assets ma on ma.id=h.asset_id
   where h.closed_at is null and ma.deleted_at is null;

  -- Tombstoned and not yet confirmed deleted from storage. This database cannot
  -- close these itself; the number is here so it is never mistaken for zero.
  select count(*)::int, min(purge_due_at) into v_awaiting, v_awaiting_oldest
    from public.media_assets
   where purpose = 'coursework'
     and deleted_at is not null
     and purged_at is null;

  select count(distinct asset_id)::int into v_erased
    from public.coursework_file_retention
   where basis = 'erasure';

  return jsonb_build_object(
    'asOf', v_as_of,
    'policies', jsonb_build_object(
      'courseworkFile', jsonb_build_object(
        'years', 1,
        'days', null,
        'clock', 'one year after the later of the class ending and the file being handed in',
        'source', 'The owner''s answer of 2026-11-01: "a year after the class ends."'),
      'erasedRecord', jsonb_build_object(
        'years', null,
        'days', 30,
        'clock', 'thirty days after the learner''s record was erased, where that is sooner',
        'source', 'The children''s policy: a child''s learning record is deleted thirty days after the guardian''s account closes.')),
    'files', jsonb_build_object(
      'due', v_due,
      'oldestDue', v_oldest,
      'nextDue', v_next,
      'erasedToDate', v_erased,
      'held', jsonb_build_object(
        'count', v_held,
        'oldestDue', v_held_oldest,
        'note', 'Files somebody held on purpose. Deletion stops while a hold is open and needs a written reason to end.')),
    'storage', jsonb_build_object(
      'awaiting', v_awaiting,
      'oldestDue', v_awaiting_oldest,
      'note', 'Unwatchable; storage deletion has not been recorded. An owner statement does not independently verify the object or its copies.'));
end;
$$;

create or replace function public.queue_reviewed_shared_coursework(p_asset_id uuid,p_reason text,p_confirm text)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_asset public.media_assets; v_prior text:=current_setting('app.media_status_transition',true);
  v_contexts uuid[]; v_current_contexts uuid[];
begin
  perform public.lock_coursework_erasure_review_owner();
  if length(trim(coalesce(p_reason,'')))<3 or length(trim(p_reason))>1000
     or p_confirm is distinct from 'I reviewed every context and understand this only queues storage deletion' then
    raise exception 'confirm the review and provide a reason' using errcode='invalid_parameter_value';
  end if;
  -- The same ordering as retention: lock each currently attributable submission
  -- before the asset, then re-evaluate the complete clock after both locks.
  select array_agg(r.submission_id order by r.submission_id) into v_contexts
    from public.coursework_file_retention r where r.asset_id=p_asset_id;
  perform s.id from public.assignment_submissions s where s.id=any(coalesce(v_contexts,'{}'::uuid[]))
   order by s.id for update;
  select * into v_asset from public.media_assets where id=p_asset_id for update;
  if not found or v_asset.purpose<>'coursework' then
    raise exception 'the coursework file was not found' using errcode='no_data_found';
  end if;
  if v_asset.deleted_at is not null then return false; end if;
  -- A previously uncommitted attachment could have appeared while the asset
  -- lock was being acquired. Do not act on a context whose submission row was
  -- not among the rows locked above; retry with a fresh candidate set instead.
  select array_agg(r.submission_id order by r.submission_id) into v_current_contexts
    from public.coursework_file_retention r where r.asset_id=p_asset_id;
  if v_current_contexts is distinct from v_contexts then
    raise exception 'submission contexts changed during review; refresh and retry' using errcode='serialization_failure';
  end if;
  if v_asset.status<>'available' then
    raise exception 'pending or quarantined files need separate individual handling' using errcode='check_violation';
  end if;
  if exists(select 1 from public.coursework_retention_holds where asset_id=p_asset_id and closed_at is null) then
    raise exception 'a safeguarding hold is open' using errcode='check_violation';
  end if;
  if exists(select 1 from public.coursework_erasure_review_assets where asset_id=p_asset_id)
     or exists(select 1 from public.lesson_resources where media_asset_id=p_asset_id)
     or public.coursework_storage_needs_individual_review(p_asset_id) then
    raise exception 'the file has a separate erasure, lesson or storage issue that needs individual handling' using errcode='check_violation';
  end if;
  if (select count(*) from public.coursework_file_retention where asset_id=p_asset_id)<2 then
    raise exception 'the file no longer has multiple submission contexts; refresh the register' using errcode='check_violation';
  end if;
  if exists(select 1 from public.coursework_file_retention where asset_id=p_asset_id
             and (due_at is null or due_at>now())) then
    raise exception 'not all submission contexts are due; keep the file until every clock permits deletion' using errcode='check_violation';
  end if;
  perform set_config('app.media_status_transition','on',true);
  update public.media_assets set status='deleted',deleted_at=now(),purge_due_at=now() where id=p_asset_id;
  perform set_config('app.media_status_transition',coalesce(v_prior,''),true);
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
    values(public.current_user_id(),'coursework.shared_retention_review_queued','media_asset',p_asset_id,
      jsonb_build_object('reason',trim(p_reason),'storageDeletionVerified',false));
  return true;
end;
$$;

create or replace function public.coursework_shared_retention_review_page(p_after uuid default null,p_limit integer default 51)
returns table(asset_id uuid,display_name text,earliest_due date,submission_contexts bigint,
              in_lesson boolean,erasure_review boolean,held boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  if not public.coursework_active_actor() then raise exception 'coursework:not_allowed' using errcode='insufficient_privilege'; end if;
  if p_limit is null or p_limit<1 or p_limit>100 then
    raise exception 'invalid shared retention review page' using errcode='invalid_parameter_value';
  end if;
  return query select ma.id,ma.display_name,
    (select min(r.due_on) from public.coursework_file_retention r where r.asset_id=ma.id),
    (select count(distinct r.submission_id) from public.coursework_file_retention r where r.asset_id=ma.id),
    exists(select 1 from public.lesson_resources lr where lr.media_asset_id=ma.id),
    exists(select 1 from public.coursework_erasure_review_assets x where x.asset_id=ma.id),
    exists(select 1 from public.coursework_retention_holds h where h.asset_id=ma.id and h.closed_at is null)
  from public.media_assets ma
  where ma.purpose='coursework' and ma.deleted_at is null and (p_after is null or ma.id>p_after)
    and exists(select 1 from public.coursework_file_retention r where r.asset_id=ma.id and r.due_at<=now())
    and public.coursework_asset_needs_individual_review(ma.id)
  order by ma.id limit p_limit;
end;
$$;
