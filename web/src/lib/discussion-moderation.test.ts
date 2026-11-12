import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchModerationQueue, moderatePost } from './discussion.ts';
import { fetchReportQueue } from './governance.ts';

test('moderation sends the exact displayed text and state to the checked RPC',async()=>{
  let sent:unknown;
  const db={rpc:async (name:string,args:unknown)=>{assert.equal(name,'moderate_discussion_post');sent=args;return {error:null};}} as unknown as SupabaseClient;
  const result=await moderatePost(db,{postId:'post',state:'visible',reviewedBody:'Text as displayed\n',reviewedState:'pending',parent:null});
  assert.deepEqual(result,{ok:true});
  assert.deepEqual(sent,{p_post_id:'post',p_state:'visible',p_note:null,p_reviewed_body:'Text as displayed\n',p_reviewed_state:'pending',p_parent_id:null,p_parent_body:null,p_parent_state:null});
});
test('stale decision is not presented as successful',async()=>{
  const db={rpc:async()=>({error:{message:'post changed or is unavailable; refresh and review again'}})} as unknown as SupabaseClient;
  const result=await moderatePost(db,{postId:'post',state:'visible',reviewedBody:'Old',reviewedState:'pending',parent:null});
  assert.deepEqual(result,{ok:false,message:'post changed or is unavailable; refresh and review again'});
});
test('the queue remains available when posting is switched off',()=>{
  const page=readFileSync(new URL('../app/admin/discussion/page.tsx',import.meta.url),'utf8');
  assert.match(page,/const queue = await fetchModerationQueue\(supabase\)/);
  assert.match(page,/existing posts still need review/i);
  assert.match(page,/more may be waiting/);
});


test('reply decisions include the exact question displayed to the moderator',async()=>{
  let sent:Record<string,unknown>={};
  const db={rpc:async (_name:string,args:Record<string,unknown>)=>{sent=args;return {error:null};}} as unknown as SupabaseClient;
  const parent={id:'root',lessonId:'lesson',body:'Original question',state:'visible'};
  await moderatePost(db,{postId:'reply',state:'visible',reviewedBody:'Answer',reviewedState:'pending',parent});
  assert.equal(sent.p_parent_id,'root');assert.equal(sent.p_parent_body,'Original question');assert.equal(sent.p_parent_state,'visible');
});

function queryStub(batches: unknown[][]) {
  const calls:string[]=[];let index=0;
  const client={from:(table:string)=>{
    calls.push(table);const data=batches[index++] ?? [];
    const chain:Record<string,unknown>={};
    for(const name of ['select','eq','is','in','order','limit'])chain[name]=()=>chain;
    chain.then=(resolve:(value:unknown)=>void)=>resolve({data,error:null});
    return chain;
  }} as unknown as SupabaseClient;
  return {client,calls};
}

test('moderation queue shows the actual parent and rejects mismatched or missing context',async()=>{
  const reply={id:'reply',lesson_id:'lesson',body:'Answer',parent_id:'root',created_at:'2026-01-01',visibility_state:'pending',user_profiles:[],lessons:[]};
  const parent={id:'root',lesson_id:'lesson',body:'Question',visibility_state:'visible',parent_id:null,deleted_at:null};
  const found=queryStub([[reply],[parent]]);const items=await fetchModerationQueue(found.client);
  assert.deepEqual(found.calls,['discussion_posts','discussion_posts']);
  assert.deepEqual(items[0]?.parent,{id:'root',lessonId:'lesson',body:'Question',state:'visible'});
  const mismatch=queryStub([[reply],[{...parent,lesson_id:'other'}]]);
  assert.equal((await fetchModerationQueue(mismatch.client))[0]?.parent,null);
  const missing=queryStub([[reply],[]]);assert.equal((await fetchModerationQueue(missing.client))[0]?.parent,null);
});

test('reported replies carry their reviewed question too',async()=>{
  const report={id:'report',report_category:'other',description:'Problem',status:'submitted',created_at:'2026-01-01',discussion_post_id:'reply',reporter:null,lesson:null,discussion_post:{body:'Answer',visibility_state:'visible',parent_id:'root',lesson_id:'lesson'}};
  const parent={id:'root',lesson_id:'lesson',body:'Question',visibility_state:'visible',parent_id:null,deleted_at:null};
  const stub=queryStub([[report],[parent]]);const rows=await fetchReportQueue(stub.client);
  assert.deepEqual(rows[0]?.discussionPost?.parent,{id:'root',lessonId:'lesson',body:'Question',state:'visible'});
  assert.deepEqual(stub.calls,['content_reports','discussion_posts']);
});
