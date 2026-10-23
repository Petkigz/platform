import assert from 'node:assert/strict';
import test from 'node:test';

import {
  StatementError,
  isQuiet,
  parseStatement,
  waitingCount,
  type StatementAccount,
} from './statement.ts';

const movement = {
  kind: 'charge',
  occurredAt: '2026-10-01T09:00:00Z',
  orderId: '11111111-1111-1111-1111-111111111111',
  orderNumber: 'AS-0001',
  amountMinor: '30000',
  direction: 'out',
  description: 'Qur\u2019an for beginners',
  runningMinor: '30000',
};

const account = {
  billingAccountId: '22222222-2222-2222-2222-222222222222',
  displayName: 'The Okello family',
  billingCountry: 'UG',
  billingCurrency: 'UGX',
  currencies: [
    {
      currencyCode: 'UGX',
      chargedMinor: '30000',
      refundedMinor: '0',
      netMinor: '30000',
      moved: [movement],
      notYetMoney: [],
    },
  ],
};

const payload = {
  generatedAt: '2026-10-23T10:00:00Z',
  accounts: [account],
};

test('a well-formed statement is read as it was sent', () => {
  const statement = parseStatement(payload);
  assert.equal(statement.accounts.length, 1);
  const section = statement.accounts[0]!.currencies[0]!;
  assert.equal(section.currencyCode, 'UGX');
  assert.equal(section.netMinor, '30000');
  assert.equal(section.moved[0]!.amountMinor, '30000');
  assert.equal(section.moved[0]!.direction, 'out');
});

test('a movement keeps the order it belongs to', () => {
  const [row] = parseStatement(payload).accounts[0]!.currencies[0]!.moved;
  assert.equal(row!.orderNumber, 'AS-0001');
  assert.equal(row!.orderId, '11111111-1111-1111-1111-111111111111');
});

test('an empty statement is an answer, not an error', () => {
  const statement = parseStatement({ generatedAt: '2026-10-23T10:00:00Z', accounts: [] });
  assert.deepEqual(statement.accounts, []);
});

test('an account with no orders is quiet rather than broken', () => {
  const statement = parseStatement({
    accounts: [{ ...account, currencies: [] }],
  });
  assert.equal(isQuiet(statement.accounts[0]!), true);
  assert.equal(isQuiet(parseStatement(payload).accounts[0]!), false);
});

test('an amount that is not whole minor units is refused, not rendered', () => {
  const broken = {
    accounts: [
      {
        ...account,
        currencies: [{ ...account.currencies[0], netMinor: '300.50' }],
      },
    ],
  };
  assert.throws(() => parseStatement(broken), StatementError);
});

test('a malformed movement refuses the whole statement', () => {
  const broken = {
    accounts: [
      {
        ...account,
        currencies: [
          {
            ...account.currencies[0],
            moved: [{ ...movement, amountMinor: 'thirty thousand' }],
          },
        ],
      },
    ],
  };
  assert.throws(() => parseStatement(broken), /not a whole number/);
});

test('a payload with no account list is refused rather than shown as zero', () => {
  // The distinction that matters: "you have paid nothing" and "this did not
  // load" must never look the same on a page about money.
  assert.throws(() => parseStatement({}), StatementError);
  assert.throws(() => parseStatement(null), StatementError);
});

test('a currency that is not ISO 4217 is refused', () => {
  const broken = {
    accounts: [
      {
        ...account,
        currencies: [{ ...account.currencies[0], currencyCode: 'shillings' }],
      },
    ],
  };
  assert.throws(() => parseStatement(broken), /not a currency code/);
});

test('a kind the screen does not know still passes through', () => {
  // A new kind added to the function must not make yesterday's statement
  // unreadable; the page falls back to a generic label instead.
  const future = {
    accounts: [
      {
        ...account,
        currencies: [
          {
            ...account.currencies[0],
            moved: [{ ...movement, kind: 'adjustment' }],
          },
        ],
      },
    ],
  };
  const section = parseStatement(future).accounts[0]!.currencies[0]!;
  assert.equal(section.moved[0]!.kind, 'adjustment');
});

test('waiting items are counted, and nothing waiting is zero', () => {
  const waiting = {
    accounts: [
      {
        ...account,
        currencies: [
          {
            ...account.currencies[0],
            notYetMoney: [
              {
                kind: 'refund',
                occurredAt: '2026-10-02T09:00:00Z',
                orderId: null,
                orderNumber: 'AS-0001',
                amountMinor: '10000',
                status: 'pending',
                reason: null,
                says: 'Waiting for the provider to confirm.',
              },
            ],
          },
        ],
      },
    ],
  };
  const parsed = parseStatement(waiting).accounts[0]!;
  assert.equal(waitingCount(parsed), 1);
  assert.equal(waitingCount(parseStatement(payload).accounts[0]!), 0);
});

test('a missing optional field is null rather than undefined', () => {
  const sparse = {
    accounts: [
      {
        ...account,
        currencies: [
          {
            ...account.currencies[0],
            moved: [{ kind: 'charge', amountMinor: '1', runningMinor: '1' }],
          },
        ],
      },
    ],
  };
  const section = parseStatement(sparse).accounts[0]!.currencies[0]!;
  assert.equal(section.moved[0]!.description, null);
  assert.equal(section.moved[0]!.orderNumber, null);
  assert.equal(section.moved[0]!.direction, 'out');
});

test('the account keeps its own currency even before anything is bought', () => {
  const statement = parseStatement({ accounts: [{ ...account, currencies: [] }] });
  const parsed: StatementAccount = statement.accounts[0]!;
  assert.equal(parsed.billingCurrency, 'UGX');
});
