-- ---------------------------------------------------------------------------
-- The controls with no writer, given one — each with its own bounds.
--
-- `platform_settings` holds two kinds of row. Ninety of them are feature switches
-- (`flag_group` is set) and they have a dashboard. The rest are *controls*: the
-- numbers and words that decide how a feature behaves once it is on — the
-- reporting currency, the rate sanity factor, the upload quota, the device cap,
-- the live-room host, the publication threshold.
--
-- Several of those already have a purpose-built writer and a screen:
--
--   teaching.revenue_share_percent   set_revenue_share_percent()  /admin
--   teaching.payout_hold_days        set_payout_policy()          /admin/payouts
--   commerce.refund_window_hours     set_refund_window()          /admin/refunds
--
-- The rest had nothing. Nine of them could only be changed with an UPDATE
-- against a table the owner cannot see, which is the exact shape this project
-- keeps rejecting: a routine change is a field or a button on the screen of
-- whoever is allowed to make it.
--
-- SHAPE OF THE FIX, AND WHY IT IS NOT A "GENERIC SETTINGS WRITER"
-- ---------------------------------------------------------------
-- A function that took a key and a value and wrote whatever it was given would
-- be the same hole with a friendlier name: any privileged account could rewrite
-- the revenue share, the reporting currency and every feature switch under cover
-- of "settings". So this is an **allowlist of named controls**, and each entry
-- carries its own gate, its own type and its own bounds:
--
--   finance.reporting_currency        text     ISO 4217, upper-case       finance
--   finance.rate_sanity_factor        integer  0 – 1000                   finance
--   media.upload_quota_gb_per_teacher integer  1 – 10 000                 platform
--   learning.offline_max_devices      integer  1 – 10                     platform
--   learning.offline_expiry_days      integer  1 – 365                    platform
--   delivery.live_room_base           text     empty, or https://         platform
--   governance.min_approvals          integer  1 – 5                      governance
--   governance.panel_required         boolean  true / false               governance
--   governance.scholar_board_active    boolean  true / false               platform
--
-- The rules live in **one** place, `platform_control_rules()`, and both the
-- reader and the writer consult it. Two copies would drift, and the failure mode
-- of a drifted copy is a screen offering a value the writer refuses.
--
-- Three refusals that matter more than the rest:
--
--   1. A KEY NOT ON THE LIST IS REFUSED, with a sentence saying where it does
--      belong. Trying `teaching.revenue_share_percent` here names
--      `set_revenue_share_percent()` and its screen; trying a feature switch
--      names the flag dashboard. A screen that silently accepted the keys it
--      knew and ignored the rest would teach people the wrong model.
--   2. A CONTROL WITH ITS OWN WRITER IS NOT ON THE LIST. The refund window, the
--      revenue share and the payout hold already have a writer that does more
--      than change a number — the revenue share snapshots into every future
--      earning, the payout policy has two gates. Routing them through here would
--      bypass that.
--   3. THE GATE IS PER CONTROL, not per screen. A finance admin sees the two
--      money controls; a governance admin sees the two governance ones; the
--      platform admin sees all nine. The reader returns only what the caller may
--      actually change — the same rule `staff_attention()` follows, because a
--      number shown but not editable is a permission question dressed as a
--      layout question.
--
-- Every change is audited with the old value, the new one and a written reason.
-- The reason is not decoration: these are the numbers that decide what a family
-- can ask for, what a teacher may store, and how many people must agree before a
-- course teaches anything.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- The rules, in one place
-- ---------------------------------------------------------------------------
create or replace function public.platform_control_rules()
returns table (
  control_key       text,
  value_type        text,
  min_value         integer,
  max_value         integer,
  allowed_prefix    text,
  requires_finance  boolean,
  requires_governance boolean,
  requires_platform boolean,
  label             text,
  unit              text,
  note              text
)
language sql
immutable
as $$
  select *
    from (values
      ('finance.reporting_currency', 'text', null::integer, null::integer, null::text,
       true, false, false,
       'Reporting currency', 'ISO 4217',
       'The one currency money is reported in. Changing it re-reports the past at whatever rates are recorded; it never restates a ledger row.'),

      ('finance.rate_sanity_factor', 'integer', 0, 1000, null::text,
       true, false, false,
       'Rate sanity factor', 'times',
       'How many times the previous rate a new one may be before recording it needs a written reason. 0 turns the check off.'),

      ('media.upload_quota_gb_per_teacher', 'integer', 1, 10000, null::text,
       false, false, true,
       'Teacher upload allowance', 'GiB',
       'Cumulative master bytes one uploader may store. Below 1 would block every upload rather than limit it, so 1 is the floor. Enforced only while platform.cost_controls is on.'),

      ('learning.offline_max_devices', 'integer', 1, 10, null::text,
       false, false, true,
       'Devices per learner', 'devices',
       'How many devices one learner may keep saved lessons on at once, counted on devices that actually hold a live save.'),

      ('learning.offline_expiry_days', 'integer', 1, 365, null::text,
       false, false, true,
       'Saved lesson lifetime', 'days',
       'How long a saved lesson plays before it asks to be refreshed. A saved lesson is a subscription artefact, not a purchase.'),

      ('delivery.live_room_base', 'text', null::integer, null::integer, 'https://',
       false, false, true,
       'Live room host', 'URL',
       'Base URL of the live-room host; a room is this plus /room/<slug>. Empty means live rooms are not connected, and joining refuses rather than handing out a URL that carries no class.'),

      ('governance.min_approvals', 'integer', 1, 5, null::text,
       false, true, false,
       'Approvals needed to publish', 'approvals',
       'How many independent approvals a course version needs before it may be published.'),

      ('governance.panel_required', 'boolean', null::integer, null::integer, null::text,
       false, true, false,
       'Scholarly panel required', null,
       'Whether a scholarly panel must decide before publication. Off means peer review by an authorised reviewer is enough.'),

      ('governance.scholar_board_active', 'boolean', null::integer, null::integer, null::text,
       false, false, true,
       'Scholar board convened', null,
       'Whether a convened board may check reviewer credentials. Turning it on grants nothing by itself: only the owner may appoint a member, and only a member gains the power.')
    ) v(control_key, value_type, min_value, max_value, allowed_prefix,
        requires_finance, requires_governance, requires_platform, label, unit, note);
