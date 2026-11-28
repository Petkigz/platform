import assert from 'node:assert/strict';
import test from 'node:test';

import { readFileSync, readdirSync } from 'node:fs';

import { CONSOLE_LINKS, QUEUE_WORDS, consoleSections, switchboardNotice, type StaffFacts } from './admin-console.ts';
import { en } from './i18n/messages/en.ts';

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

test('the non-owner is told whose the switches are, whatever their role', () => {
  for (const facts of [
    { ...nobody, financeAdmin: true },
    { ...nobody, financeAdmin: true, governanceAdmin: true },
    { ...nobody, supportAgent: true },
    // A staff member with no recognised role still gets the sentence rather than a blank.
    nobody,
  ]) assert.equal(switchboardNotice(facts), 'staff.notOwner');
  assert.match(en['staff.notOwner'], /belong to the platform admin/);
  // Not "permission denied": that reads as a fault to report rather than a
  // person to ask.
  assert.doesNotMatch(en['staff.notOwner'], /denied|not allowed|forbidden|permission/i);
});

test('the owner is told nothing, because the switchboard is not a notice to them', () => {
  assert.equal(switchboardNotice({ ...nobody, platformAdmin: true }), null);
});

test('every screen is listed once, under one gate, with a name from the catalogue', () => {
  const all = Object.values(CONSOLE_LINKS).flat();
  assert.equal(all.length, 43);
  assert.equal(new Set(all.map((link) => link.href)).size, 43);
  assert.equal(new Set(all.map((link) => link.label)).size, 43);
  for (const link of all) {
    assert.match(link.href, /^\/admin\/[a-z-]+$/u);
    assert.ok(en[link.label].length > 0, link.href);
    // The sentence beside it is a key too, and follows a dash: no closing stop.
    assert.match(link.note, /^console\.n[A-Z][A-Za-z]+$/u, link.href);
    assert.ok(en[link.note].length > 0 && !en[link.note].endsWith('.'), link.href);
    assert.doesNotMatch(en[link.note], /`/u, link.href);
  }
  assert.equal(new Set(all.map((link) => link.note)).size, 43);
  assert.equal(new Set(all.map((link) => en[link.note])).size, 43);
  // A link's sentence is named after the link: `staff.lRefunds` has `console.nRefunds`.
  for (const link of all) {
    if (link.label.startsWith('staff.l')) assert.equal(link.note, `console.n${link.label.slice('staff.l'.length)}`, link.href);
  }
});

test('a queue is named by its code, and every code the database sends has words', () => {
  // The codes `staff_attention()` hands to `attention_row()`, read from the migrations.
  const dir = new URL('../../../supabase/migrations/', import.meta.url);
  const sql = readdirSync(dir).sort().map((name) => readFileSync(new URL(name, dir), 'utf8')).join('\n');
  const start = sql.lastIndexOf('create or replace function public.staff_attention()');
  assert.ok(start > 0);
  const body = sql.slice(start, sql.indexOf('$$;', start));
  const sent = [...body.matchAll(/attention_row\(\s*'([a-z_]+)', '((?:[^']|'')+)', v_count, '([^']+)',\s*'((?:[^']|'')+)'/gu)];
  assert.equal(sent.length, 13);
  assert.deepEqual(sent.map((m) => m[1]).sort(), Object.keys(QUEUE_WORDS).sort());
  for (const [, code, label, , detail] of sent) {
    const words = QUEUE_WORDS[code!]!;
    const plain = (text: string) => text.replaceAll("''", '’');
    // The English of the catalogue is the database's own, so a reader of
    // English sees what they saw before.
    assert.equal(en[words.label], plain(label!), code);
    assert.equal(en[words.detail], plain(detail!), code);
  }
});
