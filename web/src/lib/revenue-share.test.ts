import assert from 'node:assert/strict';
import test from 'node:test';

import { setRevenueShare, validateRevenueShare } from './revenue-share.ts';

const validReason = 'Approved instructor compensation policy';

test('a whole percentage from 0 to 100 is accepted', () => {
  for (const percent of [0, 1, 25, 70, 99, 100]) {
    assert.equal(validateRevenueShare(percent, validReason).ok, true,
      `${percent}% should be accepted`);
  }
});

test('out-of-range or fractional percentages are refused', () => {
  for (const percent of [-1, 101, 10.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = validateRevenueShare(percent, validReason);
    assert.equal(result.ok, false, `${percent} should be refused`);
    assert.ok(!result.ok);
    if (!result.ok) assert.match(result.message, /whole percentage from 0 to 100/i);
  }
});

test('a missing or blank reason is refused before the database call', () => {
  for (const reason of ['', '   ', null, 42]) {
    const result = validateRevenueShare(25, reason);
    assert.equal(result.ok, false);
    assert.ok(!result.ok);
    if (!result.ok) assert.match(result.message, /written reason/i);
  }
});

test('an overlong reason is refused', () => {
  const result = validateRevenueShare(25, 'x'.repeat(501));
  assert.equal(result.ok, false);
});

test('the writer calls only the audited database RPC with percentage and reason', async () => {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return { data: 35, error: null };
    },
  } as any;

  const result = await setRevenueShare(client, 35, `  ${validReason}  `);
  assert.deepEqual(result, { ok: true, percent: 35 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.fn, 'set_revenue_share_percent');
  assert.deepEqual(calls[0]?.args, {
    p_percent: 35,
    p_reason: validReason,
  });
  assert.deepEqual(Object.keys(calls[0]?.args ?? {}).sort(), ['p_percent', 'p_reason']);
});

test('a non-finance staff refusal is translated into an actionable message', async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = {
    rpc: async () => ({
      data: null,
      error: { message: 'only a finance admin or platform admin may change the revenue share' },
    }),
  } as any;

  const result = await setRevenueShare(client, 35, validReason);
  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.code, 'not_authorized');
    assert.match(result.message, /finance admin or platform admin/i);
  }
});

test('invalid input never reaches the database', async () => {
  let calls = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = {
    rpc: async () => {
      calls += 1;
      return { data: null, error: null };
    },
  } as any;

  const result = await setRevenueShare(client, 101, validReason);
  assert.equal(result.ok, false);
  assert.equal(calls, 0);
});
