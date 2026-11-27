import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { LOCALES } from './i18n/index.ts';
import { CATALOGUES } from './i18n/messages/catalogues.ts';
import { en } from './i18n/messages/en.ts';
import { HELD_FOR_REVIEW } from './i18n/messages/held.ts';
import { PANEL } from './i18n/messages/panel.ts';
import { panelOutcomeKey, panelSeatKey, panelStatusKey, panelVoteKey, panelVoteRefusalOf } from './panels.ts';

// A board member's own page, put into the reader's language on 2026-11-27.

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const LANGUAGES = LOCALES.map((l) => l.code).filter((code) => code !== 'en' && !Object.hasOwn(HELD_FOR_REVIEW, code));
const blanks = (text: string) => [...text.matchAll(/\{([a-zA-Z]+)\}/gu)].map((m) => m[1]).sort().join(',');
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');

const PAGE = read('../app/panel/page.tsx');
const VOTE = read('../app/panel/panel-vote.tsx');
const KEYS = (Object.keys(en) as (keyof typeof en)[]).filter((key) => key.startsWith('panel.'));

test('panel. is written in every language the dashboard is', () => {
  assert.equal(KEYS.length, 45);
  assert.deepEqual(Object.keys(PANEL).sort(), [...LANGUAGES].sort());
  for (const code of LANGUAGES) {
    const own = PANEL[code];
    assert.ok(own, code);
    assert.deepEqual(Object.keys(own).sort(), [...KEYS].sort(), code);
    for (const key of KEYS) {
      const value: string = own[key]!;
      assert.ok(value.trim() !== '' && value === value.trim(), `${code} ${key}`);
      assert.equal(blanks(value), blanks(en[key]), `${code} ${key} changed its gaps`);
      assert.equal(CATALOGUES[code]?.[key], value, `${code} ${key} is served`);
      assert.notEqual(value, en[key], `${code} ${key} is the English sentence`);
    }
    if (code.startsWith('zh')) assert.ok(!Object.values(own).join('').includes('您'), code);
  }
});

test('one thing has one name, and things that differ are told apart', () => {
  for (const code of LANGUAGES) {
    const all = CATALOGUES[code]!;
    assert.equal(all['panel.crumb'], all['ask.crumbLearn'], code);
    assert.equal(all['panel.back'], all['ask.back'], code);
    // The three votes, and "has not voted", which is not "abstained".
    assert.equal(new Set([all['panel.approve'], all['panel.reject'], all['panel.abstain'], all['panel.notVoted']]).size, 4, code);
    assert.equal(new Set([all['panel.outcomeApproved'], all['panel.outcomeRejected'], all['panel.outcomeWithdrawn']]).size, 3, code);
    assert.equal(new Set([all['panel.convened'], all['panel.notConvened'], all['panel.dissolved']]).size, 3, code);
    assert.notEqual(all['panel.chair'], all['panel.member'], code);
    assert.notEqual(all['panel.quorumMet'], all['panel.quorumWaiting'], code);
    // "It was not recorded" and "nobody can say" are two sentences.
    assert.notEqual(all['panel.refused'], all['panel.unsure'], code);
    assert.equal(new Set(['already', 'alreadyDecided', 'notSitting', 'notMemberVote', 'signedOut', 'refused', 'unsure'].map((k) => all[`panel.${k}` as keyof typeof en])).size, 7, code);
  }
  assert.equal(en['panel.crumb'], en['nav.learn']);
});