$$;

revoke all on function public.platform_control_rules() from public, anon;
grant execute on function public.platform_control_rules() to authenticated;

comment on function public.platform_control_rules() is
  'The allowlist of controls this screen may change: key, type, bounds, owning role and a sentence about what the number decides. One source of truth — the reader and the writer both consult it.';

-- ---------------------------------------------------------------------------
-- Who may change a given control
-- ---------------------------------------------------------------------------
create or replace function public.may_change_control(p_actor uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case
      when r.requires_platform then public.has_role(p_actor, 'platform_admin')
      else
        (not r.requires_finance
          or public.has_role(p_actor, 'finance_admin')
          or public.has_role(p_actor, 'platform_admin'))
        and
        (not r.requires_governance
          or public.has_role(p_actor, 'governance_admin')
          or public.has_role(p_actor, 'platform_admin'))
    end
    from public.platform_control_rules() r
   where r.control_key = p_key), false);
$$;

revoke all on function public.may_change_control(uuid, text) from public, anon;
grant execute on function public.may_change_control(uuid, text) to authenticated;

comment on function public.may_change_control(uuid, text) is
  'Whether one person may change one named control. A platform admin may change all of them; a finance or governance admin only the ones their job owns.';

-- ---------------------------------------------------------------------------
-- What this person may change, with what each is now
-- ---------------------------------------------------------------------------
create or replace function public.platform_controls()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_rows  jsonb;
begin
  if v_actor is null then
    raise exception 'sign in to see the controls'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.is_privileged(v_actor) then
    raise exception 'only platform staff have controls to change'
      using errcode = 'insufficient_privilege';
  end if;

  -- Only the controls this person may change. A control returned but not
  -- editable would be a permission question dressed as a layout question, and
  -- the value of some of these — what a teacher may store, how many people must
  -- agree before a course publishes — is not a number to hand to every role.
  select coalesce(jsonb_agg(jsonb_build_object(
           'key',         r.control_key,
           'label',       r.label,
           'valueType',   r.value_type,
           'value',       s.value_text,
           'unit',        r.unit,
           'minValue',    r.min_value,
           'maxValue',    r.max_value,
           'allowedPrefix', r.allowed_prefix,
           'note',        r.note,
           'updatedAt',   s.updated_at,
           'updatedBy',   updater.display_name
         ) order by r.control_key), '[]'::jsonb)
    into v_rows
    from public.platform_control_rules() r
    join public.platform_settings s on s.key = r.control_key
    left join public.user_profiles updater on updater.user_id = s.updated_by
   where public.may_change_control(v_actor, r.control_key);

  return jsonb_build_object(
    'generatedAt', now(),
    'controls',    v_rows,
    -- The reader is honest about its own narrowness: other controls exist and
    -- are not this person's.
    'totalControls', (select count(*) from public.platform_control_rules()),
    'mineCount',    (select count(*) from public.platform_control_rules() r
                      where public.may_change_control(v_actor, r.control_key)));
end;
$$;

revoke all on function public.platform_controls() from public, anon;
grant execute on function public.platform_controls() to authenticated;

comment on function public.platform_controls() is
  'Every control the signed-in staff member may change, with its current value, type, bounds and what it decides. Filters by role rather than labelling: a control returned but not editable is a permission question disguised as a layout one.';

