import { cookies, headers } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

import { LOCALE_COOKIE, chooseLocale, languageShownFor, translator } from './i18n';
import type { TranslateWords } from './translate';
import { translateButtonOn, translateWords } from './translate-server';

/**
 * What a page hands every Translate button on it: the button's words in the
 * reader's language, or null when translation is off for any reason (the
 * owner's switch, or no key on the server). Null draws nothing.
 *
 * The language a text is translated **into** is not decided here. The route
 * reads it from the same cookie when the button is pressed, so a page cannot
 * ask for a language its reader did not choose.
 */
export async function translateFor(supabase: SupabaseClient): Promise<TranslateWords | null> {
  if (!(await translateButtonOn(supabase))) return null;
  const jar = await cookies();
  const hdrs = await headers();
  const { code } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return translateWords(translator(languageShownFor(code, 'translate').code));
}
