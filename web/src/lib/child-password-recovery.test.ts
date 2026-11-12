import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recoverChildPassword, type RecoveryPorts } from './child-password-recovery.ts';
const learner='11111111-1111-4111-8111-111111111111';
const identity='22222222-2222-4222-8222-222222222222';
const reset='33333333-3333-4333-8333-333333333333';
const input={learnerId:learner,password:'test-password-42'};
function ports():RecoveryPorts {return {prepare:async()=>({resetId:reset,userId:identity}),change:async()=>{},status:async()=>({resetId:reset,learnerId:learner,completed:true})};}
test('validate and bind provider request to the committed receipt',async()=>{
  const p=ports();let count=0;p.change=async (id,r,pass)=>{count++;assert.equal(id,identity);assert.equal(r,reset);assert.equal(pass,input.password);};
  assert.equal((await recoverChildPassword(p,{...input,password:'short'})).ok,false);assert.equal(count,0);
  assert.equal((await recoverChildPassword(p,input)).ok,true);assert.equal(count,1);
  p.status=async()=>({resetId:reset,learnerId:identity,completed:true}); assert.equal((await recoverChildPassword(p,input)).ok,false);
});
test('lost provider reply is confirmed only by the matching database receipt',async()=>{
  const p=ports();p.change=async()=>{throw Error('lost');};assert.equal((await recoverChildPassword(p,input)).ok,true);
  p.status=async()=>({resetId:reset,learnerId:learner,completed:false});const result=await recoverChildPassword(p,input);assert.equal(result.ok,false);if(!result.ok) assert.match(result.message,/could not confirm/);
  p.prepare=async()=>({resetId:'bad',userId:identity});assert.equal((await recoverChildPassword(p,input)).ok,false);
});
