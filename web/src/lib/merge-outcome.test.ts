import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  MERGE_BLOCKS,
  MERGE_NOTES,
  MERGE_SENTENCE,
  MERGE_TITLE_LIMIT,
  mergeAnswerOf,
  mergeBlockOf,
  mergeBlocksOf,
  mergeCodeOf,
  mergeDoneOf,
  mergeNoteOf,
  mergeOutcomeOf,
  mergeQuoted,
  mergeRefusal,
  mergeStatusOf,
  type MergeCode,
} from './merge-outcome.ts';
import { MERGE_MOVES } from './merge.ts';
import { en } from './i18n/messages/en.ts';
import { MERGE } from './i18n/messages/merge.ts';

const CODES = Object.keys(MERGE_SENTENCE) as MergeCode[];

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const MERGE_SQL = read('../../../supabase/migrations/20261281000800_account_merge.sql');
const OWNER_SQL = read('../../../supabase/migrations/20261281058000_named_owner_account_boundary.sql');

/** A database sentence as it is once `''` is one quote and its gaps are filled. */
const said = (sentence: string, with_: string) => sentence.replaceAll("''", "'").replace(/%s|%/gu, with_);

/** Every sentence a migration raises, with the state it is raised under. */
function raisesOf(sql: string): { message: string; state: string }[] {
  const out: { message: string; state: string }[] = [];
  const pattern = /raise exception '((?:[^']|'')*)'[\s\S]*?using errcode = '([a-z_]+)'/gu;
  for (const match of sql.matchAll(pattern)) out.push({ message: match[1]!, state: match[2]! });
  return out;
}

const SQLSTATE: Record<string, string> = {
  insufficient_privilege: '42501',
  feature_not_supported: '0A000',
  no_data_found: 'P0002',
  invalid_parameter_value: '22023',
  check_violation: '23514',
};

/** Every sentence `merge_blocks()` adds to one of its two lists. */
function listed(sql: string, list: 'v_blocks' | 'v_notes'): string[] {
  const out: string[] = [];
  const pattern = new RegExp(`${list} := array_append\\(${list}, (?:format\\(\\s*)?'((?:[^']|'')*)'`, 'gu');
  for (const match of sql.matchAll(pattern)) out.push(match[1]!);
  return out;
}

// ---------------------------------------------------------------------------
// The route's answers
// ---------------------------------------------------------------------------

test('every refusal has one status, and only "failed" is not a refusal', () => {
  assert.deepEqual(CODES, [
    'signed_out',
    'off',
    'malformed',
    'email',
    'no_account',
    'same_account',
    'pending',
    'no_request',
    'not_yours',
    'name',
    'blocked',
    'expired',
    'answered',
    'refused',
    'failed',
  ]);
  for (const code of CODES) {
    const status = mergeStatusOf(code);
    if (code === 'failed') assert.equal(status, 502);
    else assert.ok(status >= 400 && status <= 499, `${code} is answered with ${status}`);
    assert.deepEqual(mergeRefusal(code), { ok: false, code, message: MERGE_SENTENCE[code] });
  }
  assert.equal(mergeStatusOf('signed_out'), 401);
  assert.equal(mergeStatusOf('not_yours'), 403);
  assert.equal(mergeStatusOf('no_account'), 404);
  assert.equal(mergeStatusOf('no_request'), 404);
  for (const code of ['off', 'pending', 'blocked', 'expired', 'answered', 'refused'] as const) {
    assert.equal(mergeStatusOf(code), 409);
  }
  for (const code of ['malformed', 'email', 'same_account', 'name'] as const) {
    assert.equal(mergeStatusOf(code), 400);
  }
});

test('the screen believes a refusal only when the route named it and answered with a four hundred', () => {
  for (const code of CODES.filter((c) => c !== 'failed')) {
    assert.equal(mergeOutcomeOf(mergeStatusOf(code), { code }), code);
  }
  assert.equal(mergeOutcomeOf(502, { code: 'refused' }), 'failed');
  assert.equal(mergeOutcomeOf(500, undefined), 'failed');
  assert.equal(mergeOutcomeOf(200, { code: 'refused' }), 'failed');
  assert.equal(mergeOutcomeOf(409, { code: 'made_up' }), 'failed');
  assert.equal(mergeOutcomeOf(409, null), 'failed');
  assert.equal(mergeOutcomeOf(409, 'blocked'), 'failed');
  // A name every object has is not a reason.
  assert.equal(mergeOutcomeOf(409, { code: 'toString' }), 'failed');
});

