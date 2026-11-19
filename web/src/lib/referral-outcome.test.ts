import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { messagesFor } from './i18n/index.ts';
import { REFER } from './i18n/messages/refer.ts';
import {
  REFERRAL_RAISES,
  REFERRAL_SENTENCE,
  firstNameOf,
  invitedNameOf,
  percentOf,
  personStateOf,
  referralCodeFromPath,
  referralCodeOf,
  referralRefusal,
  referralStatusOf,
  rewardStateOf,
  type ReferralCode,
} from './referral-outcome.ts';
import type { ReferralReward } from './referrals.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const MIGRATION = read('../../../supabase/migrations/20261281000900_referrals.sql');

/** The body of one function in the migration. */
function body(name: string): string {
  const start = MIGRATION.indexOf(`create or replace function public.${name}(`);
  assert.ok(start >= 0, name);
  const end = MIGRATION.indexOf('\n$$;', start);
  assert.ok(end > start, name);
  return MIGRATION.slice(start, end);
}

/** Every `raise exception '…' using errcode = '…'` in a function, as written. */
function raises(name: string): { message: string; errcode: string }[] {
  return [...body(name).matchAll(/raise exception '([^']+)'[^;]*?using errcode = '([a-z_]+)'/gu)].map((m) => ({
    message: m[1]!,
    errcode: m[2]!,
  }));
}

const SQLSTATE: Record<string, string> = {
  insufficient_privilege: '42501',
  feature_not_supported: '0A000',
  check_violation: '23514',
};

test('each refusal has one status and its own English, and none repeats the database', () => {
  const codes: ReferralCode[] = ['signed_out', 'off', 'failed'];
  assert.deepEqual(Object.keys(REFERRAL_SENTENCE).sort(), [...codes].sort());
  assert.equal(referralStatusOf('signed_out'), 401);
  assert.equal(referralStatusOf('off'), 409);
  assert.equal(referralStatusOf('failed'), 502);
  for (const code of codes) {
    assert.deepEqual(referralRefusal(code), { ok: false, code, message: REFERRAL_SENTENCE[code] });
  }
  const said = [...raises('my_referral_code'), ...raises('my_referrals')].map((r) => r.message);
  assert.ok(said.length >= 4);
  for (const sentence of Object.values(REFERRAL_SENTENCE)) {
    for (const words of said) {
      assert.ok(!sentence.toLowerCase().includes(words.replace(/%.*$/u, '').trim().toLowerCase()), sentence);
    }
  }
});

test('what the database raises is read out of the migration, and each has a name', () => {
  const mint = raises('my_referral_code');
  const board = raises('my_referrals');
  assert.deepEqual(mint.map((r) => r.errcode), ['insufficient_privilege', 'feature_not_supported', 'check_violation']);
  assert.deepEqual(board.map((r) => r.errcode), ['insufficient_privilege']);

  const named = (r: { message: string; errcode: string }) =>
    referralCodeOf({ code: SQLSTATE[r.errcode], message: r.message });

  assert.equal(named(mint[0]!), 'signed_out');
  assert.equal(named(mint[1]!), 'off');
  // A discount set to something that is not a discount is the owner's
  // mistake; the person on the page is told nothing came back, not its words.
  assert.equal(named(mint[2]!), 'failed');
  assert.equal(named(board[0]!), 'signed_out');

  // The words alone, or the state alone, are not enough.
  assert.equal(referralCodeOf({ code: '42501', message: 'permission denied for function my_referrals' }), 'failed');
  assert.equal(referralCodeOf({ code: 'P0001', message: mint[1]!.message }), 'failed');
  assert.equal(referralCodeOf(null), 'failed');
  assert.equal(referralCodeOf({}), 'failed');
  assert.equal(REFERRAL_RAISES.length, 2);
});

