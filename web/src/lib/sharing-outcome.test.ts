import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  SHARE_SENTENCE,
  shareAnswerOf,
  shareCodeOf,
  shareDoneOf,
  shareOutcomeOf,
  shareRefusal,
  shareStatusOf,
  type ShareCode,
} from './sharing-outcome.ts';
import { INVITE_EXPIRY_OPTIONS, SHARE_SCOPES } from './sharing.ts';
import { en } from './i18n/messages/en.ts';
import { SHARE } from './i18n/messages/share.ts';

const CODES = Object.keys(SHARE_SENTENCE) as ShareCode[];

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const SHARES_SQL = read('../../../supabase/migrations/20261222000100_adult_learning_shares.sql');
const INVITES_SQL = read('../../../supabase/migrations/20261239000100_share_invitations.sql');

/** One function's text, from its `create` to the end of its body. */
function functionOf(sql: string, name: string): string {
  const from = sql.indexOf(`create or replace function public.${name}(`);
  assert.ok(from >= 0, `${name} is not in the migration`);
  const to = sql.indexOf('\n$$;', from);
  assert.ok(to > from, `${name} has no end`);
  return sql.slice(from, to);
}

const INVITE_SQL = functionOf(INVITES_SQL, 'invite_learning_share');
const ACCEPT_SQL = functionOf(INVITES_SQL, 'accept_learning_share');
const REVOKE_SQL = functionOf(SHARES_SQL, 'revoke_adult_learning_share');

/** A database sentence as it is once `''` is one quote and its gaps are filled. */
const said = (sentence: string, with_: string) => sentence.replaceAll("''", "'").replace(/%s|%/gu, with_);

/** Every sentence a piece of SQL raises, with the state it is raised under. */
function raisesOf(sql: string): { message: string; state: string }[] {
  const out: { message: string; state: string }[] = [];
  const pattern = /raise exception '((?:[^']|'')*)'[\s\S]*?using errcode = '([a-z_]+)'/gu;
  for (const match of sql.matchAll(pattern)) out.push({ message: match[1]!, state: match[2]! });
  return out;
}

const SQLSTATE: Record<string, string> = {
  insufficient_privilege: '42501',
  no_data_found: 'P0002',
  invalid_parameter_value: '22023',
  check_violation: '23514',
  object_not_in_prerequisite_state: '55000',
  unique_violation: '23505',
};

// ---------------------------------------------------------------------------
// The route's answers
// ---------------------------------------------------------------------------

test('every refusal has one status, and only "failed" is not a refusal', () => {
  assert.deepEqual(CODES, [
    'signed_out',
    'off',
    'malformed',
    'email',
    'own_address',
    'no_profile',
    'link',
    'no_invitation',
    'used',
    'withdrawn',
    'expired',
    'other_address',
    'have_it',
    'no_share',
    'not_yours',
    'refused',
    'failed',
  ]);
  for (const code of CODES) {
    const status = shareStatusOf(code);
    if (code === 'failed') assert.equal(status, 502);
    else assert.ok(status >= 400 && status <= 499, `${code} is answered with ${status}`);
    assert.deepEqual(shareRefusal(code), { ok: false, code, message: SHARE_SENTENCE[code] });
  }
  assert.equal(shareStatusOf('signed_out'), 401);
  for (const code of ['other_address', 'not_yours'] as const) assert.equal(shareStatusOf(code), 403);
  for (const code of ['no_invitation', 'no_share'] as const) assert.equal(shareStatusOf(code), 404);
  for (const code of ['off', 'no_profile', 'used', 'withdrawn', 'expired', 'have_it', 'refused'] as const) {
    assert.equal(shareStatusOf(code), 409);
  }
  for (const code of ['malformed', 'email', 'own_address', 'link'] as const) assert.equal(shareStatusOf(code), 400);
});

test('the screen believes a refusal only when the route named it and answered with a four hundred', () => {
  for (const code of CODES.filter((c) => c !== 'failed')) {
    assert.equal(shareOutcomeOf(shareStatusOf(code), { code }), code);
  }
  assert.equal(shareOutcomeOf(502, { code: 'refused' }), 'failed');
  assert.equal(shareOutcomeOf(500, undefined), 'failed');
  assert.equal(shareOutcomeOf(200, { code: 'refused' }), 'failed');
  assert.equal(shareOutcomeOf(409, { code: 'made_up' }), 'failed');
  assert.equal(shareOutcomeOf(409, null), 'failed');
  assert.equal(shareOutcomeOf(409, 'expired'), 'failed');
  // A name every object has is not a reason.
  assert.equal(shareOutcomeOf(409, { code: 'toString' }), 'failed');
});

