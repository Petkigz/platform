import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('unknown prior status requires an explicit owner choice and truthful warning', () => {
  const page = readFileSync(new URL('../app/admin/coursework/page.tsx', import.meta.url), 'utf8');
  const action = readFileSync(new URL('../app/admin/coursework/quarantine-actions.ts', import.meta.url), 'utf8');
  assert.match(page, /prior state is unknown and the upload still needs confirmation/);
  assert.match(page, /not a scan or storage verification/);
  assert.match(page, /Keep this file quarantined and investigate it individually/);
  assert.match(action, /review_unknown_coursework_quarantine/);
  assert.match(action, /catch\(\(\) => null\)/);
});
