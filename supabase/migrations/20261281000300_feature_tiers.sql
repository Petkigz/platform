-- Which shelf a feature needs, as something an owner can change.
--
-- WHAT WAS WRONG
-- --------------
-- `plan_feature_requires_tier()` was a closed CASE with one entry:
-- `offline_downloads` -> plus. That made the tier a real gate — a Basic plan
-- cannot be granted downloads — but it also meant the one decision the owner
-- actually makes, *which features belong to the VIP shelf*, lived in a
-- migration. Changing it needed a developer, a pull request and a deploy, while
-- every other plan decision (create a plan, move it to Plus, grant the feature,
-- price it) is a form on /admin/plans.
--
-- This is the same defect the plan screen itself was built to fix: **a rule
-- nobody can edit from a screen is not a policy, it is a constant.**
--
-- WHAT IS BUILT
-- -------------
--   feature_tier_requirements   the map, one row per code that needs more than Basic
--   plan_feature_requires_tier  now reads it, and still answers 'basic' for a code
--                               nobody has restricted — the safe default
--   set_feature_tier_requirement  the writer, staff only, audited
--   plan_feature_tier_rules     what the screen reads: the map, plus which plans
--                               would block a change
--
-- Rows are written only through the writer. The table has RLS on, a staff read
-- policy, and no write policy at all: a definer function is the only door, so
-- the vocabulary check and the audit row cannot be skipped.
--
-- RAISING A REQUIREMENT IS GUARDED, LOWERING IT IS NOT.
-- A Basic plan that already carries the feature would become a catalogue that
-- says "Plus only" while the plan hands it out. So moving a feature up the
-- shelves is refused while any Basic plan's terms still carry it, naming the
-- plan. Moving one down is always allowed: nothing in the catalogue promises a
-- feature is *exclusive* to Plus, only that a Basic plan may hold it.

-- ---------------------------------------------------------------------------
-- the map
-- ---------------------------------------------------------------------------
create table public.feature_tier_requirements (
  -- Matches the closed feature vocabulary. Not a foreign key because that
  -- vocabulary is a function (`plan_feature_codes()`), not a table; the writer
  -- checks membership, and a code that stops being sold leaves a row that is
  -- simply never consulted.
  feature_code text primary key
    check (length(btrim(feature_code)) > 0),

  -- 'basic' is written only when somebody deliberately lowers a requirement;
  -- absence means the same thing, so a row with 'basic' is a record of a
  -- decision rather than a duplicate of the default.
  min_tier text not null default 'basic'
    check (min_tier in ('basic', 'plus')),

  updated_at timestamptz not null default now(),
  updated_by uuid references public.user_profiles (user_id) on delete set null
);

comment on table public.feature_tier_requirements is
  'The lowest plan tier that may carry a feature code. Absence means basic. Written only through set_feature_tier_requirement(); read by plan_feature_requires_tier().';

alter table public.feature_tier_requirements enable row level security;

create policy ftr_read on public.feature_tier_requirements
  for select to authenticated
  using (public.is_privileged(public.current_user_id()));

create trigger feature_tier_requirements_set_updated_at
  before update on public.feature_tier_requirements
  for each row execute function public.set_updated_at();

-- The rule as it stood before this table existed. Seeded, not hard-coded, so the
-- screen shows the decision that is already in force rather than an empty list.
insert into public.feature_tier_requirements (feature_code, min_tier)
values ('offline_downloads', 'plus')
on conflict (feature_code) do nothing;

-- ---------------------------------------------------------------------------
-- the rule, now read from the map
-- ---------------------------------------------------------------------------
-- IMMUTABLE had to go: a function that reads a table cannot claim to be
-- immutable, and leaving the marker would let the planner cache an old answer.
create or replace function public.plan_feature_requires_tier(p_feature_code text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select r.min_tier
       from public.feature_tier_requirements r
      where r.feature_code = p_feature_code),
    'basic');
$$;

comment on function public.plan_feature_requires_tier(text) is
  'The lowest plan tier that may carry a feature code, read from feature_tier_requirements. A feature with no row is available on any tier, which is the safe default: an unknown code cannot accidentally be restricted to a shelf nobody is on.';