test('no sentence the route sends repeats one the database raises', () => {
  const raised = [...raisesOf(SHARES_SQL), ...raisesOf(INVITES_SQL)].map((r) => said(r.message, '').toLowerCase());
  assert.ok(raised.length >= 25);
  for (const code of CODES) {
    const sentence = SHARE_SENTENCE[code].toLowerCase();
    for (const words of raised) {
      assert.ok(!sentence.includes(words.slice(0, 20)), `${code} repeats "${words}"`);
    }
  }
});

// ---------------------------------------------------------------------------
// The database's words, read out of the migrations
// ---------------------------------------------------------------------------

test('every sentence the three functions raise is a named refusal, never "failed"', () => {
  const expected: Record<string, ShareCode> = {
    // invite_learning_share()
    'sign in first': 'signed_out',
    "sharing an adult''s learning is not enabled on this platform": 'off',
    'that is not an email address': 'email',
    'a share covers progress, achievements, or both': 'malformed',
    'an invitation lasts between 1 and 90 days': 'malformed',
    'there is no adult learner profile to share from': 'no_profile',
    'that is your own address': 'own_address',
    // accept_learning_share()
    'sign in to accept an invitation': 'signed_out',
    'that invitation link is not complete': 'link',
    'that invitation does not exist': 'no_invitation',
    'that invitation has already been accepted': 'used',
    'that invitation was withdrawn': 'withdrawn',
    'that invitation has expired': 'expired',
    'that invitation was sent to a different address': 'other_address',
    'you already have that share': 'have_it',
    // revoke_adult_learning_share()
    'no share %': 'no_share',
    'only the person who granted this share, or governance staff, may revoke it': 'not_yours',
  };
  const raised = [...raisesOf(INVITE_SQL), ...raisesOf(ACCEPT_SQL), ...raisesOf(REVOKE_SQL)];
  // Everything the three raise is in the table above, and the reverse.
  assert.deepEqual([...new Set(raised.map((r) => r.message))].sort(), Object.keys(expected).sort());
  for (const { message, state } of raised) {
    const code = SQLSTATE[state];
    assert.ok(code, `no SQLSTATE is known for ${state}`);
    assert.equal(
      shareCodeOf({ code, message: said(message, '6f0d5c1e-0000-4000-8000-000000000001') }),
      expected[message],
      message,
    );
  }
  // Every function the route calls is one of the three read above.
  assert.equal(raisesOf(INVITE_SQL).length, 7);
  assert.equal(raisesOf(ACCEPT_SQL).length, 9);
  assert.equal(raisesOf(REVOKE_SQL).length, 3);
});

test('an error nobody recognises is a refusal only under a state the functions use', () => {
  assert.equal(shareCodeOf({ code: '42501', message: 'permission denied for function accept_learning_share' }), 'refused');
  assert.equal(shareCodeOf({ code: 'P0002', message: 'no row' }), 'refused');
  assert.equal(shareCodeOf({ code: '22023', message: 'another parameter' }), 'refused');
  assert.equal(shareCodeOf({ code: '23514', message: 'violates check constraint' }), 'refused');
  assert.equal(shareCodeOf({ code: '55000', message: 'another state' }), 'refused');
  assert.equal(shareCodeOf({ code: '23505', message: 'duplicate key value violates unique constraint' }), 'refused');
  // A deadlock, a timeout, a dropped connection: nothing is known.
  assert.equal(shareCodeOf({ code: '40P01', message: 'deadlock detected' }), 'failed');
  assert.equal(shareCodeOf({ code: '57014', message: 'canceling statement due to statement timeout' }), 'failed');
  assert.equal(shareCodeOf({ code: null, message: null }), 'failed');
  assert.equal(shareCodeOf({}), 'failed');
  // The words alone, under another state, are not believed.
  assert.equal(shareCodeOf({ code: 'XX000', message: 'that invitation has expired' }), 'failed');
  assert.equal(shareCodeOf({ code: '42501', message: 'that invitation has expired' }), 'refused');
});

