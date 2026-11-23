import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

import {
  POLICY_ENGLISH,
  POLICY_OUTCOMES,
  acceptedOf,
  isPolicySlug,
  isPolicyVersion,
  policyOutcomeOf,
  policyReasonOf,
  policySentenceReason,
  policyStatusOf,
} from './policy-outcome.ts';
import { formatDay } from './i18n/format.ts';

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

test('every sentence the writer and the standing read raise has a name', () => {
  const named = (name: string) => Object.fromEntries(raised(name).map((s) => [s, policySentenceReason(s)]));
  assert.deepEqual(named('accept_policy'), {
    'policy:not_signed_in': 'not_signed_in',
    'policy:not_found': 'not_found',
    'policy:not_in_force': 'not_in_force',
  });
  assert.deepEqual(named('my_policy_standing'), { 'policy:not_signed_in': 'not_signed_in' });
  // The owner's refusals are not the reader's: none of them has a name here.
  assert.equal(policySentenceReason('policy:decisions_open'), null);
  assert.equal(policySentenceReason('permission denied for table policy_versions'), null);
  assert.equal(policySentenceReason(null), null);
});

test('the writer still takes a slug and nothing else, which is why the route checks the version', () => {
  const writer = newest('accept_policy');
  assert.match(writer, /^create or replace function public\.accept_policy\(p_slug text\)/u);
  // It resolves whatever is live at that instant.
  assert.match(writer, /where document_id = v_doc\.id and status = 'in_force'/u);
  // And a second agreement is answered with the time of the first.
  assert.match(writer, /'already', true/u);
});

test('the database’s answer is a refusal; anything else is unconfirmed', () => {
  assert.equal(policyReasonOf({ code: '23514', message: 'policy:not_in_force' }), 'not_in_force');
  assert.equal(policyReasonOf({ code: 'P0002', message: 'policy:not_found' }), 'not_found');
  assert.equal(policyReasonOf({ code: '42501', message: 'policy:not_signed_in' }), 'not_signed_in');
  assert.equal(policyReasonOf({ code: '42501', message: 'permission denied for function accept_policy' }), 'refused');
  // No SQLSTATE, or a connection that broke: it may have been recorded.
  assert.equal(policyReasonOf({ message: 'fetch failed' }), 'unconfirmed');
  assert.equal(policyReasonOf({ code: '08006', message: 'policy:not_found' }), 'unconfirmed');
  assert.equal(policyReasonOf({ code: 'PGRST301', message: 'JWT expired' }), 'unconfirmed');
});

test('every name has a status and an English sentence, and a reason is believed only with its own status', () => {
  for (const reason of POLICY_OUTCOMES) {
    assert.ok(policyStatusOf(reason) >= 400, reason);
    assert.ok(POLICY_ENGLISH[reason].length > 0, reason);
    assert.equal(policyOutcomeOf(policyStatusOf(reason), reason), reason);
  }
  assert.equal(policyStatusOf('changed'), 409);
  assert.equal(policyStatusOf('not_found'), 404);
  assert.equal(policyOutcomeOf(500, 'changed'), 'unconfirmed');
  assert.equal(policyOutcomeOf(409, 'nobody named this'), 'unconfirmed');
  assert.equal(policyOutcomeOf(502, undefined), 'unconfirmed');
});

test('a slug is what the table allows, and a version is a whole number from one', () => {
  for (const slug of ['terms', 'privacy-notice', 'a1-b2']) assert.equal(isPolicySlug(slug), true, slug);
  for (const slug of ['', 'Terms', '-terms', 'terms-', 'a--b', 'a b', '../x', 'a'.repeat(61), 4, null]) {
    assert.equal(isPolicySlug(slug), false, String(slug));
  }
  // The table's own rule, so the two cannot drift apart unseen.
  assert.match(
    readFileSync(new URL('20261281001400_policies.sql', MIGRATIONS), 'utf8'),
    /check \(slug ~ '\^\[a-z0-9\]\+\(-\[a-z0-9\]\+\)\*\$' and length\(slug\) <= 60\)/u,
  );
  for (const version of [1, 2, 40]) assert.equal(isPolicyVersion(version), true);
  for (const version of [0, -1, 1.5, '1', null, Number.NaN, 1e9]) assert.equal(isPolicyVersion(version), false, String(version));
});

