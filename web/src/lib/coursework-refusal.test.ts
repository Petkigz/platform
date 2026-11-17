import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { refusalCodeOf } from './coursework.ts';
import { mapCourseworkUploadError } from './coursework-refusal.ts';

const migration = (name: string) =>
  readFileSync(new URL(`../../../supabase/migrations/${name}`, import.meta.url), 'utf8');

/** The body of one function, from its `create` to the `$$;` that closes it. */
function bodyOf(sql: string, name: string): string {
  const start = sql.search(new RegExp(`create (?:or replace )?function public\\.${name}\\s*\\(`, 'u'));
  assert.ok(start >= 0, `${name} is not defined where this test looks for it`);
  // The first `$$` opens the body; the next `$$;` closes it.
  const end = sql.indexOf('$$;', sql.indexOf('$$', start) + 2);
  assert.ok(end > start, `${name} has no end`);
  return sql.slice(start, end);
}

/** Every sentence a function raises, as written. */
const raised = (body: string) =>
  [...body.matchAll(/raise exception\s+'((?:[^']|'')+)'/gu)].map((match) => (match[1] ?? '').replace(/''/gu, "'"));

const register = raised(bodyOf(migration('20261281006000_coursework_files.sql'), 'register_coursework_upload'));
const retry = raised(bodyOf(migration('20261281116000_coursework_retry_transfer.sql'), 'retry_coursework_upload_target'));

test('every sentence the database refuses an upload with has a word, or is left out on purpose', () => {
  // Read from the migrations, not copied: if one of them is reworded, or
  // refuses for a new reason, this fails and somebody decides what the
  // learner is told. Without it the sentence would fall to "no code", and the
  // page would say "could not be confirmed" for something that was refused.
  assert.ok(register.length >= 10, `only ${register.length} refusals were found in register_coursework_upload`);
  assert.ok(retry.length >= 5, `only ${retry.length} refusals were found in retry_coursework_upload_target`);

  // Refusals the page's own code cannot provoke: it always sends a type, a
  // size and a SHA-256, and cuts the name to two hundred characters.
  const noCode = new Set([
    'a file needs a type',
    'a file needs a size in bytes',
    'the checksum must be a 64-character lowercase hex SHA-256 digest',
    'a file name cannot be longer than 200 characters',
  ]);
  const expected: Record<string, [string, number]> = {
    'sign in to hand in a file': ['not_signed_in', 401],
    'sign in to retry this upload': ['not_signed_in', 401],
    'assignment submission not found': ['not_found', 404],
    'you can only hand in a file for a learner you are responsible for': ['not_allowed', 403],
    'this pending upload is not available to you': ['not_allowed', 403],
    'files can only be attached to an open draft': ['not_draft', 409],
    'files can only be sent to an open draft': ['not_draft', 409],
    'this upload is no longer pending; refresh the file list': ['list_changed', 409],
    'this file type is not supported for an assignment': ['wrong_kind', 415],
    'an assignment file cannot exceed 25 MiB': ['too_big', 413],
    'a file needs a name, so it can be recognised later': ['no_name', 400],
    'an assignment can have at most % files': ['too_many', 409],
    'this assignment already has the maximum number of attached files': ['too_many', 409],
    'choose the same file and file type as the original upload': ['different_file', 409],
  };
  for (const sentence of new Set([...register, ...retry])) {
    // `%` is where the database puts a number.
    const said = sentence.replace('%', '10');
    const got = mapCourseworkUploadError(said);
    if (noCode.has(sentence)) {
      assert.deepEqual(got, { code: null, status: 400 }, sentence);
      continue;
    }
    assert.ok(expected[sentence], `the database refuses with "${sentence}" and nobody has decided what the learner is told`);
    assert.deepEqual([got.code, got.status], expected[sentence], sentence);
  }
  // And nothing is tabulated here that the database no longer says.
  const all = new Set([...register, ...retry]);
  for (const sentence of [...Object.keys(expected), ...noCode]) {
    assert.ok(all.has(sentence), `"${sentence}" is no longer raised by either function`);
  }
});

test('a sentence nobody knows is a 400 with no word, never a guess', () => {
  assert.deepEqual(mapCourseworkUploadError('new row violates row-level security policy'), { code: null, status: 400 });
  assert.deepEqual(mapCourseworkUploadError(''), { code: null, status: 400 });
});

test('the page trusts a reason only from a 4xx that names one it knows', () => {
  assert.equal(refusalCodeOf(409, 'not_draft'), 'not_draft');
  assert.equal(refusalCodeOf(413, 'too_big'), 'too_big');
  assert.equal(refusalCodeOf(401, 'not_signed_in'), 'not_signed_in');
  // A server error is not a refusal, whatever it says about itself.
  assert.equal(refusalCodeOf(500, 'not_draft'), 'uncertain');
  assert.equal(refusalCodeOf(503, 'too_big'), 'uncertain');
  // No word, an unknown word, or a word that is not the server's to give.
  assert.equal(refusalCodeOf(400, undefined), 'uncertain');
  assert.equal(refusalCodeOf(400, 'something_new'), 'uncertain');
  assert.equal(refusalCodeOf(400, 'unreadable'), 'uncertain');
  assert.equal(refusalCodeOf(400, 'empty'), 'uncertain');
  assert.equal(refusalCodeOf(409, 'remove_uncertain'), 'uncertain');
  assert.equal(refusalCodeOf(200, 'not_draft'), 'uncertain');
  assert.equal(refusalCodeOf(409, 42), 'uncertain');
});

test('the route answers a refused upload with the word, and the page has a sentence for it', () => {
  const route = readFileSync(new URL('../app/api/media/route.ts', import.meta.url), 'utf8');
  assert.match(route, /const refusal = mapCourseworkUploadError\(message\);/u);
  assert.match(route, /\{ ok: false, \.\.\.\(refusal\.code \? \{ code: refusal\.code \} : \{\}\), message \},\s+\{ status: refusal\.status \}/u);

  const dir = '../app/learn/[enrolmentId]/assignment/[assignmentId]';
  const files = readFileSync(new URL(`${dir}/assignment-files.tsx`, import.meta.url), 'utf8');
  for (const code of ['not_signed_in', 'not_allowed', 'not_found', 'not_draft', 'list_changed', 'different_file']) {
    assert.ok(files.includes(`case '${code}':`), `the files part has no sentence for "${code}"`);
  }
});
