import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  OWNER_ALERT_KINDS, describeOwnerAlerts, dispatchOwnerAlert, ownerAlertMessage, ownerAlertSchedulerStatus,
  parseOwnerAlertStanding, runOwnerAlert, type OwnerAlertPorts,
} from './owner-alert.ts';

const root = dirname(fileURLToPath(import.meta.url));
const alertId = '11111111-1111-4111-8111-111111111111';
const token = '22222222-2222-4222-8222-222222222222';
const ownerId = '33333333-3333-4333-8333-333333333333';

function fixture() {
  const calls: string[] = [];
  const ports: OwnerAlertPorts = {
    async claim() { calls.push('claim'); return { state: 'leased', alertId, token, ownerId, kind: 'board_reported' }; },
    async owner(id) { calls.push('owner'); return { id, email: 'owner@example.com', verified: true }; },
    async allowed() { calls.push('allowed'); return true; },
    async send(to, kind) { calls.push(`send:${to}:${kind}`); return { outcome: 'sent', provider: 'resend', reference: 'provider-id' }; },
    async settle(_lease, outcome) { calls.push(`settle:${outcome}`); return true; },
  };
  return { calls, ports };
}

test('the provider is looked for before any alert is claimed', async () => {
  const { ports, calls } = fixture();
  assert.equal(await runOwnerAlert({ env: {}, origin: null, ports }), 'provider_unavailable');
  assert.deepEqual(calls, []);
  assert.equal(ownerAlertSchedulerStatus('provider_unavailable'), 503);
  for (const outcome of ['disabled', 'empty', 'sent', 'recorded', 'uncertain'] as const) {
    // The scheduler learns nothing about the queue from the status.
    assert.equal(ownerAlertSchedulerStatus(outcome), 200);
  }
});

test('the owner, a confirmed address and the database’s last word come before the sending', async () => {
  const { ports, calls } = fixture();
  assert.equal(await dispatchOwnerAlert(ports), 'sent');
  assert.deepEqual(calls, ['claim', 'owner', 'allowed', 'send:owner@example.com:board_reported', 'settle:sent']);

  // Somebody else's account, an unconfirmed address, no address, not an address: nothing is sent.
  for (const owner of [
    { id: alertId, email: 'x@example.com', verified: true },
    { id: ownerId, email: 'x@example.com', verified: false },
    { id: ownerId, email: null, verified: true },
    { id: ownerId, email: 'not an address', verified: true },
    null,
  ]) {
    const one = fixture();
    one.ports.owner = async () => owner;
    assert.equal(await dispatchOwnerAlert(one.ports), 'recorded');
    assert.ok(one.calls.includes('settle:address_unverified'));
    assert.ok(!one.calls.some((c) => c.startsWith('send')));
  }
  // The database says no, or cannot be asked: not sent.
  for (const allowed of [async () => false, async () => { throw new Error('down'); }]) {
    const one = fixture();
    one.ports.allowed = allowed;
    assert.equal(await dispatchOwnerAlert(one.ports), 'recorded');
    assert.ok(one.calls.includes('settle:not_sent'));
    assert.ok(!one.calls.some((c) => c.startsWith('send')));
  }
});

test('nothing says sent that the provider did not confirm', async () => {
  const blank = fixture();
  blank.ports.send = async () => ({ outcome: 'sent', provider: 'resend', reference: '' });
  assert.equal(await dispatchOwnerAlert(blank.ports), 'recorded');
  assert.ok(blank.calls.includes('settle:provider_uncertain'));

  const thrown = fixture();
  thrown.ports.send = async () => { throw new Error('socket'); };
  assert.equal(await dispatchOwnerAlert(thrown.ports), 'recorded');
  assert.ok(thrown.calls.includes('settle:provider_uncertain'));

  const unsettled = fixture();
  unsettled.ports.settle = async () => false;
  assert.equal(await dispatchOwnerAlert(unsettled.ports), 'uncertain');
  const failing = fixture();
  failing.ports.settle = async () => { throw new Error('down'); };
  assert.equal(await dispatchOwnerAlert(failing.ports), 'uncertain');
});

