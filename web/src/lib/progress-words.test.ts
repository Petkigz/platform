import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { formatNumber, translator } from './i18n/index.ts';
import { CATALOGUES } from './i18n/messages/catalogues.ts';
import { en } from './i18n/messages/en.ts';
import { PROGRESS } from './i18n/messages/progress.ts';
import {
  badgeProgress,
  courseSummary,
  streakHeadline,
  type Badge,
} from './progress-record.ts';
import { progressWords } from './progress-words.ts';

const badge = (over: Partial<Badge>): Badge => ({
  code: 'ten_lessons',
  name: 'Ten lessons',
  description: 'Finished ten lessons.',
  kind: 'lessons',
  have: 0,
  need: 10,
  unit: 'lesson',
  earned: false,
  earnedOn: null,
  ...over,
} as Badge);

const KEYS = (Object.keys(en) as (keyof typeof en)[]).filter((key) => key.startsWith('prog.'));
const LANGUAGES = [
  'ar', 'ur', 'fa', 'fa-af', 'tr', 'id', 'ms', 'bn', 'hi', 'fr', 'es', 'pt', 'sw', 'af',
  'zh-hans', 'zh-hant', 'vi', 'th', 'fil', 'uz', 'kk', 'az', 'tg', 'ky', 'tk', 'ta', 'ne',
] as const;

test('English says what the page always said', () => {
  const words = progressWords('en');
  // The same sentences `progress-record.ts` writes, which the page used to print.
  for (const [days, longest] of [[0, 0], [0, 5], [1, 1], [3, 5], [4, 4], [1, 9]] as const) {
    for (const who of ['you', 'they'] as const) {
      // One sentence was written again: "They finish a lesson to start one."
      // was an instruction to nobody.
      if (days === 0 && longest === 0 && who === 'they') continue;
      assert.equal(words.headline(days, longest, who), streakHeadline(days, longest, who), `${days}/${longest}/${who}`);
    }
  }
  assert.equal(words.headline(0, 0, 'they'), 'No streak yet. One finished lesson starts one.');
  for (const have of [0, 1, 8, 9, 10]) {
    for (const unit of ['lesson', 'course', 'certificate', 'day']) {
      const b = badge({ have, unit });
      assert.equal(words.badgeProgress(b), badgeProgress(b), `${have} ${unit}`);
    }
  }
  assert.equal(words.badgeProgress(badge({ earned: true, earnedOn: '2026-10-12' })), 'Earned 12 Oct');
  assert.equal(words.badgeProgress(badge({ earned: true })), 'Earned');
  for (const courses of [[], ['active'], ['active', 'active', 'completed'], ['completed']]) {
    const rows = courses.map((status) => ({ status }));
    assert.equal(words.courseSummary(rows as never), courseSummary(rows as never));
  }
  assert.equal(words.streak(0), 'No streak yet');
  assert.equal(words.streak(1), '1 day in a row');
  assert.equal(words.streak(12), '12 days in a row');
  assert.equal(words.day('2026-10-12'), '12 Oct');
  assert.equal(words.month('2026-10-12'), 'October');
  assert.equal([0, 1, 2, 3, 4, 5, 6].map(words.weekday).join(''), 'SMTWTFS');
});

test('the strip says three things and never "0 days in a row"', () => {
  const words = progressWords('en');
  assert.equal(
    words.strip({ streakDays: 2, longestStreakDays: 5, lessonsCompleted: 14 }, 'you'),
    '14 lessons finished · your best is 5 · come back tomorrow to keep it going',
  );
  assert.equal(
    words.strip({ streakDays: 0, longestStreakDays: 0, lessonsCompleted: 1 }, 'they'),
    '1 lesson finished · a lesson today would start one',
  );
  assert.equal(
    words.strip({ streakDays: 3, longestStreakDays: 3, lessonsCompleted: 3 }, 'they'),
    '3 lessons finished · one lesson tomorrow keeps it going',
  );
});

