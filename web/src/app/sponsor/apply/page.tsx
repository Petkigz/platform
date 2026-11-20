import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { LOCALE_COOKIE, chooseLocale, languageShownFor, translator } from '@/lib/i18n';
import { ApplyForm, type ApplyWords } from './apply-form';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'sponsor');
  return { locale, shown };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('sponsor.askLink') };
}

/**
 * Asking for a sponsored seat, in the reader's language.
 *
 * Both lists are read through the ordinary row policies (the learner list is
 * the caller's own learners and their family's, and the course list is the
 * catalogue), so this page cannot offer a learner or a course the database
 * would refuse at submit time.
 *
 * **A list that could not be read is not an empty one.** "There is no
 * learner on this account" and "no course is on sale" are said only when the
 * database answered and there were none.
 *
 * **Switched off is said, and nothing is offered.**
 *
 * A language held for review reads the page in English, whole, under
 * `lang="en"`.
 */
export default async function ApplyForSponsorshipPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/sponsor/apply');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const head = (
    <>
      <p className="eyebrow">
        <Link href="/sponsor">{t('sponsor.plEyebrow')}</Link>
      </p>
      <h1>{t('sponsor.askLink')}</h1>
    </>
  );
  const mine = (
    <p>
      <Link href="/account/sponsorship">{t('account.sponsorMine')}</Link>
    </p>
  );

  // A switch that cannot be read is treated as off: nothing is offered that might be refused.
  const enabled = await isFlagEnabled(supabase, 'commerce.sponsorship').catch(() => false);
  if (!enabled) {
    return (
      <div className="container section" {...frame}>
        {head}
        <div className="notice warn" data-ask="off">
          {t('sponsor.plOff')}
        </div>
        {mine}
      </div>
    );
  }

  const [learnersRead, coursesRead] = await Promise.all([
    supabase
      .from('learner_profiles')
      .select('id, display_name, linked_user_id, family_id')
      .is('deleted_at', null)
      .eq('status', 'active'),
    supabase
      .from('courses')
      .select('id, title, audience')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('title'),
  ]);
  const unread = Boolean(learnersRead.error || coursesRead.error);

  const learners = ((learnersRead.data ?? []) as { id: string; display_name: string }[]).map((row) => ({
    id: row.id,
    name: row.display_name,
  }));
  const courses = ((coursesRead.data ?? []) as { id: string; title: string }[]).map((row) => ({
    id: row.id,
    title: row.title,
  }));

  const words: ApplyWords = {
    whoFor: t('buy.whoFor'),
    course: t('sponsor.rqCourse'),
    choose: t('sponsor.rqChoose'),
    reason: t('sponsor.rqReason'),
    reasonNote: t('sponsor.rqReasonNote'),
    submit: t('sponsor.rqSubmit'),
    sending: t('auth.sending'),
    done: t('sponsor.rqDone'),
    mine: t('account.sponsorMine'),
    reasons: {
      reason_required: t('sponsor.rqWhyReason'),
      too_long: t('sponsor.tooLong'),
      choose: t('buy.whyChoose'),
      learner_not_yours: t('buy.whyNotYours'),
      no_course: t('buy.whyNoPrice'),
      has_course: t('sponsor.rqWhyHas'),
      already_asked: t('sponsor.rqWhyAsked'),
      off: t('sponsor.plOff'),
      not_signed_in: t('buy.signedOut'),
      malformed: t('sponsor.plWhyFailed'),
      failed: t('sponsor.plWhyFailed'),
      unconfirmed: t('sponsor.unconfirmed'),
    },
  };

  return (
    <div className="container section" {...frame}>
      {head}
      <p className="lede">{t('sponsor.rqLede')}</p>

      <div className="stack" style={{ marginTop: '1.5rem' }}>
        {unread ? (
          <div className="notice error" role="alert" data-ask="unread">
            {t('sponsor.plWhyFailed')}
          </div>
        ) : learners.length === 0 ? (
          <div className="notice" data-ask="no-learner">
            {t('sponsor.rqNoLearner')}
          </div>
        ) : courses.length === 0 ? (
          <div className="notice" data-ask="no-course">
            {t('sponsor.rqNoCourse')}
          </div>
        ) : (
          <ApplyForm learners={learners} courses={courses} words={words} />
        )}

        <div className="notice">{t('sponsor.rqPrivacy')}</div>

        <p className="muted">{t('sponsor.zakat')}</p>

        {mine}
      </div>
    </div>
  );
}
