import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { fetchModerationQueue } from './discussion.ts';
import { fetchReportQueue } from './governance.ts';
import { decodeDiscussionCursor } from './discussion-queue-cursor.ts';

const stamp='2026-11-12T13:04:05.123456+00:00';
const id=(n:number)=>`00000000-0000-4000-8000-${n.toString(16).padStart(12,'0')}`;

test('the real Supabase client preserves both queue boundaries in the REST URL',async()=>{
  const urls:URL[]=[];
  const mocked:typeof fetch=async (input)=>{
    const url=new URL(String(input));urls.push(url);
    const second=url.searchParams.has('or');
    const records=Array.from({length:second ? 1 : 51},(_,i)=>({
      id:id((second ? 51 : 1)+i),created_at:stamp,lesson_id:id(99),
      body:'Sample',parent_id:null,visibility_state:'pending',user_profiles:null,lessons:null,
      discussion_post_id:null,discussion_post:null,reporter:null,lesson:null,
    }));
    return new Response(JSON.stringify(records),{status:200,headers:{'content-type':'application/json'}});
  };
  const client=createClient('https://test.invalid','not-a-real-key',{global:{fetch:mocked},auth:{persistSession:false,autoRefreshToken:false}});
  for(const fetchPage of [fetchModerationQueue,fetchReportQueue]) {
    const first=await fetchPage(client);
    assert.equal(first.items.length,50);
    const cursor=decodeDiscussionCursor(first.nextCursor);
    assert.deepEqual(cursor,{createdAt:stamp,id:id(50)});
    const next=await fetchPage(client,{cursor});
    assert.equal(next.items.length,1);assert.equal(next.items[0]?.id,id(51));
  }
  assert.equal(urls.length,4);
  for(const url of [urls[1],urls[3]]) {
    assert.ok(url);
    assert.equal(url.searchParams.get('limit'),'51');
    assert.equal(url.searchParams.get('order'),'created_at.asc,id.asc');
    assert.equal(url.searchParams.get('or'),`(created_at.gt."${stamp}",and(created_at.eq."${stamp}",id.gt.${id(50)}))`);
  }
});
