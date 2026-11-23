import assert from 'node:assert/strict';
import test from 'node:test';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  StatementError,
  WAITING_STATES,
  isQuiet,
  movementKindOf,
  movementTitleOf,
  parseStatement,
  waitingCount,
  waitingKindOf,
  waitingStateOf,
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

// ------------------------------------------------- what the page says of a row

const MIGRATION = readFileSync(
  resolve(import.meta.dirname, '../../../supabase/migrations/20261266000100_payer_statement.sql'),
  'utf8',
);

/** The states `my_statement()` writes a sentence for, by the kind of row. */
function statesInMigration(): Record<string, string[]> {
  const starts: [string, string][] = [
    ['refund_request', "select 'refund_request'::text as kind"],
    ['refund', "select 'refund', rt.created_at"],
    ['dispute', "select 'dispute', d.opened_at"],
  ];
  const found: Record<string, string[]> = {};
  for (const [kind, marker] of starts) {
    const at = MIGRATION.indexOf(marker);
    assert.ok(at > 0, `the migration no longer has: ${marker}`);
    const block = MIGRATION.slice(at, MIGRATION.indexOf(' end', at));
    const states = [...block.matchAll(/when '([a-z_]+)'\s+then '/gu)].map((m) => m[1] ?? '');
    assert.ok(states.length > 0, `no states found for ${kind}`);
    found[kind] = states;
  }
  return found;
}

test('every state the database writes a sentence for has a name the page can say', () => {
  const written = statesInMigration();
  assert.deepEqual(Object.keys(written).sort(), Object.keys(WAITING_STATES).sort());
  for (const [kind, states] of Object.entries(written)) {
    assert.deepEqual(
      [...states].sort(),
      Object.keys(WAITING_STATES[kind as keyof typeof WAITING_STATES]).sort(),
      kind,
    );
    for (const state of states) assert.ok(waitingStateOf(kind, state), `${kind}/${state}`);
  }
  // Twelve states, ten names: a bank that has not decided is one thing.
  assert.equal(Object.values(written).flat().length, 12);
  assert.equal(new Set(Object.values(WAITING_STATES).flatMap((s) => Object.values(s))).size, 10);
});

test('a kind or a state the page has never heard of is nothing, not something else', () => {
  assert.equal(waitingStateOf('refund_request', 'requested'), 'rqRequested');
  assert.equal(waitingStateOf('dispute', 'under_review'), 'dpOpen');
  assert.equal(waitingStateOf('dispute', 'lost'), 'dpLost');
  // A request has no "pending" and a refund no "requested".
  assert.equal(waitingStateOf('refund_request', 'pending'), null);
  assert.equal(waitingStateOf('refund', 'requested'), null);
  assert.equal(waitingStateOf('chargeback', 'open'), null);
  assert.equal(waitingStateOf('refund', null), null);
  // Names an object has without being given them.
  assert.equal(waitingKindOf('constructor'), null);
  assert.equal(waitingStateOf('refund', 'toString'), null);
  assert.equal(waitingStateOf('__proto__', 'open'), null);
  assert.equal(movementKindOf('charge'), 'charge');
  assert.equal(movementKindOf('refund'), 'refund');
  assert.equal(movementKindOf('adjustment'), null);
});

test('the English the database writes in place of a title is not a title', () => {
  assert.equal(movementTitleOf({ description: 'Fiqh of prayer', orderNumber: 'AS-0001' }), 'Fiqh of prayer');
  assert.equal(movementTitleOf({ description: 'Order AS-0001', orderNumber: 'AS-0001' }), null);
  assert.equal(movementTitleOf({ description: 'Order ', orderNumber: null }), null);
  assert.equal(movementTitleOf({ description: null, orderNumber: 'AS-0001' }), null);
  assert.equal(movementTitleOf({ description: '   ', orderNumber: null }), null);
  // A course really called this keeps its name.
  assert.equal(movementTitleOf({ description: 'Order of the prayer', orderNumber: 'AS-0001' }), 'Order of the prayer');
  // The migration still writes it that way.
  assert.match(MIGRATION, /'Order ' \|\| coalesce\(o\.order_number::text, ''\)/u);
});
