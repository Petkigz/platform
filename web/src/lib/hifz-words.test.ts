import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import type { HifzPassage, HifzRecord } from './hifz.ts';
import { HIFZ_REFUSALS, aroundLabel, hifzOutcomeOf } from './hifz-board-words.ts';
import { hifzWords } from './hifz-words.ts';
import { en } from './i18n/messages/en.ts';
import { HIFZ } from './i18n/messages/hifz.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
/** The runtime puts a no-break space between a number and its unit. */
const plain = (said: string) => said.replace(/\s/gu, ' ');
const LANGUAGES = Object.keys(HIFZ);

const passage = (over: Partial<HifzPassage> = {}): HifzPassage => ({
  id: 'p1',
  label: 'Al-Fatihah 1–7',
  status: 'learning',
  rung: 0,
  intervalDays: 1,
  nextDueOn: '2026-10-29',
  lastReviewedOn: null,
  reviewCount: 0,
  lapses: 0,
  daysUntilDue: 0,
  ...over,
});

const record = (counts: { passages: number; due: number; memorised: number }): HifzRecord => ({
  enabled: true,
  learnerId: 'l',
  counts,
});

test('dates read as dates, including the overdue ones', () => {
  const words = hifzWords('en');
  assert.equal(words.due(0), 'Due today');
  assert.equal(words.due(1), 'Due tomorrow');
  assert.equal(words.due(12), 'Due in 12 days');
  assert.equal(words.due(-1), '1 day overdue');
  assert.equal(words.due(-9), '9 days overdue');

  const french = hifzWords('fr');
  assert.equal(plain(french.due(12)), 'À revoir dans 12 jours');
  assert.equal(plain(french.due(-1)), '1 jour de retard');
  assert.equal(plain(hifzWords('sw').due(3)), 'Cha kurudia baada ya siku 3');
  assert.equal(plain(hifzWords('tr').due(-2)), '2 gün gecikti');
  // Tajik has no unit data in the runtime; "3 d" is not a word.
  assert.equal(plain(hifzWords('tg').due(3)), 'Такрор пас аз 3 рӯз');
  assert.equal(plain(hifzWords('tg').days(1)), '1 рӯз');
  // Chinese takes no space before the word that follows the length.
  assert.equal(hifzWords('zh-hans').due(3), '3天后到期');
  assert.equal(hifzWords('zh-hant').due(-2), '已逾期2天');
  // Arabic: the length follows a preposition, so two days is "يومين", not "يومان".
  const arabic = hifzWords('ar');
  assert.equal(arabic.due(2), 'مستحق بعد يومين');
  assert.equal(arabic.due(-1), 'متأخر منذ يوم واحد');
  assert.equal(arabic.due(7), 'مستحق بعد 7 أيام');
  assert.equal(arabic.due(-16), 'متأخر منذ 16 يومًا');
  assert.equal(arabic.days(100), '100 يوم');
  assert.equal(arabic.days(103), '103 أيام');
});

test('no language is left with a hole or with the English length of time', () => {
  for (const code of LANGUAGES) {
    const words = hifzWords(code as never);
    const said = [
      words.due(0), words.due(1), words.due(5), words.due(-4),
      words.line(passage({ reviewCount: 1, intervalDays: 3, lapses: 1 })),
      words.line(passage({ reviewCount: 6, intervalDays: 16, lapses: 2 })),
      words.summary(record({ passages: 4, due: 2, memorised: 1 })),
      words.summary(record({ passages: 1, due: 1, memorised: 0 })),
      words.summary(record({ passages: 0, due: 0, memorised: 0 })),
      words.ladder([1, 3, 7, 16, 35, 75, 160]),
      words.ladder(undefined),
    ];
    for (const sentence of said) {
      assert.equal(/[{}]/.test(sentence), false, `${code}: ${sentence}`);
      assert.equal(/\bdays?\b/.test(sentence), false, `${code} counts days in English: ${sentence}`);
      assert.notEqual(sentence.trim(), '', code);
    }
    assert.notEqual(words.due(0), 'Due today', `${code} says it in English`);
  }
});

