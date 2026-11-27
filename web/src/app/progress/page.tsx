import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchOwnLearner } from '@/lib/family';
import { isOwnRecord } from '@/lib/progress-record';
import { fetchProgressRecord } from '@/lib/progress-record-query';
import { LOCALE_COOKIE, chooseLocale, languageShownFor, translator } from '@/lib/i18n';
import { ProgressRecordView } from './progress-record-view';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'prog');
  return { locale, shown };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('prog.title') };
}

/**
 * Screen 18: progress and achievements.
 *
 * This was the last numbered screen marked BLOCKED, on the honest grounds that
 * the engagement mechanics had never been designed: there was a streak strip on
 * the dashboard and no page, and no badge a learner had not already earned.
 *
 * **Nothing here is stored.** Every number comes from `lesson_progress`, the
 * enrolments, the certificates (rows the platform was already writing), so the
 * page cannot drift from the learning it describes, and turning the feature off
 * takes away a view rather than a record.
 *
 * `?learner=<id>` opens a child's record. Who may read which learner is decided
 * by `can_access_learner()` inside the function; this page only decides what to
 * say when the answer is no.
 *
 * **In the reader's language** since 2026-11-25, for the twenty-seven
 * languages with nothing held (`messages/progress.ts`); a language held for
 * review reads it in English, whole, under `lang="en"`: the same rule as the
 * learner dashboard.
 */
export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ learner?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { learner: requested } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/progress');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  // Whether this account is a learner is read, and the read can fail. A
  // failure used to be taken for "not a learner": the page then told a
  // learner they were not one and offered to make them one.
  const own = await fetchOwnLearner(supabase, user.id).then(
    (learner) => ({ read: true as const, learner }),
    (error: unknown) => {
      console.error('progress: the learner could not be read:', error instanceof Error ? error.message : error);
      return { read: false as const, learner: null };
    },
  );
  const learnerId = requested && /^[0-9a-f-]{36}$/i.test(requested) ? requested : own.learner?.id ?? null;

  if (!learnerId && !own.read) {
    return (
      <div className="container section" {...frame}>
        <p className="eyebrow">{t('nav.learn')}</p>
        <h1>{t('prog.title')}</h1>
        <div className="notice" role="alert">{t('prog.unread')}</div>
        <p className="muted" style={{ marginTop: '1rem' }}>
          <Link href="/learn">{t('course.back')}</Link>
        </p>
      </div>
    );
  }

  if (!learnerId) {
    return (
      <div className="container section" {...frame}>
        <p className="eyebrow">{t('nav.learn')}</p>
        <h1>{t('prog.title')}</h1>
        <p className="lede">{t('prog.noLearner')}</p>
        <p>
          <Link className="btn" href="/account">{t('prog.become')}</Link>
        </p>
        <p className="muted" style={{ marginTop: '1rem' }}>
          <Link href="/learn">{t('course.back')}</Link>
        </p>
      </div>
    );
  }

  const outcome = await fetchProgressRecord(supabase, learnerId);

  if (!outcome.ok && (outcome.reason === 'disabled' || outcome.reason === 'children_off')) {
    return (
      <div className="container section" {...frame}>
        <p className="eyebrow">{t('nav.learn')}</p>
        <h1>{t('prog.title')}</h1>
        <div className="notice">{t(outcome.reason === 'children_off' ? 'prog.offChildren' : 'prog.offAll')}</div>
        <p style={{ marginTop: '1rem' }}>
          <Link href="/learn">{t('course.back')}</Link>
        </p>
      </div>
    );
  }

  if (!outcome.ok && outcome.reason === 'forbidden') {
    return (
      <div className="container section" {...frame}>
        <p className="eyebrow">{t('nav.learn')}</p>
        <h1>{t('prog.notYoursTitle')}</h1>
        <p className="lede">{t('prog.notYours')}</p>
        <p>
          <Link href="/progress">{t('prog.seeOwn')}</Link>
          {' · '}
          <Link href="/learn">{t('course.back')}</Link>
        </p>
      </div>
    );
  }

  if (!outcome.ok) {
    return (
      <div className="container section" {...frame}>
        <p className="eyebrow">{t('nav.learn')}</p>
        <h1>{t('prog.title')}</h1>
        <div className="notice">{t('prog.unread')}</div>
        <p className="muted" style={{ marginTop: '1rem' }}>
          <Link href="/learn">{t('course.back')}</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="container section" {...frame}>
      <ProgressRecordView
        record={outcome.record}
        isSelf={isOwnRecord(own.learner, learnerId)}
        code={shown.code}
      />
    </div>
  );
}
