-- -----------------------------------------------------------------------------
-- The children's policy, brought into line with the platform
-- -----------------------------------------------------------------------------
-- The children's policy has been in force since 2026-10-28, and two of its
-- paragraphs stopped being true within four days of publication.
--
--   1. **"No one under 13 may use this platform anywhere … the switch that would
--      open the door is off."** That was true on 2026-10-28. On 2026-11-01 the
--      owner switched guardian verification on, worldwide, ahead of the legal
--      review — so the paragraph now tells every reader of a binding document that
--      the platform refuses something it in fact allows. A policy that understates
--      what the platform does is not the safe direction: it is the one that lets a
--      parent believe a gate exists because they were told it did not.
--
--   2. **"When a learner turns 18 the record becomes their own account, and they
--      are asked whether to keep it."** This is the owner's decision of
--      2026-10-27, and it is not automatic: the platform stores no date of birth —
--      by design, and this policy says so two paragraphs earlier — so it cannot
--      know that a learner has turned 18. The decision stays in the document and
--      the paragraph now says how it is reached and what happens meanwhile.
--
-- The **privacy notice** carries the same under-13 sentence, in its "Children"
-- section, and repeats "it is switched off, so the door is closed". Two documents
-- stating one rule is right; two documents stating the same stale reason is how the
-- weaker one becomes the one a parent reads. Both are corrected here, in one
-- migration, so they cannot drift apart by a release.
--
-- So this is a **new version**, not an edit: version 1 is retired and kept, because
-- a document somebody may have relied on is not rewritten in place. What changes is
-- confined to the paragraphs that were wrong, plus one added section that states
-- the guardian verification the platform now requires — the reader arriving here
-- from a consent screen should be able to find the rule that admitted their child.
--
-- **What this does not do.** It does not touch the 30-day clock, the certificate
-- exception or the coursework file rule; those were true when written and are true
-- now. It does not name a person's legal name where an office will do: the
-- safeguarding lead is the operator, reachable at the address the privacy notice
-- already publishes, and `safeguarding_lead()` reads the same control.
--
-- **The one sentence that is deliberately conditional.** A course a child may be
-- shown is held to a screening standard, and `platform.safeguarding` is a switch —
-- off by default. A policy may state a rule; it must not state a switch as though
-- it were a guarantee. The paragraph says the rule and says that the platform
-- enforces it when the operator has the control switched on, which is exactly what
-- the database does.

do $$
declare
  v_doc    uuid;
  v_live   public.policy_versions;
  v_next   integer;
  v_body   text;
  v_open   int;
  v_reason constant text :=
    'Owner instruction, 2026-11-02: republish the children''s policy so it states '
    || 'what the platform now does — guardian verification is required for every '
    || 'child, in every country, and was switched on by the owner on 2026-11-01 — '
    || 'and so that it does not promise an eighteenth-birthday handover the '
    || 'platform does not perform. The decision to build that handover stands and '
    || 'is recorded in DECISIONS.md; the policy will say so when it is built.';
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
    raise exception 'children policy: no children policy version is in force to correct';
  end if;

  -- Already corrected — by an earlier run of this migration, or by the owner
  -- publishing it from `/admin/policies` first. Nothing to do is a legitimate
  -- outcome, and saying so is better than silence.
  if position('does not know when a learner turns' in v_live.body) > 0 then
    raise notice 'children policy: the in-force version already states the current rule';
    return;
  end if;

  -- The old answer must still be there, or this is a different document than the
  -- one this migration was written against.
  if position('the switch that would open the door is off' in v_live.body) = 0 then
    raise exception 'children policy: the in-force version does not carry the paragraph this replaces';
  end if;

  v_body := $doc$## A child is not an account

On this platform a child does not need a sign-in. A child is a learner profile
inside an adult's account — a parent, a guardian, or a teacher running a class.
There is no child login to phish, no password for a seven-year-old to remember,
and no place for a stranger to message a child.

