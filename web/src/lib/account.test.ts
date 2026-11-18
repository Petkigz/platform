import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  eraseMyAccount,
  exportFileName,
  ACCOUNT_NAME_MAX,
  ACCOUNT_PROFILE_SENTENCES,
  ACCOUNT_ZONE_MAX,
  accountProfileProblem,
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
  assert.match(validateAccountProfile({ ...valid, displayName: 'x'.repeat(81) }) ?? '', /80 characters or fewer/i);
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

test('every refusal carries a name, and the database’s own sentence stays behind', async () => {
  assert.equal(accountProfileProblem(valid), null);
  assert.equal(accountProfileProblem({ ...valid, displayName: ' ' }), 'name_missing');
  assert.equal(accountProfileProblem({ ...valid, displayName: 'x'.repeat(ACCOUNT_NAME_MAX) }), null);
  assert.equal(accountProfileProblem({ ...valid, displayName: 'x'.repeat(ACCOUNT_NAME_MAX + 1) }), 'name_long');
  assert.equal(accountProfileProblem({ ...valid, preferredLanguage: 'EN' }), 'language_code');
  assert.equal(accountProfileProblem({ ...valid, timezone: 'x'.repeat(ACCOUNT_ZONE_MAX + 1) }), 'zone_long');
  assert.equal(accountProfileProblem({ ...valid, timezone: 'Mars/Olympus' }), 'zone_invalid');
  assert.equal(accountProfileProblem({ ...valid, timezone: '' }), null);

  const answering = (result: unknown) => ({
    from: () => ({
      update() { return this; }, eq() { return this; }, select() { return this; },
      async maybeSingle() { return result; },
    }),
  }) as unknown as SupabaseClient;

  const signedOut = await saveAccountProfile(answering(null), '', valid);
  assert.deepEqual(signedOut, { ok: false, code: 'signed_out', message: ACCOUNT_PROFILE_SENTENCES.signed_out });

  // The database's sentence names a table and a policy; a reader gets neither.
  const failed = await saveAccountProfile(
    answering({ data: null, error: { message: 'new row violates row-level security policy for table "user_profiles"' } }),
    'user-1', valid,
  );
  assert.deepEqual(failed, { ok: false, code: 'failed', message: ACCOUNT_PROFILE_SENTENCES.failed });
  assert.doesNotMatch(JSON.stringify(failed), /row-level|user_profiles/u);

  const gone = await saveAccountProfile(answering({ data: null, error: null }), 'user-1', valid);
  assert.equal(gone.ok === false ? gone.code : '', 'not_found');
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

test('eraseMyAccount sends the typed name and reports what the database closed', async () => {
  const calls: { method: string; value: unknown }[] = [];
  const client = {
    rpc(name: string, args: unknown) {
      calls.push({ method: `rpc:${name}`, value: args });
      return Promise.resolve({
        data: { closed: true, alreadyClosed: false, learnersErased: 2 },
        error: null,
      });
    },
  } as unknown as SupabaseClient;

  const result = await eraseMyAccount(client, '  Amina Yusuf ');
  assert.deepEqual(result, { ok: true, alreadyClosed: false, learnersErased: 2 });
  assert.deepEqual(calls, [
    { method: 'rpc:erase_my_account', value: { p_confirm: 'Amina Yusuf' } },
  ]);
});

test('eraseMyAccount names a refusal and never passes the database’s sentence through', async () => {
  const answer = (error: { code?: string; message: string }) =>
    ({ rpc: () => Promise.resolve({ data: null, error }) }) as unknown as SupabaseClient;

  const teaching = await eraseMyAccount(
    answer({ code: '23514', message: 'you still have a course in review or published; ask the platform owner to close the teacher account first' }),
    'Amina Yusuf',
  );
  assert.deepEqual(teaching, {
    ok: false,
    code: 'teaching',
    message: 'You still have a course in review or published. Ask the platform owner to close the teaching account first.',
  });

  // A constraint's own text used to be shown to the person closing their account.
  const unnamed = await eraseMyAccount(
    answer({ code: '23503', message: 'update or delete on table "user_profiles" violates foreign key constraint "x_fkey"' }),
    'Amina Yusuf',
  );
  assert.equal(unnamed.ok, false);
  assert.equal(unnamed.ok === false ? unnamed.code : '', 'refused');
  assert.doesNotMatch(unnamed.ok === false ? unnamed.message : '', /constraint|user_profiles/);

  // No state: the request may have gone through, so it is not called a refusal.
  const lost = await eraseMyAccount(answer({ message: 'fetch failed' }), 'Amina Yusuf');
  assert.equal(lost.ok === false ? lost.code : '', 'unconfirmed');
});

test('eraseMyAccount does not claim an ambiguous reply left the account unchanged', async () => {
  for (const data of [null, {}, { closed: 'yes' }]) {
    const client = {
      rpc: () => Promise.resolve({ data, error: null }),
    } as unknown as SupabaseClient;
    const result = await eraseMyAccount(client, 'Amina Yusuf');
    assert.equal(result.ok, false, `accepted ${JSON.stringify(data)} as a closure`);
    assert.equal(result.ok === false ? result.code : '', 'unconfirmed');
    assert.match(result.ok === false ? result.message : '', /could not confirm whether your account closed/);
    assert.doesNotMatch(result.ok === false ? result.message : '', /nothing was changed|was not closed/i);
  }

  const blank = await eraseMyAccount({} as unknown as SupabaseClient, '   ');
  assert.equal(blank.ok === false ? blank.code : '', 'name_missing');
});

test('the closure page distinguishes profile changes, snapshots and unverified removal', () => {
  // The page says these through the catalogue now; the English is what a
  // held language reads and what every translation was written from.
  const page = readFileSync(new URL('../app/account/delete/page.tsx', import.meta.url), 'utf8');
  const words = readFileSync(new URL('./i18n/messages/en.ts', import.meta.url), 'utf8');
  const said = (key: string) => {
    assert.ok(page.includes(`t('${key}')`), `the closure page never says ${key}`);
    const match = new RegExp(`'${key.replace('.', '\\.')}':\\s+'([^']*)'`, 'u').exec(words);
    assert.ok(match, `${key} has no English`);
    return match[1]!;
  };
  assert.match(said('close.goesAnswers'), /Earlier revision snapshots and attached files can remain/);
  assert.match(said('close.staysSupport'), /other names or identifiers may remain/);
  assert.match(said('close.undoSessions'), /other sessions and the provider sign-in/);
  assert.match(said('close.undoSignIn'), /not proof about all provider copies/);
  assert.match(said('close.alreadyNote'), /is not proof that it has been removed/);
  assert.doesNotMatch(page, /removes your name from everything it touched/);
  // The account page links here, and used to promise exactly that.
  assert.doesNotMatch(words, /removes your name from everything it touched/);
  assert.match(words, /'account\.closeBody':\s+'Closing changes your profile, removes some personal information and tries to sign you out\./u);
});

test('closure form reports network or unreadable responses as uncertain', () => {
  const form = readFileSync(new URL('../app/account/delete/erase-form.tsx', import.meta.url), 'utf8');
  // Not the reply's own sentence, whatever it says: the reason, if the
  // route named one and answered with a four hundred, and otherwise "we
  // could not confirm".
  assert.doesNotMatch(form, /json\?\.message|UNCERTAIN_CLOSURE/);
  assert.match(form, /setOutcome\(eraseOutcomeOf\(res\.status, json\?\.code\)\);/);
  assert.match(form, /catch \{\s*setOutcome\('unconfirmed'\)/);
  assert.match(form, /if \(res\.ok && json\?\.ok === true\) \{/);
  assert.doesNotMatch(form, /The account was not closed/);
});
