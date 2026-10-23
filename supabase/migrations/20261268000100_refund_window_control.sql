-- ---------------------------------------------------------------------------
-- Changing the refund window is a decision, so it has a writer and a screen.
--
-- `commerce.refund_window_hours` was added with a schema migration and the
-- setting lives in the register, which means the owner *can* change it — with an
-- UPDATE against a table they cannot see. That is exactly the shape this
-- project keeps rejecting: the standing rule is that a routine change is a field
-- or a button on the screen of whoever is allowed to make it, because the people
-- who run this platform are not going to open SQL to move a number.
--
-- So: one function, `set_refund_window()`, and a small form on `/admin/refunds`
-- — the page where the window is enforced and explained, so the control sits
-- beside the thing it changes.
--
-- What makes it a writer rather than an UPDATE with extra steps:
--
--   1. A REASON IN WRITING. The window is a policy about customers' money. A
--      change without a sentence explaining it is a change nobody can review
--      later, and this number decides whether a family can get their money back.
--
--   2. A RANGE. 0 to 8760 hours — a year. Below zero is nonsense (a window that
--      closes before the payment), and above a year is a platform pretending to
--      have a policy while allowing anything. The refusal says which bound was
--      crossed rather than "invalid input".
--
--   3. AN AUDIT ROW with the old value, the new value and the reason, so "who
--      shortened the refund window, and why" is answerable a year from now.
--
-- It is deliberately NOT a general settings writer. A generic one would let any
-- privileged account rewrite every control in the register — including the
-- revenue-share percentage and the reporting currency — under cover of a feature
-- that is about refunds. When the other numeric controls get screens, each gets
-- its own writer with its own bounds, and the audit says what changed.
-- ---------------------------------------------------------------------------

create or replace function public.set_refund_window(
  p_hours integer,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_old   integer;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff can change the refund window'
      using errcode = 'insufficient_privilege';
  end if;

  if p_hours is null then
    raise exception 'say how many hours the window should be'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_hours < 0 then
    raise exception
      'a refund window cannot be negative — use 0 to close self-serve refunds entirely'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_hours > 8760 then
    raise exception
      '% hours is longer than a year; a window that long is not a policy',
      p_hours
      using errcode = 'invalid_parameter_value';
  end if;

  if coalesce(trim(p_reason), '') = '' then
    raise exception 'say why the window is being changed'
      using errcode = 'check_violation';
  end if;

  select value_text::integer into v_old
    from public.platform_settings
   where key = 'commerce.refund_window_hours';

  update public.platform_settings
     set value_text = p_hours::text,
         updated_by = v_actor
   where key = 'commerce.refund_window_hours';

  if not found then
    raise exception 'the refund window setting is missing from the register'
      using errcode = 'P0002';
  end if;

  insert into public.governance_audit_events (actor, action, target_type, detail)
  values (
    v_actor,
    'setting.refund_window_changed',
    'platform_setting',
    jsonb_build_object(
      'key', 'commerce.refund_window_hours',
      'from_hours', v_old,
      'to_hours', p_hours,
      'reason', trim(p_reason)));

  return p_hours;
end;
$$;

revoke all on function public.set_refund_window(integer, text) from public, anon;
grant execute on function public.set_refund_window(integer, text) to authenticated;

comment on function public.set_refund_window(integer, text) is
  'Move the self-serve refund window. Staff only, needs a written reason, bounded at 0 to 8760 hours, and audited with the old value. The control lives on /admin/refunds, beside the policy it changes.';
