import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  MEMBERSHIP_ENGLISH,
  MEMBERSHIP_OUTCOMES,
  membershipOutcomeOf,
  membershipReasonOf,
  membershipStatusOf,
  REPORT_WINDOW_DAYS,
  reportWindowOf,
} from './institution-outcome.ts';

const MIGRATIONS = new URL('../../../supabase/migrations/', import.meta.url);
const SRC = new URL('../', import.meta.url);
const read = (path: string): string => readFileSync(new URL(path, SRC), 'utf8');

/** The newest definition of a function in the migrations. */
function newest(name: string): string {
  const files = readdirSync(MIGRATIONS).filter((file) => file.endsWith('.sql')).sort();
  let found = '';
  for (const file of files) {
    const sql = readFileSync(new URL(file, MIGRATIONS), 'utf8');
    const at = sql.lastIndexOf(`create or replace function public.${name}(`);
    if (at === -1) continue;
    const end = sql.indexOf('\n$$;', at);
    assert.notEqual(end, -1, `${file}: ${name} has no end`);
    found = sql.slice(at, end);
  }
  assert.notEqual(found, '', `no migration defines ${name}`);
  return found;
}

const raised = (name: string): string[] =>
  [...newest(name).matchAll(/raise exception\s+'([^']+)'/gu)].map((m) => m[1]!);

