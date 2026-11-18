import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  RESTORE_FORMAT_NEWEST,
  RESTORE_MAX_BYTES,
  RESTORE_NEVER,
  RESTORE_NEVER_SAID_BY,
  RESTORE_SENTENCE,
  RESTORE_VALUE_LIMIT,
  RESTORE_WHYS,
  restoreCodeOf,
  restoreOutcomeOf,
  restoreQuoted,
  restoreReasonOf,
  restoreRefusal,
  restoreStatusOf,
  type RestoreCode,
  type RestoreWhy,
} from './restore-outcome.ts';
import { en } from './i18n/messages/en.ts';
import { RESTORE } from './i18n/messages/restore.ts';

const CODES = Object.keys(RESTORE_SENTENCE) as RestoreCode[];

const MIGRATION = '20261281007000_restore_my_data.sql';
const sql = readFileSync(new URL(`../../../supabase/migrations/${MIGRATION}`, import.meta.url), 'utf8');
/** The function that reads a file, and the one it asks where a note belongs. */
const body = sql.slice(sql.indexOf('create or replace function public.restore_lesson_target('));

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

/** A database sentence with its gaps filled the way `format()` and `raise` fill them. */
const filled = (sentence: string, with_: string) => sentence.replace(/%s|%/gu, with_);

test('every reason a file is not put back has one status, and only "failed" is not a refusal', () => {
  assert.deepEqual(CODES, ['signed_out', 'too_large', 'not_json', 'not_export', 'newer', 'refused', 'failed']);
  for (const code of CODES) {
    const status = restoreStatusOf(code);
    if (code === 'failed') assert.equal(status, 502);
    else assert.ok(status >= 400 && status <= 499, `${code} is answered with ${status}`);
    assert.deepEqual(restoreRefusal(code), { ok: false, code, message: RESTORE_SENTENCE[code] });
  }
  assert.equal(restoreStatusOf('signed_out'), 401);
  assert.equal(restoreStatusOf('too_large'), 413);
  assert.equal(restoreStatusOf('not_json'), 400);
  assert.equal(restoreStatusOf('refused'), 409);
});

test('the form believes a refusal only when the route named it and answered with a four hundred', () => {
  for (const code of CODES.filter((c) => c !== 'failed')) {
    assert.equal(restoreOutcomeOf(restoreStatusOf(code), code), code);
  }
  // A page from something in front of the site, a five hundred, a success
  // that was not a report, a code nobody has heard of.
  assert.equal(restoreOutcomeOf(502, 'refused'), 'failed');
  assert.equal(restoreOutcomeOf(500, undefined), 'failed');
  assert.equal(restoreOutcomeOf(200, 'refused'), 'failed');
  assert.equal(restoreOutcomeOf(409, 'made_up'), 'failed');
  assert.equal(restoreOutcomeOf(409, null), 'failed');
  assert.equal(restoreOutcomeOf(409, 'toString'), 'failed');
});

test('no sentence the route sends says a file was put back', () => {
  for (const code of CODES) {
    assert.doesNotMatch(RESTORE_SENTENCE[code], /was put back|has been restored|were restored/i, code);
  }
  // A failure claims nothing either way: it may have been the button that writes.
  assert.doesNotMatch(RESTORE_SENTENCE.failed, /nothing was changed/i);
  assert.match(RESTORE_SENTENCE.refused, /Nothing was changed/u);
});

