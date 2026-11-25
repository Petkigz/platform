import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchOwnLearner } from '@/lib/family';
import { parseHifzRecord } from '@/lib/hifz';
import { hifzWords } from '@/lib/hifz-words';
import { LOCALE_COOKIE, chooseLocale, languageShownFor, translator } from '@/lib/i18n';
import { HifzBoard } from './hifz-board';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'hifz') };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('hifz.title') };
}

/**
 * What a learner has memorised, and when to look at it again.
 *
 * `learning.hifz` was registered with "revision schedule and decay model
 * designed" and nothing had been designed. The schedule is a seven-rung ladder
 * driven only by the learner's own solid/shaky verdict — see
 * `supabase/migrations/20261281002900_hifz_tracker.sql` for why it is a ladder
 * and not SM-2, and `DECISIONS.md` for the decision that a self-report is the
 * only input the platform can honestly accept.
 *
 * `?learner=<id>` opens a child's list, the same way `/progress` does. Who may
 * read or write it is decided by `can_access_learner()` inside the database; this
 * page decides only what to say when the answer is no.
 *
 * **In the reader's language** since 2026-11-25 (`messages/hifz.ts`, said
 * through `lib/hifz-words.ts`); a language held for review reads it in
 * English, whole, under `lang="en"`. The name of a passage is what the learner
 * typed and keeps its own direction.
 */
export default async function HifzPage({
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
  if (!user) redirect('/sign-in?next=/hifz');

  const { locale, shown } = await readerLanguage();
  const words = hifzWords(shown.code);
  const t = words.t;
  const frame = shown.code !== locale ? ({ lang: shown.code, dir: shown.dir } as const) : {};

  const own = await fetchOwnLearner(supabase, user.id).catch(() => null);
  const learnerId = requested && /^[0-9a-f-]{36}$/i.test(requested) ? requested : own?.id ?? null;

  if (!learnerId) {
    return (
      <div className="container section" {...frame}>
        <p className="eyebrow">{t('nav.learn')}</p>
        <h1>{t('hifz.title')}</h1>
        <p className="lede">{t('hifz.noLearner')}</p>
        <p>
          <Link className="btn" href="/account">
            {t('prog.become')}
          </Link>
        </p>
        <p className="muted" style={{ marginTop: '1rem' }}>
          <Link href="/learn">{t('course.back')}</Link>
        </p>
      </div>
    );
  }

  const { data, error } = await supabase.rpc('my_hifz', { p_learner: learnerId });

  if (error) {
    const refused = /hifz:not_allowed/.test(error.message);
    return (
      <div className="container section" {...frame}>
        <p className="eyebrow">{t('nav.learn')}</p>
        <h1>{t(refused ? 'hifz.notYours' : 'hifz.title')}</h1>
        <p className="lede">{t(refused ? 'hifz.notYoursBody' : 'hifz.unreadable')}</p>
        <p>
          <Link href={refused ? '/hifz' : '/learn'}>
            {t(refused ? 'hifz.seeOwn' : 'course.back')}
          </Link>
        </p>
      </div>
    );
  }

  const record = parseHifzRecord(data);

  if (!record.enabled) {
    return (
      <div className="container section" {...frame}>
        <p className="eyebrow">{t('nav.learn')}</p>
        <h1>{t('hifz.title')}</h1>
        <div className="notice">{t('hifz.off')}</div>
        <p style={{ marginTop: '1rem' }}>
          <Link href="/learn">{t('course.back')}</Link>
        </p>
      </div>
    );
  }

  return (
    <div {...frame}>
      <HifzBoard
        learnerId={learnerId}
        record={record}
        isSelf={!own || own.id === learnerId}
        words={words.board(record)}
      />
    </div>
  );
}
