import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { noteFor } from './playback-standing.ts';

/**
 * The learner's own page.
 *
 * Every other screen was taught to say why a recording is missing. This one — the
 * only screen where the person looking can do nothing about it — printed one
 * sentence for six situations: *"uploaded, not yet encoded for playback"*. These
 * tests pin that the sentence is gone, that the replacement gives the learner a
 * decision rather than a status, and that silence is still available when the page
 * has not been told.
 */

const here = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(join(here, '..', path), 'utf8');

const lessonPage = read('app/learn/[enrolmentId]/lesson/[lessonId]/page.tsx');
const reportForm = read('app/learn/[enrolmentId]/lesson/[lessonId]/report-form.tsx');

test('the database sentence is gone from the learner’s page', () => {
  assert.ok(
    !lessonPage.includes('not yet encoded for playback'),
    'this was a column talking: six situations, one sentence, no way to tell them apart',
  );
  assert.ok(!/encoded|rendition|profile/i.test(lessonPage.split('return (')[1] ?? ''),
    'and no other machinery vocabulary reached the rendered copy');
});

test('the learner’s page asks the database in the learner’s own words', () => {
  assert.match(lessonPage, /rpc\('lesson_playback_standing', \{ p_lesson_id: lesson\.id \}\)/);
  assert.match(lessonPage, /parseStanding\(standingData\)/);
  assert.match(lessonPage, /noteFor\(standing\.get\(r\.id\)/);

  // The three-word function, not the six-state one: a learner must not be handed
  // the author's counts or the worker's failure text.
  assert.ok(!lessonPage.includes('version_delivery_state'));
  assert.ok(!lessonPage.includes('deliveryOf('));
});

test('a failed read still renders the lesson, quietly', () => {
  // `.then(..., () => null)` is the whole contract: no standing means no note,
  // and the resource renders exactly as it did before this existed. A page that
  // guessed here would accuse a working recording after a timeout.
  assert.match(lessonPage, /\.then\(\(result\) => result\.data, \(\) => null\)/);
  assert.match(lessonPage, /if \(!note\) \{/);
  assert.equal(noteFor(null), null);
});

test('the summary is said above the materials, and only to somebody entitled', () => {
  // A learner who reads the first line and stops is the one who most needs to
  // know whether to wait or to tell somebody.
  const summaryAt = lessonPage.indexOf('{summary && (');
  const materialsAt = lessonPage.indexOf('<h2>Materials</h2>');
  assert.ok(summaryAt > 0 && materialsAt > summaryAt, 'the summary comes before Materials');
  assert.match(lessonPage, /const summary = entitled/);
});

test('the only path to a person opens on the right category', () => {
  // A learner reporting a missing recording must not be shown a form that opens
  // on "doctrinal error": the dropdown decides how the report is routed, and a
  // routing mistake on a broken file is a queue nobody is watching.
  assert.match(lessonPage, /category="technical_fault"/);
  assert.match(reportForm, /category\?: ReportCategory/);
  assert.match(reportForm, /useState<ReportCategory>\(initialCategory\)/);
});

test('the report form is offered only where the copy says it helps', () => {
  // `tellSomeone` is the difference between "wait" and "tell us". Offering a form
  // beside a recording that is on its way through a queue trains people to file
  // reports nobody can act on.
  assert.match(lessonPage, /summary\.tellSomeone &&/);
  assert.match(lessonPage, /note\.tellSomeone &&/);
  assert.equal(noteFor('preparing')?.tellSomeone, false);
  assert.equal(noteFor('unavailable')?.tellSomeone, true);
});
