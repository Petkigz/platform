import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describePayoutStatus,
  mapPayoutError,
  validatePayoutRequest,
} from './payouts.ts';

test('a request needs a currency, a destination a human could act on, and an acknowledgement', () => {
  const ok = validatePayoutRequest({
    currency: 'ugx',
    destination: 'MTN MoMo 0772 000 000',
    acknowledgeTax: true,
  });
  assert.equal(ok.ok, true);

  assert.equal(validatePayoutRequest({ currency: 'X', destination: 'a place', acknowledgeTax: true }).ok, false);
  assert.equal(validatePayoutRequest({ currency: 'UGX', destination: '  ', acknowledgeTax: true }).ok, false);
  assert.equal(validatePayoutRequest({ currency: 'UGX', destination: 'MoMo 0772', acknowledgeTax: false }).ok, false);
});

test('a long destination is refused rather than truncated', () => {
  const result = validatePayoutRequest({
    currency: 'UGX',
    destination: 'x'.repeat(301),
    acknowledgeTax: true,
  });
  assert.equal(result.ok, false);
});

test('the refusals say what a person needs to do next', () => {
  const off = mapPayoutError('payouts are not switched on yet: there is no provider');
  assert.equal(off.ok, false);
  assert.match(off.message, /provider/i);

  const waiting = mapPayoutError('you already have a payout waiting in UGX; cancel it before asking again');
  assert.match(waiting.message, /cancel it/i);

  const nothing = mapPayoutError('there is nothing to pay out in USD yet');
  assert.match(nothing.message, /refund hold/i);

  const stranger = mapPayoutError('only a finance admin or platform admin may record a payout');
  assert.equal(stranger.ok, false);
  assert.equal(stranger.ok === false ? stranger.code : null, 'not_authorized');
});

test('a status reads as a sentence', () => {
  assert.equal(describePayoutStatus('scheduled'), 'Waiting for finance');
  assert.equal(describePayoutStatus('completed'), 'Paid');
  assert.equal(describePayoutStatus('failed'), 'Did not go through');
  // An unknown status is shown, not hidden.
  assert.equal(describePayoutStatus('something_new'), 'something_new');
});
