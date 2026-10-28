-- The operator has a name. The last question in the register is answered.
--
-- Twenty-two of twenty-three decisions were written into the drafts on
-- 2026-10-27. The twenty-third was not a decision but a fact: a privacy notice
-- must name the controller, and no migration can invent one. On 2026-10-28 the
-- owner supplied it — **AyahSpring**, operated from Uganda, reachable at
-- **privacy@ayahspring.com** — and that one line unblocks the last document.
--
-- **It does not say "Inc.".** The owner offered that suffix, and it was declined
-- on purpose. "Inc." is not decoration: it states that a corporation has been
-- registered in a jurisdiction that uses the word. The operator is a person in
-- Uganda, Ugandan law governs, and no such company has been registered anywhere.
-- A privacy notice naming an entity that does not exist would be worse than one
-- naming none, because it is a claim a regulator, a customer and a court could
-- each check. So the notice names the **trading name** and a contact address,
-- which is true today, and the day there is a registered company its registered
-- name replaces this line in a new version of the document.
--
-- The other three places that need the controller — the children's policy, the
-- safeguarding lead and the takedown agent — already point at "the operator named
-- in the privacy notice". They still do, so there is one line to keep correct
-- rather than four that can drift apart.
--
-- One more thing is fixed here, because it is the same document and the same
-- subject. The privacy notice still described the children's rule in its old,
-- weaker form — "does not knowingly enrol a child under 13 *there*", meaning the
-- country where verification is switched on — while the children's policy carries
-- the owner's answer of 2026-10-27, which is absolute: **nobody under 13, anywhere,
-- in any country**, until guardian verification is working. Two documents, two
-- rules, one of them wrong. The privacy notice now states the owner's rule.

do $$
declare
  v_body   text;
  v_id     uuid;
  v_before int;
  v_after  int;
  v_marker text := '[OWNER DECISION: the name and contact details of the operator of this platform.]';
  v_old_child text := E'Verifiable parental consent for a child under 13 in the United States is built but\n'
                   || E'switched off; until it is on, this platform does not knowingly enrol a child under\n'
                   || E'13 there.';
  v_new_child text := 'No one under 13 may use this platform anywhere, in any country until '
                   || 'guardian verification is working and switched on. That verification is '
                   || 'built — a guardian relationship, a method, a stated lifetime and a way '
                   || 'to withdraw — and it is switched off, so the door is closed. The '
                   || 'children''s policy states the same rule.';
begin
  select v.id, v.body into v_id, v_body
    from public.policy_versions v
    join public.policy_documents d on d.id = v.document_id
   where d.slug = 'privacy' and v.status = 'draft';

  if v_id is null then
    raise exception 'operator identity: no privacy draft';
  end if;

  v_before := public.policy_open_decisions(v_body);

  -- The marker must be there, exactly once. A replacement that silently found
  -- nothing would leave a notice that looked answered and was not.
  if position(v_marker in v_body) = 0 then
    raise exception 'operator identity: the marker is gone from the privacy draft';
  end if;
  if v_before <> 1 then
    raise exception 'operator identity: expected one open decision, found %', v_before;
  end if;

  -- The paragraph ends with a blank line so it does not run into the sentence
  -- that follows it: the seed text put the authority in the next line of the same
  -- paragraph, and a controller with no address on the next line reads as one.
  v_body := replace(
    v_body,
    v_marker,
    'AyahSpring is the controller of the personal data described in this notice. It is '
    || 'operated from Uganda, and you can write to privacy@ayahspring.com about anything '
    || 'in this notice — to ask what is held about you, to have it corrected, to have it '
    || 'deleted, or to complain about how it has been handled.' || E'\n');

  if position(v_old_child in v_body) = 0 then
    raise exception 'operator identity: the stale children paragraph is not in the privacy draft';
  end if;
  v_body := replace(v_body, v_old_child, v_new_child);

  v_after := public.policy_open_decisions(v_body);

  update public.policy_versions
     set body = v_body,
         change_note = 'The owner answered the decisions in this text on 2026-10-27, supplied '
                    || 'the operator''s name and contact details on 2026-10-28, and the '
                    || 'children''s paragraph was brought into line with the children''s policy.'
   where id = v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (null, 'policy.operator_named', 'policy_version', v_id,
          jsonb_build_object(
            'operator', 'AyahSpring',
            'contact', 'privacy@ayahspring.com',
            'jurisdiction', 'Uganda',
            'source', 'owner, 2026-10-28',
            'answered', v_before - v_after,
            'remaining', v_after,
            'notClaimed', 'no incorporated entity — the notice names a trading name, not an Inc.',
            'alsoFixed', 'the privacy notice now states the absolute under-13 rule'));
end $$;

-- The flag row said a fact had to be typed in. It has been. What is left is the
-- owner's act rather than a build step, and the row now says only that.
update public.platform_settings
   set preconditions = 'All twenty-three decisions are answered as of 2026-10-28 '
        || 'and nothing is left to type: the privacy notice names the operator as '
        || 'AyahSpring, operated from Uganda, reachable at privacy@ayahspring.com, '
        || 'and the children''s, safeguarding and takedown documents point at that '
        || 'one line rather than repeating it. No marker remains in any document. '
        || 'What is left is your act and not a build step: publish each draft from '
        || '/admin/policies with a date and a written reason, and it goes into '
        || 'force — publication is refused only while a question is still marked '
        || 'in the text. Every published version freezes at that moment; a later '
        || 'change is a new version, never an edit. Nothing here needs a deploy',
       description = 'Terms, privacy, child policy, refund policy, content licence'
 where key = 'platform.legal';