test('inviting answers every address the same way, and the database never says who was found', () => {
  // One reply, built in one place, with nothing in it about the address.
  assert.equal(INVITE_SQL.split('return jsonb_build_object(').length - 1, 1);
  assert.ok(INVITE_SQL.includes("return jsonb_build_object('invitationId', v_id, 'expiresAt', v_expires);"));
  for (const { message } of raisesOf(INVITE_SQL)) {
    assert.ok(!/no account|not registered|no such user|not active/iu.test(message), message);
  }
  // The lookup that did say so can no longer be called by a signed-in person.
  assert.match(INVITES_SQL, /revoke execute on function public\.resolve_share_grantee\(text\) from authenticated;/u);
  assert.ok(!/resolve_share_grantee\(text\) to authenticated/u.test(INVITES_SQL));
});

// ---------------------------------------------------------------------------
// What a reply says happened
// ---------------------------------------------------------------------------

test('inviting: an invitation made, and until when; its id is never passed on', () => {
  assert.deepEqual(shareAnswerOf('invite', { invitationId: 'a', expiresAt: '2026-12-01T10:00:00Z' }), {
    ok: true,
    did: 'invited',
    expiresAt: '2026-12-01T10:00:00Z',
  });
  // A date nobody can read is left out; the invitation was still made.
  assert.deepEqual(shareAnswerOf('invite', { invitationId: 'a', expiresAt: 'soon' }), { ok: true, did: 'invited' });
  assert.deepEqual(shareAnswerOf('invite', { invitationId: 'a' }), { ok: true, did: 'invited' });
  assert.deepEqual(shareAnswerOf('invite', { invitationId: '' }), { ok: false, code: 'failed' });
  assert.deepEqual(shareAnswerOf('invite', { expiresAt: '2026-12-01T10:00:00Z' }), { ok: false, code: 'failed' });
  for (const empty of [null, undefined, [], 'ok', 7]) {
    assert.deepEqual(shareAnswerOf('invite', empty), { ok: false, code: 'failed' });
  }
  const answer = shareAnswerOf('invite', { invitationId: 'a', expiresAt: '2026-12-01T10:00:00Z', found: true });
  assert.deepEqual(Object.keys(answer).sort(), ['did', 'expiresAt', 'ok']);
});

test('accepting: a share made, or nothing is known', () => {
  assert.deepEqual(shareAnswerOf('accept', { shareId: 'b', scope: 'progress' }), { ok: true, did: 'accepted' });
  assert.deepEqual(shareAnswerOf('accept', { scope: 'progress' }), { ok: false, code: 'failed' });
  assert.deepEqual(shareAnswerOf('accept', { shareId: '' }), { ok: false, code: 'failed' });
  assert.deepEqual(shareAnswerOf('accept', null), { ok: false, code: 'failed' });
});

test('ending: a share already ended is ended, which is what was asked for', () => {
  assert.deepEqual(shareAnswerOf('revoke', { shareId: 'c', status: 'revoked', changed: true }), { ok: true, did: 'ended' });
  assert.deepEqual(
    shareAnswerOf('revoke', { shareId: 'c', status: 'revoked', changed: false, note: 'this share was already revoked' }),
    { ok: true, did: 'ended' },
  );
  assert.deepEqual(shareAnswerOf('revoke', { shareId: 'c', status: 'active' }), { ok: false, code: 'failed' });
  assert.deepEqual(shareAnswerOf('revoke', {}), { ok: false, code: 'failed' });
});

test('the replies read above are the ones the functions build', () => {
  assert.ok(ACCEPT_SQL.includes("return jsonb_build_object('shareId', v_share, 'scope', v_inv.scope);"));
  assert.match(REVOKE_SQL, /'shareId', v_row\.id, 'status', 'revoked', 'changed', false,/u);
  assert.match(REVOKE_SQL, /'shareId', v_row\.id, 'status', 'revoked', 'changed', true,/u);
});

