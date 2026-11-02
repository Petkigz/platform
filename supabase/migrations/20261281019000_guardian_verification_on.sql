-- -----------------------------------------------------------------------------
-- Guardian verification is switched on, worldwide
-- -----------------------------------------------------------------------------
-- The owner decided on 2026-11-01 that verification is required for every child,
-- in every country, and the decision was taken ahead of the legal review knowingly:
-- switching it on is the stricter direction, because it refuses a child enrolment
-- that would otherwise have succeeded.
--
-- Until now the decision was recorded in `DECISIONS.md`, stated in the children's
-- policy (version 3 is in force), and contradicted by the software: the settings row
-- shipped `false`, so a deployment built from this repository would have enrolled a
-- child on an adult's word alone. A policy is a claim about the platform; a flag is
-- what the platform does. This migration closes that gap and nothing else.
--
-- **What changes the moment it is on.** `guardian_consent_enforced()` returns true,
-- and two seams read it:
--
--   * `enforce_guardian_consent_on_enrolment()` refuses to enrol a child unless the
--     enrolling adult holds an active, verified, unexpired consent with permission to
--     manage learning. This is the rule the policy states.
--   * `can_access_learner()` stops counting plain family membership for a *child's*
--     learning data: a parent still sees that the child exists and is named, and the
--     progress, grades, enrolments and certificates are reached through a current
--     consent. A lapsed consent pauses access and deletes nothing.
--
-- **Two costs, both already recorded, neither hidden here.**
--
--   1. Every verification approved before this migration was approved without a
--      lifetime, because the lifetime did not exist when it was given. Those lapse at
--      once and have to be renewed. That is the honest outcome: nobody can say how
--      long a decision meant to last when no term was set.
--   2. A legal review of the children's policy and of this requirement is still owed.
--      Switching it on does not settle it; it makes the platform behave as the policy
--      already says, which is the direction the review would push.
--
-- -----------------------------------------------------------------------------
-- The gate applies to a person, not to the connection
-- -----------------------------------------------------------------------------
-- `enforce_guardian_consent_on_enrolment()` asked for a verified guardian whenever
-- the flag was on, including when a row was written with no caller at all — which is
-- what a seed, a migration or a fixture does. Those writes are the platform acting on
-- its own data, not an adult enrolling a child, and refusing them taught nobody
-- anything while making the whole test suite unrunnable (81 enrolment inserts).
--
-- So the trigger now returns early when there is no caller. That is a narrowing of
-- *when* it fires, not of what it requires: every path a person reaches — the enrol
-- function, a definer fulfilment on the buyer's behalf, an RLS write — carries the
-- caller's claims, and every one of those is still refused without a current consent.
create or replace function public.enforce_guardian_consent_on_enrolment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_learner_type text;
begin
  if not public.guardian_consent_enforced() then return new; end if;
  -- No caller: the platform writing its own rows. See this migration's header.
  if public.current_user_id() is null then return new; end if;

  select lp.learner_type into v_learner_type
    from public.learner_profiles lp
   where lp.id = new.learner_profile_id and lp.deleted_at is null;
  if not found or v_learner_type <> 'child' then return new; end if;

  if not exists (
    select 1 from public.guardian_relationships gr
     where gr.learner_profile_id = new.learner_profile_id
       and gr.guardian_user_id = public.current_user_id()
       and gr.status = 'active'
       and gr.verified_at is not null
       and gr.can_manage_learning
       and gr.deleted_at is null
       and public.guardian_consent_is_current(gr.id)
  ) then
    raise exception 'verified guardian consent is required before enrolling this child'
      using errcode = 'insufficient_privilege',
            hint = 'a consent that has lapsed has to be renewed; nothing the child did was lost';
  end if;
  return new;
end;
$$;

comment on function public.enforce_guardian_consent_on_enrolment() is
  'When guardian verification is enabled, a child is enrolled by a person only with a current verified consent. Rows written with no caller (seeds, migrations, fixtures) are the platform acting on its own data.';

-- The flag stays `admin`-gated, so the owner can switch it off from the dashboard in
-- one action if the review says something different. Nothing here is CODE-gated: the
-- machinery to honour it was built before the decision to use it.

update public.platform_settings
   set value_text    = 'true',
       description   = 'Manual review of guardians, required before a child is enrolled',
       preconditions = 'ON since 2026-11-01, worldwide, by the owner''s decision — '
                    || 'taken ahead of the legal review and knowingly, because requiring '
                    || 'a verified guardian is the stricter direction. The whole consent '
                    || 'loop is built and in use: a parent submits a relationship and a '
                    || 'statement from /family/guardians, names one of four methods and a '
                    || 'write-only evidence reference nobody can read back, a reviewer '
                    || 'decides from /admin/guardians with a stated lifetime of 12 months '
                    || 'by default and never more than 36, and the predicate behind '
                    || 'thirteen policies plus the child-enrolment trigger reads it. A '
                    || 'child cannot be enrolled, and a family member cannot reach a '
                    || 'child''s learning data, without a current consent. What it costs: '
                    || 'a human review queue, evidence held somewhere access-controlled '
                    || 'outside this database, and your review capacity is the real limit. '
                    || 'Approvals given before 2026-11-01 expire at once, because they '
                    || 'were approved without a lifetime and nobody can say how long they '
                    || 'meant to last. Still owed: the legal review, which switching this '
                    || 'on does not replace.'
 where key = 'family.guardian_verification';

-- The register is the only record of when a switch moved, so the move is audited
-- with the instruction that caused it rather than only appearing as a row diff.
insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
values (null, 'setting.changed', 'platform_setting', null,
        jsonb_build_object(
          'key', 'family.guardian_verification',
          'from', 'false',
          'to', 'true',
          'source', 'owner instruction of 2026-11-01, recorded by migration',
          'why', 'guardian verification is required for every child, in every country'));

comment on table public.platform_settings is
  'Every switch and tunable, with the gate that guards it and the trade-off written down. `family.guardian_verification` is on: a child enrolment requires a current verification.';
