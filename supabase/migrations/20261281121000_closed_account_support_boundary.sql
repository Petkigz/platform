-- Closing an account does not immediately revoke its provider tokens. Limit
-- that session's help-desk reach at the database, without changing access for
-- active requesters or staff. This is not an evidence-preservation hold or a
-- global session revocation. Preserve the read predicate's OID: RLS uses it.
create or replace function public.can_read_support_case(p_case_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.user_profiles p
                  where p.user_id=public.current_user_id()
                    and p.account_status <> 'closed' and p.deleted_at is null)
    and (public.is_privileged(public.current_user_id())
         or exists (select 1 from public.support_cases sc
                     where sc.id=p_case_id and sc.requested_by=public.current_user_id()));
$$;

-- Take the same profile lock used by account closure. A writer that started
-- before closure either completes first or sees the closed state afterwards.
alter function public.open_support_case(text,text,text,uuid,uuid) rename to open_support_case_before_closed_boundary;
revoke all on function public.open_support_case_before_closed_boundary(text,text,text,uuid,uuid) from public,anon,authenticated;
create function public.open_support_case(p_category text,p_subject text,p_body text,
  p_learner_profile_id uuid default null,p_order_id uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=public.current_user_id();
begin
  if v_actor is null then
    return public.open_support_case_before_closed_boundary(p_category,p_subject,p_body,p_learner_profile_id,p_order_id);
  end if;
  perform 1 from public.user_profiles where user_id=v_actor and account_status <> 'closed' and deleted_at is null for update;
  if not found then raise exception 'support:account_closed_or_missing' using errcode='insufficient_privilege'; end if;
  return public.open_support_case_before_closed_boundary(p_category,p_subject,p_body,p_learner_profile_id,p_order_id);
end;
$$;
revoke all on function public.open_support_case(text,text,text,uuid,uuid) from public,anon;
grant execute on function public.open_support_case(text,text,text,uuid,uuid) to authenticated;

alter function public.reply_to_support_case(uuid,text,boolean) rename to reply_to_support_case_before_closed_boundary;
revoke all on function public.reply_to_support_case_before_closed_boundary(uuid,text,boolean) from public,anon,authenticated;
create function public.reply_to_support_case(p_case_id uuid,p_body text,p_is_internal boolean default false)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=public.current_user_id();
begin
  if v_actor is null then
    return public.reply_to_support_case_before_closed_boundary(p_case_id,p_body,p_is_internal);
  end if;
  perform 1 from public.user_profiles where user_id=v_actor and account_status <> 'closed' and deleted_at is null for update;
  if not found then raise exception 'support:account_closed_or_missing' using errcode='insufficient_privilege'; end if;
  return public.reply_to_support_case_before_closed_boundary(p_case_id,p_body,p_is_internal);
end;
$$;
revoke all on function public.reply_to_support_case(uuid,text,boolean) from public,anon;
grant execute on function public.reply_to_support_case(uuid,text,boolean) to authenticated;

alter function public.close_support_case(uuid,text) rename to close_support_case_before_closed_boundary;
revoke all on function public.close_support_case_before_closed_boundary(uuid,text) from public,anon,authenticated;
create function public.close_support_case(p_case_id uuid,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=public.current_user_id();
begin
  if v_actor is null then
    perform public.close_support_case_before_closed_boundary(p_case_id,p_reason);
    return;
  end if;
  perform 1 from public.user_profiles where user_id=v_actor and account_status <> 'closed' and deleted_at is null for update;
  if not found then raise exception 'support:account_closed_or_missing' using errcode='insufficient_privilege'; end if;
  perform public.close_support_case_before_closed_boundary(p_case_id,p_reason);
end;
$$;
revoke all on function public.close_support_case(uuid,text) from public,anon;
grant execute on function public.close_support_case(uuid,text) to authenticated;

-- The data export runs as a definer and includes support text, so it does not
-- inherit the support RLS policy. Refuse a stale closed-account session there
-- too. A privacy request can still be handled through the published contact.
alter function public.export_my_data() rename to export_my_data_before_closed_boundary;
revoke all on function public.export_my_data_before_closed_boundary() from public,anon,authenticated;
create function public.export_my_data()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=public.current_user_id();
begin
  if v_actor is null then return public.export_my_data_before_closed_boundary(); end if;
  perform 1 from public.user_profiles where user_id=v_actor and account_status <> 'closed' and deleted_at is null for update;
  if not found then raise exception 'support:account_closed_or_missing' using errcode='insufficient_privilege'; end if;
  return public.export_my_data_before_closed_boundary();
end;
$$;
revoke all on function public.export_my_data() from public,anon;
grant execute on function public.export_my_data() to authenticated;
