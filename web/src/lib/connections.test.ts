import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { connectionSummary, readConnections, UNSEEN_CONNECTIONS } from './connections.ts';

const WHSEC = 'whsec_' + Buffer.from('a test signing secret, 32 bytes!').toString('base64');
const by = (env: Record<string, string | undefined>, id: string) => {
  const found = readConnections(env).find((c) => c.id === id);
  assert.ok(found, id);
  return found;
};

test('with nothing set, everything is not connected and every missing name is listed', () => {
  const list = readConnections({});
  assert.ok(list.length >= 11);
  for (const c of list) {
    assert.equal(c.state, 'not_connected', c.id);
    assert.ok(c.missing.length > 0, c.id);
    assert.ok(c.without.length > 20, c.id);
  }
  assert.deepEqual(connectionSummary(list), { connected: 0, partly: 0, notConnected: list.length });
  assert.deepEqual(by({}, 'email').missing, ['RESEND_API_KEY']);
  assert.deepEqual(by({}, 'scheduler').missing, ['CRON_SECRET', 'EMAIL_WORKER_EMAIL', 'EMAIL_WORKER_PASSWORD', 'RETENTION_WORKER_EMAIL', 'RETENTION_WORKER_PASSWORD']);
  assert.equal(new Set(list.map((c) => c.id)).size, list.length);
});

test('a blank or spaces-only value is not set', () => {
  assert.equal(by({ CRON_SECRET: '   ', NEXT_PUBLIC_SITE_URL: '' }, 'scheduler').state, 'not_connected');
  assert.equal(by({ NEXT_PUBLIC_SITE_URL: ' ' }, 'site').state, 'not_connected');
});

test('some of an account\'s variables is "partly", and names only what is left', () => {
  const scheduler = by({ CRON_SECRET: 's'.repeat(40), EMAIL_WORKER_EMAIL: 'w@example.com', EMAIL_WORKER_PASSWORD: 'p' }, 'scheduler');
  assert.equal(scheduler.state, 'partly');
  assert.deepEqual(scheduler.missing, ['RETENTION_WORKER_EMAIL', 'RETENTION_WORKER_PASSWORD']);
  const database = by({ NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'k' }, 'database');
  assert.equal(database.state, 'partly');
  assert.deepEqual(database.missing, ['SUPABASE_SERVICE_ROLE_KEY']);
});

test('email follows the same decision the dispatcher makes', () => {
  const ready = by({ RESEND_API_KEY: 're_key', EMAIL_FROM: 'no-reply@ayahspring.com', EMAIL_REPLY_TO: 'privacy@ayahspring.com' }, 'email');
  assert.equal(ready.state, 'connected');
  assert.deepEqual(ready.missing, []);
  const bare = by({ RESEND_API_KEY: 're_key' }, 'email');
  assert.equal(bare.state, 'connected');
  assert.ok(bare.notes.some((n) => /No sender is set/.test(n)) && bare.notes.some((n) => /EMAIL_REPLY_TO is not set/.test(n)));
  const wrong = by({ RESEND_API_KEY: 're_key', EMAIL_FROM: 'not an address' }, 'email');
  assert.equal(wrong.state, 'partly');
  assert.deepEqual(wrong.missing, ['EMAIL_FROM']);
});

test('a webhook secret of the wrong shape is "partly", and a right one is connected', () => {
  assert.equal(by({ RESEND_WEBHOOK_SECRET: WHSEC }, 'email_reports').state, 'connected');
  const wrong = by({ RESEND_WEBHOOK_SECRET: 're_this_is_an_api_key' }, 'email_reports');
  assert.equal(wrong.state, 'partly');
  assert.ok(wrong.notes.some((n) => /begins with whsec_/.test(n)));
});

test('a payment provider is "not connected" or "some variables are set": completeness is not judged here', () => {
  const env = { PAYMENT_PROVIDER: 'pawapay', PAWAPAY_API_TOKEN: 't' };
  const pawa = by(env, 'payment_pawapay');
  assert.equal(pawa.state, 'partly');
  assert.deepEqual(pawa.missing, []);
  assert.ok(pawa.notes.some((n) => /does not check that they are complete/.test(n)) && pawa.notes.some((n) => /in use/.test(n)));
  assert.equal(by(env, 'payment_mtn_momo').state, 'not_connected');
  assert.deepEqual(by(env, 'payment_mtn_momo').notes, []);
  // A name scoped to one country counts as set; a blank one does not.
  assert.equal(by({ MTN_MOMO_UG_API_KEY: 'k' }, 'payment_mtn_momo').state, 'partly');
  assert.equal(by({ MTN_MOMO_UG_API_KEY: '  ' }, 'payment_mtn_momo').state, 'not_connected');
  // Nothing here ever calls a payment provider "connected".
  const full = { MTN_MOMO_SUBSCRIPTION_KEY: 'a', MTN_MOMO_API_USER: 'b', MTN_MOMO_API_KEY: 'c' };
  assert.equal(by(full, 'payment_mtn_momo').state, 'partly');
});

test('no value ever appears in what is returned', () => {
  const secrets = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://secret-project.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-SECRET-1', SUPABASE_SERVICE_ROLE_KEY: 'service-SECRET-2',
    NEXT_PUBLIC_SITE_URL: 'https://secret-site.example', RESEND_API_KEY: 're_SECRET_3', EMAIL_FROM: 'sender-secret@example.com', EMAIL_REPLY_TO: 'reply-secret@example.com',
    RESEND_WEBHOOK_SECRET: WHSEC, CRON_SECRET: 'cron-SECRET-4', EMAIL_WORKER_EMAIL: 'worker-secret@example.com', EMAIL_WORKER_PASSWORD: 'pw-SECRET-5',
    R2_ACCOUNT_ID: 'r2-SECRET-6', PAWAPAY_API_TOKEN: 'pawa-SECRET-7', MTN_MOMO_API_KEY: 'mtn-SECRET-8', GOOGLE_TRANSLATE_API_KEY: 'g-SECRET-9', PAYMENT_PROVIDER: 'pawapay',
  };
  const text = JSON.stringify(readConnections(secrets));
  for (const value of Object.values(secrets)) {
    if (value === 'pawapay') continue;
    assert.ok(!text.includes(value), `a value was returned: ${value.slice(0, 6)}`);
  }
});

test('every variable the page names is in .env.example, so the runbook and the page agree', () => {
  const example = readFileSync(new URL('../../.env.example', import.meta.url), 'utf8');
  const names = new Set(readConnections({}).flatMap((c) => c.missing));
  names.add('EMAIL_FROM');
  for (const name of names) {
    assert.match(example, new RegExp(`^#? ?${name}=`, 'm'), name);
  }
});

test('the page is the owner\'s, is made on the server, and shows names only', () => {
  const page = readFileSync(new URL('../app/admin/connections/page.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /'use client'/);
  assert.match(page, /p_role_code: 'platform_admin'/);
  assert.match(page, /if \(owner !== true\) redirect\('\/'\)/);
  assert.match(page, /redirect\('\/sign-in\?next=\/admin\/connections'\)/);
  // The environment is read once, by the function that returns names only.
  assert.equal([...page.matchAll(/process\.env/g)].length, 1);
  assert.match(page, /readConnections\(process\.env\)/);
  assert.ok(UNSEEN_CONNECTIONS.some((u) => /DNS/.test(u.name)) && UNSEEN_CONNECTIONS.some((u) => /SMTP/.test(u.where)));
});
