import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  acceptanceLabel,
  approvalProblem,
  audienceLabel,
  bodyBlocks,
  canPublish,
  decisionCount,
  describePolicyError,
  documentsNeedingWork,
  draftNote,
  isInForce,
  liveLine,
  outstandingSentence,
  publishRefusal,
  readableBlocks,
  readyToPublish,
  statusNote,
  type PolicyRegister,
  type RegisterDocument,
} from './policies.ts';

test('an audience reads as a sentence, not as a database value', () => {
  assert.equal(audienceLabel('everyone'), 'Everyone');
  assert.equal(audienceLabel('child'), 'Children and their guardians');
  assert.equal(audienceLabel('teacher'), 'Teachers');
  assert.equal(audienceLabel('institution'), 'Institutions');
  // A value nobody planned for falls back rather than printing `undefined`.
  assert.equal(audienceLabel('guardian'), 'Everyone');
  assert.equal(audienceLabel(null), 'Everyone');
});

test('only a live version makes a document in force', () => {
  assert.equal(isInForce({ versionNumber: 2 }), true);
  assert.equal(isInForce({ versionNumber: 0 }), false);
  assert.equal(isInForce({}), false);
  assert.equal(isInForce(null), false);
  assert.equal(isInForce(undefined), false);
});

test('a document with no live version says so, rather than showing a version', () => {
  assert.equal(statusNote(null), 'Not in force yet');
  assert.equal(statusNote({}), 'Not in force yet');
  assert.equal(statusNote({ versionNumber: 1, effectiveAt: '2026-11-01T00:00:00' }),
    'Version 1, in force from 2026-11-01');
  assert.equal(liveLine({ versionNumber: 3, effectiveAt: null }), 'Version 3, in force');
});

test('the prompt counts documents, and says nothing when nothing is owed', () => {
  assert.equal(outstandingSentence(0), 'Nothing is waiting for your agreement.');
  assert.equal(outstandingSentence(1), 'One document is waiting for your agreement.');
  assert.equal(outstandingSentence(4), '4 documents are waiting for your agreement.');
});

test('an accepted document shows when it was agreed, not a button', () => {
  assert.equal(acceptanceLabel(null), 'Agree to this version');
  assert.equal(acceptanceLabel(undefined), 'Agree to this version');
  assert.equal(acceptanceLabel('2026-10-27T09:14:00+00:00'), 'Agreed on 2026-10-27');
});

test('open decisions are counted the way the database counts them', () => {
  assert.equal(decisionCount(''), 0);
  assert.equal(decisionCount(null), 0);
  assert.equal(decisionCount('Nothing is marked here.'), 0);
  assert.equal(decisionCount('[OWNER DECISION: governing law.]'), 1);
  assert.equal(decisionCount(`A paragraph.

[OWNER DECISION: the controller.]

[OWNER DECISION: the supervisory authority, and the
law this notice is written against.]`), 2);
  // A bare mention in prose is not a marker to be answered.
  assert.equal(decisionCount('We do not use OWNER DECISION markers.'), 0);
});

test('nothing publishes while a decision is open, and the refusal names the count', () => {
  assert.equal(canPublish(0), true);
  assert.equal(canPublish(1), false);
  assert.equal(publishRefusal(0), 'Nothing is blocking this version.');

  const one = publishRefusal(1);
  assert.match(one, /one owner decision/);
  assert.match(one, /is still marked/);
  assert.doesNotMatch(one, /are still/);

  const three = publishRefusal(3);
  assert.match(three, /3 owner decisions/);
  assert.match(three, /are still marked/);
  // The sentence explains the rule rather than scolding the reader.
  assert.match(three, /\[OWNER DECISION: …\]/);
});

test('a body splits into headings, paragraphs and decision blocks', () => {
  const blocks = bodyBlocks(`## Who may use it

You need an account, and an account is for one person.

## Money

[OWNER DECISION: state whether courses are sold at launch.

And in which markets.]`);
  assert.deepEqual(blocks.map((b) => b.kind), ['heading', 'text', 'heading', 'decision']);
  assert.equal(blocks[0]?.text, 'Who may use it');
  assert.equal(blocks[1]?.text, 'You need an account, and an account is for one person.');
  // A decision that wrapped across lines is one block on one line, so it cannot
  // be skimmed as two separate sentences of the policy.
  assert.equal((blocks[3] as { text: string }).text,
    '[OWNER DECISION: state whether courses are sold at launch. And in which markets.]');
});

test('an empty body has no blocks, and CRLF is not a paragraph', () => {
  assert.deepEqual(bodyBlocks(''), []);
  assert.deepEqual(bodyBlocks(null), []);
  assert.deepEqual(bodyBlocks('   \n\n  '), []);
  assert.deepEqual(bodyBlocks('One line.'), [{ kind: 'text', text: 'One line.' }]);
  assert.deepEqual(bodyBlocks('## Title\r\n\r\nBody.').map((b) => b.text), ['Title', 'Body.']);
});

