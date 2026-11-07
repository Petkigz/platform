import assert from 'node:assert/strict';
import test from 'node:test';
import { getServiceRoleKey, isServiceRoleConfigured } from './env.ts';

test('placeholder or blank service keys do not permit a transfer that cannot be confirmed', () => {
  const previous = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    for (const value of ['', '  ', 'your-service-role-key', 'changeme', '<service-key>']) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = value;
      assert.equal(isServiceRoleConfigured(), false);
      assert.throws(getServiceRoleKey, /SUPABASE_SERVICE_ROLE_KEY/);
    }
    process.env.SUPABASE_SERVICE_ROLE_KEY = '  sb_secret_example  ';
    assert.equal(isServiceRoleConfigured(), true);
    assert.equal(getServiceRoleKey(), 'sb_secret_example');
  } finally {
    if (previous === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previous;
  }
});
