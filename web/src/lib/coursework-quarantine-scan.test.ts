import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { scanQuarantinedCoursework } from './coursework-quarantine-scan.ts';
import type { R2Config } from './media-r2.ts';
const asset='11111111-1111-4111-8111-111111111111';
const target={asset_id:asset,storage_backend:'r2',master_bucket:'masters',master_key:`${asset}/application-pdf`,declared_bytes:4};
const config:R2Config={accountId:'acct',credentials:{accessKeyId:'a',secretAccessKey:'b'},mastersBucket:'masters',renditionsBucket:'renditions'};
const scanner=async ({bytes}:{bytes:Buffer;socketPath:string})=>({outcome:'clean' as const,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
test('owner scan downloads bounded bytes, signs the asset target, and calls the local scanner',async()=>{
  let seen=false;
  const fetchImpl:typeof fetch=async (_url,init)=>{assert.equal(init?.method,'GET');assert.equal(init?.redirect,'error');assert.equal(init?.cache,'no-store');assert.ok(init?.signal);return new Response('test',{headers:{'content-length':'4'}});};
  const scan=async (input:{bytes:Buffer;socketPath:string})=>{assert.equal(input.bytes.toString(),'test');assert.equal(input.socketPath,'/tmp/local.sock');seen=true;return scanner(input);};
  assert.deepEqual(await scanQuarantinedCoursework({target,config,socketPath:'/tmp/local.sock',fetchImpl,scan}),{ok:true,outcome:'clean',bytes:4});
  assert.equal(seen,true);
});
test('mismatched targets and bad or incomplete transfers fail without scanning',async()=>{
  let scans=0;
  const scan=async (input:{bytes:Buffer;socketPath:string})=>{scans++;return scanner(input);};
  const fetchers:typeof fetch[]=[async()=>new Response('test',{status:403}),async()=>new Response('test',{headers:{'content-length':'3'}}),async()=>new Response('tes',{headers:{'content-length':'4'}}),async()=>new Response('testing',{headers:{'content-length':'4'}}),async()=>{throw Error('offline');}];
  for(const fetchImpl of fetchers) assert.equal((await scanQuarantinedCoursework({target,config,socketPath:'/tmp/local.sock',fetchImpl,scan})).ok,false);
  assert.equal((await scanQuarantinedCoursework({target:{...target,master_key:'22222222-2222-4222-8222-222222222222/application-pdf'},config,socketPath:'/tmp/local.sock',scan})).ok,false);
  assert.equal(scans,0);
});
test('unavailable scanner never results in a clean report',async()=>{
  const fetchImpl:typeof fetch=async()=>new Response('test',{headers:{'content-length':'4'}});
  const scan=async()=>({outcome:'unavailable' as const,reason:'timeout' as const});
  assert.equal((await scanQuarantinedCoursework({target,config,socketPath:'/tmp/local.sock',fetchImpl,scan})).ok,false);
});
test('scan is owner-only through a rechecked target and does not release quarantine',()=>{
  const route=readFileSync(new URL('../app/api/admin/coursework/quarantine-scan/route.ts',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../app/admin/coursework/quarantine-scan.tsx',import.meta.url),'utf8');
  assert.equal((route.match(/rpc\('coursework_quarantine_inspection_target'/g)??[]).length,2);
  assert.match(route,/quarantineReleased:false/);
  assert.match(ui,/does not guarantee safety/);
  assert.match(ui,/Quarantine was not released/);
});
