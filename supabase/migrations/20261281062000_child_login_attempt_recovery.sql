-- Service-only recovery of a marked identity after a lost create-user reply.
-- Never expose auth records or identity existence to an ordinary caller.
create function public.child_login_attempt_identity(p_attempt uuid, p_guardian uuid)
returns uuid language plpgsql stable security definer set search_path=public as $$
declare
  v_attempt public.child_login_attempts;
  v_ids uuid[];
begin
  select * into v_attempt from public.child_login_attempts
   where id=p_attempt and guardian_user_id=p_guardian;
  if not found then
    raise exception 'child_login:no_attempt' using errcode='insufficient_privilege';
  end if;
  select array_agg(u.id) into v_ids from auth.users u
   where lower(u.email)=v_attempt.username || '@learners.ayahspring.com'
     and u.raw_app_meta_data->>'ayahspring_child_attempt'=p_attempt::text;
  if coalesce(cardinality(v_ids), 0) > 1 then
    raise exception 'child_login:ambiguous_identity' using errcode='check_violation';
  end if;
  return v_ids[1];
end;
$$;
revoke all on function public.child_login_attempt_identity(uuid,uuid) from public, anon, authenticated;
grant execute on function public.child_login_attempt_identity(uuid,uuid) to service_role;
