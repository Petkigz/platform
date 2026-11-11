import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseSupportCleanupHoldStatus, parseSupportCleanupHolds, parseSupportCleanupHoldHistory, parseSupportHeldVersions } from './support-case-cleanup-hold.ts';

const row = {case_id:'00000000-0000-4000-8000-000000000001',case_number:'SC-000001',reason:'Review needed',opened_at:'2026-01-01T00:00:00Z'};
test('owner hold data is validated rather than treating a failed list as empty', () => {
  assert.equal(parseSupportCleanupHolds(null),null);
  assert.deepEqual(parseSupportCleanupHolds([]),[]);
  assert.equal(parseSupportCleanupHolds([row])?.[0]?.caseNumber,'SC-000001');
  assert.equal(parseSupportCleanupHolds([{...row,case_number:'../bad'}]),null);
  assert.equal(parseSupportCleanupHolds([{...row,opened_at:'invalid'}]),null);
  assert.deepEqual(parseSupportCleanupHoldStatus({held:false}),{held:false});
  assert.deepEqual(parseSupportCleanupHoldStatus({held:true,reason:row.reason,openedAt:row.opened_at}), {held:true,reason:row.reason,openedAt:row.opened_at});
  assert.equal(parseSupportCleanupHoldStatus({held:true}),null);
  assert.equal(parseSupportCleanupHoldStatus(null),null);
  assert.equal(parseSupportCleanupHoldHistory(null),null);
  assert.equal(parseSupportCleanupHoldHistory([{event_id:row.case_id,action:'held',reason:row.reason,occurred_at:row.opened_at}])?.length,1);
  assert.equal(parseSupportCleanupHoldHistory([{event_id:row.case_id,action:'unknown',reason:row.reason,occurred_at:row.opened_at}]),null);
});

test('pause controls are owner-only and describe their limits and uncertain results', () => {
  const page=readFileSync(new URL('../app/support/[caseNumber]/page.tsx',import.meta.url),'utf8');
  const action=readFileSync(new URL('../app/support/[caseNumber]/cleanup-hold-action.ts',import.meta.url),'utf8');
  const list=readFileSync(new URL('../app/admin/retention/page.tsx',import.meta.url),'utf8');
  assert.match(page, /owner && <section/);
  assert.match(page, /defers account-closure erasure/);
  assert.match(page, /releasing this pause deletes saved prior versions/);
  assert.match(page, /support_case_held_version_page/);
  assert.match(page, /Saved versions could not be loaded/);
  assert.match(page, /Existing support access still applies/);
  assert.match(page, /could not be confirmed/);
  assert.match(action, /change_support_case_cleanup_hold/);
  assert.match(action, /result\.error/);
  assert.match(list, /support_case_cleanup_hold_page/);
  assert.match(list, /Do not assume it is empty/);
});


test('held versions are bounded and checked before the owner sees them', () => {
  const version={version_id:row.case_id,source_kind:'case',source_id:row.case_id,captured_at:row.opened_at,content:{body:'Original'}};
  assert.equal(parseSupportHeldVersions([version])?.[0]?.content.body,'Original');
  assert.equal(parseSupportHeldVersions(null),null);
  assert.equal(parseSupportHeldVersions([{...version,source_kind:'unknown'}]),null);
  assert.equal(parseSupportHeldVersions([{...version,content:[]}]),null);
  assert.equal(parseSupportHeldVersions(Array(22).fill(version)),null);
});
