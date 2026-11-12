import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculatedHijriDate } from './hijri-date.ts';

test('returns a labelled browser-calculated date and rejects invalid dates',()=>{
  assert.equal(calculatedHijriDate(new Date(NaN)),null);
  const result=calculatedHijriDate(new Date('2025-03-01T12:00:00Z'));
  assert.ok(result);
  assert.match(result.hijri,/1446/);
  assert.match(result.civil,/2025/);
});
test('page and dashboard independently gate the display and explain its limits',()=>{
  const page=readFileSync(new URL('../app/companion/hijri/page.tsx',import.meta.url),'utf8');
  const view=readFileSync(new URL('../app/companion/hijri/view.tsx',import.meta.url),'utf8');
  const dashboard=readFileSync(new URL('../app/learn/page.tsx',import.meta.url),'utf8');
  assert.match(page,/isFlagEnabled\(supabase,'companion\.hijri_date'\)/);
  assert.match(dashboard,/hijriOn &&/);
  assert.match(view,/not sunset/); assert.match(view,/announcements/);
  assert.doesNotMatch(view,/localStorage|sessionStorage|fetch\(|geolocation/);
});
