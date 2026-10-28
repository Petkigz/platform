// Verifiable parental consent: asking, deciding, lapsing, withdrawing.
//
// The machinery existed for months and could not be used: a parent could write a
// relationship and could not open the case that makes anybody look at it, nothing
// recorded *how* a relationship was established, and a verification never expired.
// So "verified" meant "verified once, for ever".
//
// These tests are about the four things that make consent verifiable — submission,
// method, expiry and withdrawal — and about the one seam (`can_access_learner()`,
// behind thirteen policies) where a lapse has to bite.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, grantRole, committed,
  } = ctx;

  const admin = await bootstrapAdmin('gc-admin@example.com');

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q(`select set_config('request.jwt.claims',$1,true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try {
      const result = await q(sql, params);
      await q('commit');
      return result;
    } catch (e) {
      await q('rollback');
      throw e;
    }
  }

  const call = async (actor, fn, params = []) =>
    (await asActor(actor, `select public.${fn} as r`, params)).rows[0].r;
  const eq = (actual, expected, what) =>
    assert(actual === expected,
      `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

  const governance = await newUser('gc-governance@example.com');
  await newProfile(governance, 'Consent Governance');
  await committed(() => grantRole(governance, 'governance_admin', admin));

  const support = await newUser('gc-support@example.com');
  await newProfile(support, 'Consent Support');
  await committed(() => grantRole(support, 'support_agent', admin));

  /** A family owned by `owner`, with one child in it. */
  async function familyWithChild(ownerEmail, childName) {
    const owner = await newUser(ownerEmail);
    await newProfile(owner, ownerEmail.split('@')[0]);
    const { familyId, childId } = await committed(async () => {
      const fam = (await q(
        `insert into public.families (name, created_by, status)
         values ($1,$2,'active') returning id`, ['Consent Family', owner])).rows[0].id;
      const child = (await q(
        `insert into public.learner_profiles
           (display_name, learner_type, age_band, family_id, status)
         values ($1,'child','8-10',$2,'active') returning id`, [childName, fam])).rows[0].id;
      await q(`insert into public.family_memberships
                 (family_id, user_id, membership_type, status, joined_at, created_by)
               values ($1,$2,'owner','active',now(),$3)`, [fam, owner, owner]);
      return { familyId: fam, childId: child };
    });
    return { owner, familyId, childId };
  }

  const parent = await familyWithChild('gc-parent@example.com', 'Amina');
  const stranger = await familyWithChild('gc-stranger@example.com', 'Bilal');

  const STATEMENT = 'Amina is my daughter. I registered her for Qur’an memorisation and I '
    + 'am the adult responsible for her account.';

  let caseId = '';
  let relationshipId = '';

  await test('a parent asks, and the request always has somewhere to go', async () => {
    // An adult outside the family cannot open a case about somebody else's child:
    // the queue must not become a way of learning that a child exists.
    await rejects(() => call(stranger.owner, 'submit_guardian_consent($1,$2,$3,$4,$5)',
      [parent.childId, 'parent', 'video_call', null, STATEMENT]),
    /guardian:not_in_family/);

    // An adult profile is not a child; consent is for a child.
    await rejects(() => call(parent.owner, 'submit_guardian_consent($1,$2,$3,$4,$5)',
      [stranger.childId, 'parent', 'video_call', null, 'x'.repeat(40)]),
    /guardian:not_in_family/);

    await rejects(() => call(parent.owner, 'submit_guardian_consent($1,$2,$3,$4,$5)',
      [parent.childId, 'parent', 'video_call', null, 'too short']),
    /guardian:statement_required/);
    await rejects(() => call(parent.owner, 'submit_guardian_consent($1,$2,$3,$4,$5)',
      [parent.childId, 'parent', 'guesswork', null, STATEMENT]),
    /guardian:method_invalid/);
    await rejects(() => call(parent.owner, 'submit_guardian_consent($1,$2,$3,$4,$5)',
      [parent.childId, 'uncle', 'video_call', null, STATEMENT]),
    /guardian:relationship_invalid/);

    const submitted = await call(parent.owner, 'submit_guardian_consent($1,$2,$3,$4,$5)',
      [parent.childId, 'parent', 'video_call', 'vault/consent/amina.pdf', STATEMENT]);
    eq(submitted.status, 'pending', 'a submitted consent is a request');
    eq(submitted.referenceGiven, true, 'the evidence reference was recorded');
    // The children's policy was published on 2026-10-28, so a consent now records
    // the version that was in force when it was given. Before that date there was
    // no version, and the right answer was a null rather than a claim.
    assert(submitted.policyVersionId !== null,
      'a consent was recorded without naming the children’s policy it agreed to');
    caseId = submitted.caseId;
    relationshipId = submitted.relationshipId;

    // One live relationship per adult and child, and one open case at a time.
    await rejects(() => call(parent.owner, 'submit_guardian_consent($1,$2,$3,$4,$5)',
      [parent.childId, 'parent', 'video_call', null, STATEMENT]),
    /guardian:already_waiting/);
  });

  await test('the evidence reference is write-only, and the statement is what the reviewer reads', async () => {
    // The reference is write-only for **everybody**: not the parent, not the reviewer
    // who decides. A pointer to identity documents is not something a queue hands out.
    await rejects(() => asActor(parent.owner,
      'select evidence_reference from public.guardian_verification_cases where id = $1', [caseId]),
    /permission denied/i);
    await rejects(() => asActor(governance,
      'select evidence_reference from public.guardian_verification_cases where id = $1', [caseId]),
    /permission denied/i);
    // Nor can the register hand it out: it says only that evidence exists.
    const register = await call(governance, 'guardian_consent_register()');
    const row = register.waiting.find((w) => w.caseId === caseId);
    assert(row, 'the case is not in the queue');
    eq(row.referenceGiven, true, 'the queue knows evidence exists');
    eq('evidenceReference' in row, false, 'the queue hands out the reference');
    assert(/my daughter/.test(row.statement), 'the queue carries the parent’s own words');
    eq(register.policyInForce, true, 'the published children’s policy is not reported as in force');
    eq(register.enforced, false, 'verification is enforced while the flag is off');
  });

  await test('only governance staff or the owner decide, and a decision needs months', async () => {
    await rejects(() => call(support, 'decide_guardian_consent($1,$2,$3)',
      [caseId, 'verified', 'Looks fine.']), /guardian:not_allowed/);
    await rejects(() => call(parent.owner, 'decide_guardian_consent($1,$2,$3)',
      [caseId, 'verified', 'Let me in.']), /guardian:not_allowed/);
    await rejects(() => call(governance, 'decide_guardian_consent($1,$2,$3)',
      [caseId, 'maybe', 'Looks fine.']), /guardian:decision_invalid/);
    await rejects(() => call(governance, 'decide_guardian_consent($1,$2,$3)',
      [caseId, 'verified', 'ok']), /guardian:reason_required/);
    await rejects(() => call(governance, 'decide_guardian_consent($1,$2,$3,$4)',
      [caseId, 'verified', 'Called the number on the school record.', 0]),
    /guardian:validity_invalid/);
    await rejects(() => call(governance, 'decide_guardian_consent($1,$2,$3,$4)',
      [caseId, 'verified', 'Called the number on the school record.', 37]),
    /guardian:validity_invalid/);
  });

  await test('a verification is a method and a date, not a boolean', async () => {
    const decided = await call(governance, 'decide_guardian_consent($1,$2,$3,$4,$5,$6,$7)',
      [caseId, 'verified', 'Video call; the identity document matched the school record.',
        12, true, true, false]);
    eq(decided.status, 'verified', 'verified');
    eq(decided.months, 12, 'twelve months');

    const rel = (await q(
      `select status, consent_method, consent_expires_at, verified_at,
              can_view_progress, can_manage_learning, can_manage_profile,
              consent_expires_at - verified_at as window
         from public.guardian_relationships where id = $1`, [relationshipId])).rows[0];
    eq(rel.status, 'active', 'the relationship is active');
    eq(rel.consent_method, 'video_call', 'how it was established');
    eq(rel.can_view_progress, true, 'progress, as the reviewer granted');
    eq(rel.can_manage_learning, true, 'learning, as the reviewer granted');
    eq(rel.can_manage_profile, false, 'the profile permission was narrowed, not granted');
    // Twelve months, within a day of slack for leap years and clock skew.
    const days = Math.round((new Date(rel.consent_expires_at) - new Date(rel.verified_at)) / 86400000);
    eq(days >= 364 && days <= 366, true, `the verification window (${days} days)`);

    // Deciding the same case twice is refused rather than silently rewriting the date.
    await rejects(() => call(governance, 'decide_guardian_consent($1,$2,$3)',
      [caseId, 'verified', 'Again.']), /guardian:already_decided/);
    // And a child already verified to this adult has nothing to renew.
    await rejects(() => call(parent.owner, 'submit_guardian_consent($1,$2,$3,$4,$5)',
      [parent.childId, 'parent', 'video_call', null, STATEMENT]),
    /guardian:already_verified/);
  });

  await test('a parent sees the consent, its method and its expiry — never the evidence', async () => {
    const mine = await call(parent.owner, 'my_guardian_consents()');
    eq(mine.consents.length, 1, 'one child');
    const row = mine.consents[0];
    eq(row.learnerName, 'Amina', 'the child');
    eq(row.status, 'active', 'the state');
    eq(row.method, 'video_call', 'how it was established');
    eq(row.expiresAt !== null, true, 'when it lapses');
    eq(row.canManageProfile, false, 'the permission the reviewer narrowed');
    eq(row.openCase, null, 'no case is open any more');
    eq('evidenceReference' in row, false, 'the parent is handed the evidence reference');
    assert(/matches the school record|identity document/.test(row.lastDecision.reason),
      'the reviewer’s reason is shown to the parent');
  });

  await test('an expiry is inert while the flag is off, and bites when it is on', async () => {
    // Move the expiry into the past, as a year would.
    // A year passes: both ends move, because a verification cannot expire before it
    // was made. Nothing here rewrites the decision, only the clock.
    await q(`update public.guardian_relationships
                set verified_at = now() - interval '13 months',
                    consent_expires_at = now() - interval '1 month'
              where id = $1`, [relationshipId]);

    // Flag off: nothing changes. This is today's behaviour and it must not shift
    // under the owner's feet.
    const off = await call(parent.owner, 'can_access_learner($1)', [parent.childId]);
    eq(off, true, 'access while verification is not enforced');

    await q(`update public.platform_settings set value_text = 'true'
              where key = 'family.guardian_verification'`);
    try {
      const on = await call(parent.owner, 'can_access_learner($1)', [parent.childId]);
      eq(on, false, 'a lapsed consent while verification is enforced');
      eq(await call(parent.owner, 'is_verified_guardian_of($1)', [parent.childId]), false,
        'a lapsed verification is not a verified guardian');

      // The parent is told, in a word, rather than left guessing.
      const mine = await call(parent.owner, 'my_guardian_consents()');
      eq(mine.consents[0].status, 'lapsed', 'the state the parent sees');
      eq(mine.policyInForce, true, 'the children’s policy is published');

      // Staff see it too, counted, so a lapse is not invisible to the queue.
      const register = await call(governance, 'guardian_consent_register()');
      eq(register.counts.lapsed >= 1, true, 'lapsed consents are counted');
      eq(register.active.find((a) => a.relationshipId === relationshipId).lapsed, true,
        'and named');
    } finally {
      await q(`update public.platform_settings set value_text = 'false'
                where key = 'family.guardian_verification'`);
    }
  });

  await test('renewing replaces the relationship rather than duplicating it', async () => {
    const renewed = await call(parent.owner, 'submit_guardian_consent($1,$2,$3,$4,$5)',
      [parent.childId, 'parent', 'in_person', null, STATEMENT]);
    eq(renewed.relationshipId, relationshipId, 'the same relationship row');

    const decided = await call(governance, 'decide_guardian_consent($1,$2,$3,$4)',
      [renewed.caseId, 'verified', 'Seen in person at the weekend class.', 24]);
    eq(decided.months, 24, 'a longer verification');

    const rows = (await q(
      `select count(*)::int n from public.guardian_relationships
        where guardian_user_id = $1 and learner_profile_id = $2`,
      [parent.owner, parent.childId])).rows[0].n;
    eq(rows, 1, 'relationships for this pair');

    const rel = (await q(
      `select consent_method, consent_expires_at > now() + interval '23 months' as long_enough
         from public.guardian_relationships where id = $1`, [relationshipId])).rows[0];
    eq(rel.consent_method, 'in_person', 'the renewed method');
    eq(rel.long_enough, true, 'the renewed expiry');

    // Both cases remain: the history of a verification is not a single row.
    const cases = (await q(
      `select count(*)::int n from public.guardian_verification_cases
        where guardian_relationship_id = $1`, [relationshipId])).rows[0].n;
    eq(cases, 2, 'cases on the relationship');
  });

  await test('a parent can withdraw consent, and that is not a pause', async () => {
    // Enforced, so the difference between a pause and a withdrawal is observable.
    await q(`update public.platform_settings set value_text = 'true'
              where key = 'family.guardian_verification'`);
    try {
      eq(await call(parent.owner, 'can_access_learner($1)', [parent.childId]), true,
        'a current consent reaching the learning record');
    } finally {
      await q(`update public.platform_settings set value_text = 'false'
                where key = 'family.guardian_verification'`);
    }
    await rejects(() => call(stranger.owner, 'revoke_guardian_consent($1,$2)',
      [relationshipId, 'I have decided to withdraw my consent entirely.']),
    /guardian:not_allowed/);
    await rejects(() => call(parent.owner, 'revoke_guardian_consent($1,$2)',
      [relationshipId, 'no']), /guardian:reason_required/);

    const revoked = await call(parent.owner, 'revoke_guardian_consent($1,$2)',
      [relationshipId, 'Amina has moved to her mother’s account. She will be verified there.']);
    eq(revoked.status, 'revoked', 'revoked');

    const rel = (await q(
      `select status, can_manage_profile, can_view_progress, can_manage_learning,
              revoked_at is not null as stamped, revoked_reason
         from public.guardian_relationships where id = $1`, [relationshipId])).rows[0];
    eq(rel.status, 'revoked', 'the relationship status');
    eq(rel.can_view_progress, false, 'progress permission cleared');
    eq(rel.can_manage_learning, false, 'learning permission cleared');
    eq(rel.stamped, true, 'the withdrawal is dated');
    assert(/mother/.test(rel.revoked_reason), 'the reason is kept');

    // Under enforcement, a withdrawn consent closes the learning record even to a
    // family owner — the family clause now runs through consent.
    await q(`update public.platform_settings set value_text = 'true'
              where key = 'family.guardian_verification'`);
    try {
      eq(await call(parent.owner, 'can_access_learner($1)', [parent.childId]), false,
        'a withdrawn consent still reaching the learning record');
      eq(await call(parent.owner, 'is_verified_guardian_of($1)', [parent.childId]), false,
        'a withdrawn consent still counting as a verified guardian');
    } finally {
      await q(`update public.platform_settings set value_text = 'false'
                where key = 'family.guardian_verification'`);
    }

    // Reopening a withdrawn consent is refused: the second call is a duplicate.
    await rejects(() => call(parent.owner, 'revoke_guardian_consent($1,$2)',
      [relationshipId, 'Withdrawing again, just to be sure.']), /guardian:already_revoked/);
  });

  await test('a request that is withdrawn takes its open case with it', async () => {
    const second = await familyWithChild('gc-second@example.com', 'Yusuf');
    const submitted = await call(second.owner, 'submit_guardian_consent($1,$2,$3,$4,$5)',
      [second.childId, 'guardian', 'signed_declaration', null,
        'Yusuf is my nephew and I am his legal guardian while his parents are abroad.']);

    const revoked = await call(second.owner, 'revoke_guardian_consent($1,$2)',
      [submitted.relationshipId, 'His parents have returned and taken over his account.']);
    eq(revoked.status, 'revoked', 'the withdrawal');

    const kase = (await q(
      `select status, reviewed_at is not null as decided
         from public.guardian_verification_cases where id = $1`, [submitted.caseId])).rows[0];
    eq(kase.status, 'revoked', 'the open case is closed with the consent');
    eq(kase.decided, true, 'and dated');
  });

  await test('the register is staff reading, and says what it cannot know', async () => {
    await rejects(() => call(parent.owner, 'guardian_consent_register()'), /guardian:not_allowed/);
    await rejects(() => call(support, 'guardian_consent_register()'), /guardian:not_allowed/);

    const register = await call(admin, 'guardian_consent_register()');
    assert(register.counts.children >= 2, 'the children in families are counted');
    eq(register.policyInForce, true,
      'the published children’s policy is not reported by the register');
    // A verification approved before this migration carries no expiry, and that is
    // reported as a fact rather than hidden.
    eq(typeof register.counts.noExpiry, 'number', 'verifications without an expiry are counted');
  });

  await test('the flag describes what exists, including what it will do when switched on', async () => {
    const row = (await q(
      `select gate_type, preconditions from public.platform_settings
        where key = 'family.guardian_verification'`)).rows[0];
    eq(row.gate_type, 'admin_setup', 'a human queue is a setup question');
    assert(/the whole consent loop/i.test(row.preconditions), 'the loop is named');
    assert(/expire at once/i.test(row.preconditions),
      'the flag does not warn that older verifications will lapse when it is switched on');
    assert(/write-only evidence reference/i.test(row.preconditions), 'the evidence rule');
  });
}
