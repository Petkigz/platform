import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkCourseworkStoragePresence, parseStoragePresenceTarget, sameStoragePresenceTarget, type StoragePresenceTarget } from './coursework-storage-presence.ts';
import type { R2Config } from './media-r2.ts';
const asset='11111111-1111-4111-8111-111111111111';
const target:StoragePresenceTarget={asset_id:asset,storage_backend:'r2',master_bucket:'masters',master_key:`${asset}/application-pdf`};
const config:R2Config={accountId:'abc',credentials:{accessKeyId:'test',secretAccessKey:'test'},mastersBucket:'masters',renditionsBucket:'renditions'};
test('storage target is bound to the requested asset and unchanged on recheck',()=>{
  assert.deepEqual(parseStoragePresenceTarget([target],asset),target);
  for(const value of [null,[],[target,target],[{...target,asset_id:'other'}],[{...target,master_key:'22222222-2222-4222-8222-222222222222/application-pdf'}]]) assert.equal(parseStoragePresenceTarget(value,asset),null);
  assert.equal(sameStoragePresenceTarget(target,{...target,master_bucket:'other'}),false);
});
test('storage check reports only what HEAD returns; no status records deletion',async()=>{
  let calls=0;
  const fetcher:typeof fetch=async (_url,init)=>{calls++;assert.equal(init?.method,'HEAD');assert.equal(init?.redirect,'error');assert.equal(init?.cache,'no-store');assert.ok(init?.signal);return new Response(null,{status:404});};
  assert.equal(await checkCourseworkStoragePresence(target,config,fetcher),'not_found');assert.equal(calls,1);
  assert.equal(await checkCourseworkStoragePresence(target,config,async()=>new Response(null,{status:200})),'present');
  for(const status of [403,500]) assert.equal(await checkCourseworkStoragePresence(target,config,async()=>new Response(null,{status})),'unknown');
  assert.equal(await checkCourseworkStoragePresence(target,config,async()=>{throw Error('timeout');}),'unknown');
  assert.equal(await checkCourseworkStoragePresence({...target,master_bucket:'other'},config,fetcher),'unknown');assert.equal(calls,1);
});
test('endpoint rechecks authority and the UI does not claim verified deletion',()=>{
  const route=readFileSync(new URL('../app/api/admin/coursework/storage-presence/route.ts',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../app/admin/coursework/storage-presence.tsx',import.meta.url),'utf8');
  assert.equal((route.match(/rpc\('coursework_storage_presence_target'/g)??[]).length,2);
  assert.match(route,/verifiedDeletion:false/);
  assert.match(ui,/does not verify deletion/);
  assert.match(ui,/does not delete anything or record a deletion/);
});
