-- Say why a lesson cannot be saved, and what your plan actually gives you.
--
-- Two silences, both expensive.
--
-- The first is the download button. `may_download_lesson()` answers a yes-or-no,
-- so a learner on a Basic plan sees a lesson with no Save button and no
-- explanation. "Save on this device" is the thing Plus sells; a learner who
-- cannot see the button cannot see the shelf either. A refusal with no reason is
-- a dead end, and a benefit nobody can see is a benefit nobody buys.
--
-- The second is `/subscriptions`, which lists periods and learner slots and
-- never says what the plan *includes*. The tier was a column, the features were
-- rows, and neither reached the person paying.
--
-- So this migration adds three things:
--
--   `plan_feature_label()` — a human sentence for a feature code, beside the
--   code itself, so the screen does not invent its own wording.
--
--   `lesson_download_standing()` — the same question `may_download_lesson()`
--   answers, decomposed into a reason. It does not re-decide anything: `allowed`
--   is the decomposition, and a test pins it against `may_download_lesson()` in
--   every case, because two predicates that drift apart is how a learner is told
--   they may do something the writer then refuses.
--
--   `my_plan_summary()` — the caller's live subscriptions with the shelf, the
--   period and what each plan includes in words.
--
-- Nothing here widens access. Every function is `security definer` and starts by
-- asking who is signed in, exactly as the predicates it explains do.

-- ---------------------------------------------------------------------------
-- the words for a code
-- ---------------------------------------------------------------------------
create or replace function public.plan_feature_label(p_code text)
returns text
language sql
immutable
security definer
set search_path = public
as $$
  select case p_code
    when 'offline_downloads' then 'Watch lessons inside the app with no connection'
    else p_code
  end;
$$;

comment on function public.plan_feature_label(text) is
  'A sentence a person can read for a sellable feature code. Unknown codes fall '
  'back to the code itself rather than to a guess, so a new feature is visibly '
  'unlabelled instead of quietly mislabelled.';

revoke all on function public.plan_feature_label(text) from public, anon;
grant execute on function public.plan_feature_label(text) to authenticated;

