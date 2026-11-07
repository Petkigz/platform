import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('coursework UI describes the working file path without claiming a malware scan', () => {
  const teacher = readFileSync(new URL('../app/teach/[courseId]/assignments/assignment-manager.tsx', import.meta.url), 'utf8');
  const owner = readFileSync(new URL('../app/admin/coursework/page.tsx', import.meta.url), 'utf8');
  const route = readFileSync(new URL('../app/api/media/route.ts', import.meta.url), 'utf8');
  const verification = readFileSync(new URL('./media-verify.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(teacher, /file-viewer\s+path is not connected yet/);
  assert.match(teacher, /Files are not currently scanned for malware/);
  assert.match(owner, /have not been scanned for malware/);
  assert.match(route, /contentVerified: false/);
  assert.match(route, /malwareScanned: false/);
  assert.match(verification, /same-size replacement/);
  assert.match(verification, /coursework transition is reserved to the server/);
});
