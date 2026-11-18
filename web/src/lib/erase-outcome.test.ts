import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import {
  ERASE_SENTENCE,
  PRIVACY_CONTACT,
  UNCERTAIN_CLOSURE,
  eraseCodeOf,
  eraseOutcomeOf,
  eraseRefusal,
  eraseStatusOf,
  type EraseCode,
} from './erase-outcome.ts';

const CODES = Object.keys(ERASE_SENTENCE) as EraseCode[];

test('every reason closing an account is refused for has one status, and only "unconfirmed" is not a refusal', () => {
  assert.equal(CODES.length, 10);
  for (const code of CODES) {
    const status = eraseStatusOf(code);
    if (code === 'unconfirmed') assert.equal(status, 502);
    else assert.ok(status >= 400 && status <= 499, `${code} is answered with ${status}`);
    assert.deepEqual(eraseRefusal(code), { ok: false, code, message: ERASE_SENTENCE[code] });
  }
  assert.equal(eraseStatusOf('signed_out'), 401);
  assert.equal(eraseStatusOf('no_account'), 404);
  assert.equal(eraseStatusOf('name_mismatch'), 400);
  assert.equal(eraseStatusOf('teaching'), 409);
});

test('the form believes a refusal only when the route named it and answered with a four hundred', () => {
  for (const code of CODES.filter((c) => c !== 'unconfirmed')) {
    assert.equal(eraseOutcomeOf(eraseStatusOf(code), code), code);
  }
  // A page from something in front of the site, a five hundred, a success
  // that did not say the account closed, a code nobody has heard of.
  assert.equal(eraseOutcomeOf(502, 'teaching'), 'unconfirmed');
  assert.equal(eraseOutcomeOf(500, undefined), 'unconfirmed');
  assert.equal(eraseOutcomeOf(200, undefined), 'unconfirmed');
  assert.equal(eraseOutcomeOf(200, 'refused'), 'unconfirmed');
  assert.equal(eraseOutcomeOf(409, 'made_up'), 'unconfirmed');
  assert.equal(eraseOutcomeOf(409, null), 'unconfirmed');
  assert.equal(eraseOutcomeOf(409, 'toString'), 'unconfirmed');
});

test('the sentence for an answer nobody can read never says the account is still open', () => {
  assert.equal(UNCERTAIN_CLOSURE, ERASE_SENTENCE.unconfirmed);
  assert.match(UNCERTAIN_CLOSURE, /could not confirm whether your account closed/);
  assert.doesNotMatch(UNCERTAIN_CLOSURE, /nothing was changed|was not closed|still open/i);
  assert.ok(UNCERTAIN_CLOSURE.includes(PRIVACY_CONTACT));
});

test('a database error is an answer only when it carries a state, and each refusal the migrations raise has a name', () => {
  // No state, or the connection's: the request may have gone through.
  assert.equal(eraseCodeOf({ message: 'fetch failed' }), 'unconfirmed');
  assert.equal(eraseCodeOf({ code: '', message: 'type your name exactly as it appears' }), 'unconfirmed');
  assert.equal(eraseCodeOf({ code: '08006', message: 'connection failure' }), 'unconfirmed');
  assert.equal(eraseCodeOf({ code: 'PGRST301', message: 'JWT expired' }), 'unconfirmed');

  // The sentences are read out of the migrations, so that rewording one
  // there fails here instead of quietly becoming `refused`.
  const dir = new URL('../../../supabase/migrations/', import.meta.url);
  const sql = (name: string) => readFileSync(new URL(name, dir), 'utf8');
  const raised = (text: string) =>
    [...text.matchAll(/raise exception\s+'((?:[^']|'')*)'\s+using errcode = '([a-z_]+)'/gu)].map((m) => ({
      message: m[1]!.replace(/\s+/gu, ' '),
      state: m[2]!,
    }));
  const STATE: Record<string, string> = {
    insufficient_privilege: '42501',
    invalid_parameter_value: '22023',
    check_violation: '23514',
  };

  const latest = readdirSync(dir)
    .filter((name) => /create or replace function public\.erase_my_account_before_revision_hold_guard/u.test(sql(name)))
    .sort()
    .at(-1);
  assert.equal(latest, '20261281122000_support_case_held_erasure.sql');
  const body = sql(latest!);
  const start = body.indexOf('create or replace function public.erase_my_account_before_revision_hold_guard');
  const fromFunction = raised(body.slice(start, body.indexOf('$$;', start)));
  const named = fromFunction.map((r) => eraseCodeOf({ code: STATE[r.state], message: r.message }));
  assert.deepEqual(named, ['signed_out', 'no_account', 'name_mismatch', 'teaching', 'board', 'held']);

  const guard = raised(sql('20261281058000_named_owner_account_boundary.sql')).filter((r) => /before closing it/u.test(r.message));
  assert.equal(guard.length, 1);
  assert.equal(eraseCodeOf({ code: STATE[guard[0]!.state], message: guard[0]!.message }), 'appointment');

  // Anything else the database refuses has no name, and is not shown.
  assert.equal(eraseCodeOf({ code: '23503', message: 'violates foreign key constraint "x_fkey"' }), 'refused');
  assert.doesNotMatch(ERASE_SENTENCE.refused, /constraint|violates/);
});

test('the route names every refusal, forwards no database sentence, and ends the session only after a closure', () => {
  const route = readFileSync(new URL('../app/api/account/erase/route.ts', import.meta.url), 'utf8');
  assert.match(route, /NextResponse\.json\(eraseRefusal\(code\), \{ status: eraseStatusOf\(code\), headers: NO_STORE \}\)/u);
  assert.doesNotMatch(route, /error\.message|NextResponse\.json\(result, \{ status: 409 \}\)/u);
  assert.match(route, /if \(!signedIn\) return refuse\('signed_out'\);/u);
  assert.match(route, /if \(!confirm\.trim\(\)\) return refuse\('name_missing'\);/u);
  // A request that left and never answered may have closed the account.
  assert.match(route, /result = await eraseMyAccount\(supabase, confirm\);\s+\} catch \{[^}]*return refuse\('unconfirmed'\);/u);
  assert.match(route, /if \(!result\.ok\) return refuse\(result\.code\);\s+\/\/ The account is closed; the session should not outlive it\.\s+await supabase\.auth\.signOut\(\)/u);
});