test('each thing the database raises has a name, read out of the migration that raises it', () => {
  // No state, or the connection's: nothing is known.
  assert.equal(restoreCodeOf({ message: 'fetch failed' }), 'failed');
  assert.equal(restoreCodeOf({ code: '', message: 'sign in to restore your data' }), 'failed');
  assert.equal(restoreCodeOf({ code: '08006', message: 'connection failure' }), 'failed');
  assert.equal(restoreCodeOf({ code: 'PGRST301', message: 'JWT expired' }), 'failed');
  assert.equal(restoreCodeOf({ code: null, message: null }), 'failed');

  const raised = [...body.matchAll(/raise exception\s+'((?:[^']|'')*)'(?:,[^;]*?)?\s+using errcode\s*=\s*'([a-z_]+)'/gu)].map(
    (m) => ({ message: m[1]!.replace(/\s+/gu, ' '), state: m[2]! }),
  );
  const STATES: Record<string, string> = { insufficient_privilege: '42501', invalid_parameter_value: '22023' };

  // Seven, in the order the function reaches them. An eighth is a refusal
  // somebody has to give a sentence to.
  const expected: Array<[RegExp, RestoreCode]> = [
    [/^sign in to restore your data$/u, 'signed_out'],
    [/^that is not an export: the file should be one JSON object$/u, 'not_export'],
    [/^that file is % MiB; an export is far smaller than 8$/u, 'too_large'],
    [/^that file has no formatVersion, so it is not an export from this platform$/u, 'not_export'],
    [/^formatVersion % is not a version of this format$/u, 'not_export'],
    [/^that export was written by a newer version of the platform \(format %\) than this one reads/u, 'newer'],
    [/^there is no profile for this account to restore into$/u, 'refused'],
  ];
  assert.equal(raised.length, expected.length, raised.map((r) => r.message).join(' | '));
  raised.forEach((found, index) => {
    const [words, code] = expected[index]!;
    assert.match(found.message, words);
    const state = STATES[found.state];
    assert.ok(state, `${found.state} is a state this file reads`);
    assert.equal(restoreCodeOf({ code: state, message: filled(found.message, '9') }), code, found.message);
  });

  // Every one of them is raised before the first write, so "refused" and
  // "nothing was changed" are true of all seven.
  const firstWrite = body.search(/\n\s+(?:update|insert into|delete from) public\./u);
  const lastRaise = body.lastIndexOf('raise exception');
  assert.ok(firstWrite > 0 && lastRaise > 0 && lastRaise < firstWrite, 'a refusal is raised after a write');

  // Words this file has not seen, under a state it has, are a refusal with no reason given.
  assert.equal(restoreCodeOf({ code: '42501', message: 'permission denied for function' }), 'refused');
  assert.equal(restoreCodeOf({ code: '22023', message: 'something new' }), 'refused');
  // The same words under another state are not believed.
  assert.equal(restoreCodeOf({ code: '23505', message: 'sign in to restore your data' }), 'failed');
});

test('the ceiling and the newest format are the ones the function declares', () => {
  const ceiling = /v_ceiling\s+constant integer := 8 \* 1024 \* 1024;/u.test(body);
  assert.ok(ceiling, 'v_ceiling is declared as 8 MiB');
  assert.equal(RESTORE_MAX_BYTES, 8 * 1024 * 1024);
  const newest = /if v_version > (\d+) then/u.exec(body);
  assert.ok(newest, 'the newest format is checked');
  assert.equal(Number(newest[1]), RESTORE_FORMAT_NEWEST);
});

