import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { LOCALES } from './i18n/index.ts';
import { CATALOGUES } from './i18n/messages/catalogues.ts';
import { en } from './i18n/messages/en.ts';
import { HELD_FOR_REVIEW } from './i18n/messages/held.ts';
import { REVIEW_ASSIGNMENT } from './i18n/messages/review-assignment.ts';
import { SEVERITY, rehearsalBadgeOf } from './lesson-preview.ts';
import { DECISION_LABEL, versionStatusAfter } from './review.ts';
import {
  ASSIGNMENT_REFUSALS,
  ASSIGNMENT_REFUSAL_KEY,
  BADGE_KEY,
  DECISION_BUTTON_KEY,
  assignmentIsOpen,
  assignmentRefusalOf,
  assignmentSeatOf,
  assignmentStatusOf,
  isAssignmentId,
  isAssignmentRefusal,
} from './review-assignment.ts';
import { DECISION_MADE_KEY } from './review-register.ts';

// One assignment (`/review/[assignmentId]`), put into the reader's language
// on 2026-11-28, with the faults found on the way.

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const LANGUAGES = LOCALES.map((l) => l.code).filter((code) => code !== 'en' && !Object.hasOwn(HELD_FOR_REVIEW, code));
const blanks = (text: string) => [...text.matchAll(/\{([a-zA-Z]+)\}/gu)].map((m) => m[1]).sort().join(',');
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');

const PAGE = read('../app/review/[assignmentId]/page.tsx');
const ACTIONS = read('../app/review/[assignmentId]/review-actions.tsx');
const CONFLICT = read('../app/review/[assignmentId]/conflict-form.tsx');
const ROUTE = read('../app/api/review/route.ts');
const HELPERS = read('./review-assignment.ts');
const LIBRARY = read('./review.ts');
const KEYS = (Object.keys(en) as (keyof typeof en)[]).filter((key) => key.startsWith('ra.'));
const ID = '11111111-1111-4111-8111-111111111111';