The adult who adds the child is responsible for it. Adding one takes a name and
an age band — 5–7, 8–10, 11–13, 14–17 — and never a date of birth. An age band is
what the content needs; a birthday is what an advertising profile needs.

## Who is answerable for a child here

Before a child is enrolled, an adult must be verified as that child's parent or
guardian. Verification is a decision recorded by a person, not a checkbox: they
read the adult's own statement of who the child is to them, they confirm one of
four methods — a video call, an identity document, meeting in person, or a signed
declaration kept outside this database — and the record carries how the
relationship was established and how long it lasts.

This requirement is on for every country, including the United States and the
European Union. The operator decided on 2026-11-01 to apply it everywhere ahead of
a legal review that is still owed, because the alternative was enrolling children
on nothing but an adult's word.

A verification expires. Twelve months is the ordinary lifetime, six is used where
the reviewer is not sure, and nothing longer than thirty-six months is possible.
When it lapses the adult is asked again. A child already enrolled keeps their
place: the requirement is on arriving and on reaching into the record, not on
being removed from a course somebody paid for. A child who has no verified
guardian cannot be enrolled, and a verification can be withdrawn at any time,
which closes that reach into the record.

## What a child's profile shows

Nothing public. A child's name is visible to the adult who holds the account, to
family members that adult has invited, and to a teacher whose class the child
joined — and to staff doing their work, with a written reason.

A child's progress, notes and assessment results are private in the same way.

## Classes, discussion and contact

Discussion on a lesson is moderated: a teacher's post is visible at once, a
learner's post is held until it is read. A child cannot open a private
conversation with an adult, and a teacher is never given a child's contact
details.

Live classes are attended from inside the platform. Nobody is asked to join a
call from a private address.

## Children under 13

No one under 13 may use this platform anywhere, in any country, until guardian
verification is working and switched on. It is working, and the operator applies
it in every country from 2026-11-01: a child under 13 may use the platform once a
guardian has been verified, and a child of any age is enrolled only that way.

There is no lower age at which an adult's word is enough on its own, and no
country where the requirement is waived.

## If something goes wrong

A concern about a child goes to the platform's safeguarding lead, who is a person
and not a queue. The lead is the operator named in the privacy notice — AyahSpring,
reachable at privacy@ayahspring.com. That address is published so a concern can be raised
without an account, and it is read.

Content can be withheld while a concern is looked at. A course that a child may be
shown is held to a stricter standard than a course for adults: its author must
hold a screening record that passed and has not lapsed, and must have
acknowledged this platform's safeguarding and conduct policy. The platform
enforces that in the database when the operator has the control switched on, and
the screening register records what each teacher holds and when it lapses.

## When a child grows up

This platform records no date of birth, so it does not know when a learner turns
18 and does not act on a birthday by itself.

When a learner turns 18 the record becomes their own account, and they are asked
whether to keep it. If they say no it is deleted within 30 days. Because there is
no birthday to detect, that is not automatic yet: the young person, or the adult
holding the record, asks — through the support desk, which is a person — and the
record stays where it is until they do. It is not archived, and it is not quietly
kept.

## How long a child's learning record is kept

A child's learning record is deleted with the guardian's account, thirty days
after that account closes. What is deleted is what the child actually did:
enrolments, lesson progress, submissions, assessment attempts and answers,
attendance, memorisation passages and their reviews, class memberships, downloads
and devices.

Two things survive, and both for a reason stated in advance. A certificate
already issued keeps its number and its snapshot, because a certificate somebody
may have shown an employer has to go on meaning something — it verifies the
certificate, not the child. And a file handed in for a class is kept for a year
after the later of the class ending and the hand-in, because a teacher may still
need to answer a question about marked work. A file whose submission is erased
becomes unwatchable at once, and its bytes follow thirty days later.

## When this policy changes

A change is a new version with a date and a written reason; the version it
replaces is kept, because a record is read rather than rewritten. A guardian
verification records the version of this policy that was in force when it was
decided, so the consent an adult gave is always against the words they were
shown.$doc$;

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
     'Guardian verification is required for every child in every country, and the paragraph promising a handover at eighteen is replaced by what the platform does today. Decided by the owner on 2026-11-02.',
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
            'whyNoAccount', 'republished with the correction that makes it true again'));

  raise notice 'children policy: version % is in force from 2026-11-02', v_next;