test('the reader never sees an unanswered question', () => {
  const body = `## Terms

A real sentence.

[OWNER DECISION: governing law.]`;
  assert.equal(bodyBlocks(body).length, 3);
  const readable = readableBlocks(body);
  assert.equal(readable.length, 2);
  assert.equal(readable.some((b) => b.kind === 'decision'), false);
  assert.equal(readable[1]?.text, 'A real sentence.');
});

function doc(over: Partial<RegisterDocument>): RegisterDocument {
  return {
    id: 'd1',
    slug: 'terms',
    title: 'Terms of use',
    summary: null,
    audience: 'everyone',
    acceptanceRequired: true,
    live: null,
    acceptedAccounts: 0,
    draft: null,
    versions: [],
    ...over,
  };
}

test('the owner sees what still needs work, worst first', () => {
  const register: PolicyRegister = {
    documents: [
      doc({ id: 'a', slug: 'terms', live: {
        versionNumber: 1, effectiveAt: '2026-11-01', approvedAt: '2026-10-27', approvalReason: 'ok',
      }, draft: { id: 'v2', versionNumber: 2, openDecisions: 0, changeNote: 'n', createdAt: 'x' } }),
      doc({ id: 'b', slug: 'privacy', draft: {
        id: 'v1', versionNumber: 1, openDecisions: 3, changeNote: 'n', createdAt: 'x',
      } }),
      doc({ id: 'c', slug: 'refunds', draft: {
        id: 'v1', versionNumber: 1, openDecisions: 5, changeNote: 'n', createdAt: 'x',
      } }),
      doc({ id: 'd', slug: 'takedown', live: {
        versionNumber: 1, effectiveAt: '2026-11-01', approvedAt: '2026-10-27', approvalReason: 'ok',
      } }),
    ],
    counts: { documents: 4, inForce: 2, drafts: 3, openDecisions: 8 },
  };

  // Terms is live and its draft is clean: publishing it is a choice, not a
  // repair, so it is not in the blocked list.
  assert.deepEqual(documentsNeedingWork(register).map((d) => d.slug), ['refunds', 'privacy']);
  assert.deepEqual(documentsNeedingWork(null), []);
  assert.deepEqual(readyToPublish(register).map((d) => d.slug), ['terms']);
  assert.deepEqual(readyToPublish(null), []);
});

test('a document says what its draft is waiting for', () => {
  assert.equal(draftNote(doc({})), 'No draft yet.');
  assert.equal(draftNote(doc({ live: {
    versionNumber: 1, effectiveAt: '2026-11-01', approvedAt: '2026-10-27', approvalReason: 'ok',
  } })), 'In force. No draft waiting.');
  assert.equal(draftNote(doc({ draft: {
    id: 'v2', versionNumber: 2, openDecisions: 0, changeNote: 'n', createdAt: 'x',
  } })), 'Draft version 2, ready to publish.');
  assert.equal(draftNote(doc({ draft: {
    id: 'v2', versionNumber: 2, openDecisions: 1, changeNote: 'n', createdAt: 'x',
  } })), 'Draft version 2, one decision still open.');
  assert.equal(draftNote(doc({ draft: {
    id: 'v2', versionNumber: 2, openDecisions: 4, changeNote: 'n', createdAt: 'x',
  } })), 'Draft version 2, 4 decisions still open.');
});

test('publishing needs a reason and a date before the button is pressed', () => {
  assert.match(String(approvalProblem('', '2026-11-01')), /reason/);
  assert.match(String(approvalProblem('   ', '2026-11-01')), /reason/);
  assert.match(String(approvalProblem('Reviewed.', '')), /date/);
  assert.match(String(approvalProblem('Reviewed.', '1 November')), /date/);
  assert.equal(approvalProblem('Reviewed against the code.', '2026-11-01'), null);
});

test('a database refusal becomes a sentence somebody can act on', () => {
  assert.match(describePolicyError('policy:decisions_open'), /owner decision as unanswered/);
  assert.match(describePolicyError('policy:reason_required'), /reason/);
  assert.match(describePolicyError('policy:change_note_required'), /what changed/);
  assert.match(describePolicyError('policy:body_too_short'), /too short/);
  assert.match(describePolicyError('policy:not_allowed'), /Only the platform owner/);
  assert.match(describePolicyError('policy:not_in_force'), /not in force yet/);
  assert.match(describePolicyError('policy:not_found'), /does not exist/);
  assert.match(describePolicyError('policy:already_decided'), /already been decided/);
  assert.match(describePolicyError('policy:not_signed_in'), /Sign in/);
  // An unexpected message is passed through rather than swallowed: a refusal
  // nobody recognises is still better than "something went wrong" hiding it.
  assert.equal(describePolicyError('permission denied for table policy_versions'),
    'permission denied for table policy_versions');
  assert.equal(describePolicyError(''), 'Something went wrong. Nothing was changed.');
});
