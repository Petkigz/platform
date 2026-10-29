import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_FROM,
  RESEND_ENDPOINT,
  buildResendRequest,
  classifyResendResponse,
  classifyTransportError,
  namesRecipient,
  resolveEmailProvider,
  sendWithResend,
  type OutboundEmail,
} from './email/provider.ts';
import {
  describeReport,
  dispatchOnce,
  settleArgs,
  type ClaimedMessage,
  type DispatchReport,
} from './email/dispatch.ts';

function message(overrides: Partial<OutboundEmail> = {}): OutboundEmail {
  return {
    id: 'm1',
    to: 'parent@example.com',
    subject: 'Your receipt',
    body: 'Assalamu alaikum.',
    templateCode: 'receipt_email',
    attempts: 0,
    ...overrides,
  };
}

function claimed(overrides: Partial<ClaimedMessage> = {}): ClaimedMessage {
  return {
    id: 'm1',
    channel: 'email',
    to: 'parent@example.com',
    subject: 'Your receipt',
    body: 'Assalamu alaikum.',
    templateCode: 'receipt_email',
    purpose: 'receipt',
    attempts: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Which provider, if any
// ---------------------------------------------------------------------------

test('with no key the deployment is not configured, and says what to set', () => {
  const config = resolveEmailProvider({});
  assert.equal(config.kind, 'none');
  if (config.kind !== 'none') return;
  assert.match(config.reason, /RESEND_API_KEY/);
  assert.match(config.reason, /3,000/, 'the free tier is not named');

  // Whitespace is not a key.
  assert.equal(resolveEmailProvider({ RESEND_API_KEY: '   ' }).kind, 'none');
});

test('a key is a provider, and the sender has a sane default', () => {
  const config = resolveEmailProvider({ RESEND_API_KEY: 're_test_123' });
  assert.equal(config.kind, 'resend');
  if (config.kind !== 'resend') return;
  assert.equal(config.from, DEFAULT_FROM);
  assert.equal(config.replyTo, null);
  assert.equal(config.apiKey, 're_test_123');
});

test('a reply-to is carried, and a bad sender is refused rather than used', () => {
  const withReply = resolveEmailProvider({
    RESEND_API_KEY: 'k',
    EMAIL_FROM: 'mail@ayahspring.com',
    EMAIL_REPLY_TO: 'privacy@ayahspring.com',
  });
  assert.equal(withReply.kind, 'resend');
  if (withReply.kind === 'resend') {
    assert.equal(withReply.from, 'mail@ayahspring.com');
    assert.equal(withReply.replyTo, 'privacy@ayahspring.com');
  }

  const bad = resolveEmailProvider({ RESEND_API_KEY: 'k', EMAIL_FROM: 'not-an-address' });
  assert.equal(bad.kind, 'none');
  if (bad.kind === 'none') assert.match(bad.reason, /EMAIL_FROM/);
});

// ---------------------------------------------------------------------------
// The request
// ---------------------------------------------------------------------------

test('the request is the shape Resend expects, with the text body', () => {
  const config = resolveEmailProvider({
    RESEND_API_KEY: 're_key',
    EMAIL_FROM: 'no-reply@ayahspring.com',
    EMAIL_REPLY_TO: 'privacy@ayahspring.com',
  });
  assert.equal(config.kind, 'resend');
  if (config.kind !== 'resend') return;

  const request = buildResendRequest(config, message());
  assert.equal(request.url, RESEND_ENDPOINT);
  assert.equal(request.headers.authorization, 'Bearer re_key');

  const body = JSON.parse(request.body) as Record<string, unknown>;
  assert.deepEqual(body.to, ['parent@example.com']);
  assert.equal(body.subject, 'Your receipt');
  assert.equal(body.text, 'Assalamu alaikum.');
  assert.equal(body.reply_to, 'privacy@ayahspring.com');
  // HTML is never sent: the templates are plain text, and an HTML body built
  // from user-supplied course titles is an injection surface nobody needs.
  assert.equal('html' in body, false);

  const noReply = resolveEmailProvider({ RESEND_API_KEY: 'k' });
  if (noReply.kind === 'resend') {
    const bare = JSON.parse(buildResendRequest(noReply, message()).body) as Record<string, unknown>;
    assert.equal('reply_to' in bare, false);
  }
});

// ---------------------------------------------------------------------------
// Reading the answer — the part that must not be clever
// ---------------------------------------------------------------------------

test('a provider reference is the only thing that makes a message sent', () => {
  const result = classifyResendResponse(200, JSON.stringify({ id: 'abc-123' }));
  assert.deepEqual(result, { outcome: 'sent', reference: 'abc-123', provider: 'resend' });
});

test('a 200 with no id is not a delivery', () => {
  const result = classifyResendResponse(200, JSON.stringify({ ok: true }));
  assert.equal(result.outcome, 'retry');
  if (result.outcome === 'retry') assert.match(result.error, /without a reference/);

  // Nor is an empty id, nor a body that is not JSON at all.
  assert.equal(classifyResendResponse(201, '{"id":"   "}').outcome, 'retry');
  assert.equal(classifyResendResponse(200, 'OK').outcome, 'retry');
});

test('the provider asking us to come back is a retry, never a bounce', () => {
  assert.equal(classifyResendResponse(429, '{"message":"slow down"}').outcome, 'retry');
  assert.equal(classifyResendResponse(503, 'upstream').outcome, 'retry');
  assert.equal(classifyResendResponse(500, '{"message":"boom"}').outcome, 'retry');
});

test('our credentials being wrong never suppresses somebody’s address', () => {
  for (const status of [401, 403]) {
    const result = classifyResendResponse(status, '{"message":"invalid api key"}');
    assert.equal(result.outcome, 'retry', `${status} was treated as a bad address`);
    if (result.outcome === 'retry') {
      assert.equal(result.misconfigured, true);
      assert.match(result.error, /address is fine/);
    }
  }
});

test('only a refusal that names the recipient may suppress', () => {
  assert.equal(
    classifyResendResponse(422, '{"message":"Invalid `to` field."}').outcome,
    'bounce',
  );
  assert.equal(
    classifyResendResponse(422, '{"message":"Not a valid email address."}').outcome,
    'bounce',
  );
  assert.equal(
    classifyResendResponse(400, '{"message":"550 5.1.1 recipient address rejected"}').outcome,
    'bounce',
  );

  // The inverse, and the one that matters: a malformed *message* must not be
  // read as a dead mailbox. Retrying costs an attempt; suppressing costs a
  // person every future receipt.
  for (const body of [
    '{"message":"Invalid subject"}',
    '{"message":"Missing required field: html"}',
    '{"message":"The `from` domain is not verified"}',
    '{"message":"Validation failed"}',
  ]) {
    const result = classifyResendResponse(422, body);
    assert.equal(result.outcome, 'retry', `suppressed an address over: ${body}`);
  }
});

test('the recipient matcher is narrow enough to read', () => {
  assert.equal(namesRecipient('Invalid `to` field.'), true);
  assert.equal(namesRecipient('recipient address rejected'), true);
  assert.equal(namesRecipient('address unknown'), true);
  assert.equal(namesRecipient('Invalid subject'), false);
  assert.equal(namesRecipient('invalid api key'), false);
});

test('a thrown request is a provider we could not reach, not a bad address', () => {
  const result = classifyTransportError(new Error('ETIMEDOUT'));
  assert.equal(result.outcome, 'retry');
  if (result.outcome === 'retry') assert.match(result.error, /could not reach/);
  assert.equal(classifyTransportError('a string').outcome, 'retry');
});

// ---------------------------------------------------------------------------
// The transport, against a fake
// ---------------------------------------------------------------------------

test('the real transport sends and settles on the provider’s id', async () => {
  const config = resolveEmailProvider({ RESEND_API_KEY: 'k' });
  if (config.kind !== 'resend') throw new Error('expected a provider');

  // An array rather than a reassigned `let`: TypeScript narrows a captured
  // variable to `never` after the closure that writes it, and the assertion
  // would fail to compile rather than fail to pass.
  const seen: { url: string; body: string }[] = [];
  const fake = (async (url: string, init: RequestInit) => {
    seen.push({ url, body: String(init.body) });
    return new Response(JSON.stringify({ id: 'resend-1' }), { status: 200 });
  }) as unknown as typeof fetch;

  const result = await sendWithResend(config, message(), fake);
  assert.equal(result.outcome, 'sent');
  assert.equal(seen[0]?.url, RESEND_ENDPOINT);
  assert.match(seen[0]?.body ?? '', /parent@example\.com/);
});

test('the real transport turns a thrown fetch into a retry', async () => {
  const config = resolveEmailProvider({ RESEND_API_KEY: 'k' });
  if (config.kind !== 'resend') throw new Error('expected a provider');

  const fake = (async () => {
    throw new Error('ECONNRESET');
  }) as unknown as typeof fetch;

  const result = await sendWithResend(config, message(), fake);
  assert.equal(result.outcome, 'retry');
});

// ---------------------------------------------------------------------------
// The loop
// ---------------------------------------------------------------------------

function reportDefaults(overrides: Partial<DispatchReport> = {}): DispatchReport {
  return {
    ran: true,
    disabledReason: null,
    claimed: 0,
    sent: 0,
    retried: 0,
    bounced: 0,
    failures: [],
    ...overrides,
  };
}

test('a switched-off platform claims nothing at all', async () => {
  let sent = 0;
  const report = await dispatchOnce({
    claim: async () => ({ disabled: true, claimed: [], reason: 'the flag is off' }),
    send: async () => {
      sent += 1;
      return { outcome: 'sent', reference: 'x', provider: 'resend' };
    },
    settle: async () => {},
  });

  assert.equal(sent, 0, 'a message was sent while delivery was off');
  assert.equal(report.ran, false);
  assert.equal(report.disabledReason, 'the flag is off');
});

test('an empty claim reports a run that had nothing to do', async () => {
  const report = await dispatchOnce({
    claim: async () => ({ disabled: false, claimed: [] }),
    send: async () => ({ outcome: 'sent', reference: 'x', provider: 'resend' }),
    settle: async () => {},
  });
  assert.equal(report.ran, true);
  assert.equal(report.claimed, 0);
  assert.match(describeReport(report), /Nothing was due/);
});

test('each message is settled exactly once, with the outcome it earned', async () => {
  const settled: { id: string; outcome: string }[] = [];
  const report = await dispatchOnce({
    claim: async () => ({
      disabled: false,
      claimed: [
        claimed({ id: 'a', to: 'one@example.com' }),
        claimed({ id: 'b', to: 'two@example.com' }),
        claimed({ id: 'c', to: 'three@example.com' }),
      ],
    }),
    send: async (msg) => {
      if (msg.id === 'a') return { outcome: 'sent', reference: 'r1', provider: 'resend' };
      if (msg.id === 'b') return { outcome: 'retry', error: 'timeout' };
      return { outcome: 'bounce', error: 'mailbox does not exist' };
    },
    settle: async (id, result) => {
      settled.push({ id, outcome: result.outcome });
    },
  });

  assert.deepEqual(settled, [
    { id: 'a', outcome: 'sent' },
    { id: 'b', outcome: 'retry' },
    { id: 'c', outcome: 'bounce' },
  ]);
  assert.equal(report.claimed, 3);
  assert.equal(report.sent, 1);
  assert.equal(report.retried, 1);
  assert.equal(report.bounced, 1);
  assert.deepEqual(report.failures, []);
});

test('a message that fails to send is still settled, so its lease does not loop', async () => {
  const settled: string[] = [];
  await dispatchOnce({
    claim: async () => ({ disabled: false, claimed: [claimed()] }),
    send: async () => {
      throw new Error('the wheel came off');
    },
    settle: async (id) => {
      settled.push(id);
    },
  });
  assert.deepEqual(settled, ['m1']);
});

test('one unsettleable message does not abandon the rest of the run', async () => {
  const report = await dispatchOnce({
    claim: async () => ({
      disabled: false,
      claimed: [claimed({ id: 'bad' }), claimed({ id: 'good' })],
    }),
    send: async () => ({ outcome: 'sent', reference: 'ref', provider: 'resend' }),
    settle: async (id) => {
      if (id === 'bad') throw new Error('that message is not claimed by anybody');
    },
  });

  assert.equal(report.sent, 1, 'the second message was not sent');
  assert.equal(report.failures.length, 1);
  assert.equal(report.failures[0]?.messageId, 'bad');
  assert.match(report.failures[0]?.error ?? '', /not claimed/);
  // It is counted as neither sent nor retried: its state is unknown, and
  // guessing would make the report disagree with the table.
  assert.equal(report.sent + report.retried + report.bounced, 1);
});

test('an SMS row is left for a provider that can send it', async () => {
  let settled: string | null = null;
  await dispatchOnce({
    claim: async () => ({ disabled: false, claimed: [claimed({ channel: 'sms' })] }),
    send: async () => ({ outcome: 'sent', reference: 'should-not-happen', provider: 'resend' }),
    settle: async (_id, result) => {
      settled = result.outcome;
    },
  });
  assert.equal(settled, 'retry');
});

test('a settlement names the provider or the reason, never a guess', () => {
  assert.deepEqual(
    settleArgs({ outcome: 'sent', reference: 'r1', provider: 'resend' }),
    { outcome: 'sent', provider: 'resend', reference: 'r1', error: null },
  );
  assert.deepEqual(
    settleArgs({ outcome: 'retry', error: 'boom' }),
    { outcome: 'error', provider: null, reference: null, error: 'boom' },
  );
  assert.deepEqual(
    settleArgs({ outcome: 'bounce', error: 'no mailbox' }),
    { outcome: 'bounce', provider: null, reference: null, error: 'no mailbox' },
  );
});

test('the report reads as a sentence, including the bad news', () => {
  assert.match(
    describeReport(reportDefaults({ claimed: 5, sent: 4, retried: 1 })),
    /5 claimed, 4 sent, 1 back on the queue/,
  );
  assert.match(
    describeReport(reportDefaults({ claimed: 1, bounced: 1 })),
    /1 address suppressed/,
  );
  assert.match(
    describeReport(reportDefaults({ claimed: 3, sent: 1, bounced: 2 })),
    /2 addresses suppressed/,
  );
  assert.match(
    describeReport(reportDefaults({
      claimed: 2,
      sent: 1,
      failures: [{ messageId: 'x', to: 'a@b.c', error: 'nope' }],
    })),
    /1 could not be settled/,
  );
  assert.match(
    describeReport({
      ...reportDefaults(),
      ran: false,
      disabledReason: 'delivery.notifications is off',
    }),
    /delivery\.notifications is off/,
  );
});
