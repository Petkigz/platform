import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { REASON_LABEL } from './live.ts';
import { doorRefusal } from './live-door.ts';
import { liveWords } from './live-words.ts';
import { en } from './i18n/messages/en.ts';
import { LIVE } from './i18n/messages/live.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const STARTS = '2026-11-03T16:00:00.000Z';

test('a class is said at the hour the teacher set, with the reader’s own beside it', () => {
  const words = liveWords('en');
  const both = words.when(STARTS, 'Africa/Kampala', 'Europe/London');
  assert.match(both, /19:00 \(Africa\/Kampala\) · .*16:00 your time$/);
  // One zone is said once.
  const one = words.when(STARTS, 'Africa/Kampala', 'Africa/Kampala');
  assert.match(one, /19:00 \(Africa\/Kampala\)$/);
  assert.equal(words.when(STARTS, 'Africa/Kampala'), one);
  // A zone the runtime does not know still prints something true.
  assert.equal(words.when(STARTS, 'Not/AZone'), '2026-11-03 16:00 (Not/AZone)');

  const french = liveWords('fr').when(STARTS, 'Africa/Kampala', 'Europe/London');
  assert.match(french, /^mar\. 3 nov\.,? 19:00 \(Africa\/Kampala\) · mar\. 3 nov\.,? 16:00, heure de chez vous$/);
  const arabic = liveWords('ar').when(STARTS, 'Africa/Kampala', 'Europe/London');
  assert.match(arabic, /بتوقيتك$/);
  assert.equal(arabic.includes('{'), false);
});

test('how long a class lasts is counted by the language, not glued', () => {
  const words = liveWords('en');
  assert.equal(words.length(STARTS, '2026-11-03T16:45:00.000Z'), '45 minutes');
  assert.equal(words.length(STARTS, '2026-11-03T17:00:00.000Z'), '1 hour');
  assert.equal(words.length(STARTS, '2026-11-03T18:30:00.000Z'), '2 hours, 30 minutes');
  assert.equal(words.minutes(1), '1 minute');
  // An end before the start is no time at all, not a negative one.
  assert.equal(words.length(STARTS, '2026-11-03T15:00:00.000Z'), '0 minutes');
  // The runtime puts a no-break space between a number and its unit.
  const plain = (said: string) => said.replace(/\s/gu, ' ');
  assert.equal(plain(liveWords('fr').minutes(150)), '2 heures et 30 minutes');
  assert.equal(plain(liveWords('sw').minutes(45)), 'dakika 45');
  assert.equal(liveWords('en').clock('2026-11-03T16:05:00.000Z', 'Africa/Kampala'), '19:05');
});

test('every reason the English library knows has a sentence here, and the same one', () => {
  const words = liveWords('en');
  for (const [name, sentence] of Object.entries(REASON_LABEL)) {
    assert.equal(words.reason(name), sentence, name);
    assert.equal(words.door.reasons[name], sentence, name);
  }
  assert.equal(words.reason('something_new'), 'This room is not open.');
  assert.equal(words.reason(null), null);
  assert.equal(words.reason(''), null);
  for (const code of Object.keys(LIVE)) {
    const other = liveWords(code as never);
    for (const name of Object.keys(REASON_LABEL)) {
      assert.notEqual(other.reason(name), REASON_LABEL[name], `${code} says ${name} in English`);
    }
  }
});

test('the door says a named reason, and makes no claim when it got no answer', () => {
  const door = liveWords('fr').door;
  assert.equal(doorRefusal(door, 'not_open_yet'), 'La salle ouvre peu avant le début du cours.');
  assert.equal(doorRefusal(door, 'no_room_host'), 'Les salles en direct ne sont pas encore connectées ; la salle ne peut donc pas ouvrir.');
  // A reason this build has no words for is "not open", never the name itself.
  assert.equal(doorRefusal(door, 'something_new'), 'Cette salle n’est pas ouverte.');
  assert.equal(doorRefusal(door, 'constructor'), 'Cette salle n’est pas ouverte.');
  // An error from the database, or no reply: nothing is known about the room.
  assert.equal(doorRefusal(door, 'refused'), 'La salle n’a pas pu être ouverte pour l’instant. Réessayez.');
  assert.equal(doorRefusal(door, undefined), door.failed);
  assert.equal(doorRefusal(door, null), door.failed);
});

test('the pages and the two buttons carry no sentence of their own', () => {
  const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const page = code(read('../app/live/[sessionId]/page.tsx'));
  const door = read('../app/live/[sessionId]/join-button.tsx');
  const roll = read('../app/live/[sessionId]/attendance.tsx');
  const learn = code(read('../app/learn/page.tsx'));

  assert.match(page, /languageShownFor\(locale, 'live'\)/);
  assert.match(page, /liveWords\(shown\.code\)/);
  assert.doesNotMatch(page, /from '@\/lib\/live'/);
  for (const gone of ['The recording', 'Who came', 'The room', 'Back to the course', 'still in the room', 'My learning', 'This class was cancelled']) {
    assert.equal(page.includes(gone), false, `the page still says "${gone}" itself`);
  }
  // What a teacher wrote is set apart, on both pages.
  assert.match(page, /<bdi>\{session\.cancelled_reason\}<\/bdi>/);
  assert.match(learn, /<bdi>\{session\.cancelled_reason\}<\/bdi>/);
  assert.match(learn, /t\('live\.heading'\)/);
  assert.doesNotMatch(learn, /describeWhen|describeReason|you were there|Live classes/);

  // A browser may not import the catalogues.
  for (const [name, source] of [['the door', door], ['the roll', roll]] as const) {
    assert.doesNotMatch(source, /from '@\/lib\/(i18n|live-words)/, `${name} imports the catalogues`);
    assert.match(source, /from '@\/lib\/live-door'/);
  }
  assert.doesNotMatch(read('./live-door.ts'), /^import /m);
  assert.doesNotMatch(door, /result\.message|Enter the room|Opening…|This room is not open/);
  assert.match(door, /doorRefusal\(words, result\?\.reason\)/);
  assert.doesNotMatch(roll, /rpcError\.message|Mark left|>Left</);
  assert.equal(en['live.rShut'], 'This room is not open.');
});
