import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { LOCALE_COOKIE, chooseLocale, formatDateTime, formatDay, languageShownFor, translator } from '@/lib/i18n';
import { CATEGORY_KEY, fetchCaseByNumber, STATUS_KEY, type CaseWords } from '@/lib/support';
import { TranslateButton } from '@/components/translate-button';
import { translateFor } from '@/lib/translate-reader';
import { CaseActions } from './case-actions';
import { StaffPanel } from './staff-panel';

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
  return { title: translator(shown.code)('support.caseTitle') };
}

/**
 * One support case, by its human reference.
 *
 * The same page serves the person who asked and the person answering, because
 * the difference between the two views is decided by the database rather than
 * by this file: row level security hides a case from anyone who is not its
 * requester or staff, and hides internal notes from the requester. What is
 * rendered here is whatever came back.
 *
 * That is why there is no `where requested_by = user.id` filter below. Adding
 * one would not make the page safer — RLS already is — and it would break the
 * staff queue, which links here.
 *
 * One part is not the same for both seats: under the conversation the person
 * who asked gets the form that replies and withdraws, and staff get
 * `StaffPanel` instead (priority, the owner's pause on cleanup, the history,
 * triage). The panel reads tables the requester cannot see, through functions
 * that refuse anybody who is not staff.
 *
 * **In the reader's language** since 2026-11-27 (`messages/support.ts`): the
 * head, the conversation and the asker's form. The staff panel stays in
 * English and is marked as English. What somebody wrote (the subject, a
 * message, how it was resolved, why it was closed) is shown as written, in
 * its own direction; a moment is written in the page's language and names its
 * time zone.
 */
export default async function SupportCasePage({
  params, searchParams,
}: {
  params: Promise<{ caseNumber: string }>;
  searchParams: Promise<{ cleanupHold?: string; holdEventAfter?: string; heldVersionAfter?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { caseNumber } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/support/${caseNumber}`);

  const found = await fetchCaseByNumber(supabase, { caseNumber, myUserId: user.id });
  // Not a permission statement so much as a factual one: RLS makes somebody
  // else's case indistinguishable from a case that does not exist, and both
  // should land on the same page.
  if (!found) notFound();

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  const isStaff = privileged === true;
  // The requester and staff may write in different languages: each can
  // translate what the other wrote. Null when translation is off.
  const translate = await translateFor(supabase);

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};
  const moment = (iso: string) => formatDateTime(shown.code, iso, 'UTC');

  const { supportCase: supportCaseRow, messages } = found;
  const open = supportCaseRow.status !== 'closed';
  const badge = supportCaseRow.status === 'resolved' ? 'ok' : supportCaseRow.status === 'closed' ? 'neutral' : 'warn';

  const words: CaseWords = {
    heading: t('support.addHeading'),
    reply: t('support.reply'),
    replyExample: t('support.replyExample'),
    replyReopens: supportCaseRow.status === 'resolved' ? t('support.replyReopens') : null,
    sendReply: t('support.sendReply'),
    sending: t('auth.sending'),
    replySent: t(supportCaseRow.status === 'resolved' ? 'support.replyReopened' : 'support.replySent'),
    needReply: t('support.needReply'),
    withdrawHeading: t('support.withdrawHeading'),
    reason: t('support.reason'),
    reasonExample: t('support.reasonExample'),
    withdraw: t('support.withdraw'),
    withdrawn: t('support.withdrawn'),
    needReason: t('support.needReason'),
    final: t('support.final'),
    tooLong: t('support.tooLong'),
    notTaking: t('support.notTaking'),
    signedOut: t('support.signedOut'),
    gone: t('support.gone'),
    refused: t('support.refused'),
    unsure: t('support.unsureSaved'),
  };

  return (
    <div className="page support-page" {...frame}>
      <nav className="crumbs">
        <Link href="/support">{t('footer.help')}</Link>
        <span aria-hidden>›</span>
        <bdi dir="ltr">{supportCaseRow.caseNumber}</bdi>
      </nav>

      <div className="page-head">
        <p className="eyebrow support-facts">
          <bdi dir="ltr">{supportCaseRow.caseNumber}</bdi>
          <span>{CATEGORY_KEY[supportCaseRow.category] ? t(CATEGORY_KEY[supportCaseRow.category]) : supportCaseRow.category}</span>
          <span>
            {t('support.opened')} <bdi>{formatDay(shown.code, supportCaseRow.createdAt)}</bdi>
          </span>
        </p>
        <h1 dir="auto">{supportCaseRow.subject}</h1>
        <div className="support-badges">
          <span className={`badge ${badge}`} data-support-status={supportCaseRow.status}>
            {STATUS_KEY[supportCaseRow.status] ? t(STATUS_KEY[supportCaseRow.status]) : supportCaseRow.status}
          </span>
        </div>
      </div>

      {supportCaseRow.status === 'resolved' && supportCaseRow.resolutionNote && (
        <section className="card" data-support-part="resolved">
          <h2>{t('support.resolvedHeading')}</h2>
          <p dir="auto">{supportCaseRow.resolutionNote}</p>
          <p className="muted support-last">{t('support.resolvedNote')}</p>
        </section>
      )}

      {supportCaseRow.status === 'closed' && supportCaseRow.closeReason && (
        <section className="card" data-support-part="closed">
          <h2>{t('support.stClosed')}</h2>
          <p className="muted" dir="auto">{supportCaseRow.closeReason}</p>
        </section>
      )}

      <section className="card" data-support-part="conversation">
        <h2>{t('support.conversation')}</h2>

        <ol className="lessons support-thread">
          <li>
            <span className="t support-said" dir="auto">{supportCaseRow.body}</span>
            <TranslateButton text={`${supportCaseRow.subject}\n\n${supportCaseRow.body}`} words={translate} />
            <span className="muted support-facts">
              {supportCaseRow.requesterName ? <bdi>{supportCaseRow.requesterName}</bdi> : <span>{t('support.you')}</span>}
              <bdi>{moment(supportCaseRow.createdAt)}</bdi>
            </span>
          </li>

          {messages.map((m) => {
            const named = m.authorIsMe ? null : m.authorName;
            return (
              <li key={m.id}>
                <span className="t support-said" dir="auto">{m.body}</span>
                {m.authorIsMe ? null : <TranslateButton text={m.body} words={translate} />}
                <span className="muted support-facts">
                  {named ? <bdi>{named}</bdi> : <span>{t(m.authorIsStaff && !m.authorIsMe ? 'support.staff' : 'support.you')}</span>}
                  <bdi>{moment(m.createdAt)}</bdi>
                </span>
                {m.isInternal && <span className="badge neutral support-internal">{t('support.internal')}</span>}
              </li>
            );
          })}
        </ol>
      </section>

      {isStaff ? (
        <StaffPanel supabase={supabase} supportCaseRow={supportCaseRow} myUserId={user.id} query={await searchParams} />
      ) : open ? (
        <CaseActions caseId={supportCaseRow.id} words={words} />
      ) : (
        <section className="card" data-support-part="over">
          <h2>{t('support.closedHeading')}</h2>
          <p className="muted">{t('support.closedNote')}</p>
          <Link href="/support" className="btn secondary">
            {t('support.heading')}
          </Link>
        </section>
      )}
    </div>
  );
}
