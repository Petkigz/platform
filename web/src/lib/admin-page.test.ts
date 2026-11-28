import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { CONSOLE_LINKS, QUEUE_WORDS } from './admin-console.ts';
import { LOCALES, languageShownFor } from './i18n/index.ts';
import { CATALOGUES } from './i18n/messages/catalogues.ts';
import { en } from './i18n/messages/en.ts';
import { CONSOLE } from './i18n/messages/console.ts';
import { HELD_FOR_REVIEW } from './i18n/messages/held.ts';
import { STAFF } from './i18n/messages/staff.ts';

// The top of the staff console (`/admin`), put into the reader's language on 2026-11-28.

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const LANGUAGES = LOCALES.map((l) => l.code).filter((code) => code !== 'en' && !Object.hasOwn(HELD_FOR_REVIEW, code));
const blanks = (text: string) => [...text.matchAll(/\{([a-zA-Z]+)\}/gu)].map((m) => m[1]).sort().join(',');
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');

const PAGE = read('../app/admin/page.tsx');
const PANEL = read('../app/admin/setup-panel.tsx');
const KEYS = (Object.keys(en) as (keyof typeof en)[]).filter((key) => key.startsWith('staff.'));
// A French word that is also the English one.
const SAME_IN_FRENCH = ['staff.eyebrow', 'staff.publication', 'staff.lInvitations', 'staff.lMessages', 'staff.lIncidents'];

test('staff. is written in every language the dashboard is', () => {
  assert.equal(KEYS.length, 89);
  assert.deepEqual(Object.keys(STAFF).sort(), [...LANGUAGES].sort());
  for (const code of LANGUAGES) {
    const own = STAFF[code];
    assert.ok(own, code);
    assert.deepEqual(Object.keys(own).sort(), [...KEYS].sort(), code);
    for (const key of KEYS) {
      const value: string = own[key]!;
      assert.ok(value.trim() !== '' && value === value.trim(), `${code} ${key}`);
      assert.equal(blanks(value), blanks(en[key]), `${code} ${key} changed its gaps`);
      assert.equal(CATALOGUES[code]?.[key], value, `${code} ${key} is served`);
      if (!(code === 'fr' && SAME_IN_FRENCH.includes(key))) assert.notEqual(value, en[key], `${code} ${key} is the English sentence`);
    }
    if (code.startsWith('zh')) assert.ok(!Object.values(own).join('').includes('您'), code);
    assert.equal(languageShownFor(code, 'staff').code, code);
  }
  // A language held for review is shown the page in English.
  for (const code of Object.keys(HELD_FOR_REVIEW)) assert.equal(languageShownFor(code as never, 'staff').code, 'en', code);
});

test('one thing has one name, and things that differ are told apart', () => {
  const labels = Object.values(CONSOLE_LINKS).flat().map((link) => link.label);
  const queues = Object.values(QUEUE_WORDS);
  for (const code of LANGUAGES) {
    const all = CATALOGUES[code]!;
    // Every screen has a name of its own: two links that read alike send somebody to the wrong one.
    const names = labels.map((key) => all[key]!);
    assert.equal(new Set(names).size, names.length, `${code}: ${names.filter((name, i) => names.indexOf(name) !== i).join(' | ')}`);
    // Every queue too, and each queue's sentence (the two boards share theirs).
    assert.equal(new Set(queues.map((q) => all[q.label])).size, 13, code);
    assert.equal(new Set(queues.map((q) => all[q.detail])).size, 12, code);
    // The two boards are told apart, and by the names `/discuss` gives them.
    // (After a comma the name loses its capital in the scripts that have one.)
    const low = (text: string) => text.toLocaleLowerCase(code);
    assert.ok(low(all['staff.qBoardStudents']!).includes(low(all['board.students']!)), `${code} students' board`);
    assert.ok(low(all['staff.qBoardTeachers']!).includes(low(all['board.teachers']!)), `${code} teachers' board`);
    // An appeal is not a report, in the queues and in the links.
    for (const appeal of ['staff.qAppeals', 'staff.lAppeals'] as const) {
      for (const report of ['staff.qReports', 'staff.lReports', 'staff.lBoards'] as const) assert.notEqual(all[appeal], all[report], `${code} ${appeal} ${report}`);
    }
    // A learner's opinion of a course is not a reviewer's queue.
    assert.notEqual(all['staff.lCourseReviews'], all['review.title'], code);
    // The four states of the first sentence are four sentences.
    assert.equal(new Set([all['staff.unread'], all['staff.zero'], all['staff.waiting'], all['staff.zeroSetup']]).size, 4, code);
    // A count follows a colon (or the full-width one), never a word that would have to agree with it.
    for (const key of ['staff.waiting', 'staff.zeroSetup', 'staff.subjectsSome', 'staff.dormantHead'] as const) {
      assert.match(all[key]!, /[:：]\s?\{count\}/u, `${code} ${key}`);
    }
    assert.match(all['staff.waiting']!, /[:：]\s?\{queues\}/u, code);
  }
  // French spacing before a colon.
  for (const value of Object.values(STAFF.fr!)) assert.doesNotMatch(value, /[^\u00a0][:;?]\s|[^\u00a0][:;?]$/u, value);
});