test('a badge is named by its code, and an unknown one is left to the database', () => {
  const words = progressWords('ar');
  assert.equal(words.badgeName({ code: 'first_lesson' }), PROGRESS.ar?.['prog.bFirstLesson']);
  assert.equal(words.badgeWhy({ code: 'thirty_day_streak' }), PROGRESS.ar?.['prog.bMonthWhy']);
  assert.equal(words.badgeName({ code: 'hundred_lessons' }), null);
  assert.equal(words.badgeWhy({ code: 'constructor' }), null);
  // Every badge the database has today has a name and a reason.
  const sql = readFileSync(
    new URL('../../../supabase/migrations/20261281000500_learner_progress_record.sql', import.meta.url),
    'utf8',
  );
  const codes = [...sql.matchAll(/^\s+\('([a-z_]+)',\s*'[^']+',\s*'[^']+',\s*'(?:lessons|courses|certificates|streak)'/gmu)].map((m) => m[1]!);
  assert.equal(codes.length, 8);
  for (const code of codes) {
    assert.ok(words.badgeName({ code }), code);
    assert.ok(words.badgeWhy({ code }), code);
  }
});

test('another language is given its digits, its plural and its calendar', () => {
  const ar = progressWords('ar');
  assert.equal(ar.streak(1), PROGRESS.ar!['prog.rowOne']!.replace('{count}', '1'));
  assert.equal(ar.streak(3), PROGRESS.ar!['prog.rowOther']!.replace('{count}', '3'));
  assert.equal(ar.day('2026-10-12'), '12 أكتوبر');
  // A count is always a digit in another language: "one" is not a word a
  // language whose singular covers 0 and 1, or 1, 2 and 3, can be handed.
  assert.equal(progressWords('fr').badgeProgress(badge({ have: 9 })), 'Encore 1 leçon');
  assert.equal(progressWords('fr').badgeProgress(badge({ have: 8 })), 'Encore 2 leçons');
  assert.equal(progressWords('fil').badgeProgress(badge({ have: 7 })), '3 pang aralin');
  assert.equal(progressWords('fa').streak(3), '۳ روز پیاپی');
  assert.equal(progressWords('fr').courseSummary([{ status: 'completed' }] as never), '1 terminé');
  assert.equal(progressWords('fr').courseSummary([{ status: 'completed' }, { status: 'completed' }] as never), '2 terminés');
  // One written unit for a weekday, whatever the script.
  for (const code of ['fil', 'ta', 'hi', 'ar', 'zh-hans', 'th'] as const) {
    for (let d = 0; d < 7; d += 1) {
      const letter = progressWords(code).weekday(d);
      const units = [...new Intl.Segmenter(code, { granularity: 'grapheme' }).segment(letter)].length;
      assert.equal(units, 1, `${code} ${d}: "${letter}"`);
    }
  }
});

test('all twenty-seven languages have every sentence, with the same blanks', () => {
  assert.equal(KEYS.length, 89);
  const blanks = (text: string) => (text.match(/\{[a-zA-Z]+\}/gu) ?? []).sort().join(' ');
  for (const code of LANGUAGES) {
    const part = PROGRESS[code];
    assert.ok(part, code);
    assert.deepEqual(Object.keys(part).sort(), [...KEYS].sort(), code);
    for (const key of KEYS) {
      assert.equal(blanks(part[key]!), blanks(en[key]), `${code} ${key}`);
      assert.equal(CATALOGUES[code]?.[key], part[key], `${code} ${key} is served`);
    }
    // The page is read by a translator and gets this language's sentence.
    assert.equal(translator(code)('prog.title'), part['prog.title']);
  }
  assert.equal(Object.keys(PROGRESS).length, 27);
});

test('the page, the view and the strip print no English of their own', () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
  const page = read('../app/progress/page.tsx');
  const view = read('../app/progress/progress-record-view.tsx');
  const strip = read('../components/engagement-strip.tsx');
  for (const [name, source] of [['page', page], ['view', view], ['strip', strip]] as const) {
    const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|\{\/\*[\s\S]*?\*\/\}/gu, '');
    for (const sentence of [
      'Progress and achievements', 'Become a learner', 'Not your record', 'Your progress', 'In total',
      'The last twelve weeks', 'Badges', 'Earned', 'Not yet', 'Find something new', 'This week', 'Streak',
      'finished', 'in a row', 'Back to my learning', 'My learning', 'Certificates', 'Revoked',
    ]) {
      // As the text of an element or as a string, not as part of a name.
      assert.doesNotMatch(code, new RegExp(`[>'"\`]\\s*${sentence}`, 'u'), `${name} still prints "${sentence}"`);
    }
    assert.doesNotMatch(code, /toLocaleDateString|describeStreak|engagementOffSentence|streakHeadline|WEEKDAY_INITIALS/u, name);
  }
  assert.match(page, /languageShownFor\(locale, 'prog'\)/u);
  assert.match(page, /code=\{shown\.code\}/u);
  // A name inside a sentence keeps its own direction; so does a time zone.
  assert.match(view, /<bdi>\{record\.displayName\}<\/bdi>/u);
  assert.match(view, /<bdi dir="ltr">\{record\.timezone\}<\/bdi>/u);
  assert.match(strip, /<bdi>\{subject\}<\/bdi>/u);
  // A badge with no words here is marked as the English it is.
  assert.match(strip, /lang="en" dir="ltr">\{badge\.name\}/u);
  // The two pages that draw the strip give it their language and no longer mark it English.
  assert.match(read('../app/learn/page.tsx'), /<EngagementStrip engagement=\{engagement\} code=\{shown\.code\} \/>/u);
  assert.match(read('../app/family/page.tsx'), /<EngagementStrip engagement=\{engagement\} subject=\{child\.displayName\} code=\{shown\.code\} \/>/u);
  assert.ok(!read('../app/family/page.tsx').includes('{...english}'));
});

test('a badge counted in something this page has no word for is not counted in lessons', () => {
  // Found by drawing the page, 2026-11-26: a unit the page did not know was
  // said as lessons, so "four more recitations" read "Four more lessons".
  for (const code of ['en', 'ar', 'sw', 'fr'] as const) {
    const words = progressWords(code);
    const known = words.badgeProgress(badge({ have: 6, need: 10, unit: 'lesson' }));
    const unknown = words.badgeProgress(badge({ have: 6, need: 10, unit: 'recitation' }));
    assert.notEqual(unknown, known, code);
    // The two numbers, held in one direction so "6 / 10" is not read "10 / 6".
    assert.match(unknown, /^\u2066\S+ \/ \S+\u2069$/u, code);
    // A name that is on every object is not a unit either.
    assert.equal(words.badgeProgress(badge({ have: 6, need: 10, unit: 'toString' })), unknown, code);
  }
  assert.equal(progressWords('en').badgeProgress(badge({ have: 6, need: 10, unit: 'recitation' })), '\u20666 / 10\u2069');
  // In the page's own digits, whichever those are.
  assert.equal(progressWords('ar').badgeProgress(badge({ have: 6, need: 10, unit: 'recitation' })), `\u2066${formatNumber('ar', 6)} / ${formatNumber('ar', 10)}\u2069`);
  // Earned is earned whatever it was counted in.
  assert.equal(progressWords('en').badgeProgress(badge({ have: 10, need: 10, unit: 'recitation' })), 'Earned');
});
