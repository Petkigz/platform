import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OutboxError,
  deliveryNote,
  parseStanding,
  retryMessage,
  suppressAddress,
  type OutboxStanding,
} from './outbox.ts';

const standing: OutboxStanding = {
  deliveryEnabled: false,
  maxAttempts: 5,
  counts: { queued: 4, dueNow: 3, inFlight: 1, sent: 12, failed: 2, suppressed: 1 },
  nextDueAt: '2026-10-23T10:05:00Z',
  oldestQueuedAt: '2026-10-23T09:00:00Z',
  suppressedAddresses: 1,
  deadLetters: [
    {
      id: 'm-1',
      to: 'a@example.com',
      template: 'receipt_email',
      attempts: 5,
      lastError: 'provider timed out',
      deadLetteredAt: '2026-10-23T09:30:00Z',
    },
  ],
};

const payload = {
  deliveryEnabled: false,
  maxAttempts: 5,
  counts: { queued: 4, dueNow: 3, inFlight: 1, sent: 12, failed: 2, suppressed: 1 },
  nextDueAt: '2026-10-23T10:05:00Z',
  oldestQueuedAt: '2026-10-23T09:00:00Z',
  suppressedAddresses: 1,
  deadLetters: [
    {
      id: 'm-1',
      to: 'a@example.com',
      template: 'receipt_email',
      attempts: 5,
      lastError: 'provider timed out',
      deadLetteredAt: '2026-10-23T09:30:00Z',
    },
  ],
};

test('a standing is read as the database shaped it', () => {
  const parsed = parseStanding(payload);
  assert.equal(parsed.counts.queued, 4);
  assert.equal(parsed.counts.dueNow, 3);
  assert.equal(parsed.deadLetters.length, 1);
  assert.equal(parsed.deadLetters[0]!.attempts, 5);
  assert.equal(parsed.maxAttempts, 5);
});

test('a standing with no counts refuses rather than showing zeroes', () => {
  // A page full of zeroes reads as "all is well"; a page full of zeroes because
  // the call failed is a lie with a calm face.
  assert.throws(() => parseStanding({}), OutboxError);
  assert.throws(() => parseStanding(null), OutboxError);
  assert.throws(() => parseStanding({ ...payload, counts: {} }), /queued count/);
});

test('delivery is on only when the database says the word true', () => {
  assert.equal(parseStanding({ ...payload, deliveryEnabled: 'true' }).deliveryEnabled, false);
  assert.equal(parseStanding({ ...payload, deliveryEnabled: true }).deliveryEnabled, true);
});

test('a dead letter without an id refuses the payload', () => {
  assert.throws(
    () => parseStanding({ ...payload, deadLetters: [{ to: 'a@example.com' }] }),
    /no id/,
  );
});

test('the opening sentence says whether anything can leave at all', () => {
  assert.match(deliveryNote(standing), /switched off, so nothing is claimed/);
  assert.match(
    deliveryNote({ ...standing, deliveryEnabled: true, counts: { ...standing.counts, dueNow: 1 } }),
    /^Delivery is switched on and 1 message is waiting/,
  );
  assert.match(
    deliveryNote({ ...standing, deliveryEnabled: true, counts: { ...standing.counts, dueNow: 0 } }),
    /Nothing is waiting/,
  );
});

// ---------------------------------------------------------------------------
// A client that records the RPC it was asked for.
// ---------------------------------------------------------------------------
function client(result: { data?: unknown; error?: { message: string } | null }) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  return {
    calls,
    rpc(fn: string, args: Record<string, unknown>) {
      calls.push({ fn, args });
      return Promise.resolve({ data: result.data ?? null, error: result.error ?? null });
    },
  };
}

test('a retry sends the id and the reason, and nothing else', async () => {
  const stub = client({ data: { id: 'm-1', attempts: 0 } });
  const result = await retryMessage(stub as never, { id: 'm-1', reason: 'Outage is over' });
  assert.equal(result.ok, true);
  assert.equal(stub.calls[0]!.fn, 'retry_outbound_message');
  assert.deepEqual(stub.calls[0]!.args, { p_message_id: 'm-1', p_reason: 'Outage is over' });
});

test('a retry without a reason never reaches the database', async () => {
  const stub = client({ data: { id: 'm-1' } });
  const result = await retryMessage(stub as never, { id: 'm-1', reason: ' ' });
  assert.equal(result.ok, false);
  assert.equal(stub.calls.length, 0);
  assert.match(result.ok === false ? result.error : '', /why it is worth another try/);
});

test('the do-not-send refusal is translated into something a person can act on', async () => {
  const stub = client({
    error: { message: 'that address is on the do-not-send list; lift the suppression first' },
  });
  const result = await retryMessage(stub as never, { id: 'm-1', reason: 'Try again' });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false ? result.status : 0, 409);
  assert.match(result.ok === false ? result.error : '', /Lift the suppression/);
});

test('a message that is not dead says so rather than pretending to retry', async () => {
  const stub = client({ error: { message: 'that message is sent, so there is nothing to revive' } });
  const result = await retryMessage(stub as never, { id: 'm-1', reason: 'Try again' });
  assert.equal(result.ok === false ? result.error : '', 'That message is not a dead letter.');
});

test('suppressing sends the lowercased address the function will store', async () => {
  const stub = client({ data: { address: 'a@example.com', stoppedQueued: 2 } });
  const result = await suppressAddress(stub as never, {
    channel: 'email',
    address: '  A@Example.COM ',
    reason: 'Family asked us to stop',
  });
  assert.equal(result.ok, true);
  assert.equal(result.ok === true ? result.stoppedQueued : -1, 2);
  assert.deepEqual(stub.calls[0]!.args, {
    p_channel: 'email',
    p_address: 'A@Example.COM',
    p_reason: 'Family asked us to stop',
  });
});

test('an unknown channel falls back to email rather than being refused', async () => {
  const stub = client({ data: { address: 'a@example.com', stoppedQueued: 0 } });
  await suppressAddress(stub as never, { channel: 'post', address: 'a@example.com', reason: 'Stop' });
  assert.equal(stub.calls[0]!.args.p_channel, 'email');
});

test('a suppression without a reason never reaches the database', async () => {
  const stub = client({ data: { address: 'a@example.com' } });
  const result = await suppressAddress(stub as never, { address: 'a@example.com', reason: '' });
  assert.equal(result.ok, false);
  assert.equal(stub.calls.length, 0);
});
