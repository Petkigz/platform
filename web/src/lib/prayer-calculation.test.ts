import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculatePrayerTimes, calculatePrayerTimesForDeviceDay, prayerTimesMatchDeviceDay, selectedNightRule, methodExampleForZone } from './prayer-calculation.ts';

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

test('requesting a fresh location clears old coordinates and time-zone confirmation before any browser outcome',()=>{
  const tool=readFileSync(new URL('../app/companion/prayer-times/tool.tsx',import.meta.url),'utf8');
  const locate=tool.slice(tool.indexOf('  function locate() {'),tool.indexOf('  function calculate() {'));
  const beforeRequest=locate.slice(0,locate.indexOf('if (!navigator.geolocation)'));
  assert.match(beforeRequest,/setLatitude\(''\)/);
  assert.match(beforeRequest,/setLongitude\(''\)/);
  assert.match(beforeRequest,/setConfirmZone\(false\)/);
  assert.match(beforeRequest,/setResult\(null\)/);
  assert.match(locate,/permission was denied/);
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
    const corrected=calculatePrayerTimesForDeviceDay(1.87,-157.4,date,'Pacific/Kiritimati','MuslimWorldLeague','standard','middle');
    assert.ok(corrected);
    assert.equal(prayerTimesMatchDeviceDay(corrected,date,'Pacific/Kiritimati'),true);
    assert.equal(corrected[1][1].toISOString(), '2026-10-14T16:13:00.000Z');
    assert.equal(calculatePrayerTimesForDeviceDay(1.87,-157.4,date,'America/New_York','MuslimWorldLeague','standard','middle'),null);
    assert.equal(prayerTimesMatchDeviceDay(result,date,'Not/AZone'),false);
    process.env.TZ='America/New_York';
    for(const day of [7,8,9]) {
      const date=new Date(2026,2,day,12);
      const result=calculatePrayerTimes(40.7,-74,date,'NorthAmerica','standard','middle');
      assert.ok(result);
      assert.equal(prayerTimesMatchDeviceDay(result,date,'America/New_York'),true);
      const adjusted=calculatePrayerTimesForDeviceDay(40.7,-74,date,'America/New_York','NorthAmerica','standard','middle');
      assert.ok(adjusted);
      assert.deepEqual(adjusted.map(([,t])=>t.toISOString()),result.map(([,t])=>t.toISOString()));
    }
  } finally { if(previous===undefined) delete process.env.TZ; else process.env.TZ=previous; }
});

test('labelled London Moonsighting Committee example agrees with a published timetable',()=>{
  // Comparison only: source coordinates, algorithms and independence are not established.
  // https://hnco.org.uk/prayer-timetable/prayer-times-london (15 Oct 2026)
  const previous=process.env.TZ;
  try {
    process.env.TZ='Europe/London';
    const result=calculatePrayerTimesForDeviceDay(51.5074,-0.1278,new Date(2026,9,15,12),'Europe/London','MoonsightingCommittee','standard','middle');
    assert.ok(result);
    const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
    assert.deepEqual(result.map(([,date])=>fmt.format(date)),['05:49','07:24','12:51','15:31','18:10','19:30']);
  } finally { if(previous===undefined) delete process.env.TZ; else process.env.TZ=previous; }
});

test('selected civil day holds across zones, new year and both DST changes',()=>{
  const previous=process.env.TZ;
  try {
    for(const [zone,lat,lon] of [['Asia/Tokyo',35.7,139.7],['Pacific/Auckland',-36.85,174.76],['Pacific/Honolulu',21.3,-157.8],['Pacific/Kiritimati',1.87,-157.4],['America/New_York',40.7,-74],['Europe/London',51.5,-0.12]] as const) {
      process.env.TZ=zone;
      for(const [month,day] of [[0,1],[2,8],[2,29],[5,21],[9,25],[10,1],[11,31]] as const) {
        const date=new Date(2026,month,day,12);
        const times=calculatePrayerTimesForDeviceDay(lat,lon,date,zone,'MuslimWorldLeague','standard','middle');
        assert.ok(times, `${zone} ${date.toDateString()}`);
        assert.ok(prayerTimesMatchDeviceDay(times,date,zone));
      }
    }
  } finally { if(previous===undefined) delete process.env.TZ; else process.env.TZ=previous; }
});