test('each reason the database gives for leaving an entry in the file has a name, read out of the migration', () => {
  // Every `'reason', '…'` and `'reason', format('…', …)`, and the three
  // sentences `restore_lesson_target()` hands back as the problem.
  const reasons = [
    ...[...body.matchAll(/'reason',\s*(?:format\()?'((?:[^']|'')*)'/gu)].map((m) => m[1]!),
    ...[
      ...body.matchAll(/return query select null::uuid, null::uuid, null::uuid,\s+(?:format\()?'((?:[^']|'')*)'/gu),
    ].map((m) => m[1]!),
  ].map((text) => text.replace(/''/gu, "'"));

  const expected: Array<[RegExp, RestoreWhy]> = [
    [/^the name in the file is blank/u, 'name_blank'],
    [/^the name in the file is longer than 120 characters$/u, 'name_long'],
    [/^the profile column cannot hold “%s”; set it again from \/account$/u, 'language'],
    [/^“%s” is not a time zone this server knows$/u, 'timezone'],
    [/^“%s” is not a two-letter country code$/u, 'country'],
    [/^the notes section of this file is not a list/u, 'not_list'],
    [/^this file holds %s notes and only the first %s are read/u, 'capped'],
    [/^lesson notes are switched off on this platform/u, 'off'],
    [/^this note has no text$/u, 'note_empty'],
    [/^this note is longer than the %s characters a note may hold$/u, 'note_long'],
    [/^you have already written a different note on this lesson/u, 'differs'],
    [/^an active enrolment in this course, and access to this lesson, are required$/u, 'no_access'],
    [/^the bookmarks section of this file is not a list/u, 'not_list'],
    [/^this file holds %s bookmarks and only the first %s are read/u, 'capped'],
    [/^bookmarks are switched off on this platform/u, 'off'],
    [/^an active enrolment in this course, and access to this lesson, are required$/u, 'no_access'],
    [/^this entry names no lesson/u, 'no_lesson'],
    [/^you are not enrolled in a course with a lesson called “%s” any more$/u, 'not_enrolled'],
    [/^more than one of your courses has a lesson called “%s”/u, 'ambiguous'],
  ];
  assert.equal(reasons.length, expected.length, reasons.join(' | '));
  const named = new Set<RestoreWhy>();
  reasons.forEach((reason, index) => {
    const [words, why] = expected[index]!;
    assert.match(reason, words);
    assert.equal(restoreReasonOf(filled(reason, '7')).why, why, reason);
    named.add(why);
  });
  // Every name but `other` is one the database can give; `other` is the rest.
  assert.deepEqual([...named].sort(), RESTORE_WHYS.filter((why) => why !== 'other').sort());

  // The limits the sentences print are the function's own.
  assert.match(body, /v_cap\s+constant integer := 1000;/u);
  assert.match(body, /v_body_max constant integer := 4000;/u);
});

test('what the reader’s file said is carried, cut and cleaned; what the database said is not', () => {
  assert.deepEqual(restoreReasonOf('the name in the file is longer than 120 characters'), { why: 'name_long', count: 120 });
  assert.deepEqual(restoreReasonOf('this note is longer than the 4000 characters a note may hold'), {
    why: 'note_long',
    count: 4000,
  });
  assert.deepEqual(
    restoreReasonOf('this file holds 1204 notes and only the first 1000 are read — export again and restore the rest with a second file'),
    { why: 'capped', held: 1204, read: 1000 },
  );
  assert.deepEqual(restoreReasonOf('“Mars/Olympus” is not a time zone this server knows'), {
    why: 'timezone',
    value: 'Mars/Olympus',
  });
  assert.deepEqual(restoreReasonOf('“ZZZ” is not a two-letter country code'), { why: 'country', value: 'ZZZ' });
  assert.deepEqual(restoreReasonOf('the profile column cannot hold “english please”; set it again from /account'), {
    why: 'language',
    value: 'english please',
  });

  // A value is the reader's own, but it is set inside an isolate: the marks
  // that would close one early, and control characters, are dropped.
  const odd = restoreReasonOf('“a\u202eb\u2069c\u0007d” is not a two-letter country code');
  assert.deepEqual(odd, { why: 'country', value: 'abcd' });
  assert.equal(restoreQuoted(`  ${'x'.repeat(500)}  `).length, RESTORE_VALUE_LIMIT);
  // A closing quote inside the value does not end it early.
  assert.equal(restoreReasonOf('“a” b” is not a time zone this server knows').value, 'a” b');

  // Anything else, and what an insert trigger raised, has one name and carries nothing.
  for (const unknown of [
    'new row for relation "lesson_notes" violates check constraint "lesson_notes_body_check"',
    'duplicate key value violates unique constraint',
    'no reason was given',
    '',
    null,
    undefined,
    7,
    { why: 'off' },
  ]) {
    assert.deepEqual(restoreReasonOf(unknown), { why: 'other' });
  }
});

test('each of the nine things the function never puts back is said by one of the page’s seven', () => {
  const list = body.slice(body.indexOf("'notRestored', jsonb_build_array("));
  const nine = [...list.matchAll(/'what',\s*'((?:[^']|'')*)'/gu)].map((m) => m[1]!);
  assert.equal(nine.length, 9);
  assert.deepEqual([...nine].sort(), Object.keys(RESTORE_NEVER_SAID_BY).sort());

  // Every one of the seven is used, and has a name and a sentence in English.
  assert.deepEqual([...new Set(Object.values(RESTORE_NEVER_SAID_BY))].sort(), [...RESTORE_NEVER].sort());
  const english = en as Record<string, string>;
  for (const name of RESTORE_NEVER) {
    assert.ok(english[`restore.cannot${name}`], `restore.cannot${name}`);
    assert.ok(english[`restore.cannot${name}Note`], `restore.cannot${name}Note`);
  }
  // And the page draws all seven from that list, not from one of its own.
  const page = read('../app/account/restore/page.tsx');
  assert.match(page, /RESTORE_NEVER\.map\(/u);
  assert.match(page, /`restore\.cannot\$\{name\}`, `restore\.cannot\$\{name\}Note`/u);
});

