// The children's policy, and the person who checks a guardian.
//
// Two things live here, because they fail in the same way. A policy in force is a
// document somebody relies on: it said "the switch that would open the door is off"
// for four days after the owner switched it on, and it promised a handover at
// eighteen that no code performs. A reviewer's checklist is the standard a person is
// held to: without one, two reviewers decide the same request differently.
//
// So the tests are about truth rather than about text — the live version says what
// the platform does, an old version stays readable and unchanged, a consent records
// the version that admitted the child, and the document a reviewer reads exists and
// says the same nine things the screen does.
//
// A file, read from disk, is a strange dependency for a database suite. It is here
// on purpose: the checklist is a document, and the failure this guards against is a
// screen and a document drifting into two answers.

import { readFileSync } from 'node:fs';

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, committed, asAnon, asUser,
  } = ctx;

  const admin = await bootstrapAdmin('children-admin@example.com');

  const eq = (actual, expected, what) =>
    assert(actual === expected,
      `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

  /** The children's versions, newest first, with the open-decision count. */
  const versions = async () =>
    (await q(
      `select v.id, v.version_number, v.status, v.body, v.change_note,
              v.effective_at, v.approved_by, v.approval_reason,
              public.policy_open_decisions(v.body) as open
         from public.policy_versions v
         join public.policy_documents d on d.id = v.document_id
        where d.slug = 'children'
        order by v.version_number desc`)).rows;

  const live = async () => (await versions()).find((v) => v.status === 'in_force');

  // ---------------------------------------------------------------------------
  // What is in force, and what it says
  // ---------------------------------------------------------------------------

  await test('the children’s policy is in force as a correction, not an edit', async () => {
    const rows = await versions();
    eq(rows.length, 2, 'the children’s policy versions');
    eq(rows.filter((v) => v.status === 'in_force').length, 1, 'versions in force');

    const now = rows.find((v) => v.status === 'in_force');
    eq(now.version_number, 2, 'the version in force');
    eq(new Date(now.effective_at).toISOString().slice(0, 10), '2026-11-02',
      'the day the correction took effect');
    eq(now.open, 0, 'open owner decisions in a document in force');
    eq(now.approved_by, null,
      'a version published by migration names an approver who does not exist');
    assert(/^Owner instruction, 2026-11-02/.test(now.approval_reason ?? ''),
      `the correction does not record the instruction: ${now.approval_reason}`);
    assert((now.change_note ?? '').length > 40,
      'the correction does not say what changed');

    const old = rows.find((v) => v.status !== 'in_force');
    eq(old.version_number, 1, 'the version it replaced');
    eq(old.status, 'retired', 'a version somebody relied on is retired, never deleted');
    assert(/the switch that would open the door is off/.test(old.body),
      'the retired version was rewritten — the record of what was published is gone');
  });

  await test('the version in force states what the platform now does', async () => {
    const body = (await live()).body;

    // The paragraph that was false for four days. Guardian verification was
    // switched on worldwide on 2026-11-01, and a policy that still says otherwise
    // tells a parent a gate does not exist.
    assert(!/the switch that would open the door is off/.test(body),
      'the live policy still says the verification switch is off');
    assert(/2026-11-01/.test(body), 'the live policy does not say when the rule changed');
    assert(/every country/i.test(body), 'the live policy does not say the rule is worldwide');

    // The handover at eighteen: the owner's decision stays in the document, and it
    // sits beside the fact that makes it un-automatic — no birthday is stored, so
    // nobody is asked on a date and the young person has to ask.
    assert(/does not know when a learner turns/.test(body),
      'the live policy implies the platform knows a learner’s age');
    assert(/becomes their own account/.test(body),
      'the owner’s decision about turning eighteen was dropped from the policy');
    assert(/deleted within 30 days/.test(body),
      'the policy no longer says what happens if the record is not kept');
    assert(/not automatic yet/.test(body),
      'the policy presents the handover as automatic');
    assert(/support desk/.test(body),
      'the policy does not say how anybody asks for the handover');

    // The retention answer, which was true when written and is true now.
    assert(/thirty days/.test(body), 'the thirty-day clock is not stated');
    assert(/certificate/.test(body), 'the certificate exception is not stated');
    assert(/a year/.test(body), 'the coursework year is not stated');

    // The person to reach, by an address that works without an account.
    assert(/privacy@ayahspring\.com/.test(body),
      'the live policy names no address for a concern');
    assert(/AyahSpring/.test(body), 'the live policy does not name the operator');
    assert(/screening/.test(body), 'the live policy does not state the teacher standard');

    // And the sentence that is conditional says so, rather than claiming a switch.
    assert(/when the operator has the control switched on/.test(body),
      'the screening rule is stated as a guarantee the platform does not give');
  });

  await test('a consent records the version of the policy that was in force', async () => {
    const now = await live();

    const owner = await newUser('children-parent@example.com');
    await newProfile(owner, 'Policy Parent');
    const childId = await committed(async () => {
      const fam = (await q(
        `insert into public.families (name, created_by, status)
         values ('Policy Family',$1,'active') returning id`, [owner])).rows[0].id;
      const child = (await q(
        `insert into public.learner_profiles
           (display_name, learner_type, age_band, family_id, status)
         values ('Yusuf','child','8-10',$1,'active') returning id`, [fam])).rows[0].id;
      await q(`insert into public.family_memberships
                 (family_id, user_id, membership_type, status, joined_at, created_by)
               values ($1,$2,'owner','active',now(),$2)`, [fam, owner]);
      return child;
    });

    await q('begin');
    await q(`select set_config('request.jwt.claims',$1,true)`,
      [JSON.stringify({ sub: owner, role: 'authenticated' })]);
    await q('set local role authenticated');
    const submitted = (await q('select public.submit_guardian_consent($1,$2,$3,$4,$5) as r',
      [childId, 'parent', 'video_call', null,
       'Yusuf is my son. I am the adult who registered him and I look after his learning.']))
      .rows[0].r;
    await q('commit');

    eq(submitted.policyVersionId, now.id,
      'the consent names a version of the children’s policy other than the one in force');

    const stored = (await q(
      `select consented_policy_version_id as id from public.guardian_relationships
        where learner_profile_id = $1`, [childId])).rows[0].id;
    eq(stored, now.id, 'the version stored on the relationship');
  });

  // ---------------------------------------------------------------------------
  // Reading it, and the one thing that must not happen again
  // ---------------------------------------------------------------------------

  await test('a visitor reads the version in force and never the retired one', async () => {
    const now = await live();
    const old = (await versions()).find((v) => v.status !== 'in_force');

    const page = (await asAnon(() => q(`select public.policy_page('children') as r`)))
      .rows[0].r;
    eq(page.versionNumber, 2, 'the version a visitor reads');
    assert(page.body === now.body, 'the page did not return the live body');

    const readable = (await asAnon(() => q(
      `select count(*)::int n from public.policy_versions where id = $1`, [old.id])))
      .rows[0].n;
    eq(readable, 0, 'a retired version is readable by a visitor');
  });

  await test('a version already retired cannot be published again', async () => {
    const old = (await versions()).find((v) => v.status !== 'in_force');
    // The owner, not a passer-by: the refusal being tested is about the version's
    // state, and a permission refusal would prove nothing.
    await rejects(
      () => asUser(admin, () => q('select public.approve_policy_version($1,$2,$3)',
        [old.id, '2026-11-02', 'Put the old text back, which nobody should do.'])),
      /already_decided/);
    eq((await live()).version_number, 2, 'the retired version was put back in force');
  });

  await test('the privacy notice carries the same rule, and neither is stale', async () => {
    const rows = (await q(
      `select v.body, v.version_number, public.policy_open_decisions(v.body) as open
         from public.policy_versions v
         join public.policy_documents d on d.id = v.document_id
        where d.slug = 'privacy' and v.status = 'in_force'`)).rows;
    eq(rows.length, 1, 'privacy versions in force');

    const body = rows[0].body;
    eq(rows[0].open, 0, 'open owner decisions in a notice in force');
    assert(/No one under 13 may use this platform anywhere, in any country/.test(body),
      'the privacy notice lost the owner’s under-13 rule');
    assert(/the operator applies it in every country from 2026-11-01/.test(body),
      'the privacy notice still says the verification door is closed');
    assert(!/it is switched off, so the door is closed/.test(body),
      'the privacy notice still says the switch is off');
    assert(/states the same rule/.test(body),
      'the privacy notice no longer points at the policy that states the rule');
  });

  // ---------------------------------------------------------------------------
  // The checklist
  // ---------------------------------------------------------------------------

  await test('the reviewer’s checklist exists and covers the four methods', async () => {
    const doc = readFileSync(
      new URL('../../docs/safeguarding/guardian-verification-checklist.md', import.meta.url),
      'utf8');

    for (const method of ['video call', 'document', 'in person', 'signed declaration']) {
      assert(new RegExp(method, 'i').test(doc),
        `the checklist never mentions ${method}`);
    }
    for (const decision of ['Reject', 'more information', 'months', 'permissions']) {
      assert(new RegExp(decision, 'i').test(doc),
        `the checklist never mentions ${decision}`);
    }
    assert(/write-only/.test(doc), 'the checklist does not say the reference is write-only');
    assert(/two working days/.test(doc), 'the checklist sets no time to read a request');
    assert(/privacy@ayahspring\.com/.test(doc),
      'the checklist does not say where a safeguarding worry goes');
    assert(!/\[OWNER DECISION/.test(doc), 'the checklist still carries an unanswered question');
    assert(doc.length > 2500, 'the checklist is too short to be the standard it claims to be');
  });
}
