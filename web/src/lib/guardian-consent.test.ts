import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CONSENT_METHODS,
  DEFAULT_VALIDITY_MONTHS,
  ENFORCEMENT_NOTE,
  EVIDENCE_NOTE,
  VALIDITY_MONTHS,
  WITHDRAWAL_EFFECT,
  consentSentence,
  consentStateLabel,
  consentTone,
  daysUntil,
  dayLabel,
  decisionEffect,
  describeConsentError,
  enforcementNote,
  expiryWarning,
  methodLabel,
  permissionSentence,
  policyLine,
  registerHeadline,
  relationshipLabel,
  type ConsentRegister,
  type MyConsent,
} from './guardian-consent.ts';

const NOW = new Date('2026-11-01T12:00:00Z');

function consent(overrides: Partial<MyConsent> = {}): MyConsent {
  return {
    relationshipId: 'r1',
    learnerProfileId: 'l1',
    learnerName: 'Amina',
    relationshipType: 'parent',
    status: 'active',
    method: 'video_call',
    verifiedAt: '2026-11-01T09:00:00Z',
    expiresAt: '2027-11-01T09:00:00Z',
    revokedAt: null,
    revokedReason: null,
    canViewProgress: true,
    canManageLearning: true,
    canManageProfile: false,
    policyChanged: false,
    openCase: null,
    lastDecision: { status: 'verified', at: '2026-11-01T09:00:00Z', reason: 'Identity matched.' },
    ...overrides,
  };
}

function register(counts: Partial<ConsentRegister['counts']>): ConsentRegister {
  return {
    enforced: false,
    policyInForce: false,
    waiting: [],
    active: [],
    counts: { waiting: 0, active: 0, lapsed: 0, noExpiry: 0, children: 0, ...counts },
  };
}

test('methods and relationships read as sentences', () => {
  assert.equal(methodLabel('video_call'), 'a video call');
  assert.equal(methodLabel('signed_declaration'), 'a signed declaration');
  assert.equal(methodLabel(null), 'a method that was not recorded');
  assert.equal(relationshipLabel('guardian'), 'Guardian');
  assert.equal(relationshipLabel('uncle'), 'Adult');
  assert.equal(CONSENT_METHODS.length, 4);
  assert.equal(DEFAULT_VALIDITY_MONTHS, 12);
  assert.deepEqual([...VALIDITY_MONTHS], [6, 12, 24, 36]);
});

test('a withdrawal is not a refusal, and a refusal is not a withdrawal', () => {
  assert.equal(consentStateLabel(consent({ status: 'active' })), 'Verified');
  assert.equal(consentStateLabel(consent({ status: 'lapsed' })), 'Lapsed');
  assert.equal(
    consentStateLabel(consent({ status: 'pending_verification' })),
    'Waiting for review',
  );
  assert.equal(
    consentStateLabel(consent({ status: 'revoked', lastDecision: null })),
    'Withdrawn',
  );
  assert.equal(
    consentStateLabel(
      consent({ status: 'revoked', lastDecision: { status: 'rejected', at: null, reason: 'No.' } }),
    ),
    'Not granted',
  );
  assert.equal(consentTone(consent()), 'ok');
  assert.equal(consentTone(consent({ status: 'lapsed' })), 'warn');
  assert.equal(consentTone(consent({ status: 'revoked', lastDecision: null })), 'neutral');
});

test('days and dates are counted, and a missing date is not invented', () => {
  assert.equal(daysUntil('2026-11-11T12:00:00Z', NOW), 10);
  assert.equal(daysUntil('2026-10-31T12:00:00Z', NOW), -1);
  assert.equal(daysUntil(null, NOW), null);
  assert.equal(daysUntil('not a date', NOW), null);
  assert.equal(dayLabel(null), null);
  assert.equal(dayLabel('not a date'), null);
  assert.match(dayLabel('2026-11-01T09:00:00Z') ?? '', /2026/);
});

test('a live consent says how, when, and when it runs out', () => {
  const sentence = consentSentence(consent(), NOW);
  assert.match(sentence, /^Verified on /);
  assert.match(sentence, /a video call/);
  assert.match(sentence, /lapses on .*2027/);
  assert.match(sentence, /36[45] days/);
});

test('a consent without an expiry is said to have none, not given one', () => {
  const sentence = consentSentence(consent({ expiresAt: null }), NOW);
  assert.match(sentence, /no expiry recorded/);
  assert.match(sentence, /before lifetimes existed/);
  assert.doesNotMatch(sentence, /2027/);

  const warning = expiryWarning(consent({ expiresAt: null }), NOW);
  assert.match(warning ?? '', /no expiry/);
});

test('a lapsed consent says what ran out and that nothing was deleted', () => {
  const sentence = consentSentence(
    consent({ status: 'lapsed', expiresAt: '2026-10-01T09:00:00Z' }),
    NOW,
  );
  assert.match(sentence, /ran out on /);
  assert.match(sentence, /Nothing was deleted/);
  assert.match(sentence, /renew/);
});