test('ra. is written in every language the dashboard is', () => {
  assert.equal(KEYS.length, 53);
  assert.deepEqual(Object.keys(REVIEW_ASSIGNMENT).sort(), [...LANGUAGES].sort());
  for (const code of LANGUAGES) {
    const own = REVIEW_ASSIGNMENT[code];
    assert.ok(own, code);
    assert.deepEqual(Object.keys(own).sort(), [...KEYS].sort(), code);
    for (const key of KEYS) {
      const value: string = own[key]!;
      assert.ok(value.trim() !== '' && value === value.trim(), `${code} ${key}`);
      assert.equal(blanks(value), blanks(en[key]), `${code} ${key} changed its gaps`);
      assert.equal(CATALOGUES[code]?.[key], value, `${code} ${key} is served`);
      assert.notEqual(value, en[key], `${code} ${key} is the English sentence`);
      assert.ok(!value.includes("'"), `${code} ${key} has a typewriter apostrophe`);
    }
    if (code.startsWith('zh')) assert.ok(!Object.values(own).join('').includes('您'), code);
    if (code === 'th') assert.ok(!Object.values(own).some((value) => value.endsWith('.')), 'Thai does not close a sentence with a full stop');
    if (code === 'fr') assert.ok(!/[^\u00a0][:;?]/u.test(Object.values(own).join('\n')), 'French has a no-break space before a colon, a semicolon and a question mark');
    if (code === 'uz') assert.ok(!/['\u2018\u2019]/u.test(Object.values(own).join('')), 'Uzbek uses U+02BB and U+02BC');
    // The lesson's title and the file's name sit inside the sentence, so the sentence splits in two around them.
    for (const key of ['ra.nextEmpty', 'ra.nextSilent', 'ra.nextNoted'] as const) assert.equal(own[key]!.split('{lesson}').length, 2, `${code} ${key}`);
    assert.equal(own['ra.noCopy']!.split('{name}').length, 2, code);
  }
});

test('one thing has one name, and things that differ are told apart', () => {
  const told = (all: Record<string, string | undefined>, keys: Record<string, keyof typeof en>, code: string) => {
    const values = Object.values(keys).map((key) => all[key]);
    assert.equal(new Set(values).size, new Set(Object.values(keys)).size, `${code}: ${Object.values(keys).join(' ')}`);
  };
  for (const code of LANGUAGES) {
    const all = CATALOGUES[code]! as Record<string, string | undefined>;
    told(all, ASSIGNMENT_REFUSAL_KEY, code);
    told(all, BADGE_KEY, code);
    told(all, DECISION_BUTTON_KEY, code);
    // The button that makes a decision is not the decision once made.
    for (const decision of Object.keys(DECISION_BUTTON_KEY) as (keyof typeof DECISION_BUTTON_KEY)[]) {
      assert.notEqual(all[DECISION_BUTTON_KEY[decision]], all[DECISION_MADE_KEY[decision]], `${code} ${decision}`);
    }
    // The badge on a lesson and the lead of the notice above the outline say the same of a lesson worth a look.
    assert.ok(all['ra.nextNoted']!.startsWith(all['ra.bNoted']!), `${code}: "worth a look" is one phrase`);
    // "It was not recorded", "nobody can say", "it was recorded and the course stayed" are three sentences.
    assert.equal(new Set([all['ra.eRefused'], all['review.eUnsure'], all['ra.notMoved']]).size, 3, code);
    // A review that is closed and a review that is not yours are told apart.
    assert.notEqual(all['ra.closedNote'], all['ra.eNotYours'], code);
    // Turning an offer down is not rejecting a course; approving is not accepting the work; and neither
    // is the board's vote ("for", "against"), which is what these buttons said until they had words of their own.
    assert.notEqual(all['ra.decline'], all['ra.reject'], code);
    assert.notEqual(all['ra.approve'], all['ra.accept'], code);
    assert.notEqual(all['ra.decline'], all['review.stDeclined'], code);
    // (Afrikaans has one verb for both.)
    if (code !== 'af') assert.notEqual(all['ra.approve'], all['panel.approve'], code);
  }
  assert.deepEqual(Object.keys(ASSIGNMENT_REFUSAL_KEY), [...ASSIGNMENT_REFUSALS]);
  assert.deepEqual(Object.keys(DECISION_BUTTON_KEY).sort(), Object.keys(DECISION_LABEL).sort());
  // The English of each button is what the staff screens' table says.
  for (const [decision, key] of Object.entries(DECISION_BUTTON_KEY)) assert.equal(en[key], DECISION_LABEL[decision as keyof typeof DECISION_LABEL], key);
});

test('a refusal is told by its name, and no answer is not a refusal', () => {
  const of = (message: string, state: string | null = 'P0001', code?: string) => assignmentRefusalOf({ message, state, code });
  // No state, or a connection that failed: nobody can say whether the decision was written.
  assert.equal(of('<html>502 Bad Gateway</html>', null), 'unsure');
  assert.equal(of('anything', ''), 'unsure');
  assert.equal(of('connection failure', '08006'), 'unsure');
  assert.equal(assignmentRefusalOf(null), 'unsure');
  // The sentences of migration 371.
  assert.equal(of('a decision is recorded on a review that was accepted and is still open; this one is cancelled', '23514'), 'notOpen');
  assert.equal(of('a decision is recorded on a review that was accepted and is still open; this one is completed', '23514'), 'notOpen');
  assert.equal(of('a review that is declined is not made accepted by its reviewer', '42501'), 'notOpen');
  assert.equal(of('a review is completed by recording a decision on it', '23514'), 'notOpen');
  assert.equal(of('reviewer 1 has an unresolved conflict declaration against course version 2; no decision is recorded until it is heard', '42501'), 'conflict');
  assert.equal(of('decisions must be recorded by the assigned reviewer, not by 3', '42501'), 'notYours');
  assert.equal(of('new row violates row-level security policy for table "content_review_decisions"', '42501'), 'notYours');
  assert.equal(of('permission denied for table content_review_assignments', '42501'), 'notYours');
  // The library puts its own sentence in place of a policy's, and marks it.
  assert.equal(of('That assignment is not yours.', '42501', 'forbidden'), 'notYours');
  assert.equal(of('Only the reviewer named on this assignment can decide it.', '42501', 'forbidden'), 'notYours');
  assert.equal(of('decision 4 does not match the version and scope of its assignment', '23514'), 'refused');
  assert.equal(of('something nobody has seen yet'), 'refused');
  // The sentences are the migration's own: if it is reworded, this fails with it.
  const migration = read('../../../supabase/migrations/20261281164000_review_decided_in_own_name.sql');
  for (const sentence of ['is still open; this one is %', 'is not made % by its reviewer', 'a review is completed by recording a decision on it', 'unresolved conflict declaration', 'decisions must be recorded by the assigned reviewer']) {
    assert.ok(migration.includes(sentence), sentence);
  }

  assert.deepEqual(ASSIGNMENT_REFUSALS.map(assignmentStatusOf), [401, 403, 409, 409, 422, 422, 502]);
  assert.ok(isAssignmentRefusal('notOpen'));
  for (const not of ['rejected', 'forbidden', '', null, undefined, 3]) assert.equal(isAssignmentRefusal(not), false, String(not));

  assert.ok(isAssignmentId(ID));
  // The looser test let these through to the database, which refused them as malformed.
  for (const not of ['------------------------------------', '111111111111111111111111111111111111', `${ID} `, ID.slice(1), '', null, 7]) {
    assert.equal(isAssignmentId(not), false, String(not));
  }
});

test('the form is offered only on a review that can take a decision', () => {
  const seat = (status: Parameters<typeof assignmentSeatOf>[0]['status'], decisions = 0) => assignmentSeatOf({ status, decisions: Array.from({ length: decisions }) });
  assert.equal(seat('offered'), 'offer');
  assert.equal(seat('accepted'), 'decide');
  assert.equal(seat('in_progress'), 'decide');
  // Until 2026-11-28 each of these three was shown the decision form.
  assert.equal(seat('declined'), 'closed');
  assert.equal(seat('cancelled'), 'closed');
  assert.equal(seat('completed'), 'closed');
  // A decision already made is shown whatever state the assignment was left in.
  for (const status of ['accepted', 'completed', 'cancelled'] as const) assert.equal(seat(status, 1), 'decided');
  assert.deepEqual((['offered', 'accepted', 'in_progress', 'declined', 'completed', 'cancelled'] as const).map(assignmentIsOpen), [true, true, true, false, false, false]);

  const actions = strip(ACTIONS);
  assert.match(actions, /\{seat === 'offer' && \(/u);
  assert.match(actions, /\{seat === 'decide' && \(/u);
  assert.match(actions, /\{seat === 'decided' && \(/u);
  assert.match(actions, /\{seat === 'closed' && \(\s*<div className="notice" data-assign-closed>\{words\.closedNote\}<\/div>/u);
  const page = strip(PAGE);
  assert.match(page, /const seat = assignmentSeatOf\(assignment\);/u);
  assert.match(page, /\{assignmentIsOpen\(assignment\.status\) && \(\s*<div className="assignment-stand">\s*<ConflictForm /u);

  assert.equal(versionStatusAfter('approved'), 'approved');
  assert.equal(versionStatusAfter('revision_requested'), 'rejected');
  assert.equal(versionStatusAfter('rejected'), 'rejected');
});

test('a lesson has one of four badges, the same on the author’s page and the reviewer’s', () => {
  const lesson = (rows: number, severity: number) => ({ preview: { rows: Array.from({ length: rows }) }, severity }) as unknown as Parameters<typeof rehearsalBadgeOf>[0];
  assert.equal(rehearsalBadgeOf(lesson(0, SEVERITY.empty)), 'empty');
  assert.equal(rehearsalBadgeOf(lesson(2, SEVERITY.silent)), 'silent');
  assert.equal(rehearsalBadgeOf(lesson(2, SEVERITY.noted)), 'noted');
  assert.equal(rehearsalBadgeOf(lesson(2, SEVERITY.clean)), 'ready');
  const author = read('../app/teach/[courseId]/preview/page.tsx');
  assert.match(author, /const badge = rehearsalBadgeOf\(lesson\);/u);
  assert.match(strip(PAGE), /\{t\(BADGE_KEY\[rehearsalBadgeOf\(told\)\]\)\}/u);
  // The English of each key is the author's word.
  const words = /const BADGE_WORD = \{ empty: '([^']+)', silent: '([^']+)', noted: '([^']+)', ready: '([^']+)' \} as const;/u.exec(author);
  assert.ok(words);
  assert.deepEqual(words.slice(1), [en['ra.bEmpty'], en['ra.bSilent'], en['ra.bNoted'], en['ra.bReady']]);
});

test('the page and its two forms say nothing that is not in the catalogue', () => {
  for (const [name, source] of [['page', PAGE], ['actions', ACTIONS], ['conflict form', CONFLICT]] as const) {
    const bare = strip(source);
    assert.doesNotMatch(bare, />\s*[A-Z][a-z]+ [a-z]+[^<{]*</u, `a sentence is written in the ${name}`);
    assert.doesNotMatch(bare, /(?:placeholder|aria-label|title)="[A-Z]/u, name);
    assert.doesNotMatch(bare, /_LABEL\b|toLocaleDateString|toLocaleString|\.toLowerCase\(\)|style=\{\{/u, name);
  }
  const used = `${PAGE}\n${HELPERS}`;
  for (const key of KEYS) assert.ok(used.includes(`'${key}'`), `${key} is not used`);
  const page = strip(PAGE);
  assert.match(page, /languageShownFor\(locale, 'ra'\)/u);
  assert.match(page, /shown\.code !== locale \? \{ lang: shown\.code, dir: shown\.dir \} : \{\}/u);
  // Every count is in the reader's digits.
  const fills = [...page.matchAll(/, \{ ([a-z]+: [^}]+) \}\)/gu)].flatMap((m) => m[1]!.split(', '));
  assert.equal(fills.length, 6);
  for (const fill of fills) assert.match(fill, /^[a-z]+: n\(/u, fill);
  assert.match(page, /\{n\(s\.position\)\}\. \{s\.title\}/u);
  assert.match(page, /\{n\(l\.position\)\}\. \{l\.title\}/u);
  // What somebody else wrote sets its own direction.
  assert.match(page, /assignment\.courseSlug === ''\s*\? <h1>\{t\('review\.untitled'\)\}<\/h1>\s*: <h1 dir="auto">\{assignment\.courseTitle\}<\/h1>/u);
  assert.match(page, /\{nextBefore\}<em><bdi>\{next\.lessonTitle\}<\/bdi><\/em>\{nextAfter\}/u);
  assert.match(page, /\{copyBefore\}<bdi>\{r\.resourceName\}<\/bdi>\{copyAfter\}/u);
  assert.match(page, /<p className="assignment-transcript" dir="auto">/u);
  // The two shared panels are still English, and are marked as English.
  assert.match(page, /\{shown\.code !== 'en' && <p className="muted assignment-small">\{t\('ra\.english'\)\}<\/p>\}/u);
  assert.match(page, /<div lang="en" dir="ltr" data-assign-english>\s*<RequirementPanel/u);
  // The player runs in the browser and is handed its sentences, as the lesson page hands them.
  assert.match(page, /const playerWords = renditionsByAsset\.size > 0 && shown\.code !== 'en' \? playerMessagesFor\(shown\.code\) : \{\};/u);
  assert.match(page, /<I18nProvider locale=\{shown\.code\} messages=\{playerWords\}>\s*<span className="assignment-media">/u);
  // The day of a decision is written by the server, in the reader's calendar; the browser prints it.
  assert.match(page, /days: Object\.fromEntries\(assignment\.decisions\.map\(\(d\) => \[d\.id, formatDay\(shown\.code, d\.decidedAt\) \|\| ''\]\)\)/u);

  for (const [name, source] of [['actions', ACTIONS], ['conflict form', CONFLICT]] as const) {
    assert.match(source, /^'use client';/u, name);
    const bare = strip(source);
    assert.doesNotMatch(bare, /@\/lib\/i18n|useT\(/u, name);
    assert.doesNotMatch(bare, /json\??\.message|\.message\b/u, `${name} prints what the server said`);
    // A request that never came back does not leave the buttons disabled, and is not called a refusal.
    assert.match(bare, /\} finally \{\s*setBusy\((?:null|false)\);/u, name);
    assert.match(bare, /\(await res\.json\(\)\.catch\(\(\) => null\)\) as \{ ok\?: unknown; code\?: unknown;/u, name);
    assert.match(bare, /if \(json\?\.ok === true\) \{/u, name);
  }
  const actions = strip(ACTIONS);
  assert.match(actions, /setError\(isAssignmentRefusal\(json\?\.code\) \? json\.code : 'unsure'\);/u);
  assert.match(actions, /\} catch \{\s*setError\('unsure'\);/u);
  assert.match(actions, /if \(json\.moved === 'no'\) setNotMoved\(true\);/u);
  // One button at a time: a second decision is not sent while the first is on its way.
  assert.equal(actions.match(/disabled=\{busy !== null/gu)?.length, 3);
  const conflict = strip(CONFLICT);
  assert.match(conflict, /const checked = checkConflict\(\{ conflictType, description, courseVersionId \}\);/u);
  assert.match(conflict, /: \{ code: 'unsure' \}\);/u);
  assert.match(conflict, /\} catch \{\s*refuse\(\{ code: 'unsure' \}\);/u);
});

test('a read that failed is said to have failed', () => {
  const page = strip(PAGE);
  // Text that is not an id is no assignment; a read that failed is not "not found".
  assert.match(page, /if \(!isAssignmentId\(assignmentId\)\) notFound\(\);/u);
  assert.match(page, /const found = await attempt\('the assignment', \(\) => fetchAssignment\(supabase, assignmentId\)\);\s*if \(!found\) \{/u);
  assert.match(page, /role="alert" data-assign-state="unread">\{t\('ra\.unread'\)\}/u);
  assert.match(page, /if \(!found\.value\) notFound\(\);/u);
  assert.match(LIBRARY, /\.eq\('id', assignmentId\)\s*\.maybeSingle\(\);\s*if \(error\) throw new Error\(error\.message\);\s*if \(!data\) return null;/u);
  // Nothing is swallowed into an empty answer.
  assert.doesNotMatch(page, /\.catch\(/u);
  for (const what of ['needs', 'switch', 'transcripts', 'media']) assert.ok(page.includes(`unread.push('${what}')`), what);
  assert.match(page, /role="alert" data-assign-unread=\{unread\.join\(' '\)\}>\{t\('ra\.partUnread'\)\}/u);
  // An outline that was not read is not "no sections", and its counts are not zero.
  assert.match(page, /\{!loaded \? \(\s*<div className="notice error" role="alert" data-assign-outline="unread">\{t\('ra\.outlineUnread'\)\}<\/div>\s*\) : sections\.length === 0 \? \(/u);
  assert.match(page, /<div className="n">\{loaded \? n\(sections\.length\) : '—'\}<\/div>/u);
  // What a learner gets is not worked out on a guess about the previews switch.
  assert.match(page, /const rehearsal = loaded && previews \? loaded\.rehearsal : null;/u);
  // Delivery copies that could not be read are not each called "not encoded yet".
  assert.match(page, /\{resources\.length > 0 && renditions && \(/u);
  assert.match(page, /\) : watchable \? \(\s*<span className="muted assignment-small" key=\{r\.id\} data-assign-copy="none">/u);
});

test('the route names every refusal, and a recorded decision is not answered as a failure', () => {
  const route = strip(ROUTE);
  assert.doesNotMatch(route, /code: 'rejected'|code: 'forbidden'/u);
  assert.match(route, /if \(!user\) return fail\('signedOut', /u);
  assert.match(route, /if \(!isAssignmentId\(b\.assignmentId\)\) return fail\('refused', [^)]*, 400\);/u);
  assert.match(route, /return fail\('reason', /u);
  // An assignment that could not be read is not "not yours".
  assert.match(route, /try \{\s*assignment = await fetchAssignment\(supabase, b\.assignmentId\);\s*\} catch \(error\) \{[\s\S]*?return fail\('refused', [^)]*, 502\);\s*\}\s*if \(!assignment\) return fail\('notYours', /u);
  assert.equal(route.match(/return refused\((?:outcome|recorded)\);/gu)?.length, 2);
  assert.match(route, /if \(outcome\.state === undefined\) return fail\('refused', outcome\.message\);/u);
  assert.match(route, /code === 'unsure' \? 'The answer could not be read\.' : outcome\.message/u);
  // The decision was recorded: `ok` says so, and `moved` says what became of the version.
  assert.match(route, /if \(moved\.ok\) return NextResponse\.json\(\{ ok: true, value: recorded\.value, moved: 'yes' \}/u);
  assert.match(route, /=== versionStatusAfter\(decision\);/u);
  assert.match(route, /return NextResponse\.json\(\{ ok: true, value: recorded\.value, moved: already \? 'already' : 'no' \}, \{ status: 200 \}\);/u);
  assert.doesNotMatch(route, /status: 409/u);
  // The library sends the database's state with each refusal, and reads the version's state from the row the function returns.
  assert.equal(LIBRARY.match(/state: stateOf\(error\)|const state = stateOf\(error\);/gu)?.length, 3);
  assert.match(LIBRARY, /const moved = \(data as \{ version_status\?: unknown \} \| null\)\?\.version_status;/u);
});