-- ---------------------------------------------------------------------------
-- why a lesson can or cannot be saved
-- ---------------------------------------------------------------------------
-- The predicates are the ones `may_download_lesson()` already applies, in the
-- order a learner meets them:
--
--   1. the feature is switched on at all          -> feature_off
--   2. somebody is signed in                      -> signed_out
--   3. a learner this person may act for is
--      entitled to the lesson's course version    -> not_entitled
--   4. that learner holds an active
--      offline_downloads grant                   -> needs_plus
--   5. the lesson has verified first-party media  -> no_media
--   6. otherwise                                  -> allowed
--
-- `needs_plus` is the only one that names a shelf, and it is the only one that
-- is fixed by buying something, so it is the only one the screen turns into a
-- link.
create or replace function public.lesson_download_standing(p_lesson_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_version uuid;
  v_entitled boolean := false;
  v_granted  boolean := false;
  v_media    boolean := false;
  v_enabled  boolean;
  v_reason   text;
  v_message  text;
begin
  v_enabled := public.setting_bool('learning.offline', false);

  if p_lesson_id is null then
    return jsonb_build_object('enabled', v_enabled, 'allowed', false,
      'reason', 'no_lesson', 'needsPlus', false,
      'message', 'There is no lesson to save.');
  end if;

  select cs.course_version_id into v_version
    from public.lessons l
    join public.course_sections cs on cs.id = l.section_id
   where l.id = p_lesson_id;

  if v_version is null then
    return jsonb_build_object('enabled', v_enabled, 'allowed', false,
      'reason', 'no_lesson', 'needsPlus', false,
      'message', 'There is no lesson to save.');
  end if;

  -- 5. Something first-party and verified to save. A hotlinked external_url
  -- belongs to somebody else's server, and pending or quarantined media must
  -- never be handed out — the same rule `may_download_lesson()` applies.
  select exists (
    select 1
      from public.lesson_resources lr
      join public.media_assets ma on ma.id = lr.media_asset_id
     where lr.lesson_id = p_lesson_id
       and ma.status = 'available')
    into v_media;

  if v_actor is not null then
    -- 3 and 4, over every profile this person may act for. The entitlement and
    -- the grant must belong to the *same* learner, which is why they are one
    -- query rather than two: a family must not combine one member's course with
    -- another's plan.
    select bool_or(public.can_access_course_version(lp.id, v_version)),
           bool_or(public.can_access_course_version(lp.id, v_version)
                   and exists (
                     select 1
                       from public.entitlement_grants eg
                      where eg.learner_profile_id = lp.id
                        and eg.scope_type = 'feature'
                        and eg.feature_code = 'offline_downloads'
                        and eg.status = 'active'
                        and eg.effective_from <= now()))
      into v_entitled, v_granted
      from public.learner_profiles lp
     where lp.deleted_at is null
       and (lp.linked_user_id = v_actor or public.is_learner_family_member(lp.id));

    v_entitled := coalesce(v_entitled, false);
    v_granted  := coalesce(v_granted, false);
  end if;

  v_reason := case
    when v_actor is null      then 'signed_out'
    when not v_enabled        then 'feature_off'
    when not v_entitled       then 'not_entitled'
    when not v_granted        then 'needs_plus'
    when not v_media          then 'no_media'
    else 'allowed'
  end;

  v_message := case v_reason
    when 'signed_out'   then 'Sign in to save a lesson on this device.'
    when 'feature_off'  then 'Saving lessons on a device is not switched on for this platform yet.'
    when 'not_entitled' then 'Watching this lesson does not include keeping it. Saving starts once you are enrolled in the course.'
    when 'needs_plus'   then 'Saving a lesson on this device is a Plus feature. Your plan does not include it yet.'
    when 'no_media'     then 'This lesson has no verified video to save yet.'
    else 'You can save this lesson on this device.'
  end;

  return jsonb_build_object(
    'enabled', v_enabled,
    'allowed', v_reason = 'allowed',
    'reason', v_reason,
    'needsPlus', v_reason = 'needs_plus',
    'message', v_message);
end;
$$;

revoke all on function public.lesson_download_standing(uuid) from public, anon;
grant execute on function public.lesson_download_standing(uuid) to authenticated;

comment on function public.lesson_download_standing(uuid) is
  'Why may_download_lesson() answers what it answers, as a reason a screen can '
  'turn into a sentence: signed_out, feature_off, not_entitled, needs_plus, '
  'no_media, or allowed. Decomposes the predicate rather than re-deciding it; a '
  'test pins allowed against may_download_lesson() in every case.';

-- ---------------------------------------------------------------------------
-- what the plan a person pays for actually includes
-- ---------------------------------------------------------------------------
create or replace function public.my_plan_summary()
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
    raise exception 'sign in to read your plans'
      using errcode = 'insufficient_privilege';
  end if;

  -- Membership is checked here, explicitly, and that is not belt-and-braces.
  -- This function is `security definer`, so the RLS policies on `subscriptions`
  -- do not apply to the query inside it — a first draft of this function relied
  -- on them and returned every subscription on the platform. The policy is the
  -- rule for a direct select; a definer function has to state the rule itself,
  -- and the test that reads one stranger's summary is what caught the omission.
  select coalesce(jsonb_agg(jsonb_build_object(
           'subscriptionId', s.id,
           'status', s.status,
           'planName', p.name,
           'planCode', p.code,
           'tier', p.tier,
           'interval', pv.billing_interval,
           'adultAllowance', pv.adult_allowance,
           'childAllowance', pv.child_allowance,
           'currentPeriodEnd', s.current_period_end,
           'cancelledAt', s.cancelled_at,
           'features', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'code', pe.feature_code,
                      'label', public.plan_feature_label(pe.feature_code)) order by pe.feature_code)
               from public.plan_entitlements pe
              where pe.plan_version_id = s.plan_version_id
                and pe.scope_type = 'feature'), '[]'::jsonb),
           'subjects', coalesce((
             select jsonb_agg(sa.name order by sa.name)
               from public.plan_entitlements pe
               join public.subject_areas sa on sa.id = pe.subject_area_id
              where pe.plan_version_id = s.plan_version_id
                and pe.scope_type = 'catalogue'), '[]'::jsonb))
           order by s.created_at desc), '[]'::jsonb)
    into v_rows
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    join public.plan_versions pv on pv.id = s.plan_version_id
   where s.status in ('pending', 'trialing', 'active', 'past_due', 'paused', 'cancelled')
     and (s.current_period_end is null or s.current_period_end > now())
     and exists (
       select 1
         from public.billing_account_memberships m
        where m.billing_account_id = s.billing_account_id
          and m.user_id = v_actor
          and m.status = 'active');

  return v_rows;
end;
$$;

revoke all on function public.my_plan_summary() from public, anon;
grant execute on function public.my_plan_summary() to authenticated;

comment on function public.my_plan_summary() is
  'The caller''s own subscriptions with the shelf, the period and what each '
  'pinned plan version includes in words. Live plans only — an expired period is '
  'not something a person is still on.';
