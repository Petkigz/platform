import { cookies, headers } from 'next/headers';

import { LOCALE_COOKIE, chooseLocale, languageShownFor } from '@/lib/i18n';
import type { translator } from '@/lib/i18n';
import type { ApplyOutcome } from '@/lib/teaching-outcome';
import type { ApplyFormWords } from './apply-form';
import type { WithdrawWords } from './withdraw-button';

/** The language the page that asks to teach is written in for this reader, and whether that is the one they chose. */
export async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'tapply') };
}

/** What a read answers when the request itself could not be made. */
export const READ_FAILED = { data: null, error: { message: 'the request could not be made' } };

/**
 * A sentence for every name the route can answer with, so no reply is ever
 * shown as it arrived. The three "too long" names share one sentence: the
 * boxes stop taking letters at their limit, so only a caller that is not this
 * form can meet them.
 */
function reasons(t: ReturnType<typeof translator>): Record<ApplyOutcome, string> {
  return {
    not_signed_in: t('buy.signedOut'),
    headline_short: t('tapply.whyTeach'),
    headline_long: t('tapply.whyLong'),
    qualifications_short: t('tapply.whyKnow'),
    qualifications_long: t('tapply.whyLong'),
    sample_not_link: t('tapply.whySample'),
    note_long: t('tapply.whyLong'),
    applications_closed: t('tapply.whyClosed'),
    already_teaching: t('tapply.teachesAlready'),
    already_applied: t('tapply.whyApplied'),
    nothing_to_withdraw: t('tapply.whyNothing'),
    refused: t('inst.failed'),
    unconfirmed: t('inst.unsure'),
  };
}

/**
 * What the form says, in the page's language. Handed over as words because
 * the form runs in the browser and the catalogue for this page stays on the
 * server.
 */
export function formWords(t: ReturnType<typeof translator>): ApplyFormWords {
  return {
    teach: t('tapply.fieldTeach'),
    teachHint: t('tapply.hintTeach'),
    know: t('tapply.fieldKnow'),
    knowHint: t('tapply.hintKnow'),
    sample: t('tapply.fieldSample'),
    sampleHint: t('tapply.hintSample'),
    other: t('tapply.fieldElse'),
    optional: t('family.optional'),
    otherHint: t('tapply.hintElse'),
    send: t('tapply.sendDo'),
    working: t('auth.working'),
    unreachable: t('auth.offline'),
    reasons: reasons(t),
  };
}

/** What the button that takes an application back says. */
export function withdrawWords(t: ReturnType<typeof translator>): WithdrawWords {
  return {
    label: t('tapply.withdrawDo'),
    working: t('auth.working'),
    unreachable: t('auth.offline'),
    reasons: reasons(t),
  };
}
