import assert from 'node:assert/strict';
import test from 'node:test';

import { consoleSections, switchboardNotice, type StaffFacts } from './admin-console.ts';

const nobody: StaffFacts = {
  platformAdmin: false,
  financeAdmin: false,
  governanceAdmin: false,
  supportAgent: false,
};

test('the platform admin sees the switchboard and every section', () => {
  const seen = consoleSections({ ...nobody, platformAdmin: true });
  assert.deepEqual(seen, {
    switchboard: true,
    money: true,
    publication: true,
    support: true,
    moderation: true,
  });
});

test('a finance admin sees money and moderation, not the switches', () => {
  const seen = consoleSections({ ...nobody, financeAdmin: true });
  assert.equal(seen.switchboard, false);
  assert.equal(seen.money, true);
  assert.equal(seen.publication, false);
  assert.equal(seen.support, false);
  // Moderation is every privileged role's work; it is not a narrowing.
  assert.equal(seen.moderation, true);
});

test('a governance admin sees publication, not money and not the queue', () => {
  const seen = consoleSections({ ...nobody, governanceAdmin: true });
  assert.equal(seen.money, false);
  assert.equal(seen.publication, true);
  assert.equal(seen.support, false);
  assert.equal(seen.moderation, true);
});

test('a support agent sees support and moderation, and nothing about money', () => {
  // The refund count is already withheld by `staff_attention()`. The link to
  // the refund queue was not, which is the mismatch this fixes.
  const seen = consoleSections({ ...nobody, supportAgent: true });
  assert.equal(seen.money, false);
  assert.equal(seen.publication, false);
  assert.equal(seen.support, true);
  assert.equal(seen.moderation, true);
});

test('a role held together with another widens, and does not lose what it had', () => {
  const both = consoleSections({ ...nobody, financeAdmin: true, governanceAdmin: true });
  assert.equal(both.money, true);
  assert.equal(both.publication, true);
  assert.equal(both.support, false);
});

test('the non-owner is told whose the switches are, in their own words', () => {
  assert.match(switchboardNotice({ ...nobody, financeAdmin: true }), /belong to the platform admin/);
  assert.match(switchboardNotice({ ...nobody, financeAdmin: true }), /Your work here is money/);
  // Two roles read as a list, because the sentence is about what they own.
  assert.match(
    switchboardNotice({ ...nobody, financeAdmin: true, governanceAdmin: true }),
    /Your work here is money and publication/,
  );

  const support = switchboardNotice({ ...nobody, supportAgent: true });
  assert.match(support, /Your work here is support/);
  // Not "permission denied": that reads as a fault to report rather than a
  // person to ask.
  assert.doesNotMatch(support, /denied|not allowed|forbidden/i);
});

test('the owner is told nothing, because the switchboard is not a notice to them', () => {
  assert.equal(switchboardNotice({ ...nobody, platformAdmin: true }), '');
});

test('a staff member with no recognised role still gets a sentence rather than a blank', () => {
  assert.match(switchboardNotice(nobody), /staff work/);
});
