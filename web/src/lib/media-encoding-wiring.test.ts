import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { deliveryOf } from './media-encoding.ts';

/**
 * The screens that answer "does it play yet".
 *
 * `media-encoding.test.ts` pins the six verdicts. These tests pin the wiring that
 * would be wrong silently: a page reading `media_renditions` directly would see
 * nothing while a copy is still pending, and a page that never asked would keep
 * printing the master's status as if it were the answer.
 */

const here = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(join(here, '..', path), 'utf8');

const mediaPage = read('app/teach/media/page.tsx');
const previewPage = read('app/teach/[courseId]/preview/[lessonId]/page.tsx');
const previewLib = read('lib/lesson-preview.ts');

test('the media library asks for the delivery state rather than inferring it', () => {
  assert.match(mediaPage, /rpc\('my_media_delivery'\)/);
  assert.match(mediaPage, /deliveryOf\(delivery\.get\(asset\.id\)/);

  // Reading `media_renditions` here would answer a different question: the read
  // policy admits only copies that are `available`, so a queue and a failure
  // both look like "no renditions" from a page that asks the table.
  assert.ok(!mediaPage.includes("from('media_renditions')"), 'the library must not read renditions directly');

  // And the master's status must no longer be the whole answer.
  assert.ok(
    !/<span className="badge">Ready<\/span>/.test(mediaPage),
    '"Ready" on its own is the claim this page was built to stop making',
  );
  assert.match(mediaPage, /No player yet/);
  assert.match(mediaPage, /badge">Plays</);
});

test('the lesson preview asks for the delivery state of this lesson only', () => {
  assert.match(previewPage, /rpc\('lesson_delivery_state', \{ p_lesson_id: lesson\.id \}\)/);
  assert.ok(!previewPage.includes("from('media_renditions')"));
  // The three branches of that function are the same three as `may_watch_master`
  // — uploader, author, active reviewer — so a stranger's call returns no rows
  // rather than an error the page would have to distinguish from an empty one.
  assert.match(previewPage, /encoding: assetId === null \? null : \(delivery\.get\(assetId\) \?\? null\)/);
});

test('a failed delivery read still renders the lesson', () => {
  // An RPC that throws on an older deployment must not turn a preview into a 500
  // page. The upload then says the standing "when the copies are ready", which
  // promises nothing.
  assert.match(previewPage, /delivery state unavailable/);
  assert.match(previewPage, /\.then\(\s*\(result\) => result,\s*\(\) => \(\{ data: null/);
});

test('the preview does not call an uploaded file playable without being told', () => {
  // The rule lives in `lesson-preview.ts`: an address is its own evidence, an
  // uploaded file is not.
  assert.match(previewLib, /playback !== 'nothing' && playback !== 'uploaded'/);
  assert.match(previewLib, /deliveryOf\(row\.encoding \?\? null\)/);

  // And the stalled warning only fires on a known reason, so a preview whose
  // counts never arrived does not accuse the file of anything.
  assert.match(previewLib, /row\.holdUp !== null/);
});

test('both screens share one copy of the six verdicts', () => {
  // Two spellings of "is this playable" is how a lesson says a file plays while
  // the library says it does not.
  for (const page of [mediaPage, previewPage]) {
    assert.match(page, /from '@\/lib\/media-encoding'/);
  }

  const verdicts = ['plays', 'encoding', 'failed', 'silent', 'unverified', 'held'];
  for (const verdict of verdicts) {
    assert.ok(
      read('lib/media-encoding.ts').includes(`'${verdict}'`),
      `${verdict} is a state a screen can be in and the module must name it`,
    );
  }

  // A verified master with nothing encoded is the state that looks finished, and
  // it is not the same as a queue: they need different people.
  assert.equal(deliveryOf({ available: 0, pending: 0, failed: 0, videoReady: false, audioReady: false, failureReason: null })?.kind, 'silent');
  assert.equal(deliveryOf({ available: 0, pending: 1, failed: 0, videoReady: false, audioReady: false, failureReason: null })?.kind, 'encoding');
});
