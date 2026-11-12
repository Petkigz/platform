import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculatePrayerTimes, prayerTimesMatchDeviceDay } from './prayer-calculation.ts';

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
  assert.match(tool,/visibilitychange/); assert.match(tool,/setInterval/);
});

test('rejects finite but impossible ordering near polar night',()=>{
  // Tromsø, Norway: the underlying calculation returns Asr after Maghrib.
  assert.equal(calculatePrayerTimes(69.65,18.95,new Date(2026,0,15),'MuslimWorldLeague','standard','middle'),null);
});

test('matches the upstream Adhan v4.4.6 Raleigh example, not independent verification',()=>{
  const result=calculatePrayerTimes(35.775,-78.6336,new Date(2015,6,12),'NorthAmerica','hanafi','middle');
  assert.ok(result);
  const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  assert.deepEqual(result.map(([,date])=>fmt.format(date)),['04:42','06:08','13:21','18:22','20:32','21:57']);
});

test('date guard catches a dateline offset and does not assert geographic zone accuracy',()=>{
  const previous=process.env.TZ;
  try {
    process.env.TZ='Pacific/Kiritimati';
    const date=new Date(2026,9,15,12);
    const result=calculatePrayerTimes(1.87,-157.4,date,'MuslimWorldLeague','standard','middle');
    assert.ok(result);
    assert.equal(prayerTimesMatchDeviceDay(result,date,'Pacific/Kiritimati'),false);
    assert.equal(prayerTimesMatchDeviceDay(result,date,'Not/AZone'),false);
    process.env.TZ='America/New_York';
    for(const day of [7,8,9]) {
      const date=new Date(2026,2,day,12);
      const result=calculatePrayerTimes(40.7,-74,date,'NorthAmerica','standard','middle');
      assert.ok(result);
      assert.equal(prayerTimesMatchDeviceDay(result,date,'America/New_York'),true);
    }
  } finally { if(previous===undefined) delete process.env.TZ; else process.env.TZ=previous; }
});
