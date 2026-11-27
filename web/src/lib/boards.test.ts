import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  BOARD_ENGLISH,
  BOARD_OUTCOMES,
  boardOf,
  boardOutcomeOf,
  boardReasonOf,
  boardStatusOf,
  bodyFaultOf,
  handleFaultOf,
  mayEnter,
  parseAuthor,
  parseReportQueue,
  parseStanding,
  parseThread,
  parseThreadPage,
  reasonFaultOf,
  threadFaultOf,
} from './boards.ts';

const ID = '3f0c2b0e-8a54-4a55-9d0e-1c2b3a4d5e6f';
const ID2 = '4f0c2b0e-8a54-4a55-9d0e-1c2b3a4d5e6f';
const AT = '2026-11-24T10:00:00.000Z';
const root = join(import.meta.dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

test('there are two boards and nothing else is one', () => {
  assert.equal(boardOf('students'), 'students');
  assert.equal(boardOf('teachers'), 'teachers');
  for (const other of ['staff', 'Students', '', null, undefined, 3, 'students ']) assert.equal(boardOf(other), null);
});

test('a username is held to the shape the table holds it to', () => {
  for (const fine of ['quiet_owl', 'abc', 'x'.repeat(24), 'طالبة_علم', '夜读者1', 'Reader_2026']) {
    assert.equal(handleFaultOf(fine), null, fine);
  }
  for (const bad of ['ab', 'x'.repeat(25), 'two words', 'a@b.c', 'dash-name', '<b>bold', 'zero\u200bwidth', 'tab\tname', 'a/b/c', "o'neil", 'semi;colon', '']) {
    assert.equal(handleFaultOf(bad), 'handle_shape', JSON.stringify(bad));
  }
  for (const reserved of ['Admin', 'the_moderator', 'AyahSpring_help', 'staff1', 'official_news', 'Support_desk', 'system']) {
    assert.equal(handleFaultOf(reserved), 'handle_reserved', reserved);
  }
  // The migration and this file carry the same marks, so the form refuses what the table would.
  const migration = readFileSync(join(root, '..', '..', 'supabase/migrations/20261281153000_discussion_boards.sql'), 'utf8');
  assert.ok(migration.includes(String.raw`'[\s\u00A0\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF\u3000]'`));
  assert.ok(migration.includes(String.raw`'[]\[!"#$%&''()*+,./:;<=>?@\\^` + '`' + String.raw`{|}~-]'`));
  assert.ok(migration.includes("'(admin|moderator|staff|support|official|ayahspring|system)'"));
});

test('a title, a post and a reason are held to their lengths', () => {
  assert.equal(threadFaultOf('abc', 'body'), 'title_length');
  assert.equal(threadFaultOf('x'.repeat(141), 'body'), 'title_length');
  assert.equal(threadFaultOf('  abc   ', 'body'), 'title_length');
  assert.equal(threadFaultOf('A title', '   '), 'body_length');
  assert.equal(threadFaultOf('A title', 'x'.repeat(6001)), 'body_length');
  assert.equal(threadFaultOf('A title', 'x'.repeat(6000)), null);
  assert.equal(bodyFaultOf('x'), null);
  assert.equal(reasonFaultOf('no'), 'reason_length');
  assert.equal(reasonFaultOf('x'.repeat(1001)), 'reason_length');
  assert.equal(reasonFaultOf('It is unkind.'), null);
});

test('every refusal has a status and an English sentence, and a name is believed only with its own status', () => {
  for (const name of BOARD_OUTCOMES) {
    const status = boardStatusOf(name);
    assert.ok(status >= 400 && status < 600, name);
    assert.ok(BOARD_ENGLISH[name].length > 8, name);
    assert.equal(boardOutcomeOf(status, name), name);
    assert.equal(boardOutcomeOf(status === 400 ? 409 : 400, name), 'unconfirmed', name);
  }
  assert.equal(boardOutcomeOf(403, 'made_up'), 'unconfirmed');
  assert.equal(boardOutcomeOf(403, null), 'unconfirmed');
  assert.equal(boardOutcomeOf(200, 'closed'), 'unconfirmed');
});

test('what the database raised is named, and its own words are never the name', () => {
  assert.equal(boardReasonOf({ code: '42501', message: 'board:not_allowed' }), 'not_allowed');
  assert.equal(boardReasonOf({ code: '0A000', message: 'board:closed' }), 'closed');
  assert.equal(boardReasonOf({ code: '23505', message: 'board:handle_taken' }), 'handle_taken');
  assert.equal(boardReasonOf({ code: '54000', message: 'board:too_many' }), 'too_many');
  assert.equal(boardReasonOf({ code: '23514', message: 'new row violates check constraint "board_handles_shape"' }), 'refused');
  assert.equal(boardReasonOf({ code: '42501', message: 'permission denied for table board_handles' }), 'refused');
  // The database cannot name the two outcomes that are this side's own.
  assert.equal(boardReasonOf({ code: 'P0001', message: 'board:unconfirmed' }), 'refused');
  assert.equal(boardReasonOf({ code: 'P0001', message: 'board:refused' }), 'refused');
  assert.equal(boardReasonOf({ code: 'P0001', message: 'board:nonsense' }), 'refused');
  // No SQLSTATE, or a dropped connection: it may have been done.
  assert.equal(boardReasonOf({ code: null, message: 'fetch failed' }), 'unconfirmed');
  assert.equal(boardReasonOf({ message: 'board:closed' }), 'unconfirmed');
  assert.equal(boardReasonOf({ code: '08006', message: 'connection failure' }), 'unconfirmed');
  // Every name the migration raises has a sentence here.
  const migration = readFileSync(join(root, '..', '..', 'supabase/migrations/20261281153000_discussion_boards.sql'), 'utf8');
  const raised = new Set([...migration.matchAll(/raise exception 'board:([a-z_]+)'/gu)].map((m) => m[1]));
  assert.ok(raised.size >= 14, `${raised.size} names raised`);
  for (const name of raised) assert.ok((BOARD_OUTCOMES as readonly string[]).includes(name!), `board:${name} has no name here`);
  // And the one the boards raise since they ask for agreement first.
  const later = readFileSync(join(root, '..', '..', 'supabase/migrations/20261281157000_board_agreement_first.sql'), 'utf8');
  const asked = new Set([...later.matchAll(/raise exception 'board:([a-z_]+)'/gu)].map((m) => m[1]));
  assert.ok(asked.has('agree_first'));
  for (const name of asked) assert.ok((BOARD_OUTCOMES as readonly string[]).includes(name!), `board:${name} has no name here`);
  assert.equal(boardReasonOf({ code: '42501', message: 'board:agree_first' }), 'agree_first');
  assert.equal(boardStatusOf('agree_first'), 403);
});

test('what is still to be agreed to is read whole, or the standing is not read at all', () => {
  const base = { board: 'students', open: true, kind: 'student', until: AT, handle: null, handleFixed: false, blocked: false, moderator: false };
  const owed = [
    { slug: 'terms', title: 'Terms of use', versionNumber: 1 },
    { slug: 'privacy', title: 'Privacy notice', versionNumber: 2 },
  ];
  assert.deepEqual(parseStanding({ ...base, agreements: owed })!.agreements, [
    { slug: 'terms', title: 'Terms of use', version: 1 },
    { slug: 'privacy', title: 'Privacy notice', version: 2 },
  ]);
  assert.deepEqual(parseStanding({ ...base, agreements: [] })!.agreements, []);
  // A database from before the boards asked says nothing, and refuses nothing.
  assert.deepEqual(parseStanding(base)!.agreements, []);
  // A list that cannot be read is not taken for an empty one: the box would
  // vanish and the database would still refuse the post.
  for (const bad of [
    null, 'none', {}, [null], [{ slug: 'terms', title: 'Terms of use' }],
    [{ slug: 'terms', title: 'Terms of use', versionNumber: '1' }],
    [{ slug: 'terms', title: 'Terms of use', versionNumber: 0 }],
    [{ slug: 'terms', title: 'Terms of use', versionNumber: 1.5 }],
    [{ slug: '../admin', title: 'Terms of use', versionNumber: 1 }],
    [{ slug: 'Terms', title: 'Terms of use', versionNumber: 1 }],
    [{ slug: 'terms', title: '', versionNumber: 1 }],
    [owed[0], { slug: 'privacy' }],
  ]) {
    assert.equal(parseStanding({ ...base, agreements: bad }), null, JSON.stringify(bad));
  }
});

test('where somebody stands is read, and an unreadable reply is not a standing', () => {
  const standing = parseStanding({ board: 'students', open: true, kind: 'student', until: AT, handle: 'quiet_owl', handleFixed: true, blocked: false, moderator: false });
  assert.deepEqual(standing, { board: 'students', open: true, kind: 'student', until: AT, handle: 'quiet_owl', handleFixed: true, blocked: false, moderator: false, agreements: [] });
  assert.equal(mayEnter(standing!), true);
  const out = parseStanding({ board: 'students', open: true, kind: null, until: null, handle: 'old_name' })!;
  assert.equal(out.kind, null);
  assert.equal(out.handle, 'old_name');
  assert.equal(mayEnter(out), false);
  // Closed: a student and a teacher do not go in; staff do, to clear it.
  assert.equal(mayEnter(parseStanding({ board: 'teachers', open: false, kind: 'teacher' })!), false);
  assert.equal(mayEnter(parseStanding({ board: 'teachers', open: false, kind: 'staff' })!), true);
  for (const bad of [null, {}, { board: 'staff', open: true, kind: null }, { board: 'students', kind: null }, { board: 'students', open: true, kind: 'owner' }, { board: 'students', open: 'yes', kind: null }]) {
    assert.equal(parseStanding(bad), null, JSON.stringify(bad));
  }
});

test('a page of threads is read whole or not at all', () => {
  const row = { id: ID, title: 'A question', handle: 'quiet_owl', kind: 'student', createdAt: AT, lastActivityAt: AT, replies: 2, mine: false };
  assert.deepEqual(parseThreadPage({ threads: [row], more: true }), { threads: [row], more: true });
  assert.deepEqual(parseThreadPage({ threads: [], more: false }), { threads: [], more: false });
  for (const broken of [{ ...row, id: 'x' }, { ...row, kind: 'owner' }, { ...row, title: '' }, { ...row, handle: null }, { ...row, createdAt: 'yesterday' }]) {
    assert.equal(parseThreadPage({ threads: [row, broken], more: false }), null);
  }
  assert.equal(parseThreadPage({ threads: [row] }), null);
  assert.equal(parseThreadPage(null), null);
  // Only what the page draws is kept: an account in the reply would not reach it.
  const kept = parseThreadPage({ threads: [{ ...row, userId: ID2, name: 'A Person' }], more: false })!;
  assert.deepEqual(Object.keys(kept.threads[0]!).sort(), ['createdAt', 'handle', 'id', 'kind', 'lastActivityAt', 'mine', 'replies', 'title']);
});

test('a thread is read with its replies; one that is gone says nothing', () => {
  const thread = { id: ID, board: 'students', state: 'visible', title: 'A question', body: 'Words', handle: 'quiet_owl', kind: 'student', createdAt: AT, mine: true };
  const shown = { id: ID2, state: 'visible', handle: 'ustadh_h', kind: 'teacher', body: 'An answer', createdAt: AT, mine: false };
  const gone = { id: ID2, state: 'removed', createdAt: AT, mine: false };
  const read = parseThread({ thread, replies: [shown, gone] })!;
  assert.equal(read.replies.length, 2);
  assert.deepEqual(read.replies[1], { id: ID2, state: 'removed', createdAt: AT, mine: false, handle: null, kind: null, body: null });
  assert.equal(read.replies[0]!.body, 'An answer');
  // A reply said to be shown with no words or no name is not drawn as an empty box.
  assert.equal(parseThread({ thread, replies: [{ ...shown, body: null }] }), null);
  assert.equal(parseThread({ thread, replies: [{ ...shown, handle: undefined }] }), null);
  assert.equal(parseThread({ thread: { ...thread, board: 'staff' }, replies: [] }), null);
  assert.equal(parseThread({ thread: { ...thread, state: 'pending' }, replies: [] }), null);
  assert.equal(parseThread({ thread }), null);
});

test('the report queue and the account behind a post are read for the staff desk', () => {
  const one = { threadId: ID, replyId: null, board: 'students', title: 'T', body: 'B', handleId: ID2, handle: 'rude', kind: 'student', blocked: false, postedAt: AT, reports: 2, firstReportedAt: AT, reasons: ['unkind', 'rude'] };
  const queue = parseReportQueue({ students: true, teachers: false, reports: [one] })!;
  assert.equal(queue.reports[0]!.reasons.length, 2);
  assert.equal(parseReportQueue({ students: true, teachers: false, reports: [{ ...one, replyId: 'x' }] }), null);
  assert.equal(parseReportQueue({ students: true, reports: [] }), null);
  assert.deepEqual(parseAuthor({ handle: 'rude', userId: ID, name: 'A Person' }), { handle: 'rude', userId: ID, name: 'A Person' });
  assert.deepEqual(parseAuthor({ handle: 'gone', userId: null, name: null }), { handle: 'gone', userId: null, name: null });
  assert.equal(parseAuthor({ userId: ID }), null);
});

test('only the staff desk reads the account behind a post', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx)$/u.test(name) && !name.endsWith('.test.ts')) files.push(path);
    }
  };
  walk(join(root, 'app'));
  const callers = files.filter((path) => /\bboard_author\b|\bparseAuthor\b/u.test(readFileSync(path, 'utf8'))).map((path) => path.slice(root.length + 1)).sort();
  assert.deepEqual(callers, ['app/api/boards/route.ts']);
  // …and the route calls it only for the action the staff desk sends, with a reason.
  const route = read('app/api/boards/route.ts');
  assert.equal(route.match(/board_author/gu)?.length, 1);
  assert.match(route, /action === 'author'/u);
  // The members' pages never ask for a name, an address or an account.
  for (const page of ['app/discuss/page.tsx', 'app/discuss/[board]/page.tsx', 'app/discuss/[board]/[threadId]/page.tsx', 'app/discuss/board-forms.tsx']) {
    const source = read(page);
    assert.doesNotMatch(source, /display_name|user_profiles|\.email|userId/u, page);
  }
});

