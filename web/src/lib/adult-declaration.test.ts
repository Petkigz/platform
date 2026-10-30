import assert from 'node:assert/strict';
import test from 'node:test';

import { declarationNote, fetchDeclaration, parseDeclaration } from './adult-declaration.ts';

/**
 * The adulthood declaration, on the client side.
 *
 * The database suite proves the record and the gate. This proves the *shape* the
 * page reads, because the page is what a person actually meets and a JSON blob
 * trusted blindly is a page that renders `undefined` the day a column is renamed.
 *
 * The one rule that matters most here is not a parsing rule: **the sentence under
 * the button says the declaration is not checked.** If that sentence ever loses
 * the word "not", the screen becomes a claim about a verification that does not
 * exist — the exact overclaim `platform.age_assurance` sat in the register to
 * avoid.
 */

test('a missing or malformed payload reads as "nothing declared"', () => {
  for (const value of [null, undefined, 42, 'declared', [], {}]) {
    const d = parseDeclaration(value);
    assert.equal(d.declared, false, `${JSON.stringify(value)} must not read as declared`);
    assert.equal(d.required, false, 'and must not claim the platform is asking');
    assert.equal(d.declaredAt, null);
  }
});

test('the flags are read as strict booleans, not truthiness', () => {
  // `"false"` is a string and a string is truthy. A page that rendered
  // "you declared this" because of the word "false" would be the sort of bug
  // that only appears in production.
  const d = parseDeclaration({ declared: 'false', required: 'true', statement: 'x' });
  assert.equal(d.declared, false);
  assert.equal(d.required, false);
});

test('a withdrawn declaration is not a declared one, and says so', () => {
  const d = parseDeclaration({
    required: true,
    declared: false,
    withdrawn: true,
    statementVersion: 1,
    statement: 'I am 18 or older.',
    declaredAt: '2026-10-30T09:00:00Z',
    withdrawnAt: '2026-11-02T09:00:00Z',
  });
  assert.equal(d.declared, false);
  assert.equal(d.withdrawn, true);
  assert.ok(d.declaredAt && d.withdrawnAt, 'both moments survive, so the page can say which');
});

test('the wording is kept, and its version with it', () => {
  const d = parseDeclaration({
    required: true,
    declared: true,
    statementVersion: 3,
    statement: 'A future sentence.',
    declaredAt: '2026-10-30T09:00:00Z',
  });
  assert.equal(d.statement, 'A future sentence.');
  assert.equal(d.statementVersion, 3);
  // A row with no statement is still readable as a declaration: the page shows
  // the date and the withdrawal button rather than throwing the card away.
  assert.equal(parseDeclaration({ declared: true }).statement, '');
});

test('a failed read is silence, not an exception', async () => {
  const failing = { rpc: async () => ({ data: null, error: { message: 'boom' } }) };
  const d = await fetchDeclaration(failing as never);
  assert.equal(d.required, false, 'a database error must not pretend the platform is asking');
  assert.equal(d.declared, false);
});

test('the note says, in words, that the declaration is not checked', () => {
  const note = declarationNote();
  assert.match(note, /do not check/u);
  // And says what is recorded instead, so "not checked" is not read as
  // "not recorded".
  assert.match(note, /record/iu);
  assert.match(note, /no document/iu);
});