test('the page says its top from the catalogue, and marks what is still English', () => {
  const page = strip(PAGE);
  const panel = strip(PANEL);
  // Every key is said: by the page, or through the tables the page reads.
  const tables = strip(read('./admin-console.ts')) + strip(read('./setup.ts'));
  for (const key of KEYS) assert.ok(page.includes(`'${key}'`) || tables.includes(`'${key}'`), `${key} is said nowhere`);
  for (const key of ['export.inMoney', 'inst.title', 'support.eyebrow', 'ask.back'] as const) assert.ok(page.includes(`t('${key}')`), key);
  // The sentences the page used to type.
  for (const typed of [
    'What is waiting', 'Staff queues could not be loaded', 'things are', 'Safeguarding concerns', 'Handed-in files',
    'Paused', 'No queue has anything', 'Also checked and empty', 'paused\n', 'Everyone&rsquo;s work', 'Any member of staff',
    'Back to my learning', 'What was charged', '>Publication<', '>Support<', '>Money<', '>Institutions<',
  ]) assert.ok(!page.includes(typed), `the page still types "${typed}"`);
  assert.ok(!panel.includes('Before anyone can study here') && !panel.includes('@/lib/setup'));
  // The frame, the reader's digits, and the two marks.
  assert.match(page, /languageShownFor\(locale, 'staff'\)/u);
  assert.match(page, /const frame = shown\.code !== locale \? \{ lang: shown\.code, dir: shown\.dir \} : \{\};/u);
  assert.match(page, /const english = shown\.code === 'en' \? \{\} : \(\{ lang: 'en', dir: 'ltr' \} as const\);/u);
  // The sentence beside a link is the catalogue's too, in the language its part is shown in.
  assert.match(page, /notes: languageShownFor\(locale, 'console'\)/u);
  assert.match(page, /const tn = translator\(notes\.code\);/u);
  assert.match(page, /const noteMark = notes\.code === shown\.code \? \{\} : \{ lang: notes\.code, dir: notes\.dir \};/u);
  assert.match(page, /<span \{\.\.\.noteMark\}>\{tn\(link\.note\)\}<\/span>/u);
  assert.doesNotMatch(page, /<span \{\.\.\.english\}>\{link\.note\}/u);
  assert.match(page, /<div \{\.\.\.english\} data-staff-switchboard>/u);
  assert.match(page, /: \{ label: q\.label, detail: q\.detail, mark: english \}/u);
  for (const count of ['n(waiting)', 'n(busy.length)', 'n(q.count)', 'n(dormant.length)', 'n(i + 1)']) assert.ok(page.includes(count), count);
  assert.doesNotMatch(page, /\{q\.count\}|\{waiting\}/u);
  // What is still typed in English is inside the switchboard and nowhere else.
  const start = page.indexOf('<div {...english} data-staff-switchboard>');
  const end = page.indexOf('data-staff-not-owner');
  assert.ok(start > 0 && end > start);
  for (const typed of ['Feature flags', 'Retention clock', 'needs a deploy', 'The flag register is empty.']) {
    const at = page.indexOf(typed);
    assert.ok(at > start && at < end, typed);
  }
});

