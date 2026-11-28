/**
 * The Translate button's rules that are not the database's.
 *
 * People write in their own language; a reader presses Translate and is
 * shown a machine's translation under the original (owner decision,
 * 2026-11-24). The service is Google Cloud Translation. This file holds what
 * the route and the button agree on: how long a text may be, which of
 * Google's language names goes with which of ours, and a name for every way
 * a request can end.
 *
 * Nothing here talks to the database, and the only function that talks to
 * Google takes its `fetch` as an argument so a test can stand in for it.
 */

/** The most one request may carry. The same number is in `translation_request_max()`. */
export const TRANSLATE_MAX = 5000;

/** How long Google is waited for. */
export const TRANSLATE_TIMEOUT_MS = 10_000;

export const GOOGLE_TRANSLATE_ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';

export type TranslateOutcome =
  | 'not_signed_in'
  | 'closed'
  | 'empty'
  | 'too_long'
  | 'too_many'
  | 'month_spent'
  | 'unsupported'
  | 'unavailable'
  | 'refused';

/** English, for a caller with no words of its own. The button has the reader's. */
export const TRANSLATE_ENGLISH: Record<TranslateOutcome, string> = {
  not_signed_in: 'Sign in to translate this.',
  closed: 'Translation is not switched on.',
  empty: 'There is nothing to translate.',
  too_long: 'This is too long to translate in one go.',
  too_many: 'You have translated as much as one person can in a day. Try again tomorrow.',
  month_spent: 'Translation has reached its limit for this month.',
  unsupported: 'The translation service does not offer this language.',
  unavailable: 'The translation service did not answer. Try again in a moment.',
  refused: 'That could not be translated.',
};

export function translateStatusOf(code: TranslateOutcome): number {
  switch (code) {
    case 'not_signed_in': return 401;
    case 'closed': return 404;
    case 'empty': return 400;
    case 'too_long': return 413;
    case 'too_many':
    case 'month_spent': return 429;
    case 'unsupported': return 422;
    case 'unavailable': return 502;
    default: return 400;
  }
}

const NAMED: readonly TranslateOutcome[] = ['not_signed_in', 'closed', 'empty', 'too_long', 'too_many', 'month_spent'];

/** The database's refusal, as a name. Its own text is logged and sent to nobody. */
export function translateReasonOf(error: { message?: string | null } | null | undefined): TranslateOutcome {
  const found = /translate:([a-z_]+)/.exec(error?.message ?? '');
  const name = found?.[1] as TranslateOutcome | undefined;
  return name && NAMED.includes(name) ? name : 'refused';
}

/**
 * What Google bills for: characters as code points, so that one emoji or one
 * Arabic letter with its marks is not counted by its UTF-16 halves.
 */
export function countCharacters(text: string): number {
  let n = 0;
  for (const _ of text) n += 1; // eslint-disable-line @typescript-eslint/no-unused-vars
  return n;
}

/**
 * Our language code, as Google names it. Most are the same word. The four
 * that are not are written out; anything else goes as it is, and Google's
 * refusal of a name it does not know comes back as `unsupported`.
 */
const GOOGLE_NAME: Record<string, string> = {
  'zh-hans': 'zh-CN',
  'zh-hant': 'zh-TW',
  'fa-af': 'fa-AF',
  fil: 'tl',
};

export function googleLanguageOf(code: string): string {
  return GOOGLE_NAME[code.toLowerCase()] ?? code;
}

/** Whether what Google detected is the language the reader asked for. */
export function sameLanguage(detected: string | null, target: string): boolean {
  if (!detected) return false;
  const base = (value: string) => value.toLowerCase().split('-')[0];
  const a = detected.toLowerCase();
  const b = target.toLowerCase();
  if (a === b) return true;
  // zh-CN and zh-TW are different writing; fa and fa-AF are not the same either.
  if (a.includes('-') || b.includes('-')) return false;
  return base(a) === base(b);
}

export type GoogleAnswer = { text: string; from: string | null };

/** Google's reply, read without trusting its shape. */
export function parseGoogleAnswer(json: unknown): GoogleAnswer | null {
  const data = (json as { data?: { translations?: unknown } } | null)?.data;
  const first = Array.isArray(data?.translations) ? (data.translations[0] as Record<string, unknown> | undefined) : undefined;
  if (!first || typeof first.translatedText !== 'string' || first.translatedText === '') return null;
  const from = typeof first.detectedSourceLanguage === 'string' ? first.detectedSourceLanguage : null;
  return { text: first.translatedText, from };
}

