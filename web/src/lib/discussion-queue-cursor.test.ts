import test from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { decodeDiscussionCursor, encodeDiscussionCursor } from './discussion-queue-cursor.ts';
import { fetchModerationQueue } from './discussion.ts';
import { fetchReportQueue } from './governance.ts';

const date='2026-11-12T13:04:05.123456+00:00';
const id=(n:number)=>`00000000-0000-4000-8000-${n.toString(16).padStart(12,'0')}`;
test('cursor round trip preserves sub-millisecond precision and rejects filter injection',()=>{
  const cursor={createdAt:date,id:id(1)};
  assert.deepEqual(decodeDiscussionCursor(encodeDiscussionCursor(cursor)),cursor);
  for(const token of ['', '%%%','x'.repeat(257),Buffer.from(JSON.stringify({...cursor,createdAt:`${date},id.gt.0`})).toString('base64url'),Buffer.from(JSON.stringify({...cursor,id:'x),id.gt.0'})).toString('base64url')])
    assert.equal(decodeDiscussionCursor(token),null);
  assert.throws(()=>encodeDiscussionCursor({...cursor,id:'invalid'}));
});

test('queue pages use timestamp plus UUID and fetch one extra row',async()=>{
  const rows=Array.from({length:51},(_,i)=>({id:id(i+1),lesson_id:id(90),body:'Question',parent_id:null,created_at:date,visibility_state:'pending',user_profiles:[],lessons:[]}));
  const calls:{method:string;args:unknown[]}[]=[];
  const db={from:()=>{
    const query:Record<string,unknown>={};
    for(const method of ['select','eq','is','order','limit','or'])query[method]=(...args:unknown[])=>{calls.push({method,args});return query;};
    query.then=(resolve:(value:unknown)=>void)=>resolve({data:rows,error:null});return query;
  }} as unknown as SupabaseClient;
  const result=await fetchModerationQueue(db,{cursor:{createdAt:date,id:id(0)}});
  assert.equal(result.items.length,50);
  assert.deepEqual(decodeDiscussionCursor(result.nextCursor),{createdAt:date,id:id(50)});
  assert.deepEqual(calls.filter(c=>c.method==='order').map(c=>c.args[0]),['created_at','id']);
  assert.deepEqual(calls.find(c=>c.method==='limit')?.args,[51]);
  assert.equal(calls.find(c=>c.method==='or')?.args[0],`created_at.gt."${date}",and(created_at.eq."${date}",id.gt.${id(0)})`);
});


test('report queue uses the same stable page boundary',async()=>{
  const rows=Array.from({length:51},(_,i)=>({id:id(i+1),created_at:date,discussion_post_id:null,reporter:null,lesson:null,discussion_post:null}));
  const calls:{method:string;args:unknown[]}[]=[];
  const db={from:()=>{
    const query:Record<string,unknown>={};
    for(const method of ['select','in','order','limit','or'])query[method]=(...args:unknown[])=>{calls.push({method,args});return query;};
    query.then=(resolve:(value:unknown)=>void)=>resolve({data:rows,error:null});return query;
  }} as unknown as SupabaseClient;
  const result=await fetchReportQueue(db,{cursor:{createdAt:date,id:id(0)}});
  assert.equal(result.items.length,50);
  assert.deepEqual(decodeDiscussionCursor(result.nextCursor),{createdAt:date,id:id(50)});
  assert.deepEqual(calls.filter(c=>c.method==='order').map(c=>c.args[0]),['created_at','id']);
  assert.deepEqual(calls.find(c=>c.method==='limit')?.args,[51]);
  assert.equal(calls.find(c=>c.method==='or')?.args[0],`created_at.gt."${date}",and(created_at.eq."${date}",id.gt.${id(0)})`);
});
