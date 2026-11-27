import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { looksLikeVerse, pickVoice, speakable } from './read-aloud.ts';

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

test('a sentence written as a verse is written is not given to a voice', () => {
  // Fully vowelled, in ornate brackets, with the end-of-ayah sign, and the basmala as one sign.
  assert.equal(looksLikeVerse('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'), true);
  assert.equal(looksLikeVerse('قال تعالى: ﴿قل هو الله أحد﴾'), true);
  assert.equal(looksLikeVerse('قل هو الله أحد ۝'), true);
  assert.equal(looksLikeVerse('﷽'), true);
  // Prose: Arabic with no marks, Arabic with one for clarity, Urdu, Persian, English.
  assert.equal(looksLikeVerse('هذا الدرس يشرح أحكام النون الساكنة والتنوين'), false);
  assert.equal(looksLikeVerse('كُتب هذا الدرس للمبتدئين في علم التجويد'), false);
  assert.equal(looksLikeVerse('اِس سبق میں نون ساکن کے احکام بیان کیے گئے ہیں'), false);
  assert.equal(looksLikeVerse('این درس دربارهٔ احکام نون ساکن است'), false);
  assert.equal(looksLikeVerse('This lesson explains the rules of nun sakinah.'), false);
});

test('a text is read sentence by sentence, with the verses left out and counted', () => {
  const text = 'Allah says in Surat al-Ikhlas.\nقُلْ هُوَ اللَّهُ أَحَدٌ\nThis means: Say, He is Allah, the One. What does it teach?';
  const { parts, skipped } = speakable(text);
  assert.deepEqual(parts, ['Allah says in Surat al-Ikhlas.', 'This means: Say, He is Allah, the One.', 'What does it teach?']);
  assert.equal(skipped, 1);

  assert.deepEqual(speakable('').parts, []);
  assert.deepEqual(speakable(null), { parts: [], skipped: 0 });
  assert.deepEqual(speakable('…\n---\n'), { parts: [], skipped: 0 });
  // Urdu and Chinese end their sentences with their own stops.
  assert.equal(speakable('یہ پہلا جملہ ہے۔ یہ دوسرا ہے۔').parts.length, 2);
  assert.equal(speakable('这是第一句。这是第二句。').parts.length, 2);
  // Only verses: nothing to read, and the screen can say why.
  assert.deepEqual(speakable('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'), { parts: [], skipped: 1 });
});

test('a long sentence is handed over in pieces that never cut a word', () => {
  const sentence = `${Array.from({ length: 120 }, (_, i) => `word${i}`).join(' ')}.`;
  const { parts } = speakable(sentence);
  assert.ok(parts.length > 3);
  for (const part of parts) assert.ok(part.length <= 220, String(part.length));
  assert.equal(parts.join(' '), sentence);
  // A run with no space at all is cut at the limit rather than looping for ever.
  assert.ok(speakable('x'.repeat(1000)).parts.every((part) => part.length <= 220));
});

test('the voice is the device\'s own for the lesson\'s language, or none', () => {
  const voices = [
    { lang: 'en-US', default: true, localService: true },
    { lang: 'ar-SA', localService: false },
    { lang: 'ar_EG', localService: true },
    { lang: 'zh-CN', localService: true },
    { lang: 'ur' },
  ];
  assert.equal(pickVoice(voices, 'en'), 0);
  assert.equal(pickVoice(voices, 'ar'), 2, 'a voice on the device comes before one on the network');
  assert.equal(pickVoice(voices, 'zh-hans'), 3);
  assert.equal(pickVoice(voices, 'UR'), 4);
  // No voice for the language is no voice: never the default one reading another language.
  assert.equal(pickVoice(voices, 'bn'), -1);
  assert.equal(pickVoice(voices, null), -1);
  assert.equal(pickVoice([], 'en'), -1);
});

test('the button sends the words nowhere and has no sentence of its own', () => {
  const part = read('../app/learn/[enrolmentId]/lesson/[lessonId]/read-aloud.tsx');
  const code = part.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');
  assert.doesNotMatch(code, /fetch\(|XMLHttpRequest|sendBeacon|supabase/u);
  assert.match(code, /window\.speechSynthesis/u);
  assert.doesNotMatch(code, />\s*[A-Z][a-z]+ [a-z]+[^<{]*</u);
  assert.match(code, /from '@\/lib\/read-aloud'/u);
  assert.doesNotMatch(code, /from '@\/lib\/i18n'/u);
  // No language, no button: a voice is never left to guess.
  assert.match(code, /if \(!able \|\| !language\) return null;/u);
  // The module it leans on imports nothing.
  assert.doesNotMatch(read('./read-aloud.ts'), /^import /mu);
});