test('a pending request says who is holding it, and whether they asked for more', () => {
  const waiting = consentSentence(consent({ status: 'pending_verification', verifiedAt: null }));
  assert.match(waiting, /waiting for a reviewer/);

  const more = consentSentence(
    consent({
      status: 'pending_verification',
      openCase: { id: 'c1', status: 'needs_information', submittedAt: NOW.toISOString(), note: 'More.' },
    }),
  );
  assert.match(more, /asked for more information/);
});

test('withdrawal and refusal are described without implying punishment', () => {
  const withdrawn = consentSentence(consent({ status: 'revoked', lastDecision: null }));
  assert.match(withdrawn, /You withdrew/);
  assert.match(withdrawn, /unchanged/);

  const refused = consentSentence(
    consent({ status: 'revoked', lastDecision: { status: 'rejected', at: null, reason: 'No.' } }),
  );
  assert.match(refused, /did not grant/);
  assert.match(refused, /Nothing was removed/);
});

test('the warning appears only within a month, and never for a consent that is not live', () => {
  assert.equal(expiryWarning(consent(), NOW), null);
  assert.equal(
    expiryWarning(consent({ expiresAt: '2026-11-20T12:00:00Z' }), NOW),
    'This verification lapses in 19 days.',
  );
  assert.equal(
    expiryWarning(consent({ expiresAt: '2026-11-02T12:00:00Z' }), NOW),
    'This verification lapses in 1 day.',
  );
  assert.match(
    expiryWarning(consent({ expiresAt: '2026-11-01T12:00:00Z' }), NOW) ?? '',
    /today/,
  );
  assert.equal(expiryWarning(consent({ status: 'lapsed' }), NOW), null);
});

test('permissions are listed, and none reads as none', () => {
  const all = permissionSentence({
    canViewProgress: true,
    canManageLearning: true,
    canManageProfile: true,
  });
  assert.match(all, /see progress/);
  assert.match(all, /change what the child is learning/);
  assert.match(all, /change the child’s profile/);

  const narrowed = permissionSentence({
    canViewProgress: true,
    canManageLearning: false,
    canManageProfile: false,
  });
  assert.equal(narrowed, 'You may see progress.');

  assert.match(
    permissionSentence({ canViewProgress: false, canManageLearning: false, canManageProfile: false }),
    /No permissions/,
  );
});

test('a database refusal becomes a sentence, and an unknown one is passed through', () => {
  assert.match(
    describeConsentError('guardian:statement_required'),
    /in your own words/,
  );
  assert.match(describeConsentError('guardian:already_verified'), /nothing to renew/i);
  assert.match(describeConsentError('guardian:not_in_family'), /adult in this child’s family/);
  assert.match(describeConsentError('guardian:validity_invalid'), /thirty-six months/);
  assert.equal(
    describeConsentError('guardian:something_new'),
    'guardian:something_new',
  );
  assert.equal(describeConsentError(''), 'That did not work. Nothing was recorded.');
  assert.equal(describeConsentError(null), 'That did not work. Nothing was recorded.');
});

test('the queue headline counts what needs doing and nothing else', () => {
  assert.equal(registerHeadline(null), 'Nothing has been read yet.');
  assert.equal(registerHeadline(register({})), 'Nothing is waiting for a decision.');
  assert.equal(
    registerHeadline(register({ waiting: 1 })),
    '1 request is waiting for a decision.',
  );
  assert.equal(
    registerHeadline(register({ waiting: 3 })),
    '3 requests are waiting for a decision.',
  );
  assert.equal(
    registerHeadline(register({ lapsed: 2, noExpiry: 1 })),
    'Nothing is waiting. 2 lapsed and 1 without an expiry need a renewal.',
  );
});

test('the policy line never claims a policy in force', () => {
  assert.match(policyLine(false), /No children’s policy is in force/);
  assert.match(policyLine(false), /Publish the policy/);
  assert.match(policyLine(true), /records the children’s policy version/);
});

test('the standing notes say the awkward things out loud', () => {
  assert.match(ENFORCEMENT_NOTE, /enforcement is off/i);
  assert.match(ENFORCEMENT_NOTE, /lapse does not yet remove access/);
  assert.equal(enforcementNote(true), null);
  assert.equal(enforcementNote(false), ENFORCEMENT_NOTE);

  assert.match(WITHDRAWAL_EFFECT, /clears every permission/);
  assert.match(WITHDRAWAL_EFFECT, /does not .*delete/i);

  assert.match(EVIDENCE_NOTE, /write-only/);
  assert.match(EVIDENCE_NOTE, /never what it is/);

  assert.match(decisionEffect('verified', 12), /12 months/);
  assert.match(decisionEffect('rejected', 12), /clears every permission/);
  assert.match(decisionEffect('needs_information', 12), /keeps the request open/);
});
