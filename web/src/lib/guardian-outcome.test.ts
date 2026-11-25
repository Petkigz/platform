import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  METHODS,
  REASON_MIN,
  RELATIONSHIPS,
  STATEMENT_MIN,
  guardianOutcomeOf,
  guardianReasonOf,
  guardianStatusOf,
  type GuardianCode,
} from './guardian-outcome.ts';

const NAMES: GuardianCode[] = [
  'signed_out', 'choose_child', 'statement_short', 'not_in_family', 'not_a_child', 'child_gone',
  'method_invalid', 'relationship_invalid', 'already_verified', 'already_waiting', 'reason_short',
  'already_revoked', 'gone', 'not_yours', 'refused', 'unconfirmed',
];

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const migration = read('../../../supabase/migrations/20261281002100_guardian_consent.sql');

test('every reason the database raises has a name the form can say', () => {
  const raised = [...new Set([...migration.matchAll(/'(guardian:[a-z_]+)/gu)].map((m) => m[1]!))];
  assert.ok(raised.length >= 10, `${raised.length} reasons found`);
  for (const reason of raised) {
    const name = guardianReasonOf({ message: `${reason} — something a person wrote`, code: 'P0001' });
    // A reviewer's own refusals are raised by the same migration and are never
    // seen by a parent; they may fall to the plain refusal, never to "unconfirmed".
    assert.notEqual(name, 'unconfirmed', reason);
  }
  assert.equal(guardianReasonOf({ message: 'guardian:already_waiting', code: 'P0001' }), 'already_waiting');
  assert.equal(guardianReasonOf({ message: 'guardian:not_found', code: 'P0001' }), 'gone');
  assert.equal(guardianReasonOf({ message: 'guardian:not_allowed', code: '42501' }), 'not_yours');
  assert.equal(guardianReasonOf({ message: 'guardian:statement_required', code: 'P0001' }), 'statement_short');
});

test('an error that is not the database answering is not called a refusal', () => {
  // The database refused, for a reason this file has no word for: nothing was written.
  assert.equal(guardianReasonOf({ message: 'new row violates a check', code: '23514' }), 'refused');
  // No SQLSTATE: the reply never came from the database. The request may have landed.
  assert.equal(guardianReasonOf({ message: 'fetch failed' }), 'unconfirmed');
  assert.equal(guardianReasonOf({ message: 'fetch failed', code: '' }), 'unconfirmed');
  assert.equal(guardianReasonOf({ message: null, code: null }), 'unconfirmed');
  // PostgREST's own codes are not SQLSTATEs.
  assert.equal(guardianReasonOf({ message: 'JWT expired', code: 'PGRST301' }), 'unconfirmed');
  // Class 08 is the connection.
  assert.equal(guardianReasonOf({ message: 'connection failure', code: '08006' }), 'unconfirmed');
});

test('a name is answered at one status, and only "unconfirmed" is outside the four hundreds', () => {
  for (const name of NAMES) {
    const status = guardianStatusOf(name);
    if (name === 'unconfirmed') assert.equal(status, 502);
    else assert.ok(status >= 400 && status <= 499, `${name} ${status}`);
    // What the route answers is what the form reads back.
    assert.equal(guardianOutcomeOf(status, name), name, name);
  }
  assert.equal(guardianStatusOf('signed_out'), 401);
  assert.equal(guardianStatusOf('not_yours'), 403);
  assert.equal(guardianStatusOf('gone'), 404);
  assert.equal(guardianStatusOf('statement_short'), 400);
  assert.equal(guardianStatusOf('already_waiting'), 409);
});

test('only a four hundred that names a known reason is read as a refusal', () => {
  assert.equal(guardianOutcomeOf(409, 'already_waiting'), 'already_waiting');
  // A name with no status to back it.
  assert.equal(guardianOutcomeOf(500, 'already_waiting'), 'unconfirmed');
  assert.equal(guardianOutcomeOf(502, 'refused'), 'unconfirmed');
  assert.equal(guardianOutcomeOf(200, 'refused'), 'unconfirmed');
  // A status with no name, or a name nobody has heard of.
  assert.equal(guardianOutcomeOf(400, undefined), 'unconfirmed');
  assert.equal(guardianOutcomeOf(403, null), 'unconfirmed');
  assert.equal(guardianOutcomeOf(409, 'toString'), 'unconfirmed');
  assert.equal(guardianOutcomeOf(409, 42), 'unconfirmed');
  // "Not configured" is a 503 and names nothing the form knows.
  assert.equal(guardianOutcomeOf(503, 'unavailable'), 'unconfirmed');
  // A four hundred may not claim that nothing is known.
  assert.equal(guardianOutcomeOf(400, 'unconfirmed'), 'unconfirmed');
});

test('the lengths and the lists are the ones the database checks', () => {
  assert.equal(STATEMENT_MIN, 20);
  assert.equal(REASON_MIN, 10);
  assert.deepEqual([...RELATIONSHIPS], ['parent', 'guardian', 'other']);
  assert.deepEqual([...METHODS], ['video_call', 'id_document', 'in_person', 'signed_declaration']);
  for (const method of METHODS) assert.ok(migration.includes(`'${method}'`), method);
});

test('the route names every refusal and the forms print no sentence the route sent', () => {
  const route = read('../app/api/family/guardians/route.ts');
  // Every reply that is not a yes carries a `code`.
  const replies = [...route.matchAll(/NextResponse\.json\(\{([^}]*)\}/gu)].map((m) => m[1]!);
  assert.ok(replies.length >= 5);
  for (const reply of replies) {
    assert.ok(/\bok: true\b/u.test(reply) || /\bcode\b/u.test(reply), reply.trim());
  }
  for (const file of ['consent-form.tsx', 'consent-actions.tsx']) {
    const form = read(`../app/family/guardians/${file}`);
    assert.ok(!/json\.error/u.test(form), `${file} prints what the route wrote`);
    assert.ok(form.includes('json.ok !== true'), `${file} takes a reply without "ok" for a yes`);
    assert.ok(form.includes('guardianOutcomeOf(res.status, json.code)'), file);
    // A browser file: no catalogue, no server words.
    assert.ok(!/from '@\/lib\/(i18n|guardian-words|guardian-consent)/u.test(form), `${file} imports a server file`);
    // And no sentence of its own between tags.
    assert.ok(!/>\s*[A-Z][a-z]+ [a-z]+[^<{]*</u.test(form), `${file} has an English sentence in it`);
  }
});
