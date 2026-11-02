-- -----------------------------------------------------------------------------
-- The children's policy learns that the handover exists
-- -----------------------------------------------------------------------------
-- Version 2 was published on 2026-11-02 to stop the policy promising something
-- nobody could do: a handover at eighteen. It replaced the promise with the truth
-- of that morning — *"that is not automatic yet: the young person, or the adult
-- holding the record, asks — through the support desk, which is a person — and the
-- record stays where it is until they do."*
--
-- Every word of that was true when it was written. Then `request_learner_handover()`
-- and `/handover` were built (the unit that closed `e34f8a6`), and two of those
-- words stopped being true in the same afternoon: there is no support desk in the
-- path, and "not automatic yet" is now wrong in the other direction — the platform
-- does perform it, on request, at once. A reader sent to support for something the
-- platform does itself is the same defect as a reader promised something that does
-- not exist, only quieter: nobody complains about a detour, they just take it.
--
-- So this is version 3, made the same way as version 2: the paragraph that is no
-- longer true is replaced, the version it replaces is retired and kept, and an
-- audit row records the instruction. Nothing else in the document moves — the
-- thirty-day clock, the certificate exception, the coursework year, the under-13
-- rule and the screening standard were true this morning and are true now.
--
-- **What the new paragraph must not do.** It must not imply a birthday is
-- detected, and it must not say the statement is checked. The platform holds no
-- date of birth — that is the reason this feature is a recorded statement in the
-- first place — and a policy that let a parent believe an age had been verified
-- would be a worse document than the one it replaces. The test in
-- `supabase/tests/children_policy.test.mjs` fails if either sentence goes missing.

do $$
declare
  v_doc    uuid;
  v_live   public.policy_versions;
  v_next   integer;
  v_body   text;
  v_open   int;
  v_new    constant text :=
    'There is still no birthday to detect, so nothing here happens by itself: what '
    || 'happens is that somebody says so. The learner can say it from their own '
    || 'sign-in, and the adult holding the record can say it from theirs; either opens '
    || 'the handover page at /handover, states that the learner is 18 or older, and '
    || 'chooses there and then. Keeping the record means it becomes their own account '
    || 'and leaves the family, and the adult''s reach into it ends at that moment. Not '
    || 'keeping it deletes it within 30 days — the thirty-day clock described above — '
    || 'and nothing is archived or quietly kept. The platform records the statement and '
    || 'does not check it: it holds no date of birth, asks for none, and does not treat '
    || 'the answer as one. If an adult is unsure whether the learner is old enough, the '
    || 'record stays where it is until they are sure.';
  v_reason constant text :=
    'Owner instruction, 2026-11-02: the eighteenth-birthday handover now exists, so the '
    || 'children''s policy states what the platform does — a learner, or the adult '
    || 'holding the record, announces it at /handover and chooses to keep the record or '
    || 'have it deleted in thirty days — rather than sending them to a support desk and '
    || 'calling it not automatic. No date of birth is introduced or checked.';
begin
  select d.id into v_doc from public.policy_documents d where d.slug = 'children';
  if v_doc is null then
    raise exception 'children policy: there is no children document';
  end if;

  select * into v_live
    from public.policy_versions v
   where v.document_id = v_doc and v.status = 'in_force'
   order by v.version_number desc
   limit 1;

  if v_live.id is null then
    raise exception 'children policy: no version is in force to correct';
  end if;

  -- Already corrected — by an earlier run of this migration, or by the owner
  -- publishing it from `/admin/policies` first. Nothing to do is a legitimate
  -- outcome, and saying so is better than silence.
  if position('/handover' in v_live.body) > 0 then
    raise notice 'children policy: the in-force version already states the handover';
    return;
  end if;

  -- The text this replaces must still be there, or this is not the version this
  -- migration was written against. "support desk" is the phrase version 2 uses and
  -- no other version does, so it identifies the paragraph exactly.
  if position('through the support desk' in v_live.body) = 0 then
    raise exception 'children policy: the in-force version does not carry the paragraph this replaces';
  end if;

  -- `[^#]` rather than `.` because the paragraph wraps across lines and cannot be
  -- relied on to keep its line breaks, and `\s+` where the source wraps in the
  -- middle of a sentence; the section ends at the next heading.
  v_body := regexp_replace(
    v_live.body,
    'Because there is\s+no birthday to detect[^#]*?quietly\s+kept\.',
    v_new);

  if position(v_new in v_body) = 0 then
    raise exception 'children policy: the paragraph this migration replaces was not replaced';
  end if;

  v_open := public.policy_open_decisions(v_body);
  if v_open > 0 then
    raise exception 'children policy: the new text still holds % open decision(s)', v_open;
  end if;

  v_next := v_live.version_number + 1;

  -- Retire first: `policy_versions_one_live` allows one version in force per
  -- document, which is what makes "the children's policy" a single answer.
  update public.policy_versions
     set status = 'retired'
   where id = v_live.id;

  insert into public.policy_versions
    (document_id, version_number, body, change_note, status, effective_at,
     approved_at, approved_by, approval_reason)
  values
    (v_doc, v_next, v_body,
     'The handover at eighteen is built, so the paragraph that sent a family to the support desk now says what the platform does: the learner or the adult holding the record states the age at /handover and chooses to keep the record or have it deleted in thirty days. No date of birth is asked for or checked. Decided by the owner on 2026-11-02.',
     'in_force', date '2026-11-02', now(), null, v_reason);

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (null, 'policy.published', 'policy_version', v_live.id,
          jsonb_build_object(
            'slug', 'children',
            'versionNumber', v_next,
            'effectiveAt', '2026-11-02',
            'reason', v_reason,
            'replacesVersion', v_live.version_number,
            'source', 'owner instruction of 2026-11-02, recorded by migration',
            'approvedBy', null,
            'whyNoAccount', 'republished so the policy states the handover that now exists'));

  raise notice 'children policy: version % is in force from 2026-11-02', v_next;
end $$;
