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
test('the date is written in the reader\'s language and is still the Umm al-Qura date',()=>{
  const when=new Date('2025-03-01T12:00:00Z');
  const english=calculatedHijriDate(when);
  const arabic=calculatedHijriDate(when,'ar');
  const swahili=calculatedHijriDate(when,'sw');
  assert.ok(english); assert.ok(arabic); assert.ok(swahili);
  assert.equal(english.hijri,calculatedHijriDate(when,'en')!.hijri);
  assert.notEqual(arabic.hijri,english.hijri);
  // Same day and year whatever the language: 1 Ramadan 1446.
  const digits=(value:string)=>value.replace(/[\u0660-\u0669]/g,d=>String(d.charCodeAt(0)-0x0660)).match(/\d+/g);
  assert.deepEqual(digits(arabic.hijri)?.sort(),digits(english.hijri)?.sort());
  assert.deepEqual(digits(swahili.hijri)?.sort(),digits(english.hijri)?.sort());
  // A language the runtime does not know must not turn the Hijri date Gregorian.
  const unknown=calculatedHijriDate(when,'bm');
  assert.ok(unknown); assert.match(unknown.hijri,/1446/); assert.match(unknown.civil,/2025/);
  // No month names for this language in the runtime's data: keep the name.
  const wolof=calculatedHijriDate(when,'wo');
  assert.ok(wolof); assert.doesNotMatch(wolof.hijri,/^\d+\/\d+\/\d+/);
  // A tag the runtime rejects falls back to English rather than to nothing.
  assert.deepEqual(calculatedHijriDate(when,'not a tag'),english);
  const view=readFileSync(new URL('../app/companion/hijri/view.tsx',import.meta.url),'utf8');
  assert.match(view,/useLocaleCode\(\)/);
  assert.doesNotMatch(view,/calculatedHijriDate\(new Date\(\)\)/);
});
test('page and dashboard independently gate the display and explain its limits',()=>{
  const page=readFileSync(new URL('../app/companion/hijri/page.tsx',import.meta.url),'utf8');
  const view=readFileSync(new URL('../app/companion/hijri/view.tsx',import.meta.url),'utf8');
  const dashboard=readFileSync(new URL('../app/learn/page.tsx',import.meta.url),'utf8');
  // The limits are catalogue sentences now; the view asks the catalogue for them.
  const en=readFileSync(new URL('./i18n/messages/en.ts',import.meta.url),'utf8');
  assert.match(page,/isFlagEnabled\(supabase,'companion\.hijri_date'\)/);
  assert.match(dashboard,/hijriOn &&/);
  assert.match(en,/not sunset/); assert.match(en,/announcements/);
  assert.doesNotMatch(view,/localStorage|sessionStorage|fetch\(|geolocation/);
});