test('a board that is switched on can be reached from where its people work', async () => {
  const { readFileSync } = await import('node:fs');
  const read = (path: string) => readFileSync(new URL(`../app/${path}`, import.meta.url), 'utf8');
  // The only way in was a card far down `/account`. A student works on
  // `/learn` and a teacher on `/teach`.
  const learn = read('learn/page.tsx');
  assert.match(learn, /isFlagEnabled\(supabase, 'community\.student_board'\)\.catch\(\(\) => false\)/u);
  assert.match(learn, /isFlagEnabled\(supabase, 'community\.teacher_board'\)\.catch\(\(\) => false\)/u);
  // Shown while either board is on; who is let in is the discussion page's to say.
  assert.match(learn, /\{\(studentBoardOn \|\| teacherBoardOn\) && <Link href="\/discuss">\{t\('board\.title'\)\}<\/Link>\}/u);
  const teach = read('teach/page.tsx');
  assert.match(teach, /isFlagEnabled\(supabase, 'community\.teacher_board'\)\.catch\(\(\) => false\)/u);
  assert.match(teach, /\{teacherBoardOn && \([\s\S]*?<Link href="\/discuss\/teachers">/u);
  // Each page has that one link and no other: nothing leads to a board that is off.
  for (const page of [learn, teach]) assert.equal(page.split('href="/discuss').length - 1, 1);
});

test('what a closed account wrote is read whole or not at all', async () => {
  const { ERASED, parseKept, threadIdOf } = await import('./boards.ts');
  const id = '3d9a7c10-5e2b-4a8f-9c1d-0b7e6f5a4020';
  const kept = { title: 'A title', body: 'The words.', writtenAt: '2026-11-20T09:14:00+00:00', keptAt: '2026-11-26T10:00:00+00:00' };
  assert.deepEqual(parseKept(kept), kept);
  // A reply has no title.
  assert.deepEqual(parseKept({ ...kept, title: null }), { ...kept, title: null });
  for (const broken of [null, [], {}, { ...kept, body: '' }, { ...kept, body: 7 }, { ...kept, writtenAt: 'soon' }, { ...kept, keptAt: null }, { ...kept, title: 7 }]) {
    assert.equal(parseKept(broken), null, JSON.stringify(broken));
  }
  assert.equal(ERASED, '[erased]');

  // The thread is named by its id or by the address of its page, as copied.
  assert.equal(threadIdOf(id), id);
  assert.equal(threadIdOf(`  ${id.toUpperCase()} `), id);
  assert.equal(threadIdOf(`https://example.org/discuss/students/${id}`), id);
  assert.equal(threadIdOf(`/discuss/teachers/${id}?x=1#top`), id);
  for (const not of ['', 'a thread', `/discuss/others/${id}`, `/learn/${id}`, `${id}${id}`]) {
    assert.equal(threadIdOf(not), null, not);
  }
});

test('reading what was kept has a route, a form and a way to it, each saying it is recorded', async () => {
  const { readFileSync } = await import('node:fs');
  const read = (path: string) => readFileSync(new URL(`../app/${path}`, import.meta.url), 'utf8');
  // `board_kept_post()` existed since 2026-11-26 and no page called it.
  const route = read('api/boards/route.ts');
  assert.match(route, /if \(action === 'kept'\) \{[\s\S]*?LOOK_REASON_MIN[\s\S]*?ask\('board_kept_post', \{\s*p_thread: post\.threadId,\s*p_reply: post\.replyId,\s*p_reason: reason,\s*\}\)[\s\S]*?parseKept\(data\)[\s\S]*?'cache-control': 'no-store'/u);
  const form = read('admin/boards/kept-words.tsx');
  assert.match(form, /action: 'kept'/u);
  assert.match(form, /audit log/u);
  // The words are held in the page's memory and nowhere else.
  assert.doesNotMatch(form, /localStorage|sessionStorage|router\.refresh/u);
  const page = read('admin/boards/page.tsx');
  assert.match(page, /<KeptWords /u);
  // A moderator reading a thread is shown the way from a post that says `[erased]`.
  const thread = read('discuss/[board]/[threadId]/page.tsx');
  assert.match(thread, /standing\.moderator && thread\.body === ERASED/u);
  assert.match(thread, /standing\.moderator && reply\.body === ERASED/u);
  assert.match(thread, /\/admin\/boards\?thread=\$\{thread\.id\}&reply=\$\{reply\.id\}#kept/u);
});
