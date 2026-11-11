import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { handleChildLoginRemoval } from './child-login-removal-handler.ts';

const learnerId='1e576ccc-1fa6-4ad3-9afd-3d74d9ee0f64';
const acknowledged={removed:true,username:'amina',databaseAccessBlocked:false};

test('detachment validates the body before calling the database', async () => {
  let calls=0;
  const remove=async () => {calls++; return {data:acknowledged,error:null};};
  for(const value of [null,[],{}, {learnerId:'a'.repeat(36)}, {learnerId,reason:{}}, {learnerId,reason:'x'.repeat(201)}]) {
    assert.equal((await handleChildLoginRemoval(remove,value)).status,400);
  }
  assert.equal(calls,0);
  let argumentsSeen: unknown[]=[];
  const ok=await handleChildLoginRemoval(async (...args) => {argumentsSeen=args; return {data:acknowledged,error:null};},{learnerId,reason:'  family choice  '});
  assert.deepEqual(argumentsSeen,[learnerId,'family choice']);
  assert.equal(ok.status,200);
  assert.deepEqual(ok.body,{ok:true,removed:acknowledged});
});

test('only an explicit well-shaped database acknowledgement is called success', async () => {
  for(const data of [null,{},[],{...acknowledged,removed:false},{...acknowledged,username:''},{...acknowledged,databaseAccessBlocked:null}]) {
    const result=await handleChildLoginRemoval(async()=>({data,error:null}),{learnerId});
    assert.equal(result.status,409);
    assert.equal(result.body.ok,false);
  }
  const thrown=await handleChildLoginRemoval(async()=>{throw new Error('private upstream details');},{learnerId});
  assert.equal(thrown.status,409);
  assert.doesNotMatch(JSON.stringify(thrown),/private upstream/);
  const returned=await handleChildLoginRemoval(async()=>({data:null,error:{message:'private upstream details'}}),{learnerId});
  assert.equal(returned.status,409);
  assert.doesNotMatch(JSON.stringify(returned),/private upstream/);
});

test('known database refusals remain helpful, and blocked is not mistaken for provider deletion', async () => {
  const refused=await handleChildLoginRemoval(async()=>({data:null,error:{message:'child_login:verified_guardian_required'}}),{learnerId});
  assert.deepEqual(refused,{status:409,body:{ok:false,code:'child_login:verified_guardian_required'}});
  const blocked=await handleChildLoginRemoval(async()=>({data:{...acknowledged,databaseAccessBlocked:true},error:null}),{learnerId});
  assert.equal(blocked.status,200);
  assert.doesNotMatch(JSON.stringify(blocked),/providerDeleted|sessionsRevoked/);
});

test('route and card require a JSON request and an explicit detachment receipt', () => {
  const route=readFileSync(new URL('../app/api/family/child-login/route.ts',import.meta.url),'utf8');
  const card=readFileSync(new URL('../app/family/child-login-card.tsx',import.meta.url),'utf8');
  const deletion=route.slice(route.indexOf('export async function DELETE'));
  assert.match(deletion,/application\\\/json/);
  assert.match(deletion,/handleChildLoginRemoval/);
  assert.match(card,/json\.removed\?\.removed !== true/);
  assert.match(card,/does not delete the sign-in or revoke/);
});