test('no sentence the route sends repeats one the database raises', () => {
  const raised = [...raisesOf(MERGE_SQL), ...raisesOf(OWNER_SQL)].map((r) => said(r.message, '').toLowerCase());
  assert.ok(raised.length >= 12);
  for (const code of CODES) {
    const sentence = MERGE_SENTENCE[code].toLowerCase();
    for (const words of raised) {
      assert.ok(!sentence.includes(words.slice(0, 24)), `${code} repeats "${words}"`);
    }
    // Nor an address: the one the database gives is not one that is answered.
    assert.ok(!sentence.includes('@'), code);
  }
});

// ---------------------------------------------------------------------------
// The database's words, read out of the migrations
// ---------------------------------------------------------------------------

test('every sentence the merge functions raise is a named refusal, never "failed"', () => {
  const expected: Record<string, MergeCode> = {
    'sign in to merge an account': 'signed_out',
    'sign in to see merge requests': 'signed_out',
    'sign in to cancel a merge': 'signed_out',
    'sign in to answer a merge request': 'signed_out',
    'merging accounts is not enabled on this platform yet': 'off',
    'type the email address of the account you want to keep': 'email',
    'there is no account with that email address': 'no_account',
    'that is this account; sign in to the other one to merge it': 'same_account',
    'there is no such merge request': 'no_request',
    'only the account asking to be merged can withdraw the request': 'not_yours',
    'only the account that would survive can decide': 'not_yours',
    'type your name exactly as it appears to confirm the merge': 'name',
    'this merge cannot run: %': 'blocked',
  };
  const raised = raisesOf(MERGE_SQL);
  // Everything the migration raises is in the table above, and the reverse.
  assert.deepEqual([...new Set(raised.map((r) => r.message))].sort(), Object.keys(expected).sort());
  for (const { message, state } of raised) {
    const code = SQLSTATE[state];
    assert.ok(code, `no SQLSTATE is known for ${state}`);
    assert.equal(mergeCodeOf({ code, message: said(message, 'that is the same account') }), expected[message], message);
  }
});

test('the owner appointment the later migration raises is said as blocked', () => {
  // The same migration guards closing an account with a sentence of its own.
  const raised = raisesOf(OWNER_SQL).filter((r) => /owner appointment.*before merging it/u.test(r.message));
  assert.equal(raised.length, 1);
  assert.equal(raised[0]!.state, 'check_violation');
  assert.equal(mergeCodeOf({ code: '23514', message: raised[0]!.message }), 'blocked');
});

test('an error nobody recognises is a refusal only under a state the functions use', () => {
  assert.equal(mergeCodeOf({ code: '42501', message: 'permission denied for function decide_account_merge' }), 'refused');
  assert.equal(mergeCodeOf({ code: '0A000', message: 'something else is not supported' }), 'refused');
  assert.equal(mergeCodeOf({ code: 'P0002', message: 'no row' }), 'refused');
  assert.equal(mergeCodeOf({ code: '22023', message: 'another parameter' }), 'refused');
  assert.equal(mergeCodeOf({ code: '23514', message: 'violates check constraint' }), 'refused');
  // A deadlock, a timeout, a dropped connection: nothing is known.
  assert.equal(mergeCodeOf({ code: '40P01', message: 'deadlock detected' }), 'failed');
  assert.equal(mergeCodeOf({ code: '57014', message: 'canceling statement due to statement timeout' }), 'failed');
  assert.equal(mergeCodeOf({ code: null, message: null }), 'failed');
  assert.equal(mergeCodeOf({}), 'failed');
  // The words alone, under another state, are not believed.
  assert.equal(mergeCodeOf({ code: 'XX000', message: 'there is no such merge request' }), 'failed');
});

