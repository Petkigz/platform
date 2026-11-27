import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { isWrongAddress, throwUnlessWrongAddress } from './read-failed.ts';

const APP = new URL('../app/', import.meta.url).pathname;
const read = (path: string): string => readFileSync(join(APP, path), 'utf8');

function pages(dir = APP, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) pages(full, out);
    else if (name === 'page.tsx') out.push(full.slice(APP.length));
  }
  return out.sort();
}

/** A read whose error is thrown away: `const { data } = await supabase.from(…)` and its relatives. */
const DROPPED = /const \{ data(?:: [a-zA-Z]+)? \} = await supabase(?:\s*$|\.(?:from|rpc))/gmu;

test('an id that is not an id is a wrong address, and nothing else is', () => {
  assert.equal(isWrongAddress({ code: '22P02' }), true);
  assert.equal(isWrongAddress({ code: '42501' }), false);
  assert.equal(isWrongAddress({ code: null }), false);
  assert.equal(isWrongAddress(null), false);
  assert.doesNotThrow(() => throwUnlessWrongAddress(null));
  assert.doesNotThrow(() => throwUnlessWrongAddress({ code: '22P02', message: 'invalid input syntax for type uuid' }));
  assert.throws(() => throwUnlessWrongAddress({ code: '57014', message: 'canceling statement due to statement timeout' }), /statement timeout/u);
  assert.throws(() => throwUnlessWrongAddress({ message: 'fetch failed' }), /fetch failed/u);
});

// Surveyed on 2026-11-27: every `page.tsx` that reads with the error thrown
// away. A learner's page that does this says "not found", "none" or "not
// yours" about something it never read. What is left is listed here with the
// reason it is left, so a new one has to be argued for rather than slipped in.
test('no learner page says "none" about a read it threw the error of', () => {
  const left: Record<string, string> = {
    // The title of the tab only; the page itself reads again and decides.
    'courses/[slug]/page.tsx': 'metadata',
    'policies/[slug]/page.tsx': 'metadata',
    // A child's own login: null draws the form, and the database decides.
    'family/page.tsx': 'the form is drawn and the database decides',
    // Whether a lesson may be saved to the device: unread is no button.
    'learn/[enrolmentId]/lesson/[lessonId]/page.tsx': 'an optional button',
    // The reader's time zone (unread is UTC, and the zone is printed) and
    // whether a recording may be watched (unread is no link).
    'live/[sessionId]/page.tsx': 'a zone that is printed, and an optional link',
    // Whether the reader is staff: unread is the requester's view of their own case.
    'support/[caseNumber]/page.tsx': 'a gate that fails closed',
  };
  const found = new Map<string, number>();
  for (const page of pages()) {
    if (/^(?:admin|teach|review)\//u.test(page)) continue;
    const count = (read(page).match(DROPPED) ?? []).length;
    if (count > 0) found.set(page, count);
  }
  assert.deepEqual([...found.keys()], Object.keys(left).sort());
  assert.equal([...found.values()].reduce((a, b) => a + b, 0), 8);
});

test('the reads that were said as "none" now throw', () => {
  const child = read('family/[childId]/page.tsx');
  assert.match(child, /throwUnlessWrongAddress\(learnerError\);/u);
  assert.match(child, /if \(coursesError\) throw new Error\(coursesError\.message\);/u);

  const buy = read('courses/[slug]/buy/page.tsx');
  assert.match(buy, /if \(courseError\) throw new Error\(courseError\.message\);/u);
  assert.match(buy, /if \(learnersError\) throw new Error\(learnersError\.message\);/u);

  const lesson = read('learn/[enrolmentId]/lesson/[lessonId]/page.tsx');
  assert.match(lesson, /throwUnlessWrongAddress\(enrolmentError\);/u);
  assert.match(lesson, /if \(profileError\) throw new Error\(profileError\.message\);/u);

  const live = read('live/[sessionId]/page.tsx');
  assert.match(live, /throwUnlessWrongAddress\(sessionError\);/u);
  assert.match(live, /if \(rollError\) throw new Error\(rollError\.message\);/u);
  assert.match(live, /if \(mineError\) throw new Error\(mineError\.message\);/u);

  assert.match(read('family/guardians/page.tsx'), /if \(membershipsError\) throw new Error\(membershipsError\.message\);/u);
  assert.match(read('account/delete/page.tsx'), /if \(error\) throw new Error\(error\.message\);\n\n? *if \(!data\) redirect\('\/learn'\);/u);

  // A child's courses and a course's assessments: unread is said as unread.
  const family = read('family/page.tsx');
  assert.match(family, /courses: await fetchChildCourses\(supabase, c\.id\)\.catch\(\(\) => null\),/u);
  assert.match(family, /\{courses === null \? \(\s+<p className="notice warn" style=\{\{ marginBottom: 0 \}\}>\{t\('subs\.partUnread'\)\}<\/p>/u);
  const course = read('learn/[enrolmentId]/page.tsx');
  assert.match(course, /fetchAssessmentsForVersion\(supabase, enrolment\.course_version_id\)\.catch\(\(\) => null\),/u);
  assert.match(course, /\{assessmentsOn && assessments === null && <div className="notice warn">\{t\('subs\.partUnread'\)\}<\/div>\}/u);

  // Three on the staff desk, where "nothing waiting" is a promise kept.
  assert.match(read('admin/retention/page.tsx'), /if \(queueError\) throw new Error\(queueError\.message\);/u);
  assert.match(read('admin/refunds/page.tsx'), /if \(windowError\) throw new Error\(windowError\.message\);/u);
  assert.match(read('admin/media/page.tsx'), /if \(storageError\) throw new Error\(storageError\.message\);/u);
});

test('what is still open on the staff and teaching pages is counted, so it can only go down', () => {
  let gates = 0;
  let others = 0;
  for (const page of pages()) {
    if (!/^(?:admin|teach|review)\//u.test(page)) continue;
    const source = read(page);
    for (const match of source.matchAll(DROPPED)) {
      const after = source.slice(match.index, match.index + 160);
      if (/rpc\('(?:is_privileged|has_role|can_[a-z_]+|may_[a-z_]+)'/u.test(after)) gates += 1;
      else others += 1;
    }
  }
  // A gate that drops its error fails closed: the page says "not allowed".
  // That is wrong about why, and safe. The others are reads of a list or a
  // row on a staff or teaching page and are the ones still to look at.
  assert.equal(gates, 31);
  assert.equal(others, 17);
});
