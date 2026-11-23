import { cookies, headers } from 'next/headers';

import { LOCALE_COOKIE, chooseLocale, languageShownFor } from '@/lib/i18n';
import type { translator } from '@/lib/i18n';
import type { MembershipWords } from './join-button';

/** The language the institution page is written in for this reader, and whether that is the one they chose. */
export async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'inst') };
}

/** What a read answers when the request itself could not be made. */
export const READ_FAILED = { data: null, error: { message: 'the request could not be made' } };

/**
 * What the two buttons say, in the page's language.
 *
 * Handed over as words because the buttons run in the browser and the
 * catalogue for this page stays on the server. Every name the route can
 * answer with has a sentence here, so no reply is ever shown as it arrived.
 */
export function membershipWords(t: ReturnType<typeof translator>, label: string): MembershipWords {
  return {
    label,
    working: t('auth.working'),
    unreachable: t('auth.offline'),
    reasons: {
      not_signed_in: t('inst.whySignedOut'),
      already_joined: t('inst.whyAlready'),
      no_verified_domain: t('inst.whyNoMatch'),
      not_a_member: t('inst.whyNotMember'),
      last_admin: t('inst.whyLastAdmin'),
      refused: t('inst.failed'),
      unconfirmed: t('inst.unsure'),
    },
  };
}
