import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculatePrayerTimes } from './prayer-calculation.ts';

test('calculation rejects invalid inputs and unresolved polar days',()=>{
  const date=new Date(2026,5,21);
  assert.equal(calculatePrayerTimes(NaN,0,date,'Karachi','standard','middle'),null);
  assert.equal(calculatePrayerTimes(91,0,date,'Karachi','standard','middle'),null);
  assert.equal(calculatePrayerTimes(0,181,date,'Karachi','standard','middle'),null);
  assert.equal(calculatePrayerTimes(89,0,date,'Karachi','standard','middle'),null);
  assert.equal(calculatePrayerTimes(0,0,new Date(NaN),'Karachi','standard','middle'),null);
});
test('calculation exposes times in order and different Asr methods',()=>{
  const date=new Date(2026,9,15);
  const standard=calculatePrayerTimes(0.3476,32.5825,date,'MuslimWorldLeague','standard','middle');
  const hanafi=calculatePrayerTimes(0.3476,32.5825,date,'MuslimWorldLeague','hanafi','middle');
  assert.ok(standard); assert.ok(hanafi);
  assert.deepEqual(standard.map(([n])=>n),['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha']);
  for(let i=1;i<standard.length;i++) assert.ok(standard[i]![1]>standard[i-1]![1]);
  assert.ok(hanafi[3][1]>standard[3][1]);
});
test('permission is explicit, coordinates stay on device, and both links check the switch',()=>{
  const page=readFileSync(new URL('../app/companion/prayer-times/page.tsx',import.meta.url),'utf8');
  const tool=readFileSync(new URL('../app/companion/prayer-times/tool.tsx',import.meta.url),'utf8');
  const dashboard=readFileSync(new URL('../app/learn/page.tsx',import.meta.url),'utf8');
  assert.match(page,/isFlagEnabled\(supabase,'companion\.calculated_prayer_times'\)/);
  assert.match(dashboard,/prayerTimesOn &&/); assert.match(tool,/getCurrentPosition/);
  assert.doesNotMatch(tool,/localStorage|sessionStorage|indexedDB|fetch\(|sendBeacon/);
  assert.match(tool,/time zone matches/); assert.match(tool,/local authority/);
});
