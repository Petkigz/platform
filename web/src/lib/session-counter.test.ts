import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialCounterState, MAX_SESSION_COUNT, sessionCounter } from './session-counter.ts';

test('count and undo remain within bounds',()=>{
  const once=sessionCounter(initialCounterState,'increase');
  assert.equal(once.count,1);assert.equal(sessionCounter(once,'decrease').count,0);
  assert.equal(sessionCounter(initialCounterState,'decrease').count,0);
  assert.equal(sessionCounter({count:MAX_SESSION_COUNT,confirmingReset:false},'increase').count,MAX_SESSION_COUNT);
});
test('reset requires confirmation and does not change while awaiting a decision',()=>{
  const started={count:7,confirmingReset:false};
  assert.deepEqual(sessionCounter(started,'confirm-reset'),started);
  const prompt=sessionCounter(started,'ask-reset');
  assert.deepEqual(sessionCounter(prompt,'increase'),prompt);
  assert.deepEqual(sessionCounter(prompt,'decrease'),prompt);
  assert.deepEqual(sessionCounter(prompt,'cancel-reset'),started);
  assert.deepEqual(sessionCounter(prompt,'confirm-reset'),initialCounterState);
});
test('the route and dashboard both check the independent switch; count remains memory-only',()=>{
  const page=readFileSync(new URL('../app/companion/counter/page.tsx',import.meta.url),'utf8');
  const component=readFileSync(new URL('../app/companion/counter/counter.tsx',import.meta.url),'utf8');
  const dashboard=readFileSync(new URL('../app/learn/page.tsx',import.meta.url),'utf8');
  assert.match(page,/isFlagEnabled\(supabase,'companion\.dhikr_counter'\)/);
  assert.match(page,/enabled \? <>/);assert.match(page,/not saved or sent/);
  assert.match(dashboard,/counterOn &&/);assert.match(dashboard,/href="\/companion\/counter"/);
  assert.doesNotMatch(component,/localStorage|sessionStorage|indexedDB|fetch\(|sendBeacon|document\.cookie/);
});