test('the writer’s reply is read without trusting its shape', () => {
  assert.deepEqual(
    acceptedOf({ slug: 'terms', versionNumber: 3, acceptedAt: '2026-11-23T09:14:00+00:00', already: false }),
    { version: 3, acceptedAt: '2026-11-23T09:14:00+00:00', already: false },
  );
  assert.equal(acceptedOf({ versionNumber: 3, acceptedAt: '2026-11-23T09:14:00+00:00', already: true })?.already, true);
  for (const reply of [null, [], 'ok', {}, { versionNumber: 3 }, { versionNumber: '3', acceptedAt: '2026-11-23T09:14:00Z' }, { versionNumber: 3, acceptedAt: 'soon' }]) {
    assert.equal(acceptedOf(reply), null, JSON.stringify(reply));
  }
});

test('the route sends a name, checks the version first, and never sends the database’s sentence', () => {
  const route = read('app/api/policies/route.ts');
  // The version on the page against the live one, before the writer is asked.
  const check = route.indexOf("return refuse('changed')");
  const write = route.indexOf("supabase.rpc('accept_policy'");
  assert.ok(check > 0 && write > check, 'the version is checked before the writer is asked');
  assert.match(route, /live\.data !== null && liveVersion !== b\.version/u);
  // The reply says which version was recorded, so the button can say when it was not the one shown.
  assert.match(route, /version: accepted\.version/u);
  // `error.message` goes to the log and nowhere else.
  for (const line of route.split('\n').filter((one) => one.includes('.message'))) {
    assert.match(line, /console\.error|POLICY_ENGLISH\[reason\]/u, line);
  }
});

test('nothing in the reader’s pages calls the writer from the browser or throws on a read', () => {
  const button = read('app/policies/[slug]/accept-policy.tsx');
  assert.doesNotMatch(button, /supabase/u);
  assert.match(button, /fetch\('\/api\/policies'/u);
  assert.match(button, /JSON\.stringify\(\{ slug, version \}\)/u);
  for (const page of ['app/policies/page.tsx', 'app/policies/[slug]/page.tsx']) {
    const source = read(page);
    assert.doesNotMatch(source, /throw new Error/u, page);
    assert.match(source, /languageShownFor|readerLanguage\(\)/u, page);
    assert.match(source, /t\('policy\.unread'\)/u, page);
  }
  // The document is the owner's, shown as written and marked as English.
  const one = read('app/policies/[slug]/page.tsx');
  assert.match(one, /<article className="policy-body" data-policy-body \{\.\.\.written\}>/u);
  assert.match(one, /const written = shown\.code === 'en' \? \{\} : \{ lang: 'en', dir: 'ltr' as const \}/u);
});

test('a day with no time is printed as that day, with no clock on it', () => {
  assert.equal(formatDay('en', '2026-11-01'), 'Nov 1, 2026');
  // The same day wherever this runs: a `date` printed as a moment would be
  // the day before in a browser west of Greenwich.
  assert.equal(formatDay('en', '2026-11-01T00:00:00+00:00'), 'Nov 1, 2026');
  assert.doesNotMatch(formatDay('en', '2026-11-01'), /UTC|AM|PM|:/u);
  assert.match(formatDay('fr', '2026-11-01'), /1 nov\. 2026/u);
  assert.match(formatDay('ar', '2026-11-01'), /نوفمبر/u);
  assert.match(formatDay('fa', '2026-11-01'), /آبان ۱۴۰۵/u);
  for (const bad of ['', 'soon', '2026-02-31', '2026-13-01', '20261101', null, undefined]) {
    assert.equal(formatDay('en', bad), '', String(bad));
  }
});