test('the screen reads a success for what it names, and nothing else out of it', () => {
  assert.deepEqual(shareDoneOf({ ok: true, did: 'invited', expiresAt: '2026-12-01T10:00:00Z', invitationId: 'a' }), {
    ok: true,
    did: 'invited',
    expiresAt: '2026-12-01T10:00:00Z',
  });
  assert.deepEqual(shareDoneOf({ ok: true, did: 'invited', expiresAt: 'soon' }), { ok: true, did: 'invited' });
  // A date beside anything but an invitation is not read.
  assert.deepEqual(shareDoneOf({ ok: true, did: 'accepted', expiresAt: '2026-12-01T10:00:00Z' }), { ok: true, did: 'accepted' });
  assert.deepEqual(shareDoneOf({ ok: true, did: 'ended', message: 'x' }), { ok: true, did: 'ended' });
  assert.equal(shareDoneOf({ ok: true, did: 'granted' }), null);
  assert.equal(shareDoneOf({ ok: 'true', did: 'ended' }), null);
  assert.equal(shareDoneOf({ did: 'ended' }), null);
  assert.equal(shareDoneOf(null), null);
  assert.equal(shareDoneOf('ok'), null);
});

// ---------------------------------------------------------------------------
// The words
// ---------------------------------------------------------------------------

test('every sentence is written in English and in every language that has the screens', () => {
  const keys = Object.keys(en).filter((key) => key.startsWith('share.'));
  assert.equal(keys.length, 68);

  const codes = Object.keys(SHARE);
  assert.equal(codes.length, 27);
  for (const code of codes) {
    const words = SHARE[code as keyof typeof SHARE] as Record<string, string>;
    assert.deepEqual(Object.keys(words), keys, code);
    for (const key of keys) {
      const english = (en as Record<string, string>)[key]!;
      assert.deepEqual(
        [...words[key]!.matchAll(/\{[a-zA-Z]+\}/gu)].map((m) => m[0]).sort(),
        [...english.matchAll(/\{[a-zA-Z]+\}/gu)].map((m) => m[0]).sort(),
        `${code} ${key}`,
      );
    }
  }
});

test('the sentence said after inviting does not say an account was found, or was not', () => {
  for (const key of ['share.invited', 'share.invitedUntil', 'share.sameAnswer'] as const) {
    assert.ok(!/\b(found|exists?|registered|no account|has an account and)\b/iu.test(en[key].replace('whether an address has an account here', '')), key);
  }
  assert.match(en['share.sameAnswer'], /Every address is answered the same way/u);
});

// ---------------------------------------------------------------------------
// The route and the screens
// ---------------------------------------------------------------------------

test('the route forwards nothing the database wrote, has a catch, and answers no-store', () => {
  const route = read('../app/api/account/sharing/route.ts');
  assert.ok(!/error\.message/u.test(route), 'the route passes on an error message');
  assert.ok(!/\bdata\.message\b/u.test(route));
  assert.ok(!/mapSharingError|inviteToShare|acceptShareInvitation|revokeLearningShare/u.test(route));
  assert.match(route, /\} catch \{\n\s+\/\/ Nothing is known about what happened/u);
  assert.match(route, /'cache-control': 'no-store'/u);
  for (const rpc of ['invite_learning_share', 'accept_learning_share', 'revoke_adult_learning_share']) {
    assert.ok(route.includes(`.rpc('${rpc}'`), rpc);
  }
  // And no fourth: nothing here asks whether an address has an account.
  assert.equal(route.split('.rpc(').length - 1, 3);
  for (const action of ['invite', 'accept', 'revoke'] as const) {
    assert.ok(route.includes(`shareAnswerOf('${action}', data)`), action);
  }
  // Nobody sends an actor.
  assert.ok(!/p_actor|p_user_id|user\.id/u.test(route));
});

