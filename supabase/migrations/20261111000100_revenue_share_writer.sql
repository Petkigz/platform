-- Make the instructor revenue share operable from the finance dashboard.
--
-- The percentage is a business decision, not something this migration is
-- entitled to invent. Keep the seeded value at 0 until the owner chooses it;
-- make the control explicit, validated, role-limited, and audited.

create or replace function public.set_revenue_share_percent(
  p_percent integer,
  p_reason  text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid;
  v_old     integer;
  v_reason  text;
begin
  v_actor := public.current_user_id();
  v_reason := nullif(btrim(coalesce(p_reason, '')), '');

  if v_actor is null then
    raise exception 'sign in to change the revenue share'
      using errcode = 'insufficient_privilege';
  end if;

  if not (
    public.has_role(v_actor, 'platform_admin')
    or public.has_role(v_actor, 'finance_admin')
  ) then
    raise exception 'only a finance admin or platform admin may change the revenue share'
      using errcode = 'insufficient_privilege';
  end if;

  if p_percent is null or p_percent < 0 or p_percent > 100 then
    raise exception 'the teacher revenue share must be between 0 and 100 percent'
      using errcode = 'check_violation';
  end if;

  if v_reason is null then
    raise exception 'a written reason is required to change the revenue share'
      using errcode = 'check_violation';
  end if;

  select public.setting_int('teaching.revenue_share_percent', 0)
    into v_old;

  if not exists (
    select 1 from public.platform_settings
     where key = 'teaching.revenue_share_percent'
       and value_type = 'integer'
  ) then
    raise exception 'the revenue share setting is missing or is not an integer setting'
      using errcode = 'check_violation';
  end if;

  update public.platform_settings
     set value_text = p_percent::text,
         updated_by = v_actor
   where key = 'teaching.revenue_share_percent'
     and value_type = 'integer';

  if not found then
    raise exception 'the revenue share setting could not be updated'
      using errcode = 'check_violation';
  end if;

  insert into public.governance_audit_events
    (actor, action, target_type, target_id, detail)
  values
    (v_actor, 'teaching.revenue_share_changed', 'platform_setting', null,
     jsonb_build_object(
       'key', 'teaching.revenue_share_percent',
       'previous_percent', v_old,
       'new_percent', p_percent,
       'reason', v_reason
     ));

  return p_percent;
end;
$$;

revoke all on function public.set_revenue_share_percent(integer, text) from public;
grant execute on function public.set_revenue_share_percent(integer, text) to authenticated;

comment on function public.set_revenue_share_percent(integer, text) is
  'Sets the teacher share of course sale proceeds. Finance/platform admins only; 0..100 inclusive; written reason and append-only audit event required. Does not choose a business percentage.';
