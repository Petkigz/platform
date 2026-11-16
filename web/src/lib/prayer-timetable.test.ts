import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { offsetName, timetableRows } from './prayer-timetable.ts';
import { calculatePrayerTimes } from './prayer-calculation.ts';

// The timetable used to repeat "Oct 15, 2026, 5:23 AM GMT+3" on all six rows.
// It now writes the date once in the heading and the zone once in the summary,
// which is only honest if the two cases where a row needs more are kept.

const at = (iso: string) => new Date(iso);

test('an ordinary day is six clock times sharing one offset', () => {
  // Kampala, 15 October 2026, UTC+3 with no daylight saving.
  const times = [
    ['Fajr', at('2026-10-15T02:23:00Z')], ['Sunrise', at('2026-10-15T03:32:00Z')],
    ['Dhuhr', at('2026-10-15T09:36:00Z')], ['Asr', at('2026-10-15T12:49:00Z')],
    ['Maghrib', at('2026-10-15T15:39:00Z')], ['Isha', at('2026-10-15T16:44:00Z')],
  ] as const;
  const { lines, sharedOffset } = timetableRows('en', 'Africa/Kampala', at('2026-10-15T09:00:00Z'), times);
  assert.equal(sharedOffset, 'GMT+3');
  assert.deepEqual(lines.map((l) => l.time), ['5:23 AM', '6:32 AM', '12:36 PM', '3:49 PM', '6:39 PM', '7:44 PM']);
  assert.ok(lines.every((l) => l.otherDay === '' && l.offset === ''));
  assert.deepEqual(lines.map((l) => l.name), ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']);
});

test('a time after midnight carries its own date, from a real calculation', () => {
  // London at the June solstice by the Muslim World League angles: twilight
  // never ends, so the middle-of-the-night rule puts Isha on the next day.
  const zone = 'Europe/London';
  const times = calculatePrayerTimes(51.5074, -0.1278, new Date(2026, 5, 21, 12), 'MuslimWorldLeague', 'standard', 'middle');
  assert.ok(times);
  const isha = times[5][1];
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: zone, dateStyle: 'short' });
  assert.notEqual(day.format(isha), day.format(times[2][1]), 'this fixture must put Isha after midnight');
  const { lines, sharedOffset } = timetableRows('en', zone, times[2][1], times);
  assert.equal(sharedOffset, 'GMT+1');
  assert.equal(lines[5]!.otherDay, 'Jun 22');
  assert.ok(lines.slice(0, 5).every((l) => l.otherDay === ''));
});

test('a day when the clocks change writes the offset on every row', () => {
  // 29 March 2026 in London: 00:30 is still GMT, 03:00 is already BST.
  const zone = 'Europe/London';
  const times = [['Before', at('2026-03-29T00:30:00Z')], ['After', at('2026-03-29T02:00:00Z')]] as const;
  const { lines, sharedOffset } = timetableRows('en', zone, at('2026-03-29T12:00:00Z'), times);
  assert.equal(sharedOffset, '');
  assert.deepEqual(lines.map((l) => l.offset), ['GMT', 'GMT+1']);
  assert.deepEqual(lines.map((l) => l.time), ['12:30 AM', '3:00 AM']);
});

test('times are written in the reader\'s language, and a bad tag falls back to English', () => {
  const times = [['Fajr', at('2026-10-15T02:23:00Z')]] as const;
  const now = at('2026-10-15T09:00:00Z');
  assert.equal(timetableRows('ar', 'Africa/Kampala', now, times).lines[0]!.time, new Intl.DateTimeFormat('ar', { timeZone: 'Africa/Kampala', hour: 'numeric', minute: '2-digit' }).format(times[0][1]));
  assert.notEqual(timetableRows('ar', 'Africa/Kampala', now, times).lines[0]!.time, '5:23 AM');
  assert.equal(timetableRows('not a tag', 'Africa/Kampala', now, times).lines[0]!.time, '5:23 AM');
  assert.equal(offsetName('not a tag', 'Africa/Kampala', now), 'GMT+3');
});

test('the tool renders rows from this module and still shows both qualifiers', () => {
  const tool = readFileSync(new URL('../app/companion/prayer-times/tool.tsx', import.meta.url), 'utf8');
  assert.match(tool, /timetableRows\(locale,zone,now,times\)/);
  assert.match(tool, /line\.otherDay/);
  assert.match(tool, /line\.offset/);
  // The zone's short name is never silently lost: either the summary has it…
  assert.match(tool, /rows\.sharedOffset \? `\$\{zone\} \(\$\{rows\.sharedOffset\}\)` : zone/);
  // …and a negative coordinate must stay typeable on a phone: a decimal keypad
  // has no minus sign, which would lock out the southern and western halves.
  assert.doesNotMatch(tool, /inputMode="decimal"/);
});
