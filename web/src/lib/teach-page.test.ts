import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { LOCALES, formatDay, languageShownFor, translator } from './i18n/index.ts';
import { CATALOGUES } from './i18n/messages/catalogues.ts';
import { en } from './i18n/messages/en.ts';
import { HELD_FOR_REVIEW } from './i18n/messages/held.ts';
import { TEACH } from './i18n/messages/teach.ts';
import { myScreeningWords } from './screening.ts';

// The teacher's dashboard (`/teach`), put into the reader's language on 2026-11-28.

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const LANGUAGES = LOCALES.map((l) => l.code).filter((code) => code !== 'en' && !Object.hasOwn(HELD_FOR_REVIEW, code));
const blanks = (text: string) => [...text.matchAll(/\{([a-zA-Z]+)\}/gu)].map((m) => m[1]).sort().join(',');
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');
/** Prose written straight into the markup: words between a tag's end and the next tag's start. */
const proseIn = (source: string) =>
  [...source.matchAll(/>\s*([A-Za-z][A-Za-z ,.'’:—-]*[A-Za-z.:])\s*(?=<|\{)/gu)].map((m) => m[1]!.trim()).filter((text) => /[A-Za-z]{3,}/u.test(text));
/** A quoted sentence: two words or more, which no class name, key or address is. */
const quotedIn = (source: string) =>
  [...source.matchAll(/'([^'\n]*[A-Za-z]+ [A-Za-z]+[^'\n]*)'/gu)].map((m) => m[1]!).filter((text) => text !== 'use client' && !/^[a-z0-9 -]+$/u.test(text));

const PAGE = read('../app/teach/page.tsx');
const FORM = read('../app/teach/new-course.tsx');
const ROUTE = read('../app/api/teach/route.ts');
type Key = keyof typeof en;
const KEYS = (Object.keys(en) as Key[]).filter((key) => key.startsWith('teach.'));
// A word that is also the English one: French "Promotions", and Filipino
// "Draft", which is what `assign.statusDraft` already calls it there.
const SAME = new Set(['fr teach.lPromotions', 'fil teach.stDraft']);
// The sentence beside a link, which follows a dash.
const NOTES = KEYS.filter((key) => /^teach\.n[A-Z]/u.test(key) && !key.startsWith('teach.nc') && key !== 'teach.notYetTitle');
const LABELS = KEYS.filter((key) => /^teach\.l[A-Z]/u.test(key));

test('teach. is written in every language the dashboard is', () => {
  assert.equal(KEYS.length, 63);
  assert.deepEqual(Object.keys(TEACH).sort(), [...LANGUAGES].sort());
  for (const code of LANGUAGES) {
    const own = TEACH[code];
    assert.ok(own, code);
    assert.deepEqual(Object.keys(own).sort(), [...KEYS].sort(), code);
    for (const key of KEYS) {
      const value: string = own[key]!;
      assert.ok(value.trim() !== '' && value === value.trim(), `${code} ${key}`);
      assert.equal(blanks(value), blanks(en[key]), `${code} ${key} changed its gaps`);
      assert.equal(CATALOGUES[code]?.[key], value, `${code} ${key} is served`);
      if (!SAME.has(`${code} ${key}`)) assert.notEqual(value, en[key], `${code} ${key} is the English sentence`);
    }
    if (code.startsWith('zh')) assert.ok(!Object.values(own).join('').includes('您'), code);
    assert.equal(languageShownFor(code, 'teach').code, code);
  }
  // A language held for review is shown the page in English.
  for (const code of Object.keys(HELD_FOR_REVIEW)) assert.equal(languageShownFor(code as never, 'teach').code, 'en', code);
});

test('the nine sentences an older part already says are said as that part says them', () => {
  const twins: [Key, Key][] = [
    ['teach.eyebrow', 'switch.gTeaching'],
    ['teach.apply', 'account.teachLink'],
    ['teach.goLearning', 'account.selfGo'],
    ['teach.lPaths', 'paths.title'],
    ['teach.lBoard', 'board.teachers'],
    ['teach.ncCreating', 'family.creating'],
    ['teach.back', 'course.back'],
    ['teach.ncESignedOut', 'family.signedOut'],
  ];
  for (const [mine, theirs] of twins) assert.equal(en[mine], en[theirs], mine);
  assert.ok(en['tapply.byAppointment'].startsWith(`${en['teach.byAppointment']} `));
  for (const code of LANGUAGES) {
    const own = TEACH[code]!;
    for (const [mine, theirs] of twins) {
      // Copied, not borrowed: the key is this part's own, so a hold on the
      // older part cannot put an English word into this page.
      assert.equal(own[mine], CATALOGUES[code]?.[theirs], `${code} ${mine}`);
    }
    // "Teaching here is by appointment." is the first sentence of the notice on `/teach/apply`.
    assert.ok(CATALOGUES[code]?.['tapply.byAppointment']?.startsWith(own['teach.byAppointment']!), code);
  }
});

test('one thing has one name, and things that differ are told apart', () => {
  for (const code of [...LANGUAGES, 'en'] as const) {
    const t = translator(code);
    const names = LABELS.map((key) => t(key));
    assert.equal(LABELS.length, 7);
    assert.equal(new Set(names).size, names.length, `${code}: ${names.join(' | ')}`);
    const states = (['teach.stDraft', 'teach.stActive', 'teach.stRetired', 'teach.published'] as const).map((key) => t(key));
    assert.equal(new Set(states).size, 4, `${code}: ${states.join(' | ')}`);
    const record = (['teach.scStNone', 'teach.scStChecked', 'teach.scStLapsed', 'teach.scStFailed'] as const).map((key) => t(key));
    assert.equal(new Set(record).size, 4, `${code}: ${record.join(' | ')}`);
    // "Create" heads the form and "Create course" is its button; "Earnings" is not "Getting paid".
    assert.notEqual(t('teach.create'), t('teach.ncCreate'), code);
    assert.notEqual(t('teach.ncCreate'), t('teach.ncCreating'), code);
    // Each refusal says something of its own.
    const refusals = (['teach.ncETitle', 'teach.ncEDuplicate', 'teach.ncERefused', 'teach.ncEUnsure', 'teach.ncESignedOut'] as const).map((key) => t(key));
    assert.equal(new Set(refusals).size, 5, code);
    // Asking and not asking are opposite sentences.
    assert.notEqual(t('teach.scBlocks'), t('teach.scNotAsked'), code);
  }
});

test('a sentence is shaped for the place the page puts it', () => {
  assert.equal(NOTES.length, 7);
  for (const code of [...LANGUAGES, 'en'] as const) {
    const t = translator(code);
    for (const key of NOTES) {
      // After a dash: no full stop at the end, in any script's full stop.
      assert.doesNotMatch(t(key), /[.。।۔]$/u, `${code} ${key}`);
      // And it starts small where the script has capitals at all.
      const first = t(key).charAt(0);
      assert.equal(first, first.toLowerCase(), `${code} ${key}`);
    }
    // These two are followed by somebody else's words, so they end on a colon.
    for (const key of ['teach.scKind', 'teach.ncERefused'] as const) assert.match(t(key), /[:：]$/u, `${code} ${key}`);
    // A count follows a colon, so that no noun has to agree with a number.
    assert.match(t('teach.tdHeldMany'), /[:：]\s?\{count\}[.。।۔]?$/u, code);
    // A heading, a label and a button carry no full stop.
    for (const key of ['teach.title', 'teach.notYetTitle', 'teach.scTitle', 'teach.create', 'teach.ncTitle', 'teach.ncField', 'teach.ncCreate', 'teach.open', ...LABELS] as const) {
      assert.doesNotMatch(t(key), /[.。।۔:：]$/u, `${code} ${key}`);
    }
  }
  // French puts a no-break space before a colon and a semicolon.
  for (const value of Object.values(TEACH.fr!)) assert.doesNotMatch(value!, /[^\u00a0][:;]/u, value!);
});

test('the record of a check reads whole in every language, with the day in that language', () => {
  const cases = [
    { recorded: false, required: true },
    { recorded: false, required: false },
    { recorded: true, outcome: 'failed', checkedAt: '2026-10-27', required: true, retentionUntil: '2033-10-27' },
    { recorded: true, outcome: 'failed' },
    { recorded: true, outcome: 'passed', expired: true, validUntil: '2026-01-01', required: true },
    { recorded: true, outcome: 'passed', expired: true },
    { recorded: true, outcome: 'passed', checkedAt: '2026-10-27', validUntil: '2028-10-27', retentionUntil: '2035-10-27' },
    { recorded: true, outcome: 'passed', validUntil: '2028-10-27' },
    { recorded: true, outcome: 'passed', checkedAt: '2026-10-27' },
    { recorded: true, outcome: 'passed' },
  ] as const;
  const used = new Set<string>();
  for (const code of [...LANGUAGES, 'en'] as const) {
    const t = translator(code);
    for (const mine of cases) {
      const words = myScreeningWords(mine, (iso) => formatDay(code, iso));
      const said = [
        t(words.status),
        t(words.sentence.key, words.sentence.values),
        words.note ? t(words.note) : '',
        words.kept ? t(words.kept.key, words.kept.values) : '',
      ];
      for (const key of [words.status, words.sentence.key, words.note, words.kept?.key]) if (key) used.add(key);
      for (const sentence of said) assert.doesNotMatch(sentence, /[{}]|undefined|teach\./u, `${code}: ${sentence}`);
      if (mine.recorded && 'checkedAt' in mine && words.sentence.values?.date) {
        assert.ok(said[1]!.includes(formatDay(code, '2026-10-27')), `${code}: ${said[1]}`);
      }
    }
  }
  // Every sentence the catalogue has for the record is one the library can choose.
  const record = KEYS.filter((key) => key.startsWith('teach.sc') && key !== 'teach.scTitle' && key !== 'teach.scKind');
  assert.deepEqual([...used].sort(), [...record].sort());
});

test('the page says nothing in English outside the block it marks as English', () => {
  const page = strip(PAGE);
  assert.match(page, /languageShownFor\(locale, 'teach'\)/u);
  assert.match(page, /shown\.code !== locale \? \{ lang: shown\.code, dir: shown\.dir \} : \{\}/u);
  assert.match(page, /const english = shown\.code === 'en' \? \{\} : \(\{ lang: 'en', dir: 'ltr' \} as const\)/u);
  // Both renders are framed.
  assert.equal([...page.matchAll(/className="container section teach-page" \{\.\.\.frame\}/gu)].length, 2);

  // What is left in English is in one block, and the block is marked.
  const start = page.indexOf('<div {...english} data-teach-english>');
  const end = page.indexOf("{link('/teach/promotions'");
  assert.ok(start > 0 && end > start);
  const outside = page.slice(page.indexOf('export default async function TeachPage'), start) + page.slice(end);
  for (const component of ['<TakedownAnswer', '<ConductCard', '<IjazahCard', 'termsSentence(terms)', '<AcceptPolicy']) {
    assert.ok(page.slice(start, end).includes(component), component);
    assert.ok(!outside.includes(component), component);
  }
  // Outside it, no text between tags and no quoted sentence.
  assert.deepEqual(proseIn(outside), []);
  assert.deepEqual(quotedIn(outside), []);
  // The check can see: the English block has prose, and the old page had it everywhere.
  assert.ok(proseIn(page.slice(start, end)).includes('The agreement about your work'));
  assert.deepEqual(proseIn('<h1>My courses</h1><p>\n  You keep the copyright\n  <b>'), ['My courses', 'You keep the copyright']);
  assert.deepEqual(quotedIn("x ? 'Did not pass' : 'container section'"), ['Did not pass']);
  for (const attribute of ['placeholder=', 'aria-label=', 'title=']) assert.ok(!outside.includes(attribute), attribute);
  // Words of the database are printed as written and say what they are.
  assert.match(page, /<h3 style=\{\{ marginTop: 0 \}\} dir="auto">\{c\.title\}<\/h3>/u);
  assert.match(page, /<span className="badge neutral" \{\.\.\.english\}>\{c\.status\}<\/span>/u);
  assert.match(page, /lang=\{shown\.code === 'en' \? undefined : 'en'\} dir="auto" data-teach-screening-kind/u);
  assert.match(page, /dir="ltr">\s*\/\{c\.slug\}/u);
  // Numbers and days are the reader's.
  assert.match(page, /formatNumber\(shown\.code, headline\.count\)/u);
  assert.match(page, /formatDay\(shown\.code, value\)/u);
  assert.doesNotMatch(page, /toLocale(Date)?String/u);
});

test('every sentence of the part is one the page can say', () => {
  const sources = [PAGE, read('./screening.ts'), read('./takedowns.ts')].map(strip).join('\n');
  for (const key of KEYS) assert.ok(sources.includes(`'${key}'`), `${key} is said nowhere`);
  // And the page asks for no `teach.` sentence the catalogue does not have.
  for (const [, key] of sources.matchAll(/'(teach\.[A-Za-z]+)'/gu)) assert.ok(Object.hasOwn(en, key!), key);
});

test('the form is a script that holds no sentence', () => {
  const form = strip(FORM);
  assert.match(form, /^'use client';/u);
  assert.doesNotMatch(form, /@\/lib\/i18n|@\/lib\/authoring|useT\(/u);
  assert.deepEqual(quotedIn(form), []);
  assert.deepEqual(proseIn(form), []);
  assert.match(form, /placeholder=\{words\.example\}/u);
  // One press until it is answered, and the database's sentence is marked.
  assert.match(form, /if \(inFlight\.current\) return;/u);
  assert.match(form, /<span \{\.\.\.english\} data-new-course-said>/u);
  assert.match(form, /role="alert" data-new-course-refusal=\{error\.refusal\}/u);
  // It does not take the keyboard when the page opens.
  assert.doesNotMatch(form, /autoFocus/u);
  // The page hands it every word it has.
  const page = strip(PAGE);
  for (const word of ['title', 'field', 'example', 'create', 'creating', 'eTitle', 'eDuplicate', 'eRefused', 'eUnsure', 'eSignedOut']) {
    assert.match(page, new RegExp(`\\b${word}: t\\('teach\\.nc`, 'u'), word);
    assert.ok(form.includes(`words.${word}`) || read('./course-create.ts').includes(`words.${word}`), word);
  }
});

test('the route answers a new course with a reason and the right status', () => {
  const route = strip(ROUTE);
  const start = route.indexOf("if (b.action === 'create_course') {");
  const block = route.slice(start, route.indexOf("if (b.action === 'create_version') {"));
  assert.ok(start > 0);
  assert.match(block, /outcome\.code === 'duplicate' \? 409 : outcome\.code === 'unsure' \? 502 : 400/u);
  assert.doesNotMatch(block, /message:/u);
});
