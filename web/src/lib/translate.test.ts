import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  GOOGLE_TRANSLATE_ENDPOINT,
  TRANSLATE_ENGLISH,
  TRANSLATE_MAX,
  askGoogle,
  countCharacters,
  googleLanguageOf,
  parseGoogleAnswer,
  parseTranslationMonth,
  sameLanguage,
  translateReasonOf,
  translationMonthLines,
  translateStatusOf,
  type TranslateOutcome,
} from './translate.ts';
import { LOCALES } from './i18n/locales.ts';

const OUTCOMES = Object.keys(TRANSLATE_ENGLISH) as TranslateOutcome[];

/** A stand-in for `fetch` that records what it was sent. Nothing here reaches Google. */
function fakeFetch(reply: { status?: number; json?: unknown; fail?: Error }) {
  const sent: { url: string; init: RequestInit }[] = [];
  const send = (async (url: string | URL | Request, init?: RequestInit) => {
    sent.push({ url: String(url), init: init ?? {} });
    if (reply.fail) throw reply.fail;
    return new Response(JSON.stringify(reply.json ?? null), {
      status: reply.status ?? 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  return { send, sent };
}

test('every way a translation can end has a sentence and a status that is a refusal', () => {
  assert.equal(OUTCOMES.length, 9);
  for (const code of OUTCOMES) {
    assert.ok(TRANSLATE_ENGLISH[code].length > 10, code);
    assert.ok(translateStatusOf(code) >= 400 && translateStatusOf(code) < 600, code);
  }
  assert.equal(translateStatusOf('not_signed_in'), 401);
  assert.equal(translateStatusOf('closed'), 404);
  assert.equal(translateStatusOf('too_long'), 413);
  assert.equal(translateStatusOf('too_many'), 429);
  assert.equal(translateStatusOf('month_spent'), 429);
  assert.equal(translateStatusOf('unsupported'), 422);
  assert.equal(translateStatusOf('unavailable'), 502);
});

test("the database's refusal becomes a name, and its own text is not passed on", () => {
  assert.equal(translateReasonOf({ message: 'translate:too_many' }), 'too_many');
  assert.equal(translateReasonOf({ message: 'ERROR: translate:month_spent (P0001)' }), 'month_spent');
  assert.equal(translateReasonOf({ message: 'translate:closed' }), 'closed');
  // A name the database does not raise, and a sentence that is not a name.
  assert.equal(translateReasonOf({ message: 'translate:unavailable' }), 'refused');
  assert.equal(translateReasonOf({ message: 'relation "translation_spend" does not exist' }), 'refused');
  assert.equal(translateReasonOf(null), 'refused');
});

test('characters are counted as Google bills them, not as UTF-16 halves', () => {
  assert.equal(countCharacters(''), 0);
  assert.equal(countCharacters('salaam'), 6);
  assert.equal(countCharacters('سلام'), 4);
  assert.equal('🌙'.length, 2);
  assert.equal(countCharacters('🌙'), 1);
  assert.equal(TRANSLATE_MAX, 5000);
});

test('every language a reader can choose has a name to give Google', () => {
  // A reader's language can be one the pages are not yet written in. The
  // translation still goes into the language they chose.
  assert.ok(LOCALES.length >= 27);
  for (const { code } of LOCALES) assert.match(googleLanguageOf(code), /^[a-z]{2,3}(-[A-Z]{2})?$/u, code);
  assert.equal(googleLanguageOf('zh-hans'), 'zh-CN');
  assert.equal(googleLanguageOf('zh-hant'), 'zh-TW');
  assert.equal(googleLanguageOf('fa-af'), 'fa-AF');
  assert.equal(googleLanguageOf('fil'), 'tl');
  assert.equal(googleLanguageOf('sw'), 'sw');
});

test('a text already in the reader’s language is recognised, and two kinds of Chinese are not one', () => {
  assert.equal(sameLanguage('en', 'en'), true);
  assert.equal(sameLanguage('EN', 'en'), true);
  assert.equal(sameLanguage('ar', 'en'), false);
  assert.equal(sameLanguage('zh-CN', 'zh-TW'), false);
  assert.equal(sameLanguage('fa', 'fa-AF'), false);
  assert.equal(sameLanguage(null, 'en'), false);
});

test("Google's reply is read without trusting its shape", () => {
  assert.deepEqual(
    parseGoogleAnswer({ data: { translations: [{ translatedText: 'Peace', detectedSourceLanguage: 'ar' }] } }),
    { text: 'Peace', from: 'ar' },
  );
  assert.deepEqual(parseGoogleAnswer({ data: { translations: [{ translatedText: 'Peace' }] } }), { text: 'Peace', from: null });
  for (const bad of [null, {}, { data: {} }, { data: { translations: [] } }, { data: { translations: [{ translatedText: '' }] } }, { data: { translations: 'x' } }]) {
    assert.equal(parseGoogleAnswer(bad), null);
  }
});

test('the key goes in a header and never in the address, and the text goes as plain text', async () => {
  const { send, sent } = fakeFetch({ json: { data: { translations: [{ translatedText: 'Amani', detectedSourceLanguage: 'en' }] } } });
  const out = await askGoogle({ key: 'k-secret', text: 'Peace <b>now</b>', target: 'sw', fetch: send });
  assert.deepEqual(out, { ok: true, answer: { text: 'Amani', from: 'en' } });
  assert.equal(sent.length, 1);
  const only = sent[0]!;
  assert.equal(only.url, GOOGLE_TRANSLATE_ENDPOINT);
  assert.ok(!only.url.includes('k-secret'));
  const headers = only.init.headers as Record<string, string>;
  assert.equal(headers['x-goog-api-key'], 'k-secret');
  assert.equal(only.init.method, 'POST');
  // Only the text and the language it is wanted in leave: no name, no id.
  assert.deepEqual(JSON.parse(String(only.init.body)), { q: ['Peace <b>now</b>'], target: 'sw', format: 'text' });
});

test('a language Google does not have is `unsupported`; every other failure is `unavailable`', async () => {
  const refused = fakeFetch({ status: 400, json: { error: { message: 'Invalid Value' } } });
  const a = await askGoogle({ key: 'k', text: 'x', target: 'xx', fetch: refused.send });
  assert.equal(a.ok, false);
  assert.equal(!a.ok && a.code, 'unsupported');

  const forbidden = fakeFetch({ status: 403, json: { error: { message: 'API key not valid' } } });
  const b = await askGoogle({ key: 'k-secret', text: 'x', target: 'sw', fetch: forbidden.send });
  assert.equal(!b.ok && b.code, 'unavailable');
  // What is kept for the log holds Google's sentence and not the key.
  assert.ok(!b.ok && !b.detail.includes('k-secret'));

  const empty = fakeFetch({ json: { data: { translations: [] } } });
  const c = await askGoogle({ key: 'k', text: 'x', target: 'sw', fetch: empty.send });
  assert.equal(!c.ok && c.code, 'unavailable');

  const broken = fakeFetch({ fail: new TypeError('fetch failed') });
  const d = await askGoogle({ key: 'k', text: 'x', target: 'sw', fetch: broken.send });
  assert.equal(!d.ok && d.code, 'unavailable');
});

test('Google is not waited for past the limit', async () => {
  const never = ((_url: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    })) as typeof fetch;
  const started = Date.now();
  const out = await askGoogle({ key: 'k', text: 'x', target: 'sw', fetch: never, timeoutMs: 30 });
  assert.equal(!out.ok && out.code, 'unavailable');
  assert.ok(!out.ok && out.detail === 'AbortError');
  assert.ok(Date.now() - started < 2000);
});

test('what the month has used is read without trusting its shape, and said to the owner', () => {
  const month = parseTranslationMonth({ on: true, monthStarts: '2026-11-01', characters: 320000, requests: 412, people: 1, monthly: 400000, daily: 20000 });
  assert.deepEqual(month, { on: true, monthStarts: '2026-11-01', characters: 320000, requests: 412, people: 1, monthly: 400000, daily: 20000 });
  // A bigint arrives as a string from some drivers.
  assert.equal(parseTranslationMonth({ on: false, characters: '12', requests: '1', people: '1', monthly: 400000, daily: 20000 })?.characters, 12);
  for (const bad of [null, [], {}, { characters: -1, requests: 0, people: 0, monthly: 1, daily: 1 }, { characters: 'many', requests: 0, people: 0, monthly: 1, daily: 1 }]) {
    assert.equal(parseTranslationMonth(bad), null);
  }

  const lines = translationMonthLines(month!, true);
  assert.match(lines.state, /^Translation is on\./);
  assert.match(lines.used, /320,000 of 400,000 characters \(80%\), in 412 requests by 1 person\./);
  // Four fifths is where members stop, so it is where the owner is warned.
  assert.equal(lines.warn, true);
  assert.equal(translationMonthLines({ ...month!, characters: 319999 }, true).warn, false);
  // The switch on with no key: nothing else on the platform shows this.
  const noKey = translationMonthLines({ ...month!, characters: 0 }, false);
  assert.match(noKey.state, /no GOOGLE_TRANSLATE_API_KEY/);
  assert.equal(noKey.warn, true);
  assert.match(translationMonthLines({ ...month!, on: false, characters: 0 }, true).state, /^Translation is off\. This server has a key/);
  assert.match(translationMonthLines({ ...month!, on: false, characters: 0 }, false).state, /It needs both\.$/);
  // A limit of nought is not a division.
  assert.match(translationMonthLines({ ...month!, monthly: 0 }, true).used, /\(0%\)/);
});
