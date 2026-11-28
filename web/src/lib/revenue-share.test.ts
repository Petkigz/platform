import assert from 'node:assert/strict';
import test from 'node:test';

import { formatNumber } from './i18n/index.ts';
import { LOCALES } from './i18n/locales.ts';
import { readPercent, revenueShareRefusalOf, setRevenueShare, validateRevenueShare } from './revenue-share.ts';

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

// 2026-11-28: the form says its refusals in the reader's language, so each
// outcome names which of its sentences it is.

test('each refusal names the thing it is about', async () => {
  const detailOf = (result: ReturnType<typeof validateRevenueShare>) => (result.ok ? null : result.detail);
  assert.equal(detailOf(validateRevenueShare(101, validReason)), 'percent');
  assert.equal(detailOf(validateRevenueShare('40', validReason)), 'percent');
  assert.equal(detailOf(validateRevenueShare(40, '  ')), 'reason');
  assert.equal(detailOf(validateRevenueShare(40, 'x'.repeat(501))), 'long');
  assert.equal(detailOf(validateRevenueShare(40, 'x'.repeat(500))), null);

  // What the database says, read into the same names.
  const refusedWith = async (message: string, code?: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = { rpc: async () => ({ data: null, error: { message, code } }) } as any;
    return setRevenueShare(client, 35, validReason);
  };
  assert.deepEqual(await refusedWith('sign in to change the revenue share'), { ok: false, code: 'not_authorized', detail: 'signed_out', message: 'Sign in first.' });
  const range = await refusedWith('the revenue share must be between 0 and 100');
  assert.ok(!range.ok && range.code === 'invalid' && range.detail === 'percent');
  const reason = await refusedWith('a written reason is required');
  assert.ok(!reason.ok && reason.code === 'invalid' && reason.detail === 'reason');
  const other = await refusedWith('deadlock detected', '40P01');
  assert.deepEqual(other, { ok: false, code: 'rejected', message: 'deadlock detected' });
  // An error with no code is not the database's answer: a gateway's page, or a
  // connection that went (class 08). The share may have been saved, and a
  // gateway's page is not shown as the database's sentence.
  for (const [message, code] of [['<html><body>Bad gateway</body></html>', undefined], ['fetch failed', ''], ['connection failure', '08006']] as const) {
    const lost = await refusedWith(message, code);
    assert.ok(!lost.ok && lost.code === 'unsure', message);
    assert.ok(!lost.ok && !lost.message.includes('<') && !lost.message.includes('fetch failed'), message);
  }
  // The database's own sentences are still read first, whatever the code.
  const noCode = await refusedWith('only a finance admin or platform admin may change the revenue share');
  assert.ok(!noCode.ok && noCode.code === 'not_authorized');
});

test('the form names a refusal from what the API answered, and no answer is not a refusal', () => {
  const said = (status: number, body: unknown) => revenueShareRefusalOf(status, body);
  assert.deepEqual(said(400, { ok: false, code: 'invalid', detail: 'percent', message: 'x' }), { refusal: 'percent', said: null });
  assert.deepEqual(said(400, { ok: false, code: 'invalid', detail: 'reason', message: 'x' }), { refusal: 'reason', said: null });
  assert.deepEqual(said(400, { ok: false, code: 'invalid', detail: 'long', message: 'x' }), { refusal: 'long', said: null });
  assert.deepEqual(said(403, { ok: false, code: 'not_authorized', message: 'Only a finance admin or platform admin can change the revenue share.' }), { refusal: 'notAllowed', said: null });
  // Signed out, said by the route (401) or by the database through the writer.
  assert.deepEqual(said(401, { ok: false, code: 'not_authorized', message: 'Sign in first.' }), { refusal: 'signedOut', said: null });
  assert.deepEqual(said(403, { ok: false, code: 'not_authorized', detail: 'signed_out', message: 'Sign in first.' }), { refusal: 'signedOut', said: null });
  // What the form has no name for carries the sentence it was given.
  assert.deepEqual(said(409, { ok: false, code: 'rejected', message: ' deadlock detected ' }), { refusal: 'refused', said: 'deadlock detected' });
  assert.deepEqual(said(400, { ok: false, code: 'invalid', message: 'Malformed request.' }), { refusal: 'refused', said: 'Malformed request.' });
  assert.deepEqual(said(503, { ok: false, code: 'rejected' }), { refusal: 'refused', said: null });
  // Nothing of the API's own.
  for (const [status, body] of [[0, null], [502, null], [504, '<html>'], [200, {}], [500, { error: 'x' }]] as const) {
    assert.deepEqual(said(status, body), { refusal: 'unsure', said: null }, JSON.stringify([status, body]));
  }
  // Or the API saying that it got none from the database.
  assert.deepEqual(said(502, { ok: false, code: 'unsure', message: 'Nobody can say whether the share was saved.' }), { refusal: 'unsure', said: null });
});

test('a percentage is read in the digits the page shows, and nothing is guessed', () => {
  // The digits 0 to 9, and the digits Persian, Dari, Arabic, Bengali, Nepali, Hindi, Tamil and Thai write.
  for (const typed of ['40', ' 40 ', '۴۰', '٤٠', '৪০', '४०', '௪௦', '๔๐', '၄၀', '４０', '4۰', '040']) assert.equal(readPercent(typed), 40, typed);
  for (const [typed, value] of [['0', 0], ['۰', 0], ['०', 0], ['100', 100], ['۱۰۰', 100], ['১০০', 100], ['7', 7], ['007', 7]] as const) assert.equal(readPercent(typed), value, typed);
  // Out of range, not whole, signed, spaced, empty, words.
  for (const typed of ['101', '۱۰۱', '1000', '-1', '+5', '4.0', '4,0', '4 0', '', '   ', 'forty', '40%', '4e1', '0x10']) assert.equal(readPercent(typed), null, typed);
  // A digit of a script the site does not write is not guessed at: these are
  // mathematical digits, and five sets of them sit side by side in Unicode.
  for (const typed of ['𝟛𝟘', '𝟜𝟘', '４𝟘']) assert.equal(readPercent(typed), null, typed);
  // What it reads is what the validator accepts.
  for (const typed of ['0', '۴۰', '100']) assert.equal(validateRevenueShare(readPercent(typed), validReason).ok, true, typed);
});

test('the form can read back every percentage the page writes, in every language', () => {
  // The field opens with the figure as the page writes it for this reader.
  // If a language's digits were ever ones `readPercent` does not know, the
  // owner would be refused the figure the page itself put in the field.
  const scripts = new Set<string>();
  for (const locale of LOCALES) {
    for (let percent = 0; percent <= 100; percent += 1) {
      const shown = formatNumber(locale.code, percent);
      assert.equal(readPercent(shown), percent, `${locale.code} writes ${percent} as "${shown}"`);
      if (percent === 30) scripts.add(shown);
    }
  }
  // And the question is a real one: the site writes thirty in more than one way.
  assert.ok(scripts.has('30') && scripts.has('۳۰') && scripts.size >= 3, [...scripts].join(' '));
});