test('every sentence merge_blocks() lists has a name, and none is "other"', () => {
  const blocks = listed(MERGE_SQL, 'v_blocks');
  assert.equal(blocks.length, 8);
  const names = blocks.map((sentence) => mergeBlockOf(said(sentence, '3')).why);
  assert.deepEqual(names, [
    'same',
    'absorbed_closed',
    'target_closed',
    'payouts',
    'billing',
    'reviewers',
    'households',
    'same_course',
  ]);

  // The ninth is added by the owner's guard.
  const owner = /jsonb_build_array\(\s*'((?:[^']|'')*)'\)/u.exec(OWNER_SQL);
  assert(owner);
  assert.deepEqual(mergeBlockOf(owner[1]), { why: 'owner' });

  // Every name but the one for a sentence nobody recognises is reachable.
  assert.deepEqual([...names, 'owner', 'other'], [...MERGE_BLOCKS]);
});

test('the two notes merge_blocks() adds have names, and a third is not said', () => {
  const notes = listed(MERGE_SQL, 'v_notes');
  assert.equal(notes.length, 2);
  assert.deepEqual(notes.map(mergeNoteOf), [...MERGE_NOTES]);
  assert.equal(mergeNoteOf('a note written after this file'), null);
  assert.equal(mergeNoteOf(7), null);
});

test('a count and a course name are taken out of a reason, and nothing else', () => {
  assert.deepEqual(mergeBlockOf('this account has 2 payout(s) in flight; wait until they finish'), {
    why: 'payouts',
    count: 2,
  });
  assert.deepEqual(
    mergeBlockOf("this account shares 11 billing account(s) with other people; a merge cannot move somebody else's payment arrangements"),
    { why: 'billing', count: 11 },
  );
  const course = (title: string) =>
    mergeBlockOf(`both accounts have started "${title}"; the platform cannot choose which progress is real. Finish or drop one before merging`);
  assert.deepEqual(course('Tajwid for beginners'), { why: 'same_course', title: 'Tajwid for beginners' });
  // A name with a quote and a semicolon of its own is kept whole.
  assert.deepEqual(course('The "five"; a first course'), { why: 'same_course', title: 'The "five"; a first course' });
  // A name that turns the line around loses the marks that do it.
  assert.deepEqual(course('\u202eeman\u2069 a\u0007b'), { why: 'same_course', title: 'eman ab' });
  assert.equal(course('x'.repeat(400)).title?.length, MERGE_TITLE_LIMIT);
  // A name that is nothing once cleaned is not a name.
  assert.deepEqual(course('\u2068\u2069'), { why: 'other' });
  assert.equal(mergeQuoted('  two  '), 'two');

  assert.deepEqual(mergeBlockOf('a reason written after this file'), { why: 'other' });
  assert.deepEqual(mergeBlockOf(null), { why: 'other' });
  assert.deepEqual(mergeBlockOf('this account has 99999999999999999999 payout(s) in flight'), { why: 'other' });
});

test('a preview that is not fine always stops the merge, and an unknown reason is said once', () => {
  assert.deepEqual(mergeBlocksOf(null), []);
  assert.deepEqual(mergeBlocksOf({ ok: true, blocks: [], notes: [] }), []);
  assert.deepEqual(mergeBlocksOf({ ok: false, blocks: [], notes: [] }), [{ why: 'other' }]);
  assert.deepEqual(
    mergeBlocksOf({
      ok: false,
      blocks: ['one nobody knows', 'that is the same account', 'another nobody knows'],
      notes: [],
    }),
    [{ why: 'other' }, { why: 'same' }],
  );
});

// ---------------------------------------------------------------------------
// What a reply says happened
// ---------------------------------------------------------------------------

test('asking: a request made, a request already waiting, and anything else is unknown', () => {
  assert.deepEqual(mergeAnswerOf('request', false, { requested: true, alreadyPending: false }), { ok: true, did: 'asked' });
  assert.deepEqual(mergeAnswerOf('request', false, { requested: false, alreadyPending: true }), { ok: false, code: 'pending' });
  assert.deepEqual(mergeAnswerOf('request', false, { requested: false }), { ok: false, code: 'failed' });
  assert.deepEqual(mergeAnswerOf('request', false, null), { ok: false, code: 'failed' });
  assert.deepEqual(mergeAnswerOf('request', false, []), { ok: false, code: 'failed' });
  assert.deepEqual(mergeAnswerOf('request', false, 'ok'), { ok: false, code: 'failed' });
});