-- ---------------------------------------------------------------------------
-- The writer
-- ---------------------------------------------------------------------------
create or replace function public.set_platform_control(
  p_key    text,
  p_value  text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_rule     record;
  v_reason   text;
  v_value    text;
  v_old      text;
  v_changed  boolean;
  v_flag     text;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff can change a control'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_rule
    from public.platform_control_rules() r
   where r.control_key = btrim(coalesce(p_key, ''));
  if v_rule.control_key is null then
    -- Two useful sentences before the generic one, because the commonest
    -- mistake is reaching for this screen to do something it deliberately
    -- does not do.
    -- A control that already has its own writer is named first: that is the more
    -- useful answer, and some of them (`teaching.revenue_share_percent`) also
    -- carry a flag group, so asking about the flag first would give the wrong
    -- sentence to the commonest mistake.
    if btrim(coalesce(p_key, '')) in
       ('teaching.revenue_share_percent', 'teaching.payout_hold_days',
        'commerce.refund_window_hours') then
      raise exception '% has its own writer and screen beside the feature it governs; it is not changed here', p_key
        using errcode = 'insufficient_privilege';
    end if;
    select flag_group into v_flag
      from public.platform_settings where key = btrim(coalesce(p_key, ''));
    if v_flag is not null then
      raise exception '% is a feature switch — turn it on or off on the flag dashboard, not here', p_key
        using errcode = 'insufficient_privilege';
    end if;
    raise exception '% is not a control this screen may change', p_key
      using errcode = 'insufficient_privilege';
  end if;

  if not public.may_change_control(v_actor, v_rule.control_key) then
    raise exception 'only % may change %',
      case
        when v_rule.requires_platform then 'a platform admin'
        when v_rule.requires_finance then 'a finance admin or platform admin'
        else 'a governance admin or platform admin'
      end,
      v_rule.control_key
      using errcode = 'insufficient_privilege';
  end if;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_reason is null then
    raise exception 'say why % is being changed', v_rule.control_key
      using errcode = 'check_violation';
  end if;
  if length(v_reason) > 500 then
    raise exception 'the reason is longer than this field holds; summarise it'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Parse by the declared type. A text control with a prefix rule (the live-room
  -- host) accepts the empty string, because empty is the honest shipped state:
  -- live rooms are not connected.
  if v_rule.value_type = 'integer' then
    if btrim(coalesce(p_value, '')) !~ '^-?[0-9]+$' then
      raise exception '% takes a whole number', v_rule.control_key
        using errcode = 'invalid_parameter_value';
    end if;
    v_value := btrim(p_value)::integer::text;
    if v_rule.min_value is not null and v_value::integer < v_rule.min_value then
      raise exception '% is below the floor of % %', v_rule.control_key,
        v_rule.min_value, coalesce(v_rule.unit, '')
        using errcode = 'invalid_parameter_value';
    end if;
    if v_rule.max_value is not null and v_value::integer > v_rule.max_value then
      raise exception '% is above the ceiling of % %', v_rule.control_key,
        v_rule.max_value, coalesce(v_rule.unit, '')
        using errcode = 'invalid_parameter_value';
    end if;
  elsif v_rule.value_type = 'boolean' then
    v_value := lower(btrim(coalesce(p_value, '')));
    if v_value not in ('true', 'false') then
      raise exception '% is on or off — say true or false', v_rule.control_key
        using errcode = 'invalid_parameter_value';
    end if;
  else
    v_value := btrim(coalesce(p_value, ''));
    if v_rule.control_key = 'finance.reporting_currency' then
      v_value := upper(v_value);
      if v_value !~ '^[A-Z]{3}$' then
        raise exception 'a reporting currency is a three-letter ISO code, like USD'
          using errcode = 'invalid_parameter_value';
      end if;
    elsif v_rule.allowed_prefix is not null and v_value <> '' then
      if v_value !~* ('^' || v_rule.allowed_prefix) then
        raise exception '% must be empty or start with %', v_rule.control_key,
          v_rule.allowed_prefix
          using errcode = 'invalid_parameter_value';
      end if;
      if length(v_value) > 300 then
        raise exception 'that address is longer than a URL needs to be'
          using errcode = 'invalid_parameter_value';
      end if;
    end if;
  end if;

  select value_text into v_old from public.platform_settings
   where key = v_rule.control_key;
  if v_old is null then
    raise exception '% is missing from the register', v_rule.control_key
      using errcode = 'P0002';
  end if;

  v_changed := v_old is distinct from v_value;

  if v_changed then
    update public.platform_settings
       set value_text = v_value,
           updated_by = v_actor
     where key = v_rule.control_key;

    insert into public.governance_audit_events (actor, action, target_type, detail)
    values (
      v_actor,
      'setting.control_changed',
      'platform_setting',
      jsonb_build_object(
        'key',     v_rule.control_key,
        'from',    v_old,
        'to',      v_value,
        'reason',  v_reason));
  end if;

  return jsonb_build_object(
    'key',      v_rule.control_key,
    'previous', v_old,
    'value',    v_value,
    'changed',  v_changed);
end;
$$;

revoke all on function public.set_platform_control(text, text, text) from public, anon;
grant execute on function public.set_platform_control(text, text, text) to authenticated;

comment on function public.set_platform_control(text, text, text) is
  'Change one named control, within its own bounds, with a written reason, audited with the old value. Refuses feature switches, refuses controls that have their own writer, and refuses a key not on the allowlist — this is not a generic settings writer.';
