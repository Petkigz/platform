import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import {
  EXPORT_ROW_LIMIT,
  EXPORT_SENTENCE,
  exportCodeOf,
  exportListsCut,
  exportOutcomeOf,
  exportRefusal,
  exportStatusOf,
  type ExportCode,
} from './export-outcome.ts';

const CODES = Object.keys(EXPORT_SENTENCE) as ExportCode[];

const dir = new URL('../../../supabase/migrations/', import.meta.url);
const sql = (name: string) => readFileSync(new URL(name, dir), 'utf8');
const latestDefining = (pattern: RegExp) =>
  readdirSync(dir)
    .filter((name) => pattern.test(sql(name)))
    .sort()
    .at(-1);

test('every reason a copy is not handed over has one status, and only "failed" is not a refusal', () => {
  assert.deepEqual(CODES, ['signed_out', 'limit', 'format', 'failed']);
  for (const code of CODES) {
    const status = exportStatusOf(code);
    if (code === 'failed') assert.equal(status, 502);
    else assert.ok(status >= 400 && status <= 499, `${code} is answered with ${status}`);
    assert.deepEqual(exportRefusal(code), { ok: false, code, message: EXPORT_SENTENCE[code] });
  }
  assert.equal(exportStatusOf('signed_out'), 401);
  assert.equal(exportStatusOf('limit'), 429);
  assert.equal(exportStatusOf('format'), 400);
});

test('the link believes a refusal only when the route named it and answered with a four hundred', () => {
  for (const code of CODES.filter((c) => c !== 'failed')) {
    assert.equal(exportOutcomeOf(exportStatusOf(code), code), code);
  }
  // A page from something in front of the site, a five hundred, a success
  // that was not a file, a code nobody has heard of.
  assert.equal(exportOutcomeOf(502, 'limit'), 'failed');
  assert.equal(exportOutcomeOf(500, undefined), 'failed');
  assert.equal(exportOutcomeOf(200, undefined), 'failed');
  assert.equal(exportOutcomeOf(200, 'limit'), 'failed');
  assert.equal(exportOutcomeOf(429, 'made_up'), 'failed');
  assert.equal(exportOutcomeOf(429, null), 'failed');
  assert.equal(exportOutcomeOf(429, 'toString'), 'failed');
});

test('no sentence here says a copy was made, and the one for a failure says to ask again', () => {
  // Asking again is harmless for a copy, so there is no "could not confirm".
  for (const code of CODES) {
    assert.doesNotMatch(EXPORT_SENTENCE[code], /was made|has been saved|downloaded/i, code);
  }
  assert.match(EXPORT_SENTENCE.failed, /ask again/i);
  assert.match(EXPORT_SENTENCE.limit, /^Ten copies .* the limit\. Wait/u);
});

test('each thing the database raises has a name, read out of the migration that raises it', () => {
  // No state, or the connection's: nothing is known, so ask again.
  assert.equal(exportCodeOf({ message: 'fetch failed' }), 'failed');
  assert.equal(exportCodeOf({ code: '', message: 'sign in to download your data' }), 'failed');
  assert.equal(exportCodeOf({ code: '08006', message: 'connection failure' }), 'failed');
  assert.equal(exportCodeOf({ code: 'PGRST301', message: 'JWT expired' }), 'failed');
  assert.equal(exportCodeOf({ code: null, message: null }), 'failed');

  const raised = (text: string) =>
    [...text.matchAll(/raise exception\s+'((?:[^']|'')*)'\s+using errcode\s*=\s*'([a-z_]+)'/gu)].map((m) => ({
      message: m[1]!.replace(/\s+/gu, ' '),
      state: m[2]!,
    }));

  // The body: the function that builds the document.
  const body = latestDefining(/create or replace function public\.export_my_data_before_closed_boundary\(\)/u);
  assert.equal(body, '20261281141000_export_eligible_learners_once.sql');
  const inBody = raised(sql(body!));
  assert.deepEqual(
    inBody.map((r) => r.state),
    ['insufficient_privilege', 'insufficient_privilege'],
    'the body raises exactly two things; a third needs a name here',
  );
  const named = inBody.map((r) => exportCodeOf({ code: '42501', message: r.message }));
  assert.deepEqual(named, ['signed_out', 'limit']);

  // The wrapper the route calls. It raises one thing of its own: a signed-in
  // session with no profile row. That has no sentence of its own and is told
  // as a failure, never as the limit and never as being signed out.
  const wrapper = latestDefining(/create or replace function public\.export_my_data\(\)/u);
  assert.equal(wrapper, '20261281139000_resource_resume_export.sql');
  const inWrapper = raised(sql(wrapper!));
  assert.deepEqual(
    inWrapper.map((r) => r.message),
    ['support:account_closed_or_missing'],
  );
  assert.equal(exportCodeOf({ code: '42501', message: inWrapper[0]!.message }), 'failed');

  // The same words under another state are not believed.
  assert.equal(exportCodeOf({ code: '22023', message: inBody[1]!.message }), 'failed');
});