test('the head of the page counts passages instead of praising or scolding', () => {
  const words = hifzWords('en');
  assert.equal(
    words.summary(record({ passages: 0, due: 0, memorised: 0 })),
    'Nothing is on your list yet. Add the first passage you are memorising.',
  );
  assert.equal(words.summary({}), words.summary(record({ passages: 0, due: 0, memorised: 0 })));
  assert.equal(
    words.summary(record({ passages: 4, due: 0, memorised: 2 })),
    '4 passages. 2 of them memorised. Nothing is due today.',
  );
  assert.equal(words.summary(record({ passages: 1, due: 1, memorised: 0 })), '1 passage. One is due today.');
  assert.equal(words.summary(record({ passages: 3, due: 3, memorised: 0 })), '3 passages. 3 are due today.');

  // French counts nought as singular; "one is due" is still said for one only.
  const french = hifzWords('fr');
  assert.equal(
    french.summary(record({ passages: 2, due: 1, memorised: 0 })),
    '2 passages. Un passage est à revoir aujourd’hui.',
  );
  assert.equal(
    french.summary(record({ passages: 2, due: 0, memorised: 0 })),
    '2 passages. Rien n’est à revoir aujourd’hui.',
  );
  // Chinese sentences end in their own full stop and take no space between them.
  assert.equal(
    hifzWords('zh-hans').summary(record({ passages: 4, due: 0, memorised: 2 })),
    '4 段。其中已背熟：2。今天没有到期的。',
  );
  // No language was given a word that judges.
  for (const code of ['en', ...LANGUAGES]) {
    const said = hifzWords(code as never).summary(record({ passages: 9, due: 9, memorised: 0 }));
    assert.equal(/fail|missed|behind|wrong|streak/i.test(said), false, `${code}: ${said}`);
  }
});

test('the line under a passage says how often, when next, and how often it went back', () => {
  const words = hifzWords('en');
  assert.equal(words.line(passage()), 'Not reviewed yet. Next in 1 day.');
  assert.equal(words.line(passage({ reviewCount: 1, intervalDays: 3 })), 'Reviewed 1 time. Next in 3 days.');
  assert.equal(
    words.line(passage({ reviewCount: 4, intervalDays: 7, lapses: 1 })),
    'Reviewed 4 times. Next in 7 days. Once it needed bringing back to the start.',
  );
  assert.equal(
    words.line(passage({ reviewCount: 9, intervalDays: 1, lapses: 3 })),
    'Reviewed 9 times. Next in 1 day. 3 times it needed bringing back to the start.',
  );
  // A payload with no interval still names a day, not "0 days".
  assert.equal(words.line(passage({ intervalDays: 0 })), 'Not reviewed yet. Next in 1 day.');
  // "Once" is for one and no other count, in a language where nought is singular too.
  const french = hifzWords('fr');
  assert.equal(french.line(passage({ reviewCount: 2, intervalDays: 3 })).includes('ramener'), false);
  assert.match(french.line(passage({ reviewCount: 2, intervalDays: 3, lapses: 1 })), /Il a fallu une fois/);
  assert.match(french.line(passage({ reviewCount: 2, intervalDays: 3, lapses: 2 })), /Il a fallu 2 fois/);
});