revoke all on function public.plan_feature_requires_tier(text) from public, anon;
grant execute on function public.plan_feature_requires_tier(text) to authenticated;

-- ---------------------------------------------------------------------------
-- the writer
-- ---------------------------------------------------------------------------
create or replace function public.set_feature_tier_requirement(
  p_feature_code text,
  p_min_tier     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_code     text := btrim(coalesce(p_feature_code, ''));
  v_tier     text := lower(btrim(coalesce(p_min_tier, '')));
  v_before   text;
  v_blockers text;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff may change which shelf a feature needs'
      using errcode = 'insufficient_privilege';
  end if;

  if v_code = '' then
    raise exception 'name the feature'
      using errcode = 'invalid_parameter_value';
  end if;

  -- The closed vocabulary, so a typo cannot quietly create a restriction on a
  -- code no plan will ever carry.
  if not (v_code = any (public.plan_feature_codes())) then
    raise exception '% is not a feature this platform sells; the list is closed', v_code
      using errcode = 'invalid_parameter_value';
  end if;

  if v_tier not in ('basic', 'plus') then
    raise exception 'a shelf is basic or plus; % is neither', coalesce(p_min_tier, '<null>')
      using errcode = 'invalid_parameter_value';
  end if;

  v_before := public.plan_feature_requires_tier(v_code);

  if v_tier = 'plus' and v_before <> 'plus' then
    -- A Basic plan that already grants it would contradict the new rule.
    select string_agg(distinct p.code, ', ' order by p.code) into v_blockers
      from public.plan_entitlements pe
      join public.plan_versions pv on pv.id = pe.plan_version_id
      join public.plans p on p.id = pv.plan_id
     where pe.scope_type = 'feature'
       and pe.feature_code = v_code
       and p.tier = 'basic'
       and p.deleted_at is null;

    if v_blockers is not null then
      raise exception
        '% is granted by a basic plan (%). Move that plan to plus, or remove the feature from its terms, first',
        v_code, v_blockers
        using errcode = 'check_violation';
    end if;
  end if;

  insert into public.feature_tier_requirements (feature_code, min_tier, updated_by)
  values (v_code, v_tier, v_actor)
  on conflict (feature_code) do update
    set min_tier   = excluded.min_tier,
        updated_by = excluded.updated_by;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'plan_feature.requirement_changed', 'feature', null,
          jsonb_build_object('feature_code', v_code, 'from', v_before, 'to', v_tier));

  return jsonb_build_object(
    'featureCode', v_code,
    'minTier', v_tier,
    'changed', v_tier is distinct from v_before
  );
end;
$$;

revoke all on function public.set_feature_tier_requirement(text, text) from public, anon;
grant execute on function public.set_feature_tier_requirement(text, text) to authenticated;

comment on function public.set_feature_tier_requirement(text, text) is
  'Sets the lowest plan tier that may carry a feature, staff only and audited. Raising a feature to plus is refused while a basic plan still grants it.';

-- ---------------------------------------------------------------------------
-- what the screen reads
-- ---------------------------------------------------------------------------
-- One call for the whole panel: the vocabulary, the shelf each code needs, and
-- the plans that would block a raise — so the screen can say *why* a change
-- would be refused before the click rather than after it.
create or replace function public.plan_feature_tier_rules()
returns table (
  feature_code text,
  min_tier     text,
  blocking_plans text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.code,
         public.plan_feature_requires_tier(c.code),
         (
           select string_agg(distinct p.code, ', ' order by p.code)
             from public.plan_entitlements pe
             join public.plan_versions pv on pv.id = pe.plan_version_id
             join public.plans p on p.id = pv.plan_id
            where pe.scope_type = 'feature'
              and pe.feature_code = c.code
              and p.tier = 'basic'
              and p.deleted_at is null
         )
    from unnest(public.plan_feature_codes()) as c(code)
   order by c.code;
$$;

revoke all on function public.plan_feature_tier_rules() from public, anon;
grant execute on function public.plan_feature_tier_rules() to authenticated;

comment on function public.plan_feature_tier_rules() is
  'Every feature the platform sells, the shelf it needs, and the basic plans that would block raising it. Read by /admin/plans.';
