-- The refunds policy says that a plan can be given back, and that it then ends.
--
-- The owner decided on 2026-11-24 that a buyer in the European Union, the rest
-- of the European Economic Area or the United Kingdom who pays for a plan gets
-- the money back when they ask within fourteen days, and migration
-- 20261281150000 made a plan refunded in full end. The policy in force said
-- neither. It said "A subscription month already used is not refunded pro
-- rata" and that a cancelled subscription runs to the end of the paid period.
-- None of that is false, and a reader could still take it to mean a plan is
-- never refunded.
--
-- On 2026-11-24 the owner said to publish the paragraph that was proposed in
-- DECISIONS.md. This migration publishes it, as a **new version**: the version
-- in force is retired and kept, because somebody may have agreed to it and a
-- waiver names the version it was made against.
--
-- What changes: one paragraph is added at the end of the section "The
-- statutory right in some countries". Nothing else in the document moves, so
-- a comparison of the two versions shows one paragraph.
--
-- What does not change: `withdrawal_wording()`, the paragraph the checkout
-- prints and a waiver agrees to, is where it was and word for word what it
-- was. No function, table, grant or switch is touched.
--
-- **The wording has not been read by a lawyer, and the approval reason says
-- so**, as it does for the version this replaces.
do $$
declare
  v_doc    uuid;
  v_live   record;
  v_body   text;
  v_open   int;
  v_anchor constant text := E'\n\n## What is not refundable';
  v_added  constant text :=
    'A plan bought in the European Union, Iceland, Liechtenstein, Norway or '
    || 'the United Kingdom can be given back within 14 days of paying: you ask on '
    || 'your orders page, and all of what you paid is returned. The plan ends for '
    || 'everyone learning on it when the money has been returned. After the 14 '
    || 'days, and everywhere else, a plan that is cancelled runs to the end of '
    || 'the period that was paid for and no part of it is refunded.';
  v_reason constant text :=
    'Owner instruction, 2026-11-24: say in the refunds policy that a plan bought '
    || 'in the EU, the EEA or the UK can be given back within 14 days, and that it '
    || 'ends when the money has been returned. The wording was drafted by the '
    || 'builder and has not been reviewed by a lawyer; that review is still owed.';
begin
  select d.id into v_doc from public.policy_documents d where d.slug = 'refunds';
  if v_doc is null then
    raise exception 'refunds policy: there is no refunds document';
  end if;

  select * into v_live
    from public.policy_versions v
   where v.document_id = v_doc and v.status = 'in_force'
   order by v.version_number desc
   limit 1;

  if v_live.id is null then
    raise exception 'refunds policy: no version is in force to add to';
  end if;

  if position('can be given back within 14 days of paying' in v_live.body) > 0 then
    -- Already said: this migration has run, or the owner published it first.
    raise notice 'refunds policy: the version in force already says a plan can be given back';
    return;
  end if;

  if position('you have 14 days from the day you pay' in v_live.body) = 0
     or position(v_anchor in v_live.body) = 0 then
    raise exception 'refunds policy: the version in force is not the one this paragraph was written to follow';
  end if;

  -- Before the next heading, so it is the last paragraph of the section about
  -- the statutory right. The anchor occurs once; replace() would change every
  -- occurrence, and one is checked for.
  if length(v_live.body) - length(replace(v_live.body, v_anchor, '')) <> length(v_anchor) then
    raise exception 'refunds policy: the heading this paragraph goes before is not there exactly once';
  end if;
  v_body := replace(v_live.body, v_anchor, E'\n\n' || v_added || v_anchor);

  v_open := public.policy_open_decisions(v_body);
  if v_open > 0 then
    raise exception 'refunds policy: the new version still holds % open decision(s)', v_open;
  end if;

  -- Retire first: one version in force for each document.
  update public.policy_versions
     set status = 'retired'
   where id = v_live.id;

  insert into public.policy_versions
    (document_id, version_number, body, change_note, status, effective_at,
     approved_at, approved_by, approval_reason)
  values
    (v_doc, v_live.version_number + 1, v_body,
     'Adds one paragraph: a plan bought in the EU, the EEA or the UK can be given back within 14 days, and it ends when the money has been returned. Decided by the owner on 2026-11-24.',
     'in_force', date '2026-11-24', now(), null, v_reason);

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (null, 'policy.published', 'policy_version', v_live.id,
          jsonb_build_object(
            'slug', 'refunds',
            'versionNumber', v_live.version_number + 1,
            'effectiveAt', '2026-11-24',
            'reason', v_reason,
            'replacesVersion', v_live.version_number,
            'source', 'owner instruction of 2026-11-24, recorded by migration',
            'approvedBy', null,
            'whyNoAccount', 'the owner gave the instruction to the builder; no account pressed the button'));
end $$;
