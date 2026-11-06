-- Open concerns must remain reachable without falsely acknowledging the first
-- page. The cursor keeps full timestamp precision and uses the review ID as a
-- tie breaker. Keep the existing one-argument reader for older clients.
create function public.safeguarding_concern_queue_page(p_after timestamptz default null, p_after_id uuid default null, p_limit integer default 50)
returns table(review_id uuid, asset_id uuid, note text, reviewed_at timestamptz,
              reviewer_name text, learner_name text, course_title text, details_unavailable boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_actor uuid := public.current_user_id();
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin')
     or not exists (select 1 from public.safeguarding_owner where singleton and owner_user_id=v_actor) then
    raise exception 'only the configured safeguarding owner may read the concern queue' using errcode = 'insufficient_privilege';
  end if;
  if (p_after is null) <> (p_after_id is null) then
    raise exception 'both queue cursor values are required' using errcode = 'invalid_parameter_value';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'limit must be between 1 and 100' using errcode = 'invalid_parameter_value';
  end if;
  return query
    select r.id, r.asset_id, r.note, r.reviewed_at, up.display_name,
           lp.display_name, c.title, (s.id is null or lp.id is null)
      from public.coursework_file_reviews r
      left join public.safeguarding_concern_acknowledgements ack on ack.review_id=r.id
      left join public.assignment_submissions s on s.id=r.submission_id
      left join public.learner_profiles lp on lp.id=s.learner_profile_id
      left join public.course_assignments ca on ca.id=s.assignment_id
      left join public.courses c on c.id=ca.course_id
      left join public.user_profiles up on up.user_id=r.reviewed_by
     where r.decision='concern' and ack.review_id is null
       and (p_after is null or (r.reviewed_at, r.id) > (p_after, p_after_id))
     order by r.reviewed_at, r.id
     limit p_limit;
end;
$$;
revoke all on function public.safeguarding_concern_queue_page(timestamptz,uuid,integer) from public, anon;
grant execute on function public.safeguarding_concern_queue_page(timestamptz,uuid,integer) to authenticated;
