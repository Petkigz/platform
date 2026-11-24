import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { childLoginCreatePorts } from './child-login-ports.ts';
import { ChildLoginAgeRefusal } from './child-login-create.ts';

const cast = (value: unknown) => value as SupabaseClient;
const attempt='7e576ccc-1fa6-4ad3-9afd-3d74d9ee0f64';
const child='8e576ccc-1fa6-4ad3-9afd-3d74d9ee0f64';
const learner='1e576ccc-1fa6-4ad3-9afd-3d74d9ee0f64';
const expected={learnerId:learner,username:'amina'};

test('session reserves and only the service client creates, looks up and completes', async () => {
  const calls: { name: string; input: unknown }[] = [];
  const session = cast({ rpc: async (name: string, input: unknown) => {
    calls.push({ name: `session:${name}`, input }); return { data: attempt, error: null };
  } });
  const service = cast({
    rpc: async (name: string, input: unknown) => {
      calls.push({ name: `service:${name}`, input });
      return { data: name === 'child_login_attempt_identity' ? null : { username: 'amina', learnerProfileId: learner, alreadyCompleted: false }, error: null };
    },
    auth: { admin: { createUser: async (input: unknown) => {
      calls.push({ name: 'service:createUser', input }); return { data: { user: { id: child } }, error: null };
    } } },
  });
  const ports = childLoginCreatePorts(session, service);
  assert.equal(await ports.prepare(learner, 'amina'), attempt);
  assert.equal(await ports.findIdentity(attempt, 'guardian'), null);
  assert.equal(await ports.createIdentity({ username: 'amina', password: 'secret', attemptId: attempt }), child);
  await ports.complete(attempt, 'guardian', child, expected);
  assert.deepEqual(calls.map(c => c.name), [
    'session:prepare_child_login', 'service:child_login_attempt_identity', 'service:createUser', 'service:complete_child_login_attempt',
  ]);
  assert.deepEqual(calls[2]?.input, {
    email: 'amina@learners.ayahspring.com', password: 'secret', email_confirm: true,
    app_metadata: { ayahspring_child_attempt: attempt },
    user_metadata: { child_login: true, username: 'amina' },
  });
});

test('provider errors are not exposed and missing results are not treated as success', async () => {
  const session = cast({ rpc: async () => ({ data: null, error: { message: 'sensitive database detail' } }) });
  const service = cast({
    rpc: async () => ({ data: null, error: { message: 'sensitive database detail' } }),
    auth: { admin: { createUser: async () => ({ data: { user: null }, error: null }) } },
  });
  const ports = childLoginCreatePorts(session, service);
  await assert.rejects(() => ports.prepare('l', 'u'), /reservation unavailable/);
  await assert.rejects(() => ports.findIdentity('a', 'g'), /identity lookup unavailable/);
  await assert.rejects(() => ports.createIdentity({ username: 'u', password: 'p', attemptId: 'a' }), /identity creation uncertain/);
  await assert.rejects(() => ports.complete('a', 'g', 'u', expected), /link completion uncertain/);
});


test('an incomplete completion response is not accepted as proof', async () => {
  const session = cast({});
  const service = cast({ rpc: async () => ({ data: {}, error: null }) });
  const ports = childLoginCreatePorts(session, service);
  await assert.rejects(() => ports.complete('a', 'g', 'u', expected), /link completion uncertain/);
});


test('unexpected identifiers and mismatched completion receipts are not accepted', async () => {
  for (const data of ['', 'not-a-uuid', 1]) {
    const ports=childLoginCreatePorts(cast({rpc:async()=>({data,error:null})}),cast({}));
    await assert.rejects(()=>ports.prepare(learner,'amina'),/reservation unavailable/);
  }
  for (const data of [
    {username:'other',learnerProfileId:learner,alreadyCompleted:false},
    {username:'amina',learnerProfileId:child,alreadyCompleted:false},
    {username:'amina',learnerProfileId:learner,alreadyCompleted:'false'},
  ]) {
    const ports=childLoginCreatePorts(cast({}),cast({rpc:async()=>({data,error:null})}));
    await assert.rejects(()=>ports.complete(attempt,'guardian',child,expected),/link completion uncertain/);
  }
  const ports=childLoginCreatePorts(cast({}),cast({rpc:async()=>({data:'invalid',error:null}),auth:{admin:{createUser:async()=>({data:{user:{id:'invalid'}},error:null})}}}));
  await assert.rejects(()=>ports.findIdentity(attempt,'guardian'),/identity lookup unavailable/);
  await assert.rejects(()=>ports.createIdentity({username:'amina',password:'secret',attemptId:attempt}),/identity creation uncertain/);
});

test('a mismatched completion receipt reaches the guardian as unconfirmed', async () => {
  const { handleChildLoginCreation }=await import('./child-login-handler.ts');
  const session=cast({rpc:async()=>({data:attempt,error:null})});
  const service=cast({
    rpc:async (name:string)=>name==='child_login_attempt_identity'
      ? {data:null,error:null}
      : {data:{username:'different',learnerProfileId:learner,alreadyCompleted:false},error:null},
    auth:{admin:{createUser:async()=>({data:{user:{id:child}},error:null})}},
  });
  const result=await handleChildLoginCreation(childLoginCreatePorts(session,service),'guardian',
    {learnerId:learner,username:'amina',password:'secret42'});
  assert.equal(result.status,409);
  assert.equal(result.body.ok,false);
  assert.match('message' in result.body ? result.body.message : '',/could not confirm/i);
  assert.doesNotMatch(JSON.stringify(result),/secret42|different/);
});

test("the guardian's yes travels to the database as a boolean, and only a true is a yes", async () => {
  const inputs: unknown[] = [];
  const session = cast({ rpc: async (_name: string, input: unknown) => { inputs.push(input); return { data: attempt, error: null }; } });
  const ports = childLoginCreatePorts(session, cast({}));
  await ports.prepare(learner, 'amina');
  await ports.prepare(learner, 'amina', true);
  await ports.prepare(learner, 'amina', 'yes' as unknown as boolean);
  assert.deepEqual(inputs, [
    { p_learner: learner, p_username: 'amina', p_twelve_or_older: false },
    { p_learner: learner, p_username: 'amina', p_twelve_or_older: true },
    { p_learner: learner, p_username: 'amina', p_twelve_or_older: false },
  ]);
});

test('an age refusal is told apart from a lost reply, and nothing else in the message is', async () => {
  for (const code of ['under_twelve', 'confirm_twelve'] as const) {
    const session = cast({ rpc: async () => ({ data: null, error: { message: `child_login:${code}` } }) });
    const ports = childLoginCreatePorts(session, cast({}));
    await assert.rejects(() => ports.prepare(learner, 'amina'), (error: unknown) => {
      assert.ok(error instanceof ChildLoginAgeRefusal);
      assert.equal(error.code, code);
      return true;
    });
  }
  // A name that only looks like one, and every other refusal: generic.
  for (const message of ['child_login:under_twelve_ish', 'child_login:disabled', 'child_login:verified_guardian_required']) {
    const session = cast({ rpc: async () => ({ data: null, error: { message } }) });
    const ports = childLoginCreatePorts(session, cast({}));
    await assert.rejects(() => ports.prepare(learner, 'amina'), (error: unknown) => {
      assert.ok(!(error instanceof ChildLoginAgeRefusal), message);
      assert.match(String((error as Error).message), /reservation unavailable/);
      return true;
    });
  }
});