test('a code out of an address is a code or nothing, and never throws', () => {
  assert.equal(referralCodeFromPath('aya-7k2m9q'), 'AYA-7K2M9Q');
  assert.equal(referralCodeFromPath(' AYA-7K2M9Q '), 'AYA-7K2M9Q');
  assert.equal(referralCodeFromPath('AYA%2D7K2M9Q'), 'AYA-7K2M9Q');
  for (const bad of ['', 'short', '%E0%A4%A', '%', 'AYA 7K2M9Q', 'AYA/7K2M9Q', '../../etc', 'a'.repeat(25), 'a'.repeat(200), 'ÀYA-7K2M9Q']) {
    assert.equal(referralCodeFromPath(bad), null, bad);
  }
  for (const bad of [null, undefined, 7, {}, ['AYA-7K2M9Q']]) assert.equal(referralCodeFromPath(bad), null);
});

test('a visitor is told a first name and no more', () => {
  assert.equal(firstNameOf('Amina Nakato'), 'Amina');
  assert.equal(firstNameOf('  Amina   Nakato '), 'Amina');
  assert.equal(firstNameOf('عائشة بنت أحمد'), 'عائشة');
  assert.equal(firstNameOf(''), null);
  assert.equal(firstNameOf('   '), null);
  assert.equal(firstNameOf(null), null);
  assert.equal(firstNameOf(42), null);
  assert.equal(firstNameOf('x'.repeat(200))!.length, 60);
  // The database sends the whole name; that is why it is cut here.
  assert.match(body('resolve_referral_code'), /'inviterName', v_name/u);
  assert.match(body('resolve_referral_code'), /select up\.display_name into v_name/u);
});

test('somebody with no name is not shown as the letter the database leaves', () => {
  // `split_part(coalesce(display_name, 'A friend'), ' ', 1)` is "A".
  assert.match(body('my_referrals'), /split_part\(coalesce\(up\.display_name, 'A friend'\), ' ', 1\)/u);
  assert.equal(invitedNameOf({ name: 'A' }), null);
  assert.equal(invitedNameOf({ name: 'A friend' }), null);
  assert.equal(invitedNameOf({ name: '' }), null);
  assert.equal(invitedNameOf({ name: 'Amina' }), 'Amina');
  assert.equal(invitedNameOf({ name: 'Ali' }), 'Ali');
});

const NOW = new Date('2026-11-19T12:00:00Z');
const reward = (over: Partial<ReferralReward>): ReferralReward => ({
  code: 'THANKS-ABC123',
  status: 'rewarded',
  percent: 10,
  startsAt: '2026-11-18T12:00:00Z',
  earnedAt: '2026-11-15T12:00:00Z',
  endsAt: '2027-02-16T12:00:00Z',
  campaignStatus: 'active',
  ...over,
});

test('a reward says which side of its window it is on', () => {
  // Made when the payment arrived; does not work until the refund window has passed.
  assert.match(body('reward_referral'), /v_starts := now\(\) \+ make_interval\(hours => greatest\(v_window, 0\)\)/u);
  assert.deepEqual(rewardStateOf(reward({ startsAt: '2026-11-20T12:00:00Z' }), NOW), {
    status: 'earned',
    window: 'from',
    date: '2026-11-20T12:00:00Z',
    live: false,
  });
  assert.deepEqual(rewardStateOf(reward({}), NOW), {
    status: 'earned',
    window: 'by',
    date: '2027-02-16T12:00:00Z',
    live: true,
  });
  // Past its end: no date to wait for, and not offered.
  assert.deepEqual(rewardStateOf(reward({ endsAt: '2026-11-19T11:59:59Z' }), NOW), {
    status: 'earned',
    window: null,
    date: null,
    live: false,
  });
  // Ends at this very moment: over.
  assert.equal(rewardStateOf(reward({ endsAt: NOW.toISOString() }), NOW).live, false);
  // Withdrawn after a refund: the campaign is archived, and nothing is offered.
  assert.deepEqual(rewardStateOf(reward({ status: 'reversed', campaignStatus: 'archived' }), NOW), {
    status: 'reversed',
    window: null,
    date: null,
    live: false,
  });
  // An archived or missing campaign is never offered, whatever the dates say.
  assert.equal(rewardStateOf(reward({ campaignStatus: 'archived' }), NOW).live, false);
  assert.equal(rewardStateOf(reward({ campaignStatus: null }), NOW).live, false);
  assert.equal(rewardStateOf(reward({ code: null }), NOW).live, false);
  // A state this file does not know is "recorded", and is not offered.
  assert.deepEqual(rewardStateOf(reward({ status: 'something_new' }), NOW), {
    status: 'other',
    window: 'by',
    date: '2027-02-16T12:00:00Z',
    live: false,
  });
  // Dates that are not dates are not printed.
  assert.deepEqual(rewardStateOf(reward({ startsAt: 'soon', endsAt: 'later' }), NOW), {
    status: 'earned',
    window: null,
    date: null,
    live: true,
  });
});