// The second part (`console.`), 2026-11-28: the word in the navigation and the sentence beside each link.
const NOTE_KEYS = (Object.keys(en) as (keyof typeof en)[]).filter((key) => key.startsWith('console.'));

test('console. is written in every language the dashboard is', () => {
  assert.equal(NOTE_KEYS.length, 44);
  assert.equal(NOTE_KEYS[0], 'console.nav');
  // Every sentence belongs to a link, and every link has one.
  const linked = Object.values(CONSOLE_LINKS).flat().map((link) => link.note);
  assert.deepEqual([...linked].sort(), NOTE_KEYS.filter((key) => key !== 'console.nav').sort());
  assert.deepEqual(Object.keys(CONSOLE).sort(), [...LANGUAGES].sort());
  for (const code of LANGUAGES) {
    const own = CONSOLE[code];
    assert.ok(own, code);
    assert.deepEqual(Object.keys(own).sort(), [...NOTE_KEYS].sort(), code);
    for (const key of NOTE_KEYS) {
      const value: string = own[key]!;
      assert.ok(value.trim() !== '' && value === value.trim() && !value.includes('  '), `${code} ${key}`);
      assert.equal(CATALOGUES[code]?.[key], value, `${code} ${key} is served`);
      assert.notEqual(value, en[key], `${code} ${key} is the English sentence`);
      // It follows the screen's name and a dash: no gap to fill, no code marks, no closing stop.
      assert.doesNotMatch(value, /[{}`]/u, `${code} ${key}`);
      assert.doesNotMatch(value, /[.。।۔]$/u, `${code} ${key} ends with a full stop`);
    }
    if (code.startsWith('zh')) assert.ok(!Object.values(own).join('').includes('您'), code);
    assert.equal(languageShownFor(code, 'console').code, code);
  }
  for (const code of Object.keys(HELD_FOR_REVIEW)) assert.equal(languageShownFor(code as never, 'console').code, 'en', code);
  // English: the same rules.
  for (const key of NOTE_KEYS) assert.doesNotMatch(en[key], /[{}`]|\.$/u, key);
  // French spacing before a colon, a semicolon and a question mark.
  for (const value of Object.values(CONSOLE.fr!)) assert.doesNotMatch(value, /[^\u00a0][:;?]\s|[^\u00a0][:;?]$/u, value);
});

test('the sentences keep the words the page above them uses', () => {
  for (const code of LANGUAGES) {
    const all = CATALOGUES[code]!;
    // The word in the navigation is the word over the page it opens.
    assert.equal(all['console.nav'], all['staff.eyebrow'], code);
    // The sentence beside "Payment disputes" is the queue's own, without its stop
    // (and without its capital, in the scripts that have one: it follows a dash).
    const low = (text: string) => text.toLocaleLowerCase(code);
    assert.equal(low(all['console.nDisputes']!), low(all['staff.dDisputes']!.replace(/[.。।۔]$/u, '')), code);
    // What a member of staff types or looks up stays in Latin letters.
    assert.ok(all['console.nScreenings']!.includes('platform.safeguarding'), code);
    assert.ok(all['console.nPanels']!.includes('governance.panel_required'), code);
    assert.ok(all['console.nInstitutions']!.includes('DNS'), code);
    // No two screens are described by one sentence.
    const notes = NOTE_KEYS.filter((key) => key !== 'console.nav').map((key) => all[key]!);
    assert.equal(new Set(notes).size, 43, code);
    // The ijazah register says "recorded" and never "verified": two quoted words, and they differ.
    const parts = all['console.nIjazah']!.split(/[“”«»「」„]/u);
    assert.equal(parts.length, 5, `${code}: ${all['console.nIjazah']}`);
    assert.notEqual(parts[1]!.trim(), parts[3]!.trim(), code);
    assert.ok(parts[1]!.trim() !== '' && parts[3]!.trim() !== '', code);
  }
  assert.equal(en['console.nav'], 'Admin');
  assert.equal(en['console.nDisputes'], en['staff.dDisputes'].replace(/\.$/u, '').replace(/^A/u, 'a'));
});