test('twenty-seven languages say all of it, with the same gaps as the English', () => {
  const english = Object.entries(en as Record<string, string>).filter(([key]) => key.startsWith('restore.'));
  assert.equal(english.length, 69);
  const gaps = (text: string) => [...text.matchAll(/\{([a-zA-Z]+)\}/gu)].map((m) => m[1]!).sort();
  const codes = Object.keys(RESTORE);
  assert.equal(codes.length, 27);
  for (const code of codes) {
    const written = RESTORE[code as keyof typeof RESTORE] as Record<string, string>;
    assert.deepEqual(Object.keys(written), english.map(([key]) => key), code);
    for (const [key, text] of english) {
      assert.deepEqual(gaps(written[key]!), gaps(text), `${code} ${key}`);
    }
    // The format's name stays as it is written on the file.
    for (const key of ['restore.fileLabel', 'restore.fileHint', 'restore.errLarge', 'restore.errNotJson', 'restore.errNotExport']) {
      assert.match(written[key]!, /JSON/u, `${code} ${key}`);
    }
  }
  // What is put in is after a colon or at the end of its sentence in English,
  // which is what lets every other language keep it uninflected.
  for (const [key, text] of english) {
    for (const gap of text.matchAll(/\{[a-zA-Z]+\}/gu)) {
      assert.match(text.slice(0, gap.index), /: $/u, key);
    }
  }
});

test('the route, the form and the page go through these names and print none of the database’s words', () => {
  const route = read('../app/api/account/restore/route.ts');
  assert.match(route, /restoreRefusal\(/u);
  assert.match(route, /restoreStatusOf\(/u);
  assert.match(route, /\} catch \{/u);
  assert.match(route, /'cache-control': 'no-store'/u);
  assert.doesNotMatch(route, /error\.message|message: error|String\(error\)|outcome\.message|parsed\.message/u);
  // The name of the file is not echoed: nothing the route says has a gap for it.
  assert.doesNotMatch(route, /searchParams\.get\('name'\)/u);

  const lib = read('./restore.ts');
  assert.match(lib, /restoreCodeOf\(error\)/u);
  assert.match(lib, /restoreReasonOf\(item\.reason\)/u);
  assert.doesNotMatch(lib, /error\.message|notRestored:/u);

  const form = read('../app/account/restore/restore-form.tsx');
  assert.match(form, /^'use client';/u);
  assert.match(form, /export function RestoreForm\(\{ words \}: \{ words: RestoreWords \}\)/u);
  assert.match(form, /restoreOutcomeOf\(/u);
  assert.match(form, /readRestoreReport\(/u);
  assert.match(form, /role="alert"/u);
  assert.match(form, /role="status"/u);
  assert.match(form, /\} catch \{/u);
  // It has no words of its own and asks the catalogue for none.
  assert.doesNotMatch(form, /@\/lib\/i18n'|useT\(|'restore\./u);
  // A reply to the button that writes which says it did not write is not believed.
  assert.match(form, /answer\.applied === apply/u);
  // The button that writes is offered only when the check found something to write.
  assert.match(form, /!report\.applied && summary\.kind === 'check'/u);
  // Nothing known after a write is said as that, not as a failure.
  assert.match(form, /setError\(apply \? words\.unconfirmed : words\.errors\.failed\)/u);

  const page = read('../app/account/restore/page.tsx');
  assert.match(page, /languageShownFor\(locale, 'restore'\)/u);
  assert.match(page, /<RestoreForm words=\{words\} \/>/u);
  // Opening the page that explains a restore must not start one.
  assert.doesNotMatch(page, /\.rpc\(/u);
});
