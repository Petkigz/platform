import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { LOCALE_COOKIE, chooseLocale, formatDay, formatNumber, languageShownFor, translator } from '@/lib/i18n';
import {
  BODY_MAX,
  CATEGORY_KEY,
  fetchMyCases,
  STATUS_KEY,
  SUPPORT_CATEGORIES,
  type NewCaseWords,
} from '@/lib/support';
import { NewCaseForm } from './new-case-form';
import { HelpSearch } from './help-search';
import type { HelpArticle } from '@/lib/platform-help';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'support') };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('footer.help') };
}

/**
 * Help — open a case, and see the ones already open.
 *
 * Support is a signed-in surface. An anonymous "contact us" form has nowhere to
 * send the answer, and on a platform where a case can discuss a child's
 * progress or a payment, an unattributed thread is a thread nobody can close.
 * "This lesson is wrong" from someone who will not sign in already has a home:
 * the report form on the lesson itself.
 *
 * While `platform.support` is off the page still lists existing cases. Turning
 * the feature off stops new ones arriving; it does not delete a conversation
 * somebody is in the middle of.
 *
 * **In the reader's language** since 2026-11-27 (`messages/support.ts`). The
 * two forms run in the browser and the catalogue stays on the server, so each
 * is handed its words. What a person wrote (a subject, how a request was
 * resolved, a help article) is shown as it was written, in its own direction.
 *
 * A switch that could not be read is not a switch that is off: then the form
 * is drawn, and the database, which reads the switch itself, has the last word.
 */
export default async function SupportPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/support');

  const [{ locale, shown }, accepting] = await Promise.all([
    readerLanguage(),
    isFlagEnabled(supabase, 'platform.support').catch(() => null),
  ]);
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};
  // Fetched whether or not the desk is open: a case opened last week is still
  // this person's case, and hiding it while the flag is off would look exactly
  // like a request that was never received.
  const cases = await fetchMyCases(supabase);
  const help = await supabase.from('platform_help_articles')
    .select('id,title,body,keywords,status,updated_at').eq('status', 'published').order('title');

  const formWords: NewCaseWords = {
    heading: t('support.formHeading'),
    topic: t('support.topic'),
    topics: SUPPORT_CATEGORIES.map((c) => ({ value: c.value, label: t(CATEGORY_KEY[c.value]) })),
    subject: t('support.subject'),
    subjectExample: t('support.subjectExample'),
    what: t('support.what'),
    whatExample: t('support.whatExample'),
    limit: t('support.limit', { max: formatNumber(shown.code, BODY_MAX) }),
    send: t('support.send'),
    sending: t('auth.sending'),
    sent: t('support.sent'),
    needSubject: t('support.needSubject'),
    needWhat: t('support.needWhat'),
    tooLong: t('support.tooLong'),
    notTaking: t('support.notTaking'),
    tooMany: t('support.tooMany'),
    signedOut: t('support.signedOut'),
    refused: t('support.notSent'),
    unsure: t('support.unsureSent'),
  };

  return (
    <div className="page support-page" {...frame}>
      <nav className="crumbs">
        <Link href="/">{t('missing.home')}</Link>
        <span aria-hidden>›</span>
        <span>{t('footer.help')}</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">{t('support.eyebrow')}</p>
        <h1>{t('support.heading')}</h1>
        <p className="muted">{t('support.lede')}</p>
      </div>

      {help.error ? (
        <p className="notice warn" data-support-help="unread">{t('support.helpUnread')}</p>
      ) : (
        <HelpSearch
          articles={(help.data ?? []) as HelpArticle[]}
          words={{
            heading: t('support.findHeading'),
            note: t('support.findNote'),
            label: t('support.findLabel'),
            example: t('support.findExample'),
            none: t('support.findNone'),
          }}
        />
      )}

      {accepting === false ? (
        <section className="card" data-support-state="paused">
          <h2>{t('support.pausedHeading')}</h2>
          <p className="muted">{t('support.pausedNote')}</p>
        </section>
      ) : (
        <NewCaseForm words={formWords} />
      )}

      <section className="section">
        <h2>{t('support.mine')}</h2>
        {cases.length === 0 ? (
          <p className="muted">{t(accepting === false ? 'support.mineNone' : 'support.mineNoneOpen')}</p>
        ) : (
          <ul className="lessons support-list">
            {cases.map((c) => (
              <li key={c.id}>
                <div className="t">
                  <Link href={`/support/${c.caseNumber}`}>
                    <strong dir="auto">{c.subject}</strong>
                  </Link>
                  <span className="muted support-facts">
                    <bdi dir="ltr">{c.caseNumber}</bdi>
                    <span>{CATEGORY_KEY[c.category] ? t(CATEGORY_KEY[c.category]) : c.category}</span>
                    <bdi>{formatDay(shown.code, c.createdAt)}</bdi>
                  </span>
                  {c.status === 'resolved' && c.resolutionNote && (
                    <p className="muted support-said" dir="auto">
                      {c.resolutionNote}
                    </p>
                  )}
                </div>
                <span
                  className={`badge ${c.status === 'resolved' ? 'ok' : c.status === 'closed' ? 'neutral' : 'warn'}`}
                >
                  {STATUS_KEY[c.status] ? t(STATUS_KEY[c.status]) : c.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="muted support-small">{t('support.privacy')}</p>
    </div>
  );
}
