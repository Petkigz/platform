-- An actual class end is not inferred from a closing click. The identified
-- safeguarding owner can attest a missing end for a closed cohort, with a
-- reason and an explicit warning that this can make coursework immediately due.
-- This is a one-time correction, not a general editor or proof of the event.
create function public.attest_closed_cohort_end(
  p_cohort_id uuid, p_ends_at timestamptz, p_reason text, p_confirm text
) returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_row public.cohorts; v_actor uuid := public.current_user_id();
begin
  perform public.require_coursework_retention_owner();
  if not exists (select 1 from public.user_profiles where user_id = v_actor
                 and account_status = 'active' and deleted_at is null) then
    raise exception 'coursework:not_allowed' using errcode = 'insufficient_privilege';
  end if;
  if p_confirm is distinct from 'I verified the class end and understand that coursework may become due' then
    raise exception 'confirm the verified end and the retention effect' using errcode = 'check_violation';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 3 or length(btrim(p_reason)) > 1000 then
    raise exception 'give a written reason of 3 to 1000 characters' using errcode = 'check_violation';
  end if;
  select * into v_row from public.cohorts where id = p_cohort_id for update;
  if not found then raise exception 'class not found' using errcode = 'no_data_found'; end if;
  if v_row.status <> 'closed' or v_row.ends_at is not null then
    raise exception 'only a closed class without an end date can be corrected here' using errcode = 'check_violation';
  end if;
  if p_ends_at is null or p_ends_at <= v_row.starts_at or p_ends_at < v_row.join_closes_at or p_ends_at > now() then
    raise exception 'the end must be after the start, not before the join window, and not in the future' using errcode = 'check_violation';
  end if;
  update public.cohorts set ends_at = p_ends_at where id = p_cohort_id;
  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'cohort.end_attested', 'cohort', p_cohort_id,
    jsonb_build_object('ends_at', p_ends_at, 'reason', btrim(p_reason), 'attestation', true));
  return p_ends_at;
end;
$$;
revoke all on function public.attest_closed_cohort_end(uuid,timestamptz,text,text) from public, anon;
grant execute on function public.attest_closed_cohort_end(uuid,timestamptz,text,text) to authenticated;

-- Add the status and boundary dates needed to make a considered decision. Keep
-- the owner-only authorization, keyset pagination and bounded page size.
drop function public.coursework_missing_class_ends(integer, uuid);
create function public.coursework_missing_class_ends(p_limit integer default 100, p_after uuid default null)
returns table (cohort_id uuid, cohort_title text, course_title text, files bigint,
               cohort_status text, starts_at timestamptz, join_closes_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_coursework_retention_owner();
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'limit must be between 1 and 100' using errcode = 'invalid_parameter_value';
  end if;
  return query
    select c.id, c.title, cr.title, count(distinct r.asset_id), c.status, c.starts_at, c.join_closes_at
      from public.coursework_file_retention r
      join public.cohorts c on c.id = r.cohort_id
      join public.courses cr on cr.id = r.course_id
     where r.basis = 'missing_class_end' and r.tombstoned_at is null
       and (p_after is null or c.id > p_after)
     group by c.id, c.title, cr.title, c.status, c.starts_at, c.join_closes_at
     order by c.id limit p_limit;
end;
$$;
revoke all on function public.coursework_missing_class_ends(integer,uuid) from public, anon;
grant execute on function public.coursework_missing_class_ends(integer,uuid) to authenticated;