test('the schedule sentence uses the numbers from the database', () => {
  const words = hifzWords('en');
  const sentence = words.ladder([1, 3, 7, 16, 35, 75, 160]);
  assert.match(sentence, /\(1 day, 3 days, 7 days, 16 days, 35 days, 75 days, 160 days\)/);
  assert.match(sentence, /^Every passage starts at 1 day\./);
  assert.match(sentence, /puts it back to 1 day\. The steps stop at 160 days\.$/);
  // A different ladder in SQL is a different sentence here, with no copy to drift.
  assert.match(words.ladder([2, 5]), /starts at 2 days\..*\(2 days, 5 days\).*stop at 5 days\.$/);
  // Without a ladder the sentence still says something true rather than nothing.
  assert.match(words.ladder(undefined), /back tomorrow/);
  assert.equal(words.ladder([]), words.ladder(undefined));
  assert.equal(words.ladder([0, -3]), words.ladder(undefined));

  // Seven lengths read as seven, in a language whose own unit list glues them.
  assert.match(plain(hifzWords('tr').ladder([1, 3, 7])), /\(1 gün, 3 gün, 7 gün\)/);
  assert.match(hifzWords('zh-hans').ladder([1, 3, 7]), /（1天、3天、7天）/);
  assert.match(plain(hifzWords('ar').ladder([1, 3, 7])), /،/);
});

test('every name the route answers by has a sentence, in every language', () => {
  const english = hifzWords('en').refusals;
  assert.equal(english.already_exists, 'That is already on the list.');
  assert.equal(english.not_allowed, 'You can only keep a list for yourself or for a learner in your family.');
  assert.equal(english.refused, 'That could not be saved. Try again.');
  // The example is the one in the form, written once.
  assert.equal(english.label_required, 'Write what the passage is — “Al-Fatihah 1–7” is enough.');
  assert.match(read('../app/hifz/hifz-board.tsx'), /placeholder=\{HIFZ_EXAMPLE\}/);
  assert.match(english.unconfirmed, /could not confirm/);
  assert.match(english.not_signed_in, /Sign in again/);
  for (const code of LANGUAGES) {
    const refusals = hifzWords(code as never).refusals;
    for (const name of [...HIFZ_REFUSALS, 'unconfirmed'] as const) {
      const said = refusals[name];
      assert.equal(typeof said === 'string' && said.trim() !== '', true, `${code} ${name}`);
      assert.notEqual(said, english[name], `${code} says ${name} in English`);
      assert.equal(/[{}]/.test(said), false, `${code} ${name} has a hole in it`);
    }
  }
  // The names the database raises, as the migration writes them.
  const sql = read('../../../supabase/migrations/20261281002900_hifz_tracker.sql');
  const raised = new Set([...sql.matchAll(/'hifz:([a-z_]+)'/g)].map((m) => String(m[1])));
  assert.equal(raised.size > 0, true);
  for (const name of raised) {
    assert.equal(HIFZ_REFUSALS.includes(name as never), true, `no sentence for hifz:${name}`);
  }
});

test('only an answer in the four hundreds with a known name is a refusal', () => {
  assert.equal(hifzOutcomeOf(400, 'already_exists'), 'already_exists');
  assert.equal(hifzOutcomeOf(401, 'not_signed_in'), 'not_signed_in');
  assert.equal(hifzOutcomeOf(400, 'refused'), 'refused');
  // No reply, a five hundred, a page from something in front of the site.
  assert.equal(hifzOutcomeOf(0, undefined), 'unconfirmed');
  assert.equal(hifzOutcomeOf(502, 'unconfirmed'), 'unconfirmed');
  assert.equal(hifzOutcomeOf(503, 'not_configured'), 'unconfirmed');
  assert.equal(hifzOutcomeOf(500, 'already_exists'), 'unconfirmed');
  assert.equal(hifzOutcomeOf(200, 'already_exists'), 'unconfirmed');
  // A name nobody wrote a sentence for is not printed and not guessed at.
  assert.equal(hifzOutcomeOf(400, 'something_new'), 'unconfirmed');
  assert.equal(hifzOutcomeOf(400, 'constructor'), 'unconfirmed');
  assert.equal(hifzOutcomeOf(400, null), 'unconfirmed');
});