test('withdrawing: a withdrawal that came too late is not said as withdrawn', () => {
  assert.deepEqual(mergeAnswerOf('cancel', false, { cancelled: true, status: 'cancelled' }), { ok: true, did: 'withdrawn' });
  for (const status of ['completed', 'declined', 'cancelled', 'expired']) {
    assert.deepEqual(mergeAnswerOf('cancel', false, { cancelled: false, status }), { ok: false, code: 'answered' });
  }
  // "Not withdrawn, still waiting" is not something the function says.
  assert.deepEqual(mergeAnswerOf('cancel', false, { cancelled: false, status: 'pending' }), { ok: false, code: 'failed' });
  assert.deepEqual(mergeAnswerOf('cancel', false, { cancelled: false, status: 'approved' }), { ok: false, code: 'failed' });
  assert.deepEqual(mergeAnswerOf('cancel', false, {}), { ok: false, code: 'failed' });
});

test('answering: a reply is believed only when it says what was asked for', () => {
  const merged = mergeAnswerOf('decide', true, {
    merged: true,
    status: 'completed',
    moved: { certificates: 1, enrolments: 2, notifications: 0, leftBehind: 3, somethingNew: 9 },
  });
  assert.deepEqual(merged, {
    ok: true,
    did: 'merged',
    moved: [
      { kind: 'enrolments', count: 2 },
      { kind: 'certificates', count: 1 },
    ],
    stayed: 3,
  });
  // A merge with nothing to count is still a merge.
  assert.deepEqual(mergeAnswerOf('decide', true, { merged: true, status: 'completed' }), { ok: true, did: 'merged', moved: [] });

  // A merge after a decline, or one the row does not agree with: unknown.
  assert.deepEqual(mergeAnswerOf('decide', false, { merged: true, status: 'completed' }), { ok: false, code: 'failed' });
  assert.deepEqual(mergeAnswerOf('decide', true, { merged: true, status: 'pending' }), { ok: false, code: 'failed' });

  assert.deepEqual(mergeAnswerOf('decide', false, { merged: false, status: 'declined' }), { ok: true, did: 'declined' });
  // Agreeing to one that was already declined did not decline it now.
  assert.deepEqual(mergeAnswerOf('decide', true, { merged: false, status: 'declined' }), { ok: false, code: 'answered' });
  for (const accept of [true, false]) {
    assert.deepEqual(mergeAnswerOf('decide', accept, { merged: false, status: 'expired' }), { ok: false, code: 'expired' });
    assert.deepEqual(mergeAnswerOf('decide', accept, { merged: false, status: 'completed' }), { ok: false, code: 'answered' });
    assert.deepEqual(mergeAnswerOf('decide', accept, { merged: false, status: 'cancelled' }), { ok: false, code: 'answered' });
    assert.deepEqual(mergeAnswerOf('decide', accept, { merged: false, status: 'pending' }), { ok: false, code: 'failed' });
    assert.deepEqual(mergeAnswerOf('decide', accept, { merged: false }), { ok: false, code: 'failed' });
    assert.deepEqual(mergeAnswerOf('decide', accept, { status: 'declined' }), { ok: false, code: 'failed' });
    assert.deepEqual(mergeAnswerOf('decide', accept, undefined), { ok: false, code: 'failed' });
  }
});

test('the replies read above are the ones the functions build', () => {
  for (const reply of [
    "jsonb_build_object('requested', false, 'alreadyPending', true,",
    "jsonb_build_object('requested', true, 'alreadyPending', false,",
    "jsonb_build_object('cancelled', false, 'status', v_row.status)",
    "jsonb_build_object('cancelled', true, 'status', 'cancelled')",
    "jsonb_build_object('merged', false, 'status', v_row.status)",
    "jsonb_build_object('merged', false, 'status', 'expired',",
    "jsonb_build_object('merged', false, 'status', 'declined')",
    "jsonb_build_object('merged', true, 'status', 'completed', 'moved', v_moved)",
  ]) {
    assert.ok(MERGE_SQL.includes(reply), reply);
  }
});