test('the page and the vote say nothing that is not in the catalogue', () => {
  for (const [name, source] of [['page', PAGE], ['vote', VOTE]] as const) {
    const bare = strip(source);
    assert.doesNotMatch(bare, />\s*[A-Z][a-z]+ [a-z]+[^<{]*</u, `a sentence is written in the ${name}`);
    assert.doesNotMatch(bare, /(?:placeholder|aria-label|title)="[A-Z]/u, name);
    // The staff screens' English helpers are not used here.
    assert.doesNotMatch(bare, /panelStatusLabel|panelMemberRole|voteLabel|quorumSentence|tallySentence|describePanelError/u, name);
  }
  const used = `${PAGE}\n${read('./panels.ts')}`;
  for (const key of KEYS) assert.ok(used.includes(`'${key}'`), `${key} is not used`);
  assert.match(PAGE, /languageShownFor\(locale, 'panel'\)/u);
  assert.match(PAGE, /shown\.code !== locale \? \{ lang: shown\.code, dir: shown\.dir \} : \{\}/u);
  assert.equal(PAGE.match(/<div className="container section panel-page" \{\.\.\.frame\}>/gu)?.length, 3);
  // The vote is handed its words and reads no catalogue; the database's sentence is not printed.
  assert.match(VOTE, /^'use client';/u);
  const bare = strip(VOTE);
  assert.doesNotMatch(bare, /@\/lib\/i18n|useT\(/u);
  assert.doesNotMatch(bare, /rpcError\.message|\.message\)/u);
  assert.match(bare, /setError\(words\.refusals\[panelVoteRefusalOf\(rpcError\)\]\);/u);
  assert.match(bare, /catch \{\s*setError\(words\.refusals\.unsure\);/u);
  // What somebody else wrote sets its own direction.
  const page = strip(PAGE);
  assert.match(page, /<strong dir="auto">\{panel\.name\}<\/strong>/u);
  assert.match(page, /<h3 dir="auto">\{row\.courseTitle\}<\/h3>/u);
  assert.match(page, /<bdi>\{row\.panelName\}<\/bdi>/u);
  assert.match(page, /<p className="muted" dir="auto">\{row\.outcomeSummary\}<\/p>/u);
  // Work that could not be read is said to be unread, not thrown.
  assert.doesNotMatch(page, /if \(error\) throw/u);
  assert.match(page, /role="alert" data-panel-state="unread">\{t\('panel\.unread'\)\}/u);
  // Every number goes through the reader's digits.
  const filled = [...page.matchAll(/, \{ ([a-z]+: [^}]+) \}\)/gu)].flatMap((m) => m[1]!.split(/, (?=[a-z]+: )/u));
  assert.equal(filled.length, 9);
  for (const pair of filled) assert.match(pair, /^[a-z]+: (?:n\(|t\(panelVoteKey\()/u, pair);
});

test('a refusal is told by its name, and no answer is not a refusal', () => {
  const of = (message: string | null, code: string | null = 'P0001') => panelVoteRefusalOf({ message, code });
  assert.equal(of('panel:already_voted', '23505'), 'already');
  assert.equal(of('panel:already_decided', '23514'), 'alreadyDecided');
  assert.equal(of('panel:not_convened', '23514'), 'notSitting');
  assert.equal(of('panel:not_a_member', '42501'), 'notMember');
  assert.equal(of('panel:not_signed_in', '42501'), 'signedOut');
  // The database refused, for a reason this page has no sentence for.
  assert.equal(of('panel:vote_invalid', '23514'), 'refused');
  assert.equal(of('panel:not_found', 'P0002'), 'refused');
  assert.equal(of('JWT expired', 'PGRST301'), 'refused');
  assert.equal(of('canceling statement due to statement timeout', '57014'), 'refused');
  // Nobody knows: a gateway's page, a connection that went, nothing at all.
  assert.equal(of('<html>502 Bad Gateway</html>', null), 'unsure');
  assert.equal(of('TypeError: Failed to fetch', ''), 'unsure');
  assert.equal(of('connection failure', '08006'), 'unsure');
  assert.equal(panelVoteRefusalOf(null), 'unsure');
  assert.equal(panelVoteRefusalOf({}), 'unsure');
  // A named refusal wins whatever the state says.
  assert.equal(of('panel:already_voted', null), 'already');
});

test('a word the database sends that this page does not know is not printed', () => {
  assert.equal(panelStatusKey('active'), 'panel.convened');
  assert.equal(panelStatusKey('inactive'), 'panel.notConvened');
  assert.equal(panelStatusKey('dissolved'), 'panel.dissolved');
  assert.equal(panelStatusKey('something_new'), 'panel.notConvened');
  assert.equal(panelStatusKey(null), 'panel.notConvened');
  assert.equal(panelSeatKey('chair'), 'panel.chair');
  assert.equal(panelSeatKey('anything'), 'panel.member');
  assert.equal(panelVoteKey('approve'), 'panel.approve');
  assert.equal(panelVoteKey('reject'), 'panel.reject');
  assert.equal(panelVoteKey('abstain'), 'panel.abstain');
  assert.equal(panelVoteKey(null), 'panel.notVoted');
  assert.equal(panelVoteKey('something_new'), 'panel.notVoted');
  assert.equal(panelOutcomeKey('approved'), 'panel.outcomeApproved');
  assert.equal(panelOutcomeKey('rejected'), 'panel.outcomeRejected');
  assert.equal(panelOutcomeKey('withdrawn'), 'panel.outcomeWithdrawn');
  assert.equal(panelOutcomeKey('something_new'), null);
});
