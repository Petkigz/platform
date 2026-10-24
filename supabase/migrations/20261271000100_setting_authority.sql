-- ---------------------------------------------------------------------------
-- A switch is the platform admin's, and the table says so
-- ---------------------------------------------------------------------------
-- `platform_settings` has two kinds of row and, until now, one gate. The read
-- policy is `is_privileged` — finance, governance, support and the owner all
-- read the register, which is right: knowing that `commerce.checkout` is off is
-- part of being staff. The *write* policy was also `is_privileged`, which is
-- not right, and was never decided; it was simply the policy that was written
-- before there was more than one kind of staff member.
--
-- The consequence was concrete. A support agent — whose whole job is other
-- people's cases, and who cannot approve a refund — could issue one UPDATE and
-- turn `commerce.checkout` on, or `platform.support` off. Nothing in the UI
-- offered it, and an offer is not a permission check. A screen that hides a
-- button is a courtesy; the database refusing the write is the rule.
--
-- The register already distinguishes the two kinds in prose (FLAGS.md has a
-- flags table and a controls table) and in code (`platform_control_rules()`
-- knows ten of the thirteen controls). What was missing was the distinction on
-- the row itself, in a column a trigger can read. That is `setting_kind`.
--
--   flag     — a feature switch. Somebody may read that it is off; only the
--              platform admin may turn it on. Enforced here as well as in the
--              dashboard, because the dashboard is not the only door.
--   control  — a dial with its own writer and its own owning role. A direct
--              table write is refused unless the writer's own gate would have
--              allowed it, so there is one answer to "who may change the
--              revenue share" rather than two that can disagree.
--
-- The three controls with bespoke writers are listed in `may_write_setting()`
-- by name, with the role each writer actually checks. If one of those writers
-- ever changes its gate, this function has to change with it — which is the
-- honest cost of having the authority in two places, and cheaper than the
-- alternative of a control whose screen says one thing and whose table says
-- another.
-- ---------------------------------------------------------------------------

alter table public.platform_settings
  add column if not exists setting_kind text not null default 'flag';

alter table public.platform_settings
  drop constraint if exists platform_settings_kind_known;
alter table public.platform_settings
  add constraint platform_settings_kind_known
  check (setting_kind in ('flag', 'control'));

comment on column public.platform_settings.setting_kind is
  'flag = a feature switch only the platform admin may flip. control = a dial with its own writer and owning role; a direct write must pass the same gate as its writer.';

-- The thirteen controls documented in FLAGS.md, named once, here. The three
-- with bespoke writers are included because they are controls even though
-- `platform_control_rules()` does not carry them — that list is the generic
-- writer's allowlist, not the definition of a control.
update public.platform_settings
   set setting_kind = 'control'
 where key in (
   'finance.reporting_currency',
   'finance.rate_sanity_factor',
   'media.upload_quota_gb_per_teacher',
   'learning.offline_max_devices',
   'learning.offline_expiry_days',
   'delivery.live_room_base',
   'delivery.max_attempts',
   'governance.min_approvals',
   'governance.panel_required',
   'governance.scholar_board_active',
   'commerce.refund_window_hours',
   'teaching.revenue_share_percent',
   'teaching.payout_hold_days'
 );

-- ---------------------------------------------------------------------------
-- Who may write which key
-- ---------------------------------------------------------------------------
-- One function, so the trigger and any future screen read the same rule. It
-- takes the actor rather than reading the session, which is what makes it
-- testable without impersonating anybody.
create or replace function public.may_write_setting(
  p_actor uuid,
  p_key   text,
  p_kind  text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    -- A feature switch is the owner's. Not "staff" — the owner. A support
    -- agent reading the register is a staff member being informed; a support
    -- agent flipping it is staff making a product decision.
    when coalesce(p_kind, 'flag') = 'flag'
      then public.has_role(p_actor, 'platform_admin')

    -- The refund window: `set_refund_window()` lets any privileged staffer move
    -- it, because it bounds asking rather than deciding and support is where a
    -- closed window gets explained.
    when p_key = 'commerce.refund_window_hours'
      then public.is_privileged(p_actor)

    -- The two money dials with their own writers, which allow exactly these.
    when p_key in ('teaching.revenue_share_percent', 'teaching.payout_hold_days')
      then public.has_role(p_actor, 'platform_admin')
        or public.has_role(p_actor, 'finance_admin')

    -- Everything else is a control in `platform_control_rules()`, and
    -- `may_change_control()` is the single declaration of who owns it.
    else public.may_change_control(p_actor, p_key)
  end;
$$;

revoke all on function public.may_write_setting(uuid, text, text) from public, anon;
grant execute on function public.may_write_setting(uuid, text, text) to authenticated;

comment on function public.may_write_setting(uuid, text, text) is
  'Who may write one settings row. A flag is the platform admin''s; a control goes to its own writer''s gate, so the table and the screen cannot disagree.';

-- ---------------------------------------------------------------------------
-- The guard
-- ---------------------------------------------------------------------------
-- A BEFORE trigger, because the CODE-flag guard beside it is one: the same
-- pattern, for the same reason. Migrations run as the superuser with no
-- session, so `current_user_id()` is null there and they pass — which is how
-- a seed or a backfill can still write anything.
--
-- The comparison on UPDATE deliberately covers every column except `updated_at`
-- and `updated_by`, rather than only `value_text`. Changing `gate_type` from
-- `code` to `admin` and then flipping the flag is two writes that would each
-- look harmless on their own; the first one is the hole.
create or replace function public.enforce_setting_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_kind  text := coalesce(new.setting_kind, 'flag');
begin
  -- No session: a migration, a seed, a test harness running as the owner of
  -- the database. Every one of those is already allowed to change anything.
  if v_actor is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and (to_jsonb(new) - 'updated_at' - 'updated_by')
         = (to_jsonb(old) - 'updated_at' - 'updated_by') then
    -- Nothing but bookkeeping moved. A writer that had to touch the row to set
    -- `updated_by` has already been checked by its own function.
    return new;
  end if;

  if public.may_write_setting(v_actor, new.key, v_kind) then
    return new;
  end if;

  if v_kind = 'flag' then
    raise exception
      'only the platform admin may change a feature switch; % may be read, not flipped',
      new.key
      using errcode = 'insufficient_privilege';
  end if;

  raise exception
    '[%] has its own writer and its own role; it is not changed by writing the table',
    new.key
    using errcode = 'insufficient_privilege';
end;
$$;

drop trigger if exists platform_settings_authority_guard on public.platform_settings;
create trigger platform_settings_authority_guard
  before insert or update on public.platform_settings
  for each row execute function public.enforce_setting_authority();

comment on function public.enforce_setting_authority() is
  'Refuses a settings write the caller could not have made through the screen that owns it: a flag needs the platform admin, a control needs its writer''s own gate.';