test('the screen reads a success for what it names, and nothing else out of it', () => {
  assert.deepEqual(mergeDoneOf({ ok: true, did: 'asked' }), { ok: true, did: 'asked' });
  assert.deepEqual(mergeDoneOf({ ok: true, did: 'withdrawn', moved: [{ kind: 'roles', count: 2 }] }), {
    ok: true,
    did: 'withdrawn',
  });
  assert.deepEqual(
    mergeDoneOf({
      ok: true,
      did: 'merged',
      moved: [
        { kind: 'roles', count: 2 },
        { kind: 'made_up', count: 5 },
        { kind: 'notes', count: 'many' },
        'bookmarks',
      ],
      stayed: 4,
    }),
    { ok: true, did: 'merged', moved: [{ kind: 'roles', count: 2 }], stayed: 4 },
  );
  assert.deepEqual(mergeDoneOf({ ok: true, did: 'merged' }), { ok: true, did: 'merged', moved: [] });
  assert.equal(mergeDoneOf({ ok: true, did: 'approved' }), null);
  assert.equal(mergeDoneOf({ ok: 'true', did: 'asked' }), null);
  assert.equal(mergeDoneOf({ did: 'asked' }), null);
  assert.equal(mergeDoneOf(null), null);
  assert.equal(mergeDoneOf('ok'), null);
});

// ---------------------------------------------------------------------------
// The words
// ---------------------------------------------------------------------------

const KEY_OF_BLOCK: Record<string, string> = {
  same: 'blockSame',
  absorbed_closed: 'blockAbsorbedClosed',
  target_closed: 'blockTargetClosed',
  payouts: 'blockPayouts',
  billing: 'blockBilling',
  reviewers: 'blockReviewers',
  households: 'blockHouseholds',
  same_course: 'blockSameCourse',
  owner: 'blockOwner',
  other: 'blockOther',
};

test('everything with a name has a sentence, in English and in every language that has the screen', () => {
  const keys = Object.keys(en).filter((key) => key.startsWith('merge.'));
  assert.equal(keys.length, 84);
  const needed = [
    ...MERGE_BLOCKS.map((why) => `merge.${KEY_OF_BLOCK[why]}`),
    'merge.noteJoin',
    'merge.noteMoves',
    'merge.unconfirmed',
    'merge.off',
    'merge.stayed',
  ];
  for (const key of needed) assert.ok(keys.includes(key), key);
  // One line for the learner record, and one for each thing counted.
  assert.equal(keys.filter((key) => /^merge\.mv[A-Z]/u.test(key)).length, MERGE_MOVES.length);

  const codes = Object.keys(MERGE);
  assert.equal(codes.length, 27);
  for (const code of codes) {
    const words = MERGE[code as keyof typeof MERGE] as Record<string, string>;
    assert.deepEqual(Object.keys(words), keys, code);
    for (const key of keys) {
      const english = (en as Record<string, string>)[key]!;
      const theirs = words[key]!;
      assert.deepEqual(
        [...theirs.matchAll(/\{[a-zA-Z]+\}/gu)].map((m) => m[0]).sort(),
        [...english.matchAll(/\{[a-zA-Z]+\}/gu)].map((m) => m[0]).sort(),
        `${code} ${key}`,
      );
      // The database's sentence names an address nobody answers; no language repeats it.
      assert.ok(!theirs.includes('@'), `${code} ${key}`);
    }
  }
});

test('no language says an address that is not answered, and English does not either', () => {
  for (const [key, value] of Object.entries(en)) {
    if (key.startsWith('merge.')) assert.ok(!value.includes('@'), key);
  }
});

