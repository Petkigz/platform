import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Say } from '@/components/say';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatDateTime, formatNumber, translator } from '@/lib/i18n';
import { parseMyInstitution, parseReport, reportCsv, safeLogoUrl, type InstitutionReport } from '@/lib/institution';
import { reportWindowOf } from '@/lib/institution-outcome';
import { InstitutionConsole } from './institution-console';
import { JoinInstitution, LeaveInstitution } from './join-button';
import { READ_FAILED, membershipWords, readerLanguage } from './reader';
import { ReportFile } from './report-file';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('inst.title') };
}

/**
 * An institution's own page.
 *
 * One address for both halves of the relationship: somebody who is not a
 * member is told whether their address could join, and somebody who is a
 * member sees what their role allows. That difference is drawn by the
 * database (`my_institution()` returns no domains or keys to a member)
 * rather than by hiding a button.
 *
 * **What a member meets is in their language**: whether they can join and
 * what joining adds their family to, the counts, and leaving. The fields an
 * administrator fills in are drawn for an administrator only, in English for
 * now, inside a block marked as English, under a sentence that says so.
 *
 * **Joining says what it counts before the button.** The report's cohort is
 * a member account's own learner and every other learner in that family, so
 * a parent who joins adds their children to the counts. The page used to say
 * only that nothing was shared "beyond the counts that institution already
 * sees".
 *
 * **Unread is said, never drawn as "not in an institution".** A reply that
 * is an error, or that does not say whether this account has joined, or says
 * it has without naming what, is `inst.unread`. The database's own text is
 * logged and shown to nobody; the page used to print it.
 *
 * **Two dates the database would refuse are named here**, without asking it:
 * a start after the end, and more than 731 days. Until now both were drawn
 * as "The report could not be read".
 */