test('the board is handed whole sentences, by passage', () => {
  const words = hifzWords('fr').board({
    enabled: true,
    learnerId: 'l',
    ladder: [1, 3, 7],
    counts: { passages: 2, due: 1, memorised: 1 },
    passages: [
      passage({ id: 'a', daysUntilDue: 0 }),
      passage({ id: 'b', daysUntilDue: 5, reviewCount: 3, intervalDays: 7, status: 'memorised' }),
    ],
  });
  assert.deepEqual(Object.keys(words.passages), ['a', 'b']);
  assert.equal(words.passages.a?.due, 'À revoir aujourd’hui');
  assert.equal(plain(words.passages.b?.due ?? ''), 'À revoir dans 5 jours');
  assert.equal(plain(words.passages.b?.line ?? ''), 'Révisé 3 fois. Prochaine révision dans 7 jours.');
  assert.equal(words.title, 'Mémorisation');
  assert.equal(words.solid.label, 'Solide');
  assert.equal(words.shaky.label, 'Fragile');
  // Nothing the board is handed still has a hole in it, but for the name of a passage.
  const flat = JSON.stringify({ ...words, movedOn: '', backTomorrow: '', archived: '' });
  assert.equal(/\{[a-zA-Z]+\}/.test(flat), false);
  for (const sentence of [words.movedOn, words.backTomorrow, words.archived]) {
    assert.equal(sentence.split('{label}').length, 2, sentence);
  }
  assert.deepEqual(aroundLabel('« {label} » : de retour à demain.'), ['« ', ' » : de retour à demain.']);
  assert.deepEqual(aroundLabel('Added.'), ['Added.', '']);
});

test('the page, the board, the route and the card carry no sentence of their own', () => {
  const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const page = code(read('../app/hifz/page.tsx'));
  const board = code(read('../app/hifz/hifz-board.tsx'));
  const route = code(read('../app/api/hifz/route.ts'));
  const learn = code(read('../app/learn/page.tsx'));

  assert.match(page, /languageShownFor\(locale, 'hifz'\)/);
  assert.match(page, /hifzWords\(shown\.code\)/);
  assert.match(page, /words=\{words\.board\(record\)\}/);
  for (const gone of ['My learning', 'Memorisation', 'Not your list', 'Become a learner', 'not switched on', 'could not be read']) {
    assert.equal(page.includes(gone), false, `the page still says "${gone}" itself`);
  }

  // A browser may not import the catalogues.
  assert.doesNotMatch(board, /from '@\/lib\/(i18n|hifz-words)/);
  assert.match(board, /from '@\/lib\/hifz-board-words'/);
  assert.doesNotMatch(read('./hifz-board-words.ts'), /^import /m);
  assert.doesNotMatch(read('./hifz.ts'), /^import /m);
  for (const gone of [
    'Due today', 'Coming up', 'Add a passage', 'Add it', 'Solid', 'Shaky', 'Memorised', 'Keep it',
    'Take it off', 'Reviewed', 'Next in', 'My learning', 'did not reach the server', 'Back to',
  ]) {
    assert.equal(board.includes(gone), false, `the board still says "${gone}" itself`);
  }
  // What the route sent as a sentence is not read, let alone printed.
  assert.doesNotMatch(board, /\.message/);
  assert.match(board, /hifzOutcomeOf\(status, body\?\.code\)/);
  assert.match(board, /words\.refusals\[error\]/);
  // The name of a passage is set apart inside the sentence about it.
  assert.match(board, /<bdi>\{notice\.label\}<\/bdi>/);

  // The route answers by name; nothing the database wrote leaves it.
  assert.doesNotMatch(route, /message:/);
  assert.doesNotMatch(route, /error\.message/);
  assert.match(route, /hifzRefusalOf\(error\)/);

  // The card on the dashboard: the last English part of it is gone.
  assert.match(learn, /t\('hifz\.title'\)/);
  assert.match(learn, /t\('hifz\.cardBody'\)/);
  assert.match(learn, /t\('hifz\.cardLink'\)/);
  assert.doesNotMatch(learn, /\{\.\.\.english\}|Open your memorisation list/);
  assert.equal(en['hifz.title'], 'Memorisation');
});
