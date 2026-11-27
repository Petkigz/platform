import { cookies, headers } from 'next/headers';

import { LOCALE_COOKIE, chooseLocale, languageShownFor } from '@/lib/i18n';
import type { translator } from '@/lib/i18n';

/** The language a learning-path page is written in for this reader, and whether that is the one they chose. */
export async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'paths') };
}

/** Who a path was made for, in the page's language. */
export function audienceName(t: ReturnType<typeof translator>, audience: string): string {
  return t(audience === 'both' ? 'paths.forBoth' : audience === 'child' ? 'paths.forChildren' : 'paths.forAdults');
}