test('the route forwards nothing the database wrote, has a catch, and answers no-store', () => {
  const route = read('../app/api/account/merge/route.ts');
  assert.ok(!/error\.message/u.test(route), 'the route passes on an error message');
  assert.ok(!/\bdata\.message\b/u.test(route));
  assert.match(route, /\} catch \{\n\s+\/\/ Nothing is known about what happened/u);
  assert.match(route, /'cache-control': 'no-store'/u);
  assert.match(route, /mergeAnswerOf\('decide', body\.accept, data\)/u);
  // An empty box never confirms a merge.
  assert.match(route, /if \(body\.accept && confirm\.trim\(\) === ''\) return refuse\('name'\)/u);
  for (const rpc of ['request_account_merge', 'cancel_account_merge', 'decide_account_merge']) {
    assert.ok(route.includes(`.rpc('${rpc}'`), rpc);
  }
});

test('the panel has no English of its own and never calls an unknown answer a refusal', () => {
  const panel = read('../app/account/merge/merge-panel.tsx');
  assert.match(panel, /^'use client';/u);
  assert.ok(!panel.includes("from '@/lib/i18n'"), 'the panel imports the server catalogue');
  assert.ok(!/'merge\.[a-zA-Z]+'/u.test(panel), 'the panel holds a key of a server-only part');
  assert.match(panel, /mergeOutcomeOf\(/u);
  assert.match(panel, /mergeDoneOf\(/u);
  assert.match(panel, /role="alert"/u);
  assert.match(panel, /role="status"/u);
  assert.ok(!/\.message\b/u.test(panel), 'the panel prints a message from the reply');
});

test('the page draws in the language the screen is written in, and prints no database sentence', () => {
  const page = read('../app/account/merge/page.tsx');
  assert.match(page, /languageShownFor\(locale, 'merge'\)/u);
  assert.match(page, /mergeBlocksOf\(/u);
  // Neither list is drawn as it came: the reasons are only ever handed to
  // `mergeBlocksOf`, and the notes go through `mergeNoteOf` and nowhere else.
  assert.ok(!page.includes('.blocks'), 'the page reads the reasons itself');
  assert.equal(page.split('.notes').length - 1, 1);
  assert.match(page, /\(request\.preview\?\.notes \?\? \[\]\)\s+\.map\(mergeNoteOf\)/u);
  assert.match(page, /\\u2068\$\{reason\.title\}\\u2069/u);
});

test('a name is shown only to the account that has to answer, and never the placeholder of a merged one', () => {
  const page = read('../app/account/merge/page.tsx');
  // Read once, for the incoming list, and not for a request already merged.
  assert.equal(page.split('.otherName').length - 1, 1);
  assert.match(page, /name: state === 'completed' \? null : request\.otherName,/u);
  // The database writes this over the name of the account it closed.
  assert.match(MERGE_SQL, /set display_name = 'Merged account'/u);
});

test('with the switch off the list is still drawn, and nothing can be asked for or agreed to', () => {
  const page = read('../app/account/merge/page.tsx');
  assert.match(page, /\{!board\.enabled && <div className="notice warn">\{t\('merge\.off'\)\}<\/div>\}/u);
  assert.match(page, /\{\(board\.enabled \|\| outgoing\.length > 0\) && \(\s*<MergePanel/u);
  const panel = read('../app/account/merge/merge-panel.tsx');
  assert.match(panel, /\{enabled && incoming\.length > 0 && \(/u);
  assert.match(panel, /\{enabled && \(\s*<section className="section-sm">\s*<h2>\{words\.outHeading\}<\/h2>/u);
  // The one thing the database still allows with the switch off.
  const cancel = MERGE_SQL.slice(MERGE_SQL.indexOf('function public.cancel_account_merge('), MERGE_SQL.indexOf('function public.merge_duplicate_account('));
  assert.ok(cancel.length > 200);
  assert.ok(!cancel.includes('platform.account_merge'), 'withdrawing now asks for the switch');
});

test('no button to agree is drawn for an account with no name, or before the name is typed', () => {
  const panel = read('../app/account/merge/merge-panel.tsx');
  assert.match(panel, /const named = displayName\.trim\(\) !== '';/u);
  assert.match(panel, /\{named && \(\s*<button\s+className="btn"\s+type="button"\s+disabled=\{!idle \|\| !confirmsMerge\(typed, displayName\)\}/u);
  // A request that is neither waiting, merged nor run out is given no form.
  assert.match(panel, /request\.state !== 'pending' \? null :/u);
});
