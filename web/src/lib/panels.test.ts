import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  describePanelError,
  outcomeProblem,
  panelMemberRole,
  panelStatusLabel,
  quorumMet,
  quorumSentence,
  tallySentence,
  versionLabel,
  voteLabel,
  type PanelTally,
} from './panels.ts';

const tally = (approve: number, reject: number, abstain = 0): PanelTally => ({
  approve, reject, abstain, cast: approve + reject + abstain,
});

test('a panel says whether it is sitting', () => {
  assert.equal(panelStatusLabel('active'), 'Convened');
  assert.equal(panelStatusLabel('inactive'), 'Not convened');
  assert.equal(panelStatusLabel('dissolved'), 'Dissolved');
  assert.equal(panelStatusLabel(null), 'Not convened');
  assert.equal(panelMemberRole('chair'), 'Chair');
  assert.equal(panelMemberRole('member'), 'Member');
  assert.equal(panelMemberRole(undefined), 'Member');
});

test('a vote reads as a verb, and not voting is not a vote', () => {
  assert.equal(voteLabel('approve'), 'Approve');
  assert.equal(voteLabel('reject'), 'Reject');
  assert.equal(voteLabel('abstain'), 'Abstain');
  assert.equal(voteLabel(null), 'Not voted');
});

test('the quorum sentence says how many have voted and whether that is enough', () => {
  assert.equal(quorumMet(2, 3), false);
  assert.equal(quorumMet(3, 3), true);
  assert.equal(quorumSentence(2, 3), 'Waiting on quorum — 2 of 3 votes cast.');
  assert.equal(quorumSentence(3, 3), 'Quorum met — 3 of 3 votes cast.');
  // A one-person panel is grammatical.
  assert.equal(quorumSentence(0, 1), 'Waiting on quorum — 0 of 1 vote cast.');
});

test('a tally reads as a sentence, and an empty one says so', () => {
  assert.equal(tallySentence(null), 'No votes cast yet.');
  assert.equal(tallySentence(tally(0, 0, 0)), 'No votes cast yet.');
  assert.equal(tallySentence(tally(2, 1, 1)), '2 approve · 1 reject · 1 abstain');
});

test('no decision is recorded below quorum', () => {
  for (const outcome of ['approved', 'rejected', 'withdrawn']) {
    const problem = outcomeProblem(outcome, tally(1, 0), 3);
    assert.match(String(problem), /not reached its quorum/);
    assert.match(String(problem), /1 of 3/);
  }
  assert.equal(outcomeProblem('withdrawn', tally(2, 1, 0), 2), null);
});

test('a decision cannot contradict the votes', () => {
  // Approving while more voted to reject is refused, at quorum or above.
  assert.match(String(outcomeProblem('approved', tally(1, 2, 0), 2)), /do not approve/);
  assert.match(String(outcomeProblem('approved', tally(0, 2, 1), 2)), /do not approve/);
  // A tie cannot be recorded as approval, but may be recorded as rejection: the
  // arithmetic refuses a contradiction, not a majority rule the owner has not set.
  assert.match(String(outcomeProblem('approved', tally(1, 1, 0), 2)), /do not approve/);
  assert.equal(outcomeProblem('rejected', tally(1, 1, 0), 2), null);
  // Rejecting while more voted to approve is refused.
  assert.match(String(outcomeProblem('rejected', tally(3, 1, 0), 2)), /do not reject/);
  // A straight majority is fine either way.
  assert.equal(outcomeProblem('approved', tally(2, 1, 0), 2), null);
  assert.equal(outcomeProblem('rejected', tally(1, 2, 0), 2), null);
  // Abstentions count toward the quorum but not toward the majority.
  assert.equal(outcomeProblem('approved', tally(1, 0, 2), 2), null);
});

test('a version says which state it is in, in words', () => {
  assert.equal(versionLabel('draft'), 'draft');
  assert.equal(versionLabel('submitted'), 'submitted for review');
  assert.equal(versionLabel('approved'), 'approved, not published');
  assert.equal(versionLabel('published'), 'published');
  assert.equal(versionLabel(null), 'unknown');
});

test('a refusal becomes a sentence somebody can act on', () => {
  assert.match(describePanelError('panel:not_allowed'), /platform owner convenes/);
  assert.match(describePanelError('panel:not_enough_members'), /Not enough people are seated/);
  assert.match(describePanelError('panel:below_quorum'), /below its quorum/);
  assert.match(describePanelError('panel:quorum_not_met'), /not reached its quorum/);
  assert.match(describePanelError('panel:outcome_contradicts_votes'), /contradicts the votes/);
  assert.match(describePanelError('panel:already_voted'), /already voted/);
  assert.match(describePanelError('panel:not_convened'), /not convened/);
  assert.match(describePanelError('panel:appointment_required'), /appointed to the board/);
  assert.match(describePanelError('panel:reviewer_not_active'), /not been checked/);
  assert.match(describePanelError('panel:not_a_member'), /seated member/);
  assert.match(describePanelError('panel:case_open'), /already has a case/);
  assert.match(describePanelError('panel:already_published'), /before publication/);
  assert.match(describePanelError('panel:summary_required'), /what the panel decided/);
  assert.match(describePanelError('panel:quorum_invalid'), /whole number of people/);
  assert.match(describePanelError('panel:open_cases'), /still has cases open/);
  assert.match(describePanelError('panel:dissolved'), /dissolved/);
  assert.match(describePanelError('panel:reason_required'), /reason/);
  assert.match(describePanelError('panel:not_signed_in'), /Sign in/);
  // An unrecognised refusal is passed through, not swallowed.
  assert.equal(describePanelError('permission denied for table scholarly_panels'),
    'permission denied for table scholarly_panels');
  assert.equal(describePanelError(''), 'Something went wrong. Nothing was changed.');
});
