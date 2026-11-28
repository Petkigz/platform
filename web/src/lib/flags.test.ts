import assert from 'node:assert/strict';
import test from 'node:test';

import { flagRefusalOf, gateLabelKey, isNoAnswer, setFlag } from './flags.ts';
import { en } from './i18n/messages/en.ts';

/**
 * The badge beside a switch on `/admin`.
 *
 * The owner set Google sign-in up, switched it on, and the row still read
 * "Needs external setup": the badge described the kind of switch, not its
 * state, and read as a refusal. What is pinned here is that a switch that is
 * on never says something is still needed.
 *
 * The badge is a key of the catalogue since 2026-11-28; the English sentence
 * each key holds is checked here, and the other languages in
 * `admin-page.test.ts`.
 */
test('a switch that leans on outside setup says so differently once it is on', () => {
  assert.equal(gateLabelKey('admin_setup'), 'switch.gateSetupFirst');
  assert.equal(gateLabelKey('admin_setup', false), 'switch.gateSetupFirst');
  assert.equal(gateLabelKey('admin_setup', true), 'switch.gateSetupOn');
  assert.equal(en[gateLabelKey('admin_setup', false)], 'Outside setup first');
  assert.equal(en[gateLabelKey('admin_setup', true)], 'On, uses outside setup');
  assert.doesNotMatch(en[gateLabelKey('admin_setup', true)], /need|first/i);
});

test('the other two kinds read the same on and off', () => {
  for (const on of [false, true]) {
    assert.equal(gateLabelKey('admin', on), 'switch.gateRuntime');
    assert.equal(gateLabelKey('code', on), 'switch.gateDeploy');
  }
  assert.equal(en['switch.gateRuntime'], 'Runtime toggle');
  assert.equal(en['switch.gateDeploy'], 'Needs a deploy');
});

test('a refusal is named from what the API answered, and no answer is not a refusal', () => {
  const said = (status: number, body: unknown) => flagRefusalOf(status, body);
  // Each code the route and `setFlag()` answer with.
  assert.deepEqual(said(403, { ok: false, code: 'not_privileged', message: 'only the platform admin may change a switch' }), { refusal: 'notOwner', said: null });
  assert.deepEqual(said(409, { ok: false, code: 'code_gated', message: "'x' needs a deploy before it can run." }), { refusal: 'deploy', said: null });
  assert.deepEqual(said(404, { ok: false, code: 'unknown_flag', message: "No flag named 'x'." }), { refusal: 'unknown', said: null });
  // Signed out is said as being signed out, not as "only the platform admin".
  assert.deepEqual(said(401, { ok: false, code: 'not_privileged', message: 'Sign in first.' }), { refusal: 'signedOut', said: null });
  // What the page has no name for carries the database's own sentence.
  assert.deepEqual(said(400, { ok: false, code: 'rejected', message: ' value too long ' }), { refusal: 'refused', said: 'value too long' });
  assert.deepEqual(said(400, { ok: false, code: 'not_boolean', message: "'x' is a integer setting, not a switch." }), { refusal: 'refused', said: "'x' is a integer setting, not a switch." });
  assert.deepEqual(said(400, { ok: false, code: 'rejected' }), { refusal: 'refused', said: null });
  assert.deepEqual(said(400, { ok: false, code: 'rejected', message: 42 }), { refusal: 'refused', said: null });
  // Nothing of the API's own: a gateway's page, a connection that went, an answer cut short.
  for (const [status, body] of [[0, null], [502, null], [504, '<html>'], [200, {}], [200, []], [500, { error: 'x' }], [200, { ok: 'false' }]] as const) {
    assert.deepEqual(said(status, body), { refusal: 'unsure', said: null }, JSON.stringify([status, body]));
  }
});

test('an error with no code is no answer, and the switch is not said to have been refused', async () => {
  for (const error of [null, undefined, {}, { code: null }, { code: '' }, { code: '08006' }, { code: '08P01' }]) assert.equal(isNoAnswer(error), true, JSON.stringify(error));
  for (const code of ['42501', 'P0001', '23514', 'PGRST116', '40P01']) assert.equal(isNoAnswer({ code }), false, code);

  const ROW = { key: 'x.y', description: '', value_type: 'boolean', value_text: 'false', gate_type: 'admin', preconditions: null, flag_group: null, updated_at: null };
  // A stand-in for the client: one answer for the read, one for the write.
  const client = (read: unknown, write: unknown) => {
    const writes: unknown[] = [];
    const chain = (answer: unknown) => {
      const self: Record<string, unknown> = {};
      for (const name of ['select', 'eq']) self[name] = () => self;
      self.maybeSingle = async () => answer;
      self.single = async () => answer;
      return self;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = { from: () => ({ ...chain(read), update: (values: unknown) => { writes.push(values); return chain(write); } }) } as any;
    return { supabase, writes };
  };

  // The write got a gateway's page: nobody can say, and the page is not passed on as a sentence.
  let c = client({ data: ROW, error: null }, { data: null, error: { message: '<html><body>Bad gateway</body></html>' } });
  let out = await setFlag(c.supabase, { key: 'x.y', enabled: true });
  assert.ok(!out.ok && out.code === 'unsure' && !out.message.includes('<'));
  assert.deepEqual(flagRefusalOf(502, out), { refusal: 'unsure', said: null });
  // The write was refused by the database: its sentence is passed on.
  c = client({ data: ROW, error: null }, { data: null, error: { code: 'P0001', message: 'a rule said no' } });
  out = await setFlag(c.supabase, { key: 'x.y', enabled: true });
  assert.deepEqual(out, { ok: false, code: 'rejected', message: 'a rule said no' });
  // Only the platform admin may: by the code, or by the trigger's sentence.
  c = client({ data: ROW, error: null }, { data: null, error: { code: '42501', message: 'permission denied' } });
  out = await setFlag(c.supabase, { key: 'x.y', enabled: true });
  assert.ok(!out.ok && out.code === 'not_privileged');
  // A read that failed is not "no flag by that name", and nothing is written.
  c = client({ data: null, error: { message: 'fetch failed' } }, { data: ROW, error: null });
  out = await setFlag(c.supabase, { key: 'x.y', enabled: true });
  assert.ok(!out.ok && out.code === 'unsure');
  assert.deepEqual(c.writes, []);
  c = client({ data: null, error: { code: '42501', message: 'permission denied for table platform_settings' } }, { data: ROW, error: null });
  out = await setFlag(c.supabase, { key: 'x.y', enabled: true });
  assert.deepEqual(out, { ok: false, code: 'rejected', message: 'permission denied for table platform_settings' });
  assert.deepEqual(c.writes, []);
  // No row, and no error: the flag is not there.
  c = client({ data: null, error: null }, { data: ROW, error: null });
  out = await setFlag(c.supabase, { key: 'x.y', enabled: true });
  assert.ok(!out.ok && out.code === 'unknown_flag');
  // And a write that is made.
  c = client({ data: ROW, error: null }, { data: { ...ROW, value_text: 'true' }, error: null });
  out = await setFlag(c.supabase, { key: 'x.y', enabled: true });
  assert.ok(out.ok && out.flag.enabled === true);
  assert.deepEqual(c.writes, [{ value_text: 'true' }]);
});