end $$;

-- -----------------------------------------------------------------------------
-- The privacy notice, corrected in the same breath
-- -----------------------------------------------------------------------------
-- Its "Children" section states the same rule and the same stale reason: "That
-- verification is built … and it is switched off, so the door is closed." It is
-- not off. Correcting one document and leaving the other saying the opposite would
-- recreate the defect the privacy notice itself was fixed for — two documents, two
-- rules, the weaker one read first — so both move together, on one date.
do $$
declare
  v_doc    uuid;
  v_live   public.policy_versions;
  v_next   integer;
  v_body   text;
  v_open   int;
  v_old    constant text :=
    'A child is a learner profile inside an adult''s account and never holds a sign-in.';
  v_new    constant text :=
    'A child is a learner profile inside an adult''s account and does not need a '
    || 'sign-in of their own. No one under 13 may use this platform anywhere, in any '
    || 'country until guardian verification is working and switched on. It is working '
    || 'and the operator applies it in every country from 2026-11-01: a child of any '
    || 'age is enrolled only after an adult has been verified as their parent or guardian, '
    || 'and that verification carries a method, a stated lifetime and a way to '
    || 'withdraw. The children''s policy states the same rule.';
  v_reason constant text :=
    'Owner instruction, 2026-11-02: correct the Children section, which said guardian '
    || 'verification was switched off. It was switched on, worldwide, on 2026-11-01, '
    || 'and the children''s policy is corrected on the same day so the two documents '
    || 'state one rule rather than two.';
begin
  select d.id into v_doc from public.policy_documents d where d.slug = 'privacy';
  if v_doc is null then
    raise exception 'privacy notice: there is no privacy document';
  end if;

  select * into v_live
    from public.policy_versions v
   where v.document_id = v_doc and v.status = 'in_force'
   order by v.version_number desc
   limit 1;

  if v_live.id is null then
    raise exception 'privacy notice: no version is in force to correct';
  end if;

  if position('the operator applies it in every country' in v_live.body) > 0 then
    raise notice 'privacy notice: the in-force version already states the current rule';
    return;
  end if;

  if position('and it is switched off, so the door is closed' in v_live.body) = 0 then
    raise exception 'privacy notice: the in-force version does not carry the paragraph this replaces';
  end if;

  v_body := regexp_replace(
    v_live.body,
    'A child is a learner profile[^#]*?The children''s policy states the same rule\.',
    v_new);

  if position(v_new in v_body) = 0 then
    raise exception 'privacy notice: the Children paragraph was not replaced';
  end if;

  v_open := public.policy_open_decisions(v_body);
  if v_open > 0 then
    raise exception 'privacy notice: the new text still holds % open decision(s)', v_open;
  end if;

  v_next := v_live.version_number + 1;

  update public.policy_versions set status = 'retired' where id = v_live.id;

  insert into public.policy_versions
    (document_id, version_number, body, change_note, status, effective_at,
     approved_at, approved_by, approval_reason)
  values
    (v_doc, v_next, v_body,
     'The Children section now states that guardian verification is required, and that the operator applies it in every country, rather than that it is built and off. Decided by the owner on 2026-11-02.',
     'in_force', date '2026-11-02', now(), null, v_reason);

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (null, 'policy.published', 'policy_version', v_live.id,
          jsonb_build_object(
            'slug', 'privacy',
            'versionNumber', v_next,
            'effectiveAt', '2026-11-02',
            'reason', v_reason,
            'replacesVersion', v_live.version_number,
            'source', 'owner instruction of 2026-11-02, recorded by migration',
            'approvedBy', null,
            'whyNoAccount', 'corrected with the children''s policy so the two cannot disagree'));

  raise notice 'privacy notice: version % is in force from 2026-11-02', v_next;
end $$;