test('the switch stops inviting and accepting, and never ending', () => {
  const route = read('../app/api/account/sharing/route.ts');
  const revoke = route.slice(route.indexOf("if (action === 'revoke')"), route.indexOf("return refuse('malformed');\n  } catch"));
  assert.ok(revoke.length > 200);
  assert.ok(!revoke.includes('switchedOn'), 'ending a share asks for the switch');
  assert.equal(route.split("if (!(await switchedOn())) return refuse('off');").length - 1, 2);
  // The database agrees: the function that ends a share does not read the switch.
  assert.ok(!REVOKE_SQL.includes('family.adult_shares'));
  assert.ok(INVITE_SQL.includes("setting_bool('family.adult_shares', false)"));
  assert.ok(ACCEPT_SQL.includes("setting_bool('family.adult_shares', false)"));

  const page = read('../app/account/sharing/page.tsx');
  assert.match(page, /\{!enabled && <div className="notice warn">\{t\('share\.off'\)\}<\/div>\}/u);
  const panel = read('../app/account/sharing/sharing-panel.tsx');
  assert.match(panel, /\{enabled && \(\s*<section className="section-sm">\s*<h2>\{words\.inviteHeading\}<\/h2>/u);
  // The list and its button are drawn whatever the switch says.
  assert.match(panel, /\{shares && \(\s*<section className="section-sm">\s*<h2>\{words\.whoHeading\}<\/h2>/u);
  assert.match(panel, /\{share\.status === 'active' && \(/u);
});

test('the panel and the button have no English of their own and never call an unknown answer a refusal', () => {
  for (const path of ['../app/account/sharing/sharing-panel.tsx', '../app/share/invite/[token]/accept-form.tsx']) {
    const source = read(path);
    assert.match(source, /^'use client';/u, path);
    assert.ok(!source.includes("from '@/lib/i18n'"), `${path} imports the server catalogue`);
    assert.ok(!/'share\.[a-zA-Z]+'/u.test(source), `${path} holds a key of a server-only part`);
    assert.match(source, /shareOutcomeOf\(/u, path);
    assert.match(source, /shareDoneOf\(/u, path);
    assert.match(source, /role="alert"/u, path);
    assert.ok(!/\.message\b/u.test(source), `${path} prints a message from the reply`);
    assert.ok(!/SHARE_SCOPE_LABEL|SHARE_STATUS_LABEL|option\.label/u.test(source), `${path} prints an English label`);
    // A request that never arrived is unknown, not "nothing was sent".
    assert.match(source, /\} catch \{\n\s+(?:setBusy\(false\);\n\s+)?setError\(words\.unconfirmed\);/u, path);
    assert.match(source, /if \(code === 'failed'\) return words\.unconfirmed;/u, path);
  }
  const panel = read('../app/account/sharing/sharing-panel.tsx');
  assert.match(panel, /role="status"/u);
  // Every scope and every length the form offers has words handed to it.
  assert.match(panel, /words\.scopes\[value\]/u);
  assert.match(panel, /words\.lengths\[option\.days\]/u);
  const page = read('../app/account/sharing/page.tsx');
  for (const scope of SHARE_SCOPES) assert.ok(page.includes(`  ${scope}: 'share.scope`), scope);
  for (const { days } of INVITE_EXPIRY_OPTIONS) assert.ok(page.includes(`  ${days}: 'share.len`), String(days));
});

test('the pages draw in the language the screens are written in, and print no database sentence', () => {
  for (const path of ['../app/account/sharing/page.tsx', '../app/share/invite/[token]/page.tsx']) {
    const page = read(path);
    assert.match(page, /languageShownFor\(locale, 'share'\)/u, path);
    assert.match(page, /<div className="container section" \{\.\.\.frame\}>/u, path);
    assert.ok(!/\.message\b/u.test(page), `${path} prints a message`);
    assert.ok(!/toLocaleDateString|toLocaleString/u.test(page), `${path} writes a date with no language and no zone`);
    assert.ok(!page.includes('<code>'), `${path} shows a switch by its name`);
  }
  const page = read('../app/account/sharing/page.tsx');
  // A state is said from the catalogue, never printed as the database wrote it.
  assert.ok(!/\{row\.status\}|\{share\.status\}/u.test(page));
  assert.match(page, /formatDateTime\(shown\.code, iso, 'UTC'\)/u);
  // Names and titles are whatever somebody typed.
  assert.match(page, /<bdi>\{overview\.learnerName\}<\/bdi>/u);
  assert.equal(page.split('<bdi>{row.courseTitle}</bdi>').length - 1, 2);
});

test('an invitation is accepted by a button, never by opening the link', () => {
  const page = read('../app/share/invite/[token]/page.tsx');
  assert.ok(!/\.rpc\(/u.test(page), 'the page calls the database to accept');
  assert.match(page, /<AcceptInvitationForm token=\{checked\.value\} words=\{words\} \/>/u);
  assert.match(page, /robots: \{ index: false, follow: false \}/u);
  const form = read('../app/share/invite/[token]/accept-form.tsx');
  assert.match(form, /<button type="button" className="btn" disabled=\{busy\} onClick=\{accept\}>/u);
  assert.match(form, /method: 'POST'/u);
  // Only a reply that says "accepted" moves the reader on.
  assert.match(form, /if \(finished\?\.did !== 'accepted'\) \{/u);
});
