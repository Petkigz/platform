import type { SupabaseClient } from '@supabase/supabase-js';

import { isFlagEnabled } from './flags';
import type { translator } from './i18n';
import { GOOGLE_TRANSLATE_ENDPOINT, type TranslateWords } from './translate';

/**
 * The translation service's key. Server-only, and deliberately not
 * `NEXT_PUBLIC_`: a key in a browser bundle is a key anybody can spend.
 */
export function translationKey(): string | null {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY?.trim();
  return key ? key : null;
}

/**
 * Where the request goes. Google's own address, always, in production. A
 * development or test server may be pointed at a stand-in, so that a test
 * never sends anything to Google or needs a key that can be charged.
 */
export function translationEndpoint(): string {
  const other = process.env.TRANSLATE_TEST_ENDPOINT?.trim();
  if (other && process.env.NODE_ENV !== 'production') return other;
  return GOOGLE_TRANSLATE_ENDPOINT;
}

/**
 * Whether a page draws the button: the owner's switch is on **and** the
 * server has a key. Either one missing is silence, not a button that fails.
 */
export async function translateButtonOn(supabase: SupabaseClient): Promise<boolean> {
  if (!translationKey()) return false;
  return isFlagEnabled(supabase, 'platform.translate').catch(() => false);
}

type T = ReturnType<typeof translator>;

export function translateWords(t: T): TranslateWords {
  return {
    translate: t('translate.button'),
    working: t('auth.working'),
    by: t('translate.by'),
    hide: t('translate.hide'),
    same: t('translate.same'),
    reasons: {
      not_signed_in: t('buy.signedOut'),
      closed: t('translate.closed'),
      empty: t('translate.failed'),
      too_long: t('translate.tooLong'),
      too_many: t('translate.tooMany'),
      month_spent: t('translate.monthSpent'),
      unsupported: t('translate.unsupported'),
      unavailable: t('translate.unavailable'),
      refused: t('translate.failed'),
    },
  };
}