test('the limit the page prints is the one the database cuts at, and the hour holds ten', () => {
  const body = sql('20261281141000_export_eligible_learners_once.sql');
  const wrapper = sql('20261281139000_resource_resume_export.sql');
  for (const text of [body, wrapper]) {
    const cap = /v_cap\s+constant integer := (\d+);/u.exec(text);
    assert.ok(cap, 'v_cap is declared');
    assert.equal(Number(cap[1]), EXPORT_ROW_LIMIT);
  }
  // "Ten" is a word in every catalogue sentence; this is where it comes from.
  assert.match(body, /if v_exported >= 10 then/u);
  assert.match(body, /e\.action = 'data\.exported'\s+and e\.occurred_at > now\(\) - interval '1 hour'/u);
});

test('the lists that were cut are read from the copy, and an unexpected shape is an empty answer', () => {
  assert.deepEqual(exportListsCut({ meta: { truncated: ['notes', 'activity'] } }), ['notes', 'activity']);
  assert.deepEqual(exportListsCut({ meta: { truncated: ['notes', 7, null, 'orders'] } }), ['notes', 'orders']);
  assert.deepEqual(exportListsCut({ meta: { truncated: [] } }), []);
  for (const odd of [null, undefined, 'text', 7, [], {}, { meta: null }, { meta: 'x' }, { meta: { truncated: 'notes' } }]) {
    assert.deepEqual(exportListsCut(odd), []);
  }
});

test('the route, the link and both pages go through these names and print none of the database’s words', () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
  const route = read('../app/api/account/export/route.ts');
  assert.match(route, /exportCodeOf\(/u);
  assert.match(route, /exportRefusal\(/u);
  assert.match(route, /exportStatusOf\(/u);
  assert.doesNotMatch(route, /error\.message|message: error|String\(error\)/u);
  assert.match(route, /'cache-control': 'no-store'/u);

  const link = read('../app/account/export/download-copy.tsx');
  assert.match(link, /^'use client';/u);
  assert.match(link, /exportOutcomeOf\(/u);
  // A refusal is an alert and everything else a status: the role is the tone.
  assert.match(link, /tone: 'status' \| 'alert'/u);
  assert.match(link, /role=\{said\.tone\}/u);
  assert.match(link, /\} catch \{/u);
  // It has no words of its own and asks the catalogue for none.
  assert.doesNotMatch(link, /@\/lib\/i18n|useT\(|'export\./u);

  const print = read('../app/account/export/print/page.tsx');
  assert.match(print, /exportCodeOf\(/u);
  assert.doesNotMatch(print, /throw new Error\(error\.message\)|error\.message/u);
  assert.match(print, /role="alert"/u);

  const page = read('../app/account/export/page.tsx');
  assert.match(page, /EXPORT_ROW_LIMIT/u);
  assert.match(page, /languageShownFor\(locale, 'export'\)/u);
  // Opening the page that explains the export must not make one.
  assert.doesNotMatch(page, /\.rpc\(/u);
});