export type AskGoogle =
  | { ok: true; answer: GoogleAnswer }
  | { ok: false; code: 'unsupported' | 'unavailable'; detail: string };

/**
 * One request to Google. The key travels in a header, never in the address,
 * so that it is not written into anybody's access log. The text is sent as
 * plain text, so what comes back is not HTML and is drawn as text.
 */
export async function askGoogle(input: {
  key: string;
  text: string;
  target: string;
  endpoint?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}): Promise<AskGoogle> {
  const send = input.fetch ?? fetch;
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), input.timeoutMs ?? TRANSLATE_TIMEOUT_MS);
  try {
    const res = await send(input.endpoint ?? GOOGLE_TRANSLATE_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': input.key },
      body: JSON.stringify({ q: [input.text], target: input.target, format: 'text' }),
      signal: stop.signal,
      cache: 'no-store',
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const message = String((json as { error?: { message?: unknown } } | null)?.error?.message ?? '');
      // Google answers 400 with "Invalid Value" for a language it does not have.
      const unsupported = res.status === 400 && /invalid value|target language|language/i.test(message);
      return { ok: false, code: unsupported ? 'unsupported' : 'unavailable', detail: `${res.status} ${message}`.trim() };
    }
    const answer = parseGoogleAnswer(json);
    if (!answer) return { ok: false, code: 'unavailable', detail: 'an answer with no translation in it' };
    return { ok: true, answer };
  } catch (error) {
    return { ok: false, code: 'unavailable', detail: error instanceof Error ? error.name : 'the request failed' };
  } finally {
    clearTimeout(timer);
  }
}

/** What the button says. Handed to it as words, so the catalogue stays on the server. */
export type TranslateWords = {
  translate: string;
  working: string;
  /** Shown above the translation. Says a machine made it. */
  by: string;
  hide: string;
  same: string;
  reasons: Record<TranslateOutcome, string>;
};

/** What `translation_month()` answers, for the owner's page. */
export type TranslationMonth = {
  on: boolean;
  monthStarts: string | null;
  characters: number;
  requests: number;
  people: number;
  monthly: number;
  daily: number;
};

export function parseTranslationMonth(input: unknown): TranslationMonth | null {
  const row = input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, unknown>) : null;
  if (!row) return null;
  const n = (value: unknown) => {
    const number = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
    return Number.isSafeInteger(number) && number >= 0 ? number : null;
  };
  const [characters, requests, people, monthly, daily] = [n(row.characters), n(row.requests), n(row.people), n(row.monthly), n(row.daily)];
  if (characters === null || requests === null || people === null || monthly === null || daily === null) return null;
  return {
    on: row.on === true,
    monthStarts: typeof row.monthStarts === 'string' ? row.monthStarts : null,
    characters, requests, people, monthly, daily,
  };
}

/**
 * What the owner is told about translation: which sentence says the state,
 * and how much of the month is used. Keys and numbers since 2026-11-28; the
 * dashboard says them in the reader's language.
 *
 * `hasKey` is whether this server has a key. The switch being on with no key
 * is the state worth saying loudest, because nothing else on the platform
 * shows it: the button is simply not drawn.
 */
export type TranslationStateKey =
  | 'switch.trOn'
  | 'switch.trOnNoKey'
  | 'switch.trOffKey'
  | 'switch.trOffNoKey';

export function translationMonthLines(month: TranslationMonth, hasKey: boolean): { state: TranslationStateKey; share: number; warn: boolean } {
  const state: TranslationStateKey = month.on && hasKey
    ? 'switch.trOn'
    : month.on
      ? 'switch.trOnNoKey'
      : hasKey
        ? 'switch.trOffKey'
        : 'switch.trOffNoKey';
  // A limit of nought is not a division.
  const share = month.monthly > 0 ? Math.floor((month.characters * 100) / month.monthly) : 0;
  return { state, share, warn: (month.on && !hasKey) || (month.monthly > 0 && month.characters * 5 >= month.monthly * 4) };
}