export default async function InstitutionPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[]; to?: string | string[] }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/institution');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const mine = await supabase.rpc('my_institution').then((r) => r, () => READ_FAILED);
  const said = mine.data as { joined?: unknown } | null;
  const parsed = !mine.error && said && typeof said.joined === 'boolean' ? parseMyInstitution(said) : null;
  const board = parsed && (!parsed.joined || parsed.institution) ? parsed : null;
  if (!board) {
    console.error('institution: the page could not be read:', mine.error?.message ?? 'a reply that does not say whether this account has joined');
  }

  const crumbs = (
    <nav className="crumbs">
      <Link href="/account">{t('learn.account')}</Link>
      <span aria-hidden>›</span>
      <span>{t('inst.title')}</span>
    </nav>
  );
  const code = (
    <p className="muted inst-code">
      {t('inst.haveCode')} <Link href="/institution/claim">{t('inst.useCode')}</Link>
    </p>
  );

  if (!board) {
    return (
      <div className="page inst-page" {...frame}>
        {crumbs}
        <div className="page-head">
          <h1>{t('inst.title')}</h1>
        </div>
        <div className="notice error" role="alert" data-inst-state="unread">
          {t('inst.unread')}
        </div>
        {code}
      </div>
    );
  }

  if (!board.joined) {
    return (
      <div className="page inst-page" {...frame}>
        {crumbs}
        <div className="page-head">
          <h1>{t('inst.title')}</h1>
        </div>
        <section className="card inst-card" data-inst-state={board.joinable ? 'joinable' : board.flags.sso ? 'no-match' : 'closed'}>
          <h2>{t('inst.notIn')}</h2>
          {board.joinable ? (
            <>
              <p>{t('inst.canJoin')}</p>
              <p className="muted">{t('inst.joinMeans')}</p>
              <JoinInstitution words={membershipWords(t, t('inst.joinDo'))} />
            </>
          ) : (
            <p className="muted">{t(board.flags.sso ? 'inst.noMatch' : 'inst.joinClosed')}</p>
          )}
        </section>
        {code}
      </div>
    );
  }

  const isAdmin = board.role === 'admin';
  const logo = safeLogoUrl(board.branding?.logoUrl ?? null);
  const name = board.branding?.displayName ?? board.institution?.name ?? '';
  const joinedAt = board.joinedAt ? formatDateTime(locale, board.joinedAt, 'UTC') : '';

  const params = await searchParams;
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const dates = reportWindowOf({ from: one(params.from), to: one(params.to) }, new Date());

  let report: InstitutionReport | null = null;
  if (board.flags.reporting && !dates.fault) {
    const read = await supabase
      .rpc('institution_report', { p_from: dates.from, p_to: dates.to })
      .then((r) => r, () => READ_FAILED);
    const totals = (read.data as { totals?: unknown } | null)?.totals;
    // A reply with no totals is not a report of nought.
    report = !read.error && totals && typeof totals === 'object' ? parseReport(read.data) : null;
    if (!report) {
      console.error('institution: the counts could not be read:', read.error?.message ?? 'a reply with no totals');
    }
  }
  const count = (value: number) => <strong>{formatNumber(locale, value)}</strong>;
  // What an administrator fills in is English, whatever the page is in.
  const english = shown.code === 'en' ? {} : { lang: 'en', dir: 'ltr' as const };

  return (
    <div className="page wide inst-page" {...frame}>
      {crumbs}

      <div className="page-head" data-inst-state="joined" data-inst-role={isAdmin ? 'admin' : 'member'}>
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="inst-logo" />
        )}
        <p className="eyebrow">{t('inst.yours')}</p>
        <h1>
          <bdi>{name}</bdi>
        </h1>
        {board.branding?.tagline && (
          <p className="muted" dir="auto">
            {board.branding.tagline}
          </p>
        )}
      </div>

      <ul className="inst-facts">
        {!isAdmin && <li>{t('inst.memberNote')}</li>}
        {joinedAt && (
          <li>
            <Say text={t('inst.joinedOn')} parts={{ date: <bdi>{joinedAt}</bdi> }} />
          </li>
        )}
      </ul>

      {board.flags.reporting && (
        <section className="card inst-card" data-inst-report={dates.fault ?? (report ? 'read' : 'unread')}>
          <h2>{t('inst.reportTitle')}</h2>
          <p className="muted">{t('inst.reportWhat')}</p>

          <form method="get" className="inst-dates">
            <label htmlFor="inst-from">{t('inst.from')}</label>
            <input id="inst-from" name="from" type="date" defaultValue={dates.from} dir="ltr" />
            <label htmlFor="inst-to">{t('inst.to')}</label>
            <input id="inst-to" name="to" type="date" defaultValue={dates.to} dir="ltr" />
            <button type="submit" className="btn secondary">
              {t('inst.readDo')}
            </button>
          </form>

          {dates.fault ? (
            <div className="notice warn" role="alert">
              {t(dates.fault === 'bad_window' ? 'inst.badWindow' : 'inst.windowTooLong')}
            </div>
          ) : !report ? (
            <div className="notice error" role="alert">
              {t('inst.reportUnread')}
            </div>
          ) : (
            <>
              <ul className="inst-totals">
                <li><Say text={t('inst.statAccounts')} parts={{ count: count(report.totals.members) }} /></li>
                <li><Say text={t('inst.statLearners')} parts={{ count: count(report.totals.learners) }} /></li>
                <li><Say text={t('inst.statEnrolments')} parts={{ count: count(report.totals.enrolments) }} /></li>
                <li><Say text={t('inst.statFinished')} parts={{ count: count(report.totals.completions) }} /></li>
                <li><Say text={t('inst.statCertificates')} parts={{ count: count(report.totals.certificates) }} /></li>
              </ul>

              <h3>{t('inst.byCourse')}</h3>
              {report.courses.length === 0 ? (
                <p className="empty">{t('inst.noneEnrolled')}</p>
              ) : (
                <div className="scroll-x">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">{t('inst.colCourse')}</th>
                        <th scope="col">{t('inst.colLearners')}</th>
                        <th scope="col">{t('inst.colEnrolments')}</th>
                        <th scope="col">{t('inst.colFinished')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.courses.map((row) => (
                        <tr key={row.course}>
                          <th scope="row" dir="auto">{row.course}</th>
                          <td>{formatNumber(locale, row.learnerProfiles)}</td>
                          <td>{formatNumber(locale, row.enrolments)}</td>
                          <td>{formatNumber(locale, row.completions)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="inst-file">
                <ReportFile
                  csv={reportCsv(report)}
                  name={`institution-report-${dates.from}-to-${dates.to}.csv`}
                  label={t('inst.csvDo')}
                />
                {shown.code !== 'en' && <p className="muted">{t('inst.csvNote')}</p>}
              </div>
            </>
          )}
        </section>
      )}

      {isAdmin && (
        <>
          {shown.code !== 'en' && <p className="muted inst-english">{t('inst.adminEnglish')}</p>}
          <div className="inst-admin" data-inst-admin {...english}>
            <p className="muted">
              <Link href="/institution/seats">Seats</Link> — the courses this institution has bought,
              the codes to hand out, and how many have been claimed. A seat is one learner for one
              course, and the school never sees which learner took which.
            </p>
            <InstitutionConsole board={board} />
          </div>
        </>
      )}

      <section className="card inst-card" data-inst-leave>
        <h2>{t('inst.leaveTitle')}</h2>
        <p className="muted">{t('inst.leaveBody')}</p>
        <LeaveInstitution words={membershipWords(t, t('inst.leaveDo'))} />
      </section>
    </div>
  );
}
