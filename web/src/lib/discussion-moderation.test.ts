import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { moderatePost } from './discussion.ts';

test('moderation sends the exact displayed text and state to the checked RPC',async()=>{
  let sent:unknown;
  const db={rpc:async (name:string,args:unknown)=>{assert.equal(name,'moderate_discussion_post');sent=args;return {error:null};}} as unknown as SupabaseClient;
  const result=await moderatePost(db,{postId:'post',state:'visible',reviewedBody:'Text as displayed\n',reviewedState:'pending'});
  assert.deepEqual(result,{ok:true});
  assert.deepEqual(sent,{p_post_id:'post',p_state:'visible',p_note:null,p_reviewed_body:'Text as displayed\n',p_reviewed_state:'pending'});
});
test('stale decision is not presented as successful',async()=>{
  const db={rpc:async()=>({error:{message:'post changed or is unavailable; refresh and review again'}})} as unknown as SupabaseClient;
  const result=await moderatePost(db,{postId:'post',state:'visible',reviewedBody:'Old',reviewedState:'pending'});
  assert.deepEqual(result,{ok:false,message:'post changed or is unavailable; refresh and review again'});
});
test('the queue remains available when posting is switched off',()=>{
  const page=readFileSync(new URL('../app/admin/discussion/page.tsx',import.meta.url),'utf8');
  assert.match(page,/const queue = await fetchModerationQueue\(supabase\)/);
  assert.match(page,/existing posts still need review/i);
  assert.match(page,/more may be waiting/);
});
