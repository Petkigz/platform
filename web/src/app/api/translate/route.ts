import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { LOCALE_COOKIE, chooseLocale } from '@/lib/i18n';
import {
  TRANSLATE_ENGLISH,
  TRANSLATE_MAX,
  askGoogle,
  countCharacters,
  googleLanguageOf,
  sameLanguage,
  translateReasonOf,
  translateStatusOf,
  type TranslateOutcome,
} from '@/lib/translate';
import { translationEndpoint, translationKey } from '@/lib/translate-server';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/**
 * The Translate button.
 *
 * A signed-in reader sends a text that is already on their screen and is
 * answered with a machine's translation of it into the language they read
 * the site in. Nothing is kept: not the text, not the translation. The
 * database is asked first (`spend_translation`) and it is the database that
 * says whether the switch is on, whether this person has used their day and
 * whether the month is used; only then is anything sent to Google.
 *
 * **What leaves the platform** is the text and the target language. No
 * account, no username, no address and nothing about where the text was
 * posted goes with it.
 *
 * The text comes from the browser, so a signed-in person could send words of
 * their own instead of a post. That shows them nothing they could not
 * already read, and the two limits are what it can cost.
 *
 * **A refusal is `{ ok: false, code }`** with an English sentence beside it.
 * Google's own error text is logged and sent to nobody.
 */
export async function POST(request: Request) {
  const named = (code: TranslateOutcome) =>
    NextResponse.json({ ok: false, code, message: TRANSLATE_ENGLISH[code] }, { status: translateStatusOf(code), headers: NO_STORE });

  if (!isSupabaseConfigured()) return named('closed');
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) return named('refused');

  const raw: unknown = await request.json().catch(() => null);
  const body = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const text = typeof body.text === 'string' ? body.text.trim() : '';

  const supabase = await createClient();
  const user = await supabase.auth.getUser().then(
    (r) => r.data.user,
    () => null,
  );
  if (!user) return named('not_signed_in');

  const key = translationKey();
  if (!key) return named('closed');

  const characters = countCharacters(text);
  if (characters === 0) return named('empty');
  if (characters > TRANSLATE_MAX) return named('too_long');

  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const target = googleLanguageOf(locale);

  const allowed = await supabase.rpc('spend_translation', { p_characters: characters }).then(
    (r) => r,
    () => ({ data: null, error: { message: 'the request could not be made' } }),
  );
  if (allowed.error) {
    const code = translateReasonOf(allowed.error);
    if (code === 'refused') console.error('translate: the database did not allow it:', allowed.error.message);
    return named(code);
  }

  const asked = await askGoogle({ key, text, target, endpoint: translationEndpoint() });
  if (!asked.ok) {
    console.error('translate: the service did not translate:', asked.detail);
    return named(asked.code);
  }

  return NextResponse.json(
    {
      ok: true,
      text: asked.answer.text,
      from: asked.answer.from,
      to: locale,
      same: sameLanguage(asked.answer.from, target) || asked.answer.text.trim() === text,
    },
    { headers: NO_STORE },
  );
}
