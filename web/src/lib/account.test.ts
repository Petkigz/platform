import assert from 'node:assert/strict';
import test from 'node:test';
import {
  exportFileName,
  saveAccountProfile,
  validateAccountProfile,
} from './account.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

const valid = { displayName: ' Amina Yusuf ', preferredLanguage: 'en-GB', timezone: 'Africa/Kampala' };

test('account profile accepts a trimmed name, supported language code and IANA timezone', () => {
  assert.equal(validateAccountProfile(valid), null);
});

test('account profile refuses blank or overlong display names', () => {
  assert.match(validateAccountProfile({ ...valid, displayName: '   ' }) ?? '', /name/i);
  assert.match(validateAccountProfile({ ...valid, displayName: 'x'.repeat(81) }) ?? '', /under 80/i);
});

test('account profile validates language format and time zone', () => {
  assert.match(validateAccountProfile({ ...valid, preferredLanguage: 'English' }) ?? '', /language code/i);
  assert.match(validateAccountProfile({ ...valid, timezone: 'Mars/Olympus' }) ?? '', /IANA time zone/i);
});

test('saveAccountProfile updates only editable fields for the session user', async () => {
  const calls: { method: string; value: unknown }[] = [];
  const result = { data: { display_name: 'Amina Yusuf', preferred_language: 'en-GB', timezone: 'Africa/Kampala' }, error: null };
  const chain = {
    update(value: unknown) { calls.push({ method: 'update', value }); return this; },
    eq(field: string, value: unknown) { calls.push({ method: `eq:${field}`, value }); return this; },
    select(value: string) { calls.push({ method: 'select', value }); return this; },
    async maybeSingle() { return result; },
  };
  const client = { from: (table: string) => { calls.push({ method: 'from', value: table }); return chain; } } as unknown as SupabaseClient;
  const saved = await saveAccountProfile(client, 'user-1', valid);
  assert.deepEqual(saved, { ok: true, profile: result.data });
  assert.deepEqual(calls, [
    { method: 'from', value: 'user_profiles' },
    { method: 'update', value: { display_name: 'Amina Yusuf', preferred_language: 'en-GB', timezone: 'Africa/Kampala' } },
    { method: 'eq:user_id', value: 'user-1' },
    { method: 'select', value: 'display_name, preferred_language, timezone' },
  ]);
});

test('invalid or signed-out profile updates never reach the database', async () => {
  let touched = false;
  const client = { from: () => { touched = true; throw new Error('must not query'); } } as unknown as SupabaseClient;
  assert.equal((await saveAccountProfile(client, '', valid)).ok, false);
  assert.equal((await saveAccountProfile(client, 'user-1', { ...valid, displayName: '' })).ok, false);
  assert.equal(touched, false);
});

// ---------------------------------------------------------------------------
// Data export filename
// ---------------------------------------------------------------------------

test('the export filename is dated and safe to put in a header', () => {
  // Dated so two downloads do not overwrite each other, and ASCII-only so no browser
  // has to guess about encoding. The Date is UTC-stamped for the same reason.
  assert.equal(
    exportFileName(new Date('2026-10-22T23:30:00Z')),
    'ayahspring-data-2026-10-22.json',
  );
  assert.equal(
    exportFileName(new Date('2026-01-01T00:00:00Z')),
    'ayahspring-data-2026-01-01.json',
  );
  assert.match(exportFileName(new Date()), /^ayahspring-data-\d{4}-\d{2}-\d{2}\.json$/);
});
