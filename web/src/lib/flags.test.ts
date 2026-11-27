import assert from 'node:assert/strict';
import test from 'node:test';

import { gateLabel } from './flags.ts';

/**
 * The badge beside a switch on `/admin`.
 *
 * The owner set Google sign-in up, switched it on, and the row still read
 * "Needs external setup": the badge described the kind of switch, not its
 * state, and read as a refusal. What is pinned here is that a switch that is
 * on never says something is still needed.
 */
test('a switch that leans on outside setup says so differently once it is on', () => {
  assert.equal(gateLabel('admin_setup'), 'Outside setup first');
  assert.equal(gateLabel('admin_setup', false), 'Outside setup first');
  assert.equal(gateLabel('admin_setup', true), 'On, uses outside setup');
  assert.doesNotMatch(gateLabel('admin_setup', true), /need|first/i);
});

test('the other two kinds read the same on and off', () => {
  for (const on of [false, true]) {
    assert.equal(gateLabel('admin', on), 'Runtime toggle');
    assert.equal(gateLabel('code', on), 'Needs a deploy');
  }
});
