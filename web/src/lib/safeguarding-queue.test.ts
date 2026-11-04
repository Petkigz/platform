import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSafeguardingConcerns, parseSafeguardingHistory } from './safeguarding-queue.ts';

const row = {
  review_id: 'review', asset_id: 'asset', note: 'A concern', reviewed_at: '2026-11-03',
  reviewer_name: 'Teacher', learner_name: null, course_title: null, details_unavailable: true,
};

test('a malformed queue is not silently rendered as an empty queue', () => {
  assert.equal(parseSafeguardingConcerns(null), null);
  assert.equal(parseSafeguardingConcerns([{}]), null);
  assert.deepEqual(parseSafeguardingConcerns([]), []);
  assert.deepEqual(parseSafeguardingConcerns([row]), [row]);
  assert.equal(parseSafeguardingHistory([row]), null);
  assert.equal(parseSafeguardingHistory([{ ...row, acknowledged_at: '2026-11-03' }])?.length, 1);
});

test('the page fetches the queue only for the configured owner and describes its limits', () => {
  const page = readFileSync('src/app/admin/coursework/page.tsx', 'utf8');
  assert.match(page, /isSafeguardingOwner\s*\? await supabase\.rpc\('safeguarding_concern_queue'/);
  assert.match(page, /does not mean it is resolved/);
  assert.match(page, /No email alert is connected/);
  assert.match(page, /Do not assume it is empty/);
  const action = readFileSync('src/app/admin/coursework/safeguarding-actions.ts', 'utf8');
  assert.match(action, /acknowledge_safeguarding_concern/);
  assert.match(action, /reopen_safeguarding_concern/);
  assert.match(page, /Older acknowledgements/);
  const home = readFileSync('src/app/admin/page.tsx', 'utf8');
  assert.match(home, /Safeguarding concerns are not included in these counts/);
  assert.doesNotMatch(home, /Every queue you can work was checked/);
});
