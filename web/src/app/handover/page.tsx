import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { handoverWords } from '@/lib/handover';
import { ageBandLabel } from '@/lib/age-band';
import { LOCALE_COOKIE, chooseLocale, formatNumber, languageShownFor, translator } from '@/lib/i18n';
import { HandoverForm } from './handover-form';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'handover') };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('handover.title') };
}

/**
 * Where somebody says a learner is eighteen.
 *
 * The page exists because the platform records no date of birth and never will, so
 * there is no birthday to detect. What it can do is let the two people entitled to
 * decide — the learner on their own login, and the adult who has been holding the
 * record — decide, and record what they said.
 *
 * It lists every child profile the caller can reach, with both outcomes spelled
 * out. It is not a queue and nothing waits: the decision is acted on immediately,
 * because a young person taking their own record is not a request to be granted.
 *
 * **In the reader's language** since 2026-11-25 (`messages/handover.ts`), with
 * one exception that is deliberate: the statement that is ticked is English on
 * every page (`HANDOVER_DECLARATION`), because a declaration has one wording.
 * A language held for review reads the whole page in English under `lang="en"`.
 */
export default async function HandoverPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/handover');

  const { data } = await supabase
    .from('learner_profiles')
    .select('id, display_name, age_band, family_id, linked_user_id')
    .eq('learner_type', 'child')
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('display_name');

  const learners = (data ?? []) as unknown as {
    id: string;
    display_name: string;
    age_band: string | null;
    family_id: string | null;
    linked_user_id: string | null;
  }[];

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};
  const words = handoverWords(t, shown.code === 'en');
  const num = (value: number) => formatNumber(shown.code, value);
  const band = (code: string) =>
    ageBandLabel(code, {
      ages: (from, to) => t('family.ages', { from: num(from), to: num(to) }),
      adult: t('family.bandAdult'),
    });

  return (
    <div className="page narrow" {...frame}>
      <nav className="crumbs">
        <Link href="/learn">{t('nav.learn')}</Link>
        <span aria-hidden>›</span>
        <span>{t('handover.crumb')}</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">{t('handover.eyebrow')}</p>
        <h1>{t('handover.title')}</h1>
        <p className="muted">{t('handover.explainer')}</p>
      </div>

      <div className="notice">
        <strong>{t('handover.decidesLead')}</strong> {t('handover.decides')}
      </div>

      {learners.length === 0 ? (
        <p className="muted" style={{ marginTop: '1.25rem' }}>
          {t('handover.none')}
        </p>
      ) : (
        learners.map((learner) => (
          <section className="card" key={learner.id} style={{ marginTop: '1.25rem' }}>
            <h2 style={{ marginTop: 0 }}>
              <bdi>{learner.display_name}</bdi>
              {learner.age_band ? <span className="muted"> · {band(learner.age_band)}</span> : null}
            </h2>
            <p className="muted">
              {learner.linked_user_id ? t('handover.hasLogin') : t('handover.noLogin')}
            </p>
            <HandoverForm
              learnerId={learner.id}
              learnerName={learner.display_name}
              hasOwnAccount={learner.linked_user_id !== null}
              code={shown.code}
              words={words}
            />
          </section>
        ))
      )}

      <p className="muted" style={{ marginTop: '1.5rem' }}>
        <Link href="/family">{t('handover.family')}</Link>
        {' · '}
        <Link href="/learn">{t('course.back')}</Link>
        {' · '}
        <Link href="/policies/children">{t('handover.policy')}</Link>
      </p>
    </div>
  );
}