test('summer high-latitude choices affect estimates and polar days fail closed',()=>{
  const prior=process.env.TZ;
  try {
    process.env.TZ='Europe/London';
    const date=new Date(2026,5,21,12);
    const middle=calculatePrayerTimesForDeviceDay(51.5074,-0.1278,date,'Europe/London','MuslimWorldLeague','standard','middle');
    const seventh=calculatePrayerTimesForDeviceDay(51.5074,-0.1278,date,'Europe/London','MuslimWorldLeague','standard','seventh');
    assert.ok(middle); assert.ok(seventh);
    assert.notEqual(middle[0][1].getTime(),seventh[0][1].getTime());
    process.env.TZ='Europe/Oslo';
    assert.equal(calculatePrayerTimesForDeviceDay(69.65,18.95,date,'Europe/Oslo','MuslimWorldLeague','standard','middle'),null);
  } finally {if(prior===undefined) delete process.env.TZ; else process.env.TZ=prior;}
});


test('Singapore estimate is close to, but explicitly not identical to, MUIS published times',()=>{
  // MUIS 2026 official timetable, Jan 1, Apr 15 and Oct 15. This uses a
  // representative point, not necessarily the official calculation location.
  // https://www.muis.gov.sg/resources/islamic-calendar/
  const previous=process.env.TZ;
  try {
    process.env.TZ='Asia/Singapore';
    const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Singapore',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
    const cases=[
      [0,1,['05:44','07:08','13:10','16:34','19:11','20:25']],
      [3,15,['05:43','07:01','13:06','16:20','19:09','20:19']],
      [9,15,['05:31','06:48','12:52','16:06','18:53','20:03']],
    ] as const;
    const minutes=(s:string)=>Number(s.slice(0,2))*60+Number(s.slice(3));
    let differences=0;
    for (const [month,day,official] of cases) {
      const times=calculatePrayerTimesForDeviceDay(1.3521,103.8198,new Date(2026,month,day,12),'Asia/Singapore','Singapore','standard','middle');
      assert.ok(times);
      times.forEach(([,time],i)=>{
        const difference=Math.abs(minutes(fmt.format(time))-minutes(official[i]!));
        assert.ok(difference<=2, `Singapore ${month+1}/${day}, ${i}: ${difference} minutes`);
        differences+=difference;
      });
    }
    assert.ok(differences>0, 'do not misrepresent this calculation as the official timetable');
  } finally {if(previous===undefined) delete process.env.TZ; else process.env.TZ=previous;}
  const tool=readFileSync(new URL('../app/companion/prayer-times/tool.tsx',import.meta.url),'utf8');
  assert.match(tool,/not the official Singapore timetable/);
  assert.match(tool,/muis\.gov\.sg\/resources\/islamic-calendar/);
});

test('Nairobi estimate is close to one published MWL timetable',()=>{
  // Source settings name MWL and Shafii. Independence and exact coordinates
  // are unknown: this is a comparison, not proof of accuracy or endorsement.
  // https://www.prayertime.online/kenya/nairobi/
  const previous=process.env.TZ;
  try {
    process.env.TZ='Africa/Nairobi';
    const times=calculatePrayerTimesForDeviceDay(-1.2921,36.8219,new Date(2026,9,15,12),'Africa/Nairobi','MuslimWorldLeague','standard','middle');
    assert.ok(times);
    const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Nairobi',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
    const published=['05:05','06:14','12:19','15:31','18:23','19:28'];
    const minutes=(s:string)=>Number(s.slice(0,2))*60+Number(s.slice(3));
    times.forEach(([,time],i)=>assert.ok(Math.abs(minutes(fmt.format(time))-minutes(published[i]!))<=2));
  } finally {if(previous===undefined) delete process.env.TZ; else process.env.TZ=previous;}
});


