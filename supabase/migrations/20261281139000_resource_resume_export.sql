-- Resource positions are personal study data. Extend the existing export
-- wrapper in place, retaining its rate limit, audit, closed-account support
-- boundary and the existing learner/verified-guardian export authorization.
-- This does not enable the resource player or resolve old lesson-only places.
create or replace function public.export_my_data()
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid := public.current_user_id();
  v_status text;
  v_deleted timestamptz;
  v_result jsonb;
  v_positions jsonb;
  v_count bigint;
  v_cap constant integer := 1000;
begin
  if v_actor is null then return public.export_my_data_before_closed_boundary(); end if;
  select account_status, deleted_at into v_status, v_deleted
    from public.user_profiles where user_id=v_actor for update;
  if not found then raise exception 'support:account_closed_or_missing' using errcode='insufficient_privilege'; end if;
  v_result := public.export_my_data_before_closed_boundary();
  if v_status='closed' or v_deleted is not null then
    v_result := jsonb_set(v_result,'{support}','[]'::jsonb);
    v_result := jsonb_set(v_result,'{notIncluded}',coalesce(v_result->'notIncluded','[]'::jsonb) ||
      jsonb_build_array(jsonb_build_object('what','Support cases after account closure',
        'why','Support case content is not available to a closed session; contact privacy@ayahspring.com about a data request.')));
    v_result := jsonb_set(v_result,'{meta,note}',to_jsonb(
      'Support case content is omitted after account closure. ' ||
      case when v_result#>>'{meta,note}'='Every list is complete.' then 'Other returned lists are complete.'
           else coalesce(v_result#>>'{meta,note}','') end));
  end if;

  -- Count and list share one statement snapshot. Tie-break on immutable IDs,
  -- so the limit is deterministic even when timestamps coincide. Neither
  -- learning entitlement nor current pin is required to export retained data.
  with eligible as materialized (
    select rp.lesson_progress_id, rp.lesson_resource_id, rp.seconds, rp.updated_at,
      lp.display_name as learner, c.title as course, l.title as lesson, r.display_name as recording,
      ce.id as enrolment_id, l.id as lesson_id
    from public.lesson_resource_positions rp
    join public.lesson_progress p on p.id=rp.lesson_progress_id
    join public.course_enrolments ce on ce.id=p.course_enrolment_id
    join public.learner_profiles lp on lp.id=ce.learner_profile_id
    join public.courses c on c.id=ce.course_id
    join public.lessons l on l.id=p.lesson_id
    join public.lesson_resources r on r.id=rp.lesson_resource_id and r.lesson_id=l.id
    where public.can_export_learner(lp.id)
  ), numbered as (
    select *, row_number() over (order by updated_at, lesson_progress_id, lesson_resource_id) as rn
    from eligible
  )
  select count(*), coalesce(jsonb_agg(jsonb_build_object(
    'learner', learner, 'course', course, 'lesson', lesson, 'recording', recording,
    'enrolmentId', enrolment_id, 'lessonId', lesson_id, 'resourceId', lesson_resource_id,
    'seconds', seconds, 'updatedAt', updated_at) order by rn) filter (where rn <= v_cap), '[]'::jsonb)
    into v_count, v_positions from numbered;

  v_result := jsonb_set(v_result, '{resourcePositions}', v_positions, true);
  v_result := jsonb_set(v_result, '{meta,counts,resourcePositions}', to_jsonb(v_count), true);
  if v_count > v_cap then
    v_result := jsonb_set(v_result, '{meta,truncated}',
      coalesce(v_result#>'{meta,truncated}', '[]'::jsonb) || jsonb_build_array('resourcePositions'));
    v_result := jsonb_set(v_result, '{meta,note}', to_jsonb(
      coalesce(v_result#>>'{meta,note}', '') || ' Recording positions were cut at the 1,000-row limit.'));
  end if;
  -- The underlying export has already logged its ordinary sections. Record the
  -- added count separately, without recording any positions, and in the same
  -- transaction so a failed audit cannot produce an apparently successful file.
  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (v_actor, 'data.resource_positions_exported', 'user_profile', v_actor,
      jsonb_build_object('count', v_count, 'truncated', v_count > v_cap));
  return v_result;
end;
$$;