test('what the database answers is passed on or not believed', async () => {
  for (const state of ['disabled', 'empty'] as const) {
    const one = fixture();
    one.ports.claim = async () => ({ state });
    assert.equal(await dispatchOwnerAlert(one.ports), state);
    assert.deepEqual(one.calls, []);
  }
  for (const bad of [
    null, 'leased', {}, { state: 'leased' },
    { state: 'leased', alertId: 'x', token, ownerId, kind: 'board_reported' },
    { state: 'leased', alertId, token: 'x', ownerId, kind: 'board_reported' },
    { state: 'leased', alertId, token, ownerId: 'x', kind: 'board_reported' },
    // A kind this code has no words for is not sent with somebody else's words.
    { state: 'leased', alertId, token, ownerId, kind: 'something_new' },
  ]) {
    const one = fixture();
    one.ports.claim = async () => bad;
    assert.equal(await dispatchOwnerAlert(one.ports), 'uncertain', JSON.stringify(bad));
    assert.deepEqual(one.calls, []);
  }
  const down = fixture();
  down.ports.claim = async () => { throw new Error('down'); };
  assert.equal(await dispatchOwnerAlert(down.ports), 'uncertain');
});

test('the email says a post was reported and where to go, and nothing else', () => {
  const here = ownerAlertMessage('board_reported', 'https://ayahspring.com');
  assert.equal(here.subject, 'AyahSpring: a discussion post was reported');
  assert.equal(
    here.body,
    'A post on a discussion board has been reported and is waiting for you.\n\nOpen https://ayahspring.com/admin/boards to deal with it.\n\nThis message says nothing about the post or about anybody. Do not reply with personal information.',
  );
  const nowhere = ownerAlertMessage('board_reported', null);
  assert.match(nowhere.body, /Sign in to AyahSpring and open \/admin\/boards to deal with it\./u);
  assert.doesNotMatch(nowhere.body, /https?:/u);
  // The words take nothing but the kind and the site's address: there is nowhere to put a post or a person.
  const source = readFileSync(join(root, 'owner-alert.ts'), 'utf8');
  assert.match(source, /export function ownerAlertMessage\(kind: OwnerAlertKind, origin: string \| null\)/u);
  // Every kind the database can queue has words here, and the reverse.
  const migration = readFileSync(join(root, '..', '..', '..', 'supabase/migrations/20261281159000_owner_alert_email.sql'), 'utf8');
  const kinds = /kind\s+text not null check \(kind in \(([^)]*)\)\)/u.exec(migration)?.[1]?.split(',').map((k) => k.trim().replace(/'/gu, ''));
  assert.deepEqual(kinds, [...OWNER_ALERT_KINDS]);
  // The register is not the ordinary outbox, which staff can read.
  assert.doesNotMatch(migration, /insert into public\.outbound_messages|queue_message\(/u);
  const route = readFileSync(join(root, '..', 'app/api/cron/owner-alert/route.ts'), 'utf8');
  assert.match(route, /checkScheduler\(/u);
  assert.doesNotMatch(route, /result: outcome|outcome \}/u);
});

test('how the owner’s alerts stand is read whole and said in one sentence', () => {
  const base = { sending: true, waiting: 0, failed: 0, lastSentAt: null, lastProblem: null };
  assert.deepEqual(parseOwnerAlertStanding(base), base);
  assert.deepEqual(parseOwnerAlertStanding({ sending: false, waiting: 1, failed: 0 }), { sending: false, waiting: 1, failed: 0, lastSentAt: null, lastProblem: null });
  for (const bad of [null, [], {}, { ...base, sending: 'yes' }, { ...base, waiting: -1 }, { ...base, failed: 1.5 }, { ...base, lastSentAt: 'then' }, { ...base, lastProblem: 'other' }]) {
    assert.equal(parseOwnerAlertStanding(bad), null, JSON.stringify(bad));
  }
  assert.match(describeOwnerAlerts({ ...base, sending: false }), /^Email is switched off .* no alert is sent to you/u);
  assert.match(describeOwnerAlerts({ ...base, sending: false, waiting: 1 }), /one is waiting and will go when email is switched on/u);
  assert.match(describeOwnerAlerts({ ...base, lastProblem: 'address_unverified' }), /has not been confirmed/u);
  assert.match(describeOwnerAlerts({ ...base, failed: 1 }), /may not have arrived/u);
  assert.match(describeOwnerAlerts({ ...base, waiting: 1 }), /waiting to go/u);
  assert.match(describeOwnerAlerts(base), /at most one every fifteen minutes/u);
});