test('Moonsighting Committee does not require an unused night rule',()=>{
  assert.equal(selectedNightRule('MoonsightingCommittee',''),'middle');
  assert.equal(selectedNightRule('MuslimWorldLeague',''),null);
  assert.equal(selectedNightRule('MuslimWorldLeague','seventh'),'seventh');
  assert.equal(selectedNightRule('MuslimWorldLeague','invalid'),null);
  const date=new Date(2026,5,21,12);
  const first=calculatePrayerTimes(51.5,-0.12,date,'MoonsightingCommittee','standard','middle');
  const second=calculatePrayerTimes(51.5,-0.12,date,'MoonsightingCommittee','standard','seventh');
  assert.ok(first); assert.ok(second);
  assert.deepEqual(first.map(([,t])=>t.getTime()),second.map(([,t])=>t.getTime()));
  const tool=readFileSync(new URL('../app/companion/prayer-times/tool.tsx',import.meta.url),'utf8');
  assert.match(tool,/selectedNightRule\(method,night\)/);
  assert.match(tool,/no separate night rule is needed/);
  assert.match(tool,/No polar approximation has been applied/);
});


test('Egyptian and Karachi calculations compare with published labelled timetables',()=>{
  // A small cross-check, not proof of independent calculation or of local authority approval.
  // Cairo: https://sajda.com/en/prayer-times/egypt/cairo/360630
  // Karachi: https://hamariweb.com/islam/pt_city.aspx?id=1
  const prior=process.env.TZ;
  try {
    const cases=[
      {zone:'Africa/Cairo',lat:30.0444,lon:31.2357,method:'Egyptian',asr:'standard',reference:['05:30','06:57','12:41','15:57','18:24','19:42']},
      {zone:'Asia/Karachi',lat:24.8607,lon:67.0011,method:'Karachi',asr:'hanafi',reference:['05:14','06:30','12:18','16:28','18:05','19:21']},
    ] as const;
    const minutes=(s:string)=>Number(s.slice(0,2))*60+Number(s.slice(3));
    for(const {zone,lat,lon,method,asr,reference} of cases) {
      process.env.TZ=zone;
      const times=calculatePrayerTimesForDeviceDay(lat,lon,new Date(2026,9,15,12),zone,method,asr,'middle');
      assert.ok(times);
      const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
      times.forEach(([,time],index)=>assert.ok(Math.abs(minutes(fmt.format(time))-minutes(reference[index]!))<=2,`${zone} ${index}`));
    }
  } finally {if(prior===undefined) delete process.env.TZ; else process.env.TZ=prior;}
});

test('calculation choices link to plain-language explanations',()=>{
  const tool=readFileSync(new URL('../app/companion/prayer-times/tool.tsx',import.meta.url),'utf8');
  assert.match(tool,/aria-describedby="asr-explanation"/);
  assert.match(tool,/aria-describedby="night-explanation"/);
  assert.match(tool,/noon shadow/);
  assert.match(tool,/Ask your community which rule/);
});


test('regional examples are explicit, limited, and never a default',()=>{
  assert.deepEqual(methodExampleForZone('Europe/London'),{place:'the UK',method:'MoonsightingCommittee'});
  assert.deepEqual(methodExampleForZone('Asia/Karachi'),{place:'Karachi',method:'Karachi'});
  assert.deepEqual(methodExampleForZone('Asia/Singapore'),{place:'Singapore',method:'Singapore'});
  assert.deepEqual(methodExampleForZone('Africa/Cairo'),{place:'Cairo',method:'Egyptian'});
  assert.deepEqual(methodExampleForZone('Africa/Nairobi'),{place:'Nairobi',method:'MuslimWorldLeague'});
  assert.equal(methodExampleForZone('Asia/Tokyo'),null);
  assert.equal(methodExampleForZone('__proto__'),null);
  const tool=readFileSync(new URL('../app/companion/prayer-times/tool.tsx',import.meta.url),'utf8');
  assert.match(tool,/useState\(''\); const \[asr/);
  assert.match(tool,/A time zone does not identify your location/);
  assert.match(tool,/onClick=\{\(\)=>\{setMethod\(example.method\);changed\(\);\}\}/);
});


test('time zone confirmation checkbox has an accessible label and does not inherit full-width input styling',()=>{
  const tool=readFileSync(new URL('../app/companion/prayer-times/tool.tsx',import.meta.url),'utf8');
  assert.match(tool,/<label className="row"[^>]*><input type="checkbox"/);
  assert.match(tool,/width:'1\.25rem',height:'1\.25rem',flex:'0 0 1\.25rem'/);
  assert.match(tool,/<span>My device time zone matches this location\.<\/span><\/label>/);
});
