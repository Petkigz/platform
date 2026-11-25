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
  assert.equal(wrapper, '20261281156000_board_reports_owner_told_export_says.sql');
  // The file defines another function after it; only the wrapper is read.
  const wrapperText = sql(wrapper!);
  const wrapperAt = wrapperText.indexOf('create or replace function public.export_my_data()');
  const inWrapper = raised(wrapperText.slice(wrapperAt, wrapperText.indexOf('\n$$;', wrapperAt)));
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
  const wrapper = sql('20261281156000_board_reports_owner_told_export_says.sql');
  const wrapperBefore = sql('20261281139000_resource_resume_export.sql');
  for (const text of [body, wrapper, wrapperBefore]) {
    const cap = /v_cap\s+constant integer := (\d+);/u.exec(text);
    assert.ok(cap, 'v_cap is declared');
    assert.equal(Number(cap[1]), EXPORT_ROW_LIMIT);
  }
  // "Ten" is a word in every catalogue sentence; this is where it comes from.
  assert.match(body, /if v_exported >= 10 then/u);
  assert.match(body, /e\.action = 'data\.exported'\s+and e\.occurred_at > now\(\) - interval '1 hour'/u);
});

test('board posts are named as left out, and the two functions that say so are the earlier ones with that added', () => {
  // The owner, 2026-11-25: board posts stay out of a copy, and when a post is
  // reported the owner is told and staff are not. PostgreSQL cannot wrap the
  // function it replaces, so each was copied whole into 20261281156000. A
  // copy can lose a line: every earlier line must still be there, in order,
  // and what was added is counted and read.
  const NOW = '20261281156000_board_reports_owner_told_export_says.sql';
  const inFile = (file: string, name: string): string[] => {
    const text = sql(file);
    const at = text.lastIndexOf(`create or replace function public.${name}(`);
    assert.notEqual(at, -1, `${file} does not define ${name}`);
    return text.slice(at, text.indexOf('\n$$;', at)).split('\n');
  };
  const addedTo = (name: string, before: string): string[] => {
    const old = inFile(before, name);
    const added: string[] = [];
    let i = 0;
    for (const line of inFile(NOW, name)) {
      if (line === old[i]) i += 1;
      else added.push(line);
    }
    assert.equal(i, old.length, `${name}(): the earlier definition has ${old.length - i} lines the new one lost`);
    assert.equal(
      latestDefining(new RegExp(`create or replace function public\\.${name}\\(`, 'u')),
      NOW,
      `${name}() is defined again after ${NOW}`,
    );
    return added;
  };

  // The copy: one entry under notIncluded, and not one board table read.
  const inCopy = addedTo('export_my_data', '20261281139000_resource_resume_export.sql');
  assert.equal(inCopy.length, 8, inCopy.join('\n'));
  const copyText = inCopy.join('\n');
  assert.match(copyText, /jsonb_set\(v_result, '\{notIncluded\}', coalesce\(v_result->'notIncluded', '\[\]'::jsonb\) \|\|/u);
  assert.match(copyText, /'what', 'What you wrote on the discussion boards'/u);
  assert.match(copyText, /They stay on the board, where you can read them and take one back\.'\)\), true\);/u);
  assert.doesNotMatch(copyText, /\b(?:select|from|update|insert|delete|perform|grant|revoke)\b/iu);
  assert.doesNotMatch(inFile(NOW, 'export_my_data').join('\n'), /board_(?:threads|replies|handles|reports)/u);
  const whole = [...sql('20261281141000_export_eligible_learners_once.sql').matchAll(/board_(?:threads|replies|handles|reports)/gu)];
  assert.equal(whole.length, 0, 'the body of the copy reads a board table');

  // The count: two rows, inside a branch only the owner's role enters.
  const inCount = addedTo('staff_attention', '20261265000100_staff_attention.sql');
  const countText = inCount.join('\n');
  assert.equal(countText.match(/^ {2}if v_platform then$/gmu)?.length, 1);
  assert.equal(countText.match(/public\.attention_row\(/gu)?.length, 2);
  assert.match(countText, /'board_reports_students', 'Reported posts, students'' board', v_count, '\/admin\/boards',/u);
  assert.match(countText, /'board_reports_teachers', 'Reported posts, teachers'' board', v_count, '\/admin\/boards',/u);
  assert.match(countText, /'community\.student_board', not public\.setting_bool\('community\.student_board', false\)\);/u);
  assert.match(countText, /'community\.teacher_board', not public\.setting_bool\('community\.teacher_board', false\)\);/u);
  // A post is counted once however many people reported it, and only while a report on it is open.
  assert.equal(countText.match(/select distinct br\.thread_id, br\.reply_id/gu)?.length, 2);
  assert.equal(countText.match(/where br\.resolved_at is null and t\.board = '(?:students|teachers)'/gu)?.length, 2);
  // It counts. It writes nothing, sends nothing and names nobody.
  const countCode = inCount.filter((line) => !line.trim().startsWith('--')).join('\n');
  assert.doesNotMatch(countCode, /\b(?:update|insert|delete|perform|grant|revoke|notify_user|reporter_id|author_id|body|handle|reason)\b/iu);
  // The branch opens and closes around exactly what was added, so no other role reaches it.
  assert.equal(inCount.filter((line) => line.trim() !== '' && !line.trim().startsWith('--')).at(0), '  if v_platform then');
  assert.equal(inCount.filter((line) => line.trim() !== '' && !line.trim().startsWith('--')).at(-1), '  end if;');

  // The page that lists what a copy lacks has the sentence, in every language the page is written in.
  const page = readFileSync(new URL('../app/account/export/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /\['export\.outBoards', 'export\.outBoardsNote'\]/u);
  assert.match(page, /isFlagEnabled\(supabase, 'community\.student_board'\)\.catch\(\(\) => true\)/u);
  assert.match(page, /isFlagEnabled\(supabase, 'community\.teacher_board'\)\.catch\(\(\) => true\)/u);
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
