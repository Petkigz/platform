import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('the decision screen does not claim a pending refund was sent to a provider', () => {
  const page = readFileSync('src/app/admin/refunds/decide-form.tsx', 'utf8');
  assert.match(page, /does not send it to a provider or transfer money/);
  assert.doesNotMatch(page, /pending with the provider/i);
});