test('what an invited person did has a name for each state the table allows', () => {
  const allowed = /check \(status in \(([^)]+)\)\)/u.exec(MIGRATION)![1]!.split(',').map((s) => s.trim().replace(/'/gu, ''));
  assert.deepEqual(allowed, ['pending', 'rewarded', 'capped', 'reversed']);
  assert.equal(personStateOf({ status: 'pending' }), 'pending');
  assert.equal(personStateOf({ status: 'rewarded' }), 'bought');
  // The yearly limit is the inviter's business, not a fact about the friend.
  assert.equal(personStateOf({ status: 'capped' }), 'bought');
  assert.equal(personStateOf({ status: 'reversed' }), 'refunded');
  assert.equal(personStateOf({ status: 'something_new' }), 'other');
});

test('a percentage is printed only when it is one', () => {
  assert.equal(percentOf(10), 10);
  assert.equal(percentOf('10'), 10);
  assert.equal(percentOf('12.50'), 12.5);
  assert.equal(percentOf(100), 100);
  for (const bad of [0, -5, 101, NaN, Infinity, '', ' ', 'ten', null, undefined, {}]) {
    assert.equal(percentOf(bad), null, String(bad));
  }
});

test('the invitation screens are written for the twenty-seven and keep their gaps', () => {
  const en = messagesFor('en') as Record<string, string>;
  const keys = Object.keys(en).filter((key) => key.startsWith('refer.'));
  assert.equal(keys.length, 51);
  const gaps = (text: string) => [...text.matchAll(/\{[a-zA-Z]+\}/gu)].map((m) => m[0]).sort();
  assert.equal(Object.keys(REFER).length, 27);
  for (const [code, written] of Object.entries(REFER)) {
    const own = written as Record<string, string>;
    assert.deepEqual(Object.keys(own).sort(), [...keys].sort(), code);
    for (const key of keys) {
      assert.deepEqual(gaps(own[key]!), gaps(en[key]!), `${code} ${key}`);
      assert.ok(!own[key]!.includes("'"), `${code} ${key}`);
    }
    // The message somebody pastes ends with the link, so nothing after it can
    // be taken for part of the address.
    for (const key of ['refer.msgNamed', 'refer.msgPlain']) {
      assert.ok(own[key]!.endsWith('{link}'), `${code} ${key}`);
      assert.ok(own[key]!.includes('AyahSpring'), `${code} ${key}`);
    }
  }
  for (const key of ['refer.msgNamed', 'refer.msgPlain']) assert.ok(en[key]!.endsWith('{link}'));
});

test('no sentence on the invitation screens says anybody is paid', () => {
  const en = messagesFor('en') as Record<string, string>;
  for (const [key, text] of Object.entries(en)) {
    if (!key.startsWith('refer.')) continue;
    assert.ok(!/\b(cash|earn money|paid to you|payout|commission|withdraw your)\b/iu.test(text), key);
  }
  assert.match(en['refer.honesty']!, /not money/u);
  assert.match(en['refer.honesty']!, /Nothing is paid out to anyone/u);
  assert.match(en['refer.lnNotMoney']!, /not money/u);
});

test('the pages draw in the language the screens are written in, and print nothing the database wrote', () => {
  for (const path of ['../app/account/referrals/page.tsx', '../app/referral/[code]/page.tsx']) {
    const page = read(path);
    assert.match(page, /languageShownFor\(locale, 'refer'\)/u, path);
    assert.match(page, /\{\.\.\.frame\}/u, path);
    assert.ok(!/\.message\b/u.test(page), `${path} prints a message`);
    assert.ok(!/toLocaleDateString|toLocaleString/u.test(page), `${path} writes a date with no language and no zone`);
    assert.ok(!/referralLookupError|describeReward|describePerson|REFERRAL_HONESTY|inviteMessage/u.test(page), `${path} uses the English`);
    assert.ok(!/\{(?:reward|person)\.status\}/u.test(page), `${path} prints a state as the database wrote it`);
  }
  const account = read('../app/account/referrals/page.tsx');
  assert.match(account, /formatDateTime\(shown\.code, iso, 'UTC'\)/u);
  // What the friend gets is read off the code, not off today's setting.
  assert.match(account, /\.rpc\('resolve_referral_code', \{ p_code: board\.code \}\)/u);
  assert.ok(!/board\.refereePercent/u.test(account), 'the page prints the setting as the worth of a code');
  assert.match(account, /<bdi>\{name\}<\/bdi>/u);
  // The switch is asked before a code is minted.
  assert.ok(account.indexOf("isFlagEnabled(supabase, 'commerce.referrals')") < account.indexOf(".rpc('my_referral_code')"));

  const landing = read('../app/referral/[code]/page.tsx');
  assert.match(landing, /robots: \{ index: false, follow: false \}/u);
  assert.match(landing, /firstNameOf\(row\.inviterName\)/u);
  assert.match(landing, /referralCodeFromPath\(raw\)/u);
  assert.ok(!/decodeURIComponent/u.test(landing), 'the page decodes an address itself');
  // Looking must not leave the cookie: the link to the route is not fetched ahead.
  assert.match(landing, /href=\{`\/api\/referral\/\$\{encodeURIComponent\(shownCode\)\}`\} prefetch=\{false\}/u);
  // Three ways to fail, said apart.
  for (const key of ['refer.lnOffTitle', 'refer.lnUnreadTitle', 'refer.lnBadTitle']) assert.ok(landing.includes(`'${key}'`), key);
});

test('the two buttons have no English of their own and say when the clipboard says no', () => {
  const panel = read('../app/account/referrals/referrals-panel.tsx');
  assert.match(panel, /^'use client';/u);
  assert.ok(!panel.includes("from '@/lib/i18n'"), 'the panel imports the server catalogue');
  assert.ok(!panel.includes("from '@/lib/referrals'"), 'the panel imports the English');
  assert.ok(!/'refer\.[a-zA-Z]+'/u.test(panel), 'the panel holds a key of a server-only part');
  assert.match(panel, /role="status"/u);
  assert.match(panel, /\} catch \{\n\s+setSaid\('refused'\);/u);
  assert.match(panel, /said === 'refused' && words\.refused/u);
  // Where the site address is unset, the browser's own is used, never a bare path.
  assert.match(panel, /if \(origin === ''\) setBase\(window\.location\.origin\);/u);
});

test('the routes answer by name, keep nothing, and never send a visitor to another host', () => {
  const board = read('../app/api/account/referrals/route.ts');
  assert.ok(!/error\.message|referralLookupError/u.test(board), 'the route passes a sentence on');
  assert.equal(board.split('} catch {').length - 1, 2);
  assert.equal(board.split("refuse('signed_out')").length - 1, 2);
  assert.equal(board.split('refuse(referralCodeOf(error))').length - 1, 2);
  assert.match(board, /const NO_STORE = \{ 'cache-control': 'no-store' \};/u);

  const keep = read('../app/api/referral/[code]/route.ts');
  assert.ok(
    !/process\.env\.NEXT_PUBLIC_SITE_URL|'http:\/\/localhost'|NextResponse\.redirect\(|request\.url/u.test(keep),
    'the route builds an absolute address',
  );
  assert.match(keep, /headers: \{ location: '\/catalogue', 'cache-control': 'no-store' \}/u);
  assert.match(keep, /referralCodeFromPath\(raw\)/u);
  assert.match(keep, /if \(error \|\| resolved\.found !== true\) return onward\(\);/u);
  assert.match(keep, /httpOnly: true,\n\s+sameSite: 'lax',/u);
});