describe('what the database and the page are held to', () => {
  it('has a name for every sentence joining and leaving raise', () => {
    const named = (name: string) =>
      Object.fromEntries(raised(name).map((s) => [s, membershipReasonOf({ code: 'P0001', message: s })]));
    assert.deepEqual(named('join_institution'), {
      'institution:not_signed_in': 'not_signed_in',
      'institution:already_joined': 'already_joined',
      'institution:no_verified_domain': 'no_verified_domain',
    });
    // Leaving has no sentence of its own for a caller with no session: nobody
    // is a member of nothing. The route turns that caller away before it asks.
    assert.deepEqual(named('leave_institution'), {
      'institution:not_a_member': 'not_a_member',
      'institution:last_admin': 'last_admin',
    });
  });

  it('refuses the same two stretches of dates the report does', () => {
    const report = newest('institution_report');
    assert.match(report, /p_to < p_from/u);
    assert.match(report, /p_to - p_from > 731/u);
    assert.equal(REPORT_WINDOW_DAYS, 731);
    // The cohort the page describes before the button: the account, and its family.
    const data = newest('institution_report_data');
    assert.match(data, /lp\.linked_user_id in \(select user_id from member_users\)/u);
    assert.match(data, /or lp\.family_id in/u);
  });

  it('answers joining and leaving by name, and never with the database’s sentence', () => {
    const route = read('app/api/institution/route.ts');
    const at = route.indexOf("if (action === 'join' || action === 'leave')");
    assert.notEqual(at, -1);
    const block = route.slice(at, route.indexOf("return NextResponse.json({ ok: false, message: 'Unknown action.' }", at));
    assert.match(block, /membershipReasonOf\(asked\.error\)/u);
    assert.match(block, /MEMBERSHIP_ENGLISH\[code\]/u);
    assert.doesNotMatch(block, /fail\(|institutionRefusal|message: asked\.error/u);
  });

  it('draws nothing from the database’s own text, and the buttons do not call it', () => {
    const page = read('app/institution/page.tsx');
    assert.doesNotMatch(page.replace(/console\.error\([^;]*;/gu, ''), /error\??\.message/u);
    assert.doesNotMatch(page, /throw /u);
    for (const island of ['app/institution/join-button.tsx', 'app/institution/report-file.tsx']) {
      const source = read(island);
      assert.match(source, /^'use client';/u);
      assert.doesNotMatch(source, /supabase|i18n\/messages|translator/u, island);
    }
    // What an administrator fills in is drawn for an administrator only.
    assert.match(page, /\{isAdmin && \(\s*<>[\s\S]*<InstitutionConsole board=\{board\} \/>/u);
    const console_ = read('app/institution/institution-console.tsx');
    assert.match(console_, /board\.flags\.sso && isAdmin/u);
    assert.doesNotMatch(console_, /action: 'leave'|action: 'join'/u);
  });
});

describe('joining and leaving, as names', () => {
  it('gives every name a status and an English sentence', () => {
    for (const name of MEMBERSHIP_OUTCOMES) {
      assert.ok(membershipStatusOf(name) >= 400, name);
      assert.ok(MEMBERSHIP_ENGLISH[name].length > 10, name);
    }
    assert.equal(membershipStatusOf('not_signed_in'), 401);
    assert.equal(membershipStatusOf('no_verified_domain'), 403);
    assert.equal(membershipStatusOf('last_admin'), 409);
    assert.equal(membershipStatusOf('refused'), 500);
    assert.equal(membershipStatusOf('unconfirmed'), 502);
  });

  it('names what the two functions raise', () => {
    const raised = (message: string) => membershipReasonOf({ code: '42501', message });
    assert.equal(raised('institution:not_signed_in'), 'not_signed_in');
    assert.equal(raised('institution:already_joined'), 'already_joined');
    assert.equal(raised('institution:no_verified_domain'), 'no_verified_domain');
    assert.equal(raised('institution:not_a_member'), 'not_a_member');
    assert.equal(raised('institution:last_admin'), 'last_admin');
  });

  it('calls anything else the database said a refusal, and never repeats it', () => {
    assert.equal(membershipReasonOf({ code: '23505', message: 'duplicate key value violates unique constraint "x"' }), 'refused');
    // A name from another part of the console is not one of these two buttons'.
    assert.equal(membershipReasonOf({ code: 'P0001', message: 'institution:not_an_admin' }), 'refused');
    for (const name of MEMBERSHIP_OUTCOMES) assert.doesNotMatch(MEMBERSHIP_ENGLISH[name], /constraint|institution:/u);
  });

  it('calls a reply that is not the database’s answer unconfirmed', () => {
    assert.equal(membershipReasonOf({ message: 'fetch failed' }), 'unconfirmed');
    assert.equal(membershipReasonOf({ code: '', message: 'institution:last_admin' }), 'unconfirmed');
    assert.equal(membershipReasonOf({ code: '08006', message: 'connection failure' }), 'unconfirmed');
    assert.equal(membershipReasonOf({ code: 'PGRST301', message: 'JWT expired' }), 'unconfirmed');
  });

  it('believes a name only when it arrives with its own status', () => {
    assert.equal(membershipOutcomeOf(409, 'last_admin'), 'last_admin');
    assert.equal(membershipOutcomeOf(403, 'no_verified_domain'), 'no_verified_domain');
    assert.equal(membershipOutcomeOf(400, 'last_admin'), 'unconfirmed');
    assert.equal(membershipOutcomeOf(500, 'unknown'), 'unconfirmed');
    assert.equal(membershipOutcomeOf(502, undefined), 'unconfirmed');
    assert.equal(membershipOutcomeOf(500, 'refused'), 'refused');
  });
});

describe('the dates the counts are read between', () => {
  const today = new Date('2026-11-23T15:00:00Z');

  it('reads the 365 days ending today when nothing is asked', () => {
    assert.deepEqual(reportWindowOf({}, today), { from: '2025-11-23', to: '2026-11-23', fault: null });
  });

  it('keeps two real dates', () => {
    assert.deepEqual(reportWindowOf({ from: '2026-01-01', to: '2026-03-31' }, today), {
      from: '2026-01-01', to: '2026-03-31', fault: null,
    });
    assert.equal(reportWindowOf({ from: '2026-03-31', to: '2026-03-31' }, today).fault, null);
  });

  it('treats a date that is not a day as not asked', () => {
    assert.deepEqual(reportWindowOf({ from: '2026-02-31', to: 'soon' }, today), {
      from: '2025-11-23', to: '2026-11-23', fault: null,
    });
    assert.deepEqual(reportWindowOf({ from: ['2026-01-01'], to: 7 }, today), {
      from: '2025-11-23', to: '2026-11-23', fault: null,
    });
  });

  it('counts back from an end date given alone', () => {
    assert.deepEqual(reportWindowOf({ to: '2024-06-30' }, today), { from: '2023-07-01', to: '2024-06-30', fault: null });
  });

  it('names a start after the end, without asking the database', () => {
    assert.equal(reportWindowOf({ from: '2026-04-01', to: '2026-03-31' }, today).fault, 'bad_window');
  });

  it('allows 731 days and names 732', () => {
    assert.equal(reportWindowOf({ from: '2024-11-22', to: '2026-11-23' }, today).fault, null);
    assert.equal(reportWindowOf({ from: '2024-11-21', to: '2026-11-23' }, today).fault, 'window_too_long');
  });
});
