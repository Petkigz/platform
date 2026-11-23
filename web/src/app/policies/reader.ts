import { cookies, headers } from 'next/headers';

import { LOCALE_COOKIE, chooseLocale, languageShownFor } from '@/lib/i18n';
import type { MessageKey, translator } from '@/lib/i18n';
import type { PolicyAudience } from '@/lib/policies';
import type { AcceptWords } from './[slug]/accept-policy';

/** The language the policy pages are written in for this reader, and whether that is the one they chose. */
export async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'policy') };
}

/** The sentence for who a document is for. */
export const AUDIENCE_WORDS: Record<PolicyAudience, MessageKey> = {
  everyone: 'policy.forEveryone',
  child: 'policy.forChild',
  teacher: 'policy.forTeacher',
  institution: 'policy.forInstitution',
};

/** What a read answers when the request itself could not be made. */
export const READ_FAILED = { data: null, error: { message: 'the request could not be made' } };

/**
 * What the agreement button says, in one language.
 *
 * Built on the server and handed to the button: a script sent to a browser
 * holds no catalogue. A document that is gone, one with no live version and
 * one whose live version moved are one sentence, because the reader does the
 * same thing about each: reads the page again, which the button has already
 * asked for.
 */
export function acceptWords(t: ReturnType<typeof translator>): AcceptWords {
  return {
    note: t('policy.agreeNote'),
    agree: t('policy.agreeDo'),
    working: t('auth.working'),
    agreed: t('policy.agreed'),
    agreedNewer: t('policy.agreedNewer'),
    unreachable: t('auth.offline'),
    reasons: {
      not_signed_in: t('buy.signedOut'),
      malformed: t('policy.agreeFailed'),
      not_found: t('policy.whyChanged'),
      not_in_force: t('policy.whyChanged'),
      changed: t('policy.whyChanged'),
      refused: t('policy.agreeFailed'),
      unconfirmed: t('policy.agreeUnsure'),
    },
  };
}
