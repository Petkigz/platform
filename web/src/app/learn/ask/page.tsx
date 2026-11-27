import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { LOCALE_COOKIE, chooseLocale, formatNumber, languageShownFor, translator } from '@/lib/i18n';
import { ASK_MAX, type AskWords } from '@/lib/ai-support';
import { AskForm } from './ask-form';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'ask') };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('ask.title') };
}

/**
 * Ask about what you are studying.
 *
 * The assistant is retrieval-only, and this page says so before anybody types
 * anything: it can point at a lesson, it cannot issue a ruling, and a question that
 * asks for one goes to a teacher. Saying that up front is the difference between a
 * boundary and an apology.
 *
 * While `learning.ai_support` is off the page still exists and still explains
 * itself — a learner who was told the feature exists should not find a 404 and
 * conclude it was taken away.
 *
 * **In the reader's language** since 2026-11-27 (`messages/ask.ts`). The box
 * runs in the browser and the catalogue stays on the server, so it is handed
 * its words. The database's answer carries an English sentence; the page
 * says what the answer's status means in its own words instead. A lesson's
 * title and the line quoted from it are the author's and are shown as
 * written.
 *
 * A switch that could not be read is not a switch that is off: then the box
 * is drawn, and the database, which reads the switch itself, has the last
 * word (its answer is `closed`, and the box says so).
 */
export default async function AskPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/learn/ask');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  // `null` is "nobody could read the switch", which is not "off".
  const open = await isFlagEnabled(supabase, 'learning.ai_support').catch(() => null);

  const off = `${t('ask.offHead')} ${t('ask.off')}`;
  const words: AskWords = {
    label: t('ask.label'),
    example: t('ask.example'),
    look: t('ask.look'),
    looking: t('ask.looking'),
    status: {
      answered: t('ask.found'),
      refused_ruling: t('ask.forTeacher'),
      no_match: t('ask.nothing'),
      closed: t('ask.closed'),
    },
    says: {
      answered: t('ask.foundSays'),
      teacherCase: t('ask.teacherCase'),
      teacherNoCase: t('ask.teacherNoCase'),
      noMatch: t('ask.nothingSays'),
      closed: off,
    },
    openCase: t('ask.openCase'),
    rules: t('ask.rules'),
    refusals: {
      signedOut: t('ask.signedOut'),
      tooShort: t('ask.tooShort'),
      tooLong: t('ask.tooLong', { max: formatNumber(shown.code, ASK_MAX) }),
      notSent: t('ask.notSent'),
      unsure: t('ask.unsure'),
    },
  };

  return (
    <div className="page narrow" {...frame}>
      <nav className="crumbs">
        <Link href="/learn">{t('ask.crumbLearn')}</Link>
        <span aria-hidden>›</span>
        <span>{t('ask.crumb')}</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">{t('ask.eyebrow')}</p>
        <h1>{t('ask.title')}</h1>
      </div>

      <div className="notice" data-ask-rule>
        <strong>{t('ask.ruleHead')}</strong> {t('ask.rule')}
      </div>

      {open === false ? (
        <div className="notice warn" style={{ marginTop: '1rem' }} data-ask-state="off">
          <strong>{t('ask.offHead')}</strong> {t('ask.off')}
        </div>
      ) : (
        <AskForm words={words} />
      )}

      <p className="muted" style={{ marginTop: '1.5rem' }}>
        <Link href="/support">{t('ask.help')}</Link>
        {' · '}
        <Link href="/learn">{t('ask.back')}</Link>
      </p>
    </div>
  );
}
