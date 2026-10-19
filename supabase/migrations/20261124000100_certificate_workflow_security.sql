-- Bind certificate issuance and revocation to the authenticated session.
-- The legacy SECURITY DEFINER functions accept caller-supplied actor ids and
-- must remain internal implementation details.

create or replace function public.issue_certificate_for_session(
  p_enrolment_id uuid,
  p_token_hash text default null
)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_certificate public.certificates;
begin
  if v_actor is null then
    raise exception 'sign in to issue certificates' using errcode='insufficient_privilege';
  end if;
  if not public.is_privileged(v_actor) and not public.has_role(v_actor,'support_agent') then
    raise exception 'only platform staff may issue certificates' using errcode='insufficient_privilege';
  end if;
  v_certificate:=public.issue_certificate(p_enrolment_id,v_actor,p_token_hash);
  return v_certificate.certificate_number;
end;
$$;

revoke all on function public.issue_certificate_for_session(uuid,text) from public;
grant execute on function public.issue_certificate_for_session(uuid,text) to authenticated;
comment on function public.issue_certificate_for_session(uuid,text) is
  'Issues an eligible certificate as the authenticated platform/support staff member; returns only its public number.';

create or replace function public.revoke_certificate_for_session(
  p_certificate_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
begin
  if v_actor is null then
    raise exception 'sign in to revoke certificates' using errcode='insufficient_privilege';
  end if;
  if not public.is_privileged(v_actor) then
    raise exception 'only platform administrators may revoke certificates' using errcode='insufficient_privilege';
  end if;
  perform public.revoke_certificate(p_certificate_id,v_actor,p_reason);
end;
$$;

revoke all on function public.revoke_certificate_for_session(uuid,text) from public;
grant execute on function public.revoke_certificate_for_session(uuid,text) to authenticated;
comment on function public.revoke_certificate_for_session(uuid,text) is
  'Revokes a certificate as the authenticated platform administrator; requires a reason and returns no learner-linked row.';

create or replace function public.list_certificate_issuance_candidates()
returns table(
  enrolment_id uuid,
  course_title text,
  course_version_number integer,
  learner_display_name text
)
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
begin
  if v_actor is null then
    raise exception 'sign in to view certificate candidates' using errcode='insufficient_privilege';
  end if;
  if not public.is_privileged(v_actor) and not public.has_role(v_actor,'support_agent') then
    raise exception 'only platform staff may view certificate candidates' using errcode='insufficient_privilege';
  end if;

  return query
  select ce.id,c.title,cv.version_number,lp.display_name
    from public.course_enrolments ce
    join public.courses c on c.id=ce.course_id
    join public.course_versions cv on cv.id=ce.course_version_id
    join public.learner_profiles lp on lp.id=ce.learner_profile_id
    join public.course_completion_policies p on p.course_version_id=ce.course_version_id
    cross join lateral public.evaluate_completion(ce.id) completion
   where ce.deleted_at is null
     and ce.status in ('active','completed')
     and p.certificate_enabled
     and completion.is_complete
     and not exists (
       select 1 from public.certificates cert where cert.course_enrolment_id=ce.id
     )
   order by c.title,lp.display_name,ce.enrolled_at;
end;
$$;

revoke all on function public.list_certificate_issuance_candidates() from public;
grant execute on function public.list_certificate_issuance_candidates() to authenticated;
comment on function public.list_certificate_issuance_candidates() is
  'Staff-only list of completed, certificate-enabled enrolments with no issued or revoked certificate.';

create or replace function public.list_certificate_admin_records()
returns table(
  certificate_id uuid,
  certificate_number text,
  status text,
  issued_at timestamptz,
  course_title text,
  course_version_number integer,
  learner_display_name text,
  revocation_reason text
)
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
begin
  if v_actor is null then
    raise exception 'sign in to view certificate records' using errcode='insufficient_privilege';
  end if;
  if not public.is_privileged(v_actor) and not public.has_role(v_actor,'support_agent') then
    raise exception 'only platform staff may view certificate records' using errcode='insufficient_privilege';
  end if;
  return query
  select c.id,c.certificate_number,c.status,c.issued_at,c.course_title,
         c.course_version_number,c.learner_display_name,c.revocation_reason
    from public.certificates c
   order by c.issued_at desc;
end;
$$;

revoke all on function public.list_certificate_admin_records() from public;
grant execute on function public.list_certificate_admin_records() to authenticated;
comment on function public.list_certificate_admin_records() is
  'Staff-only certificate records needed for administration and revocation.';

-- The old functions remain callable only by trusted database owners and
-- internal SECURITY DEFINER wrappers; actor ids supplied by clients are not
-- an authorization boundary.
revoke execute on function public.issue_certificate(uuid,uuid,text) from public,anon,authenticated;
revoke execute on function public.revoke_certificate(uuid,uuid,text) from public,anon,authenticated;
