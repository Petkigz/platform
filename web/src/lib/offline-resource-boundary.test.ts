import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('offline downloads book and verify the specific selected resource', () => {
  const player = readFileSync(new URL('../app/_shared/rendition-player.tsx', import.meta.url), 'utf8');
  const route = readFileSync(new URL('../app/api/media/download/route.ts', import.meta.url), 'utf8');
  assert.match(player, /save_offline_lesson_for_resource/);
  assert.match(player, /p_resource_id: resourceId/);
  assert.match(player, /save: String\(saved\.downloadId/);
  assert.match(route, /offline_booking_matches_resource/);
  assert.match(route, /p_download_id: saveId/);
  assert.match(route, /p_resource_id: chosenResource\.id/);
  assert.match(route, /matchesBooking !== true/);
});

test('vault keys require current entitlement beyond row visibility', () => {
  const route = readFileSync(new URL('../app/api/offline/key/route.ts', import.meta.url), 'utf8');
  assert.match(route, /offline_save_key_allowed/);
  assert.match(route, /allowed !== true/);
  assert.match(route, /Access to this saved lesson could not be checked/);
});

test('the current network requirement for opening saved lessons is visible', () => {
  const downloads = readFileSync(new URL('../app/downloads/page.tsx', import.meta.url), 'utf8');
  const offline = readFileSync(new URL('./offline.ts', import.meta.url), 'utf8');
  assert.match(downloads, /connection is currently required/);
  assert.match(offline, /Connect to the internet to open this saved lesson/);
});
