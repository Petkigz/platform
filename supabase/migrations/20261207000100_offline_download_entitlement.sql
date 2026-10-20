-- Offline download is something a plan carries, not something enrolment implies.
--
-- WHAT THE OWNER DECIDED (2026-10-20)
-- -----------------------------------
-- Saving a lesson to a device requires a Plus-tier subscription. A Basic-tier
-- subscription does not carry it. Enrolment alone never does: buying a course
-- lets you watch it, and watching is not keeping.
--
-- WHY THIS IS NOT A NEW COLUMN ON plans
-- -------------------------------------
-- The catalogue already expresses "this plan carries that capability" as a
-- plan_entitlements row with scope_type='feature' and a feature_code, and
-- subscription fulfilment already propagates those rows into per-learner
-- entitlement_grants bounded by the paid period
-- (20261113000100_subscription_checkout_and_access.sql:257). The feature code
-- 'offline_downloads' is already the one in use. So the decision is data an
-- admin sets per plan version, pinned like every other term so it cannot move
-- under a paying subscriber -- not a schema change, and not a constant.
--
-- What was missing is the read side: nothing asked the question "may this
-- learner save this lesson?", so nothing could enforce the answer. That is
-- may_download_lesson() below.
--
-- WHAT IS DELIBERATELY NOT HERE
-- -----------------------------
-- Device storage limits, per-device registration, and download expiry are still
-- open (FLAGS.md, `learning.offline`) and are not invented here. Neither is the
-- byte path: no object is fetched, signed or transferred by this migration.
-- This decides who is entitled; it does not hand anything over.

-- ---------------------------------------------------------------------------
-- Pin the vocabulary of sellable features.
--
-- A plan is sold by code, and the code is what fulfilment copies into a grant
-- and what may_download_lesson() looks for. Free text means one typo --
-- 'offline_download' instead of 'offline_downloads' -- produces a plan that
-- takes money and grants nothing, with no error anywhere. Adding a feature
-- should be a reviewed migration, not a string in an admin form.
-- ---------------------------------------------------------------------------

alter table public.plan_entitlements
  drop constraint if exists pe_feature_vocabulary;

alter table public.plan_entitlements
  add constraint pe_feature_vocabulary check (
    scope_type <> 'feature'
    or feature_code in ('offline_downloads')
  );

-- The same list, readable. The admin plan form offers these codes rather than
-- taking free text, so a plan cannot be built with a code the constraint will
-- refuse -- and so the vocabulary has one place to be read from and one place to
-- be enforced, with a test holding the two together.
create or replace function public.plan_feature_codes()
returns text[]
language sql
immutable
security definer
set search_path = public
as $$
  select array['offline_downloads']::text[];
$$;

comment on function public.plan_feature_codes() is
  'The closed vocabulary of sellable plan features, mirroring pe_feature_vocabulary. A code belongs here only once a predicate reads it; selling a feature nothing honours would take money and grant nothing.';

revoke all on function public.plan_feature_codes() from public;
grant execute on function public.plan_feature_codes() to authenticated;

comment on constraint pe_feature_vocabulary on public.plan_entitlements is
  'Sellable feature codes are a closed vocabulary. 2026-10-20: offline_downloads is the only one, because it is the only one a predicate reads. Adding a feature means adding the code here and the rule that honours it.';

-- ---------------------------------------------------------------------------
-- The predicate.
--
-- Shaped like can_access_lesson_now(): keyed on the session rather than on a
-- learner profile, across every profile this user may act for, because a
-- guardian saves a child's lesson and an adult saves their own.
-- ---------------------------------------------------------------------------

create or replace function public.may_download_lesson(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_lesson_id is not null
     and public.current_user_id() is not null
     and exists (
    select 1
      from public.lessons l
      join public.course_sections cs on cs.id = l.section_id
      join public.learner_profiles lp on lp.deleted_at is null
     where l.id = p_lesson_id
       and (lp.linked_user_id = public.current_user_id()
            or public.is_learner_family_member(lp.id))

       -- Entitlement to the version, deliberately NOT can_access_lesson().
       -- That function also returns true for a free preview while
       -- learning.previews is on, and a sample is free to watch but not free
       -- to keep: otherwise any lesson an author marked as a preview could be
       -- downloaded by anyone, and the paid feature would have a hole in it
       -- the size of a preview. The same reasoning is why this is keyed per
       -- learner profile rather than per session -- access and the feature
       -- have to belong to the same learner, not to two different members of
       -- one family.
       and public.can_access_course_version(lp.id, cs.course_version_id)

       -- And the plan actually being paid for has to carry the feature. The
       -- grant is bounded by the paid period, so a lapsed subscription stops
       -- saving without anything being revoked by hand.
       and exists (
             select 1
               from public.entitlement_grants eg
              where eg.learner_profile_id = lp.id
                and eg.scope_type = 'feature'
                and eg.feature_code = 'offline_downloads'
                -- eg_active_is_live already forbids an active grant whose
                -- window has passed; status alone is the honest check, and a
                -- revoked or expired grant is not active.
                and eg.status = 'active'
                and eg.effective_from <= now()
           )

       -- And there has to be something first-party to save. A hotlinked
       -- external_url belongs to somebody else's server and cannot be
       -- downloaded at all; media that is still pending or quarantined must
       -- never be handed out, which is the whole reason that state machine
       -- exists. Verified first-party media, or nothing.
       and exists (
             select 1
               from public.lesson_resources lr
               join public.media_assets ma on ma.id = lr.media_asset_id
              where lr.lesson_id = l.id
                and ma.status = 'available'
           )
  );
$$;

comment on function public.may_download_lesson(uuid) is
  'May the current session save this lesson to a device? Requires entitlement to the lesson''s course version, an active offline_downloads feature grant on a plan the same learner is paying for, and verified first-party media. A free preview may be watched but not kept. Decided 2026-10-20: a Plus-tier plan carries it, a Basic-tier plan does not. Device limits and download expiry are still open and are not decided here.';

revoke all on function public.may_download_lesson(uuid) from public;
revoke all on function public.may_download_lesson(uuid) from anon;
grant execute on function public.may_download_lesson(uuid) to authenticated;
