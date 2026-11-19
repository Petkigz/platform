import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { ownLearnerProfileId } from '@/lib/enrolment';
import {
  LOCALE_COOKIE,
  chooseLocale,
  formatDateTime,
  formatNumber,
  languageShownFor,
  translator,
  type MessageKey,
} from '@/lib/i18n';
import {
  fetchMyLearningShares,
  fetchSharedWithMe,
  type ShareScope,
  type ShareStatus,
} from '@/lib/sharing';
import { SharingPanel, type ShareView, type ShareWords } from './sharing-panel';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'share');
  return { locale, shown };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('account.shareHeading') };
}

const SCOPE: Record<ShareScope, MessageKey> = {
  progress: 'share.scopeProgress',
  achievements: 'share.scopeCertificates',
  progress_and_achievements: 'share.scopeBoth',
};

const STATUS: Record<ShareStatus, MessageKey> = {
  active: 'share.stActive',
  revoked: 'share.stRevoked',
  expired: 'share.stExpired',
};

/** The lengths an invitation is offered for, by their number of days. */
const LENGTH: Record<number, MessageKey> = {
  7: 'share.lenWeek',
  30: 'share.lenMonth',
  90: 'share.lenQuarter',
};

// A course's state is the dashboard's word for it. A state this list does not
// know has no badge: what the database wrote is not printed in its place.
const ENROLMENT: Record<string, MessageKey> = {
  active: 'learn.statusActive',
  completed: 'learn.statusCompleted',
  withdrawn: 'learn.statusWithdrawn',
  suspended: 'learn.statusSuspended',
  expired: 'learn.statusExpired',
};

/**
 * Who can see my learning, and whose learning I can see, in the reader's
 * language.
 *
 * Both seats on one page because they are the same question asked from two
 * ends of it, and a person who has been shared with should not have to hunt
 * for where it went.
 *
 * Inviting is gated by `family.adult_shares`, which ships off. Reading and
 * ending are not, because a share granted while the flag was on is still read
 * by the other account after it is turned off. Turning a feature off strands
 * nobody's privacy decision.
 *
 * **Twenty-seven languages have it** (`messages/share.ts`); a language held
 * for review reads it in English, whole, under `lang="en"`. Nobody who speaks
 * any of the twenty-seven has read them.
 *
 * **Nothing the database wrote as a sentence is shown.** A list that could not
 * be read is said as that, in the screen's own words, without the reason the
 * database gave. A share's state, what it covers and a course's state are
 * names said from the catalogue.
 *
 * **Every time is said with its zone.** This page is drawn on a server, which
 * does not know the reader's clock.
 *
 * **Names are set apart.** A person's name and a course's title are whatever
 * somebody typed, in whatever script; each sits in its own `<bdi>`.
 */
export default async function AccountSharingPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/account/sharing');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const num = (value: number) => formatNumber(shown.code, value);
  const when = (iso: string | null) => (iso ? formatDateTime(shown.code, iso, 'UTC') : '');
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const [enabled, emailEnabled, learnerProfileId, sharedWithMe] = await Promise.all([
    isFlagEnabled(supabase, 'family.adult_shares').catch(() => false),
    isFlagEnabled(supabase, 'delivery.notifications').catch(() => false),
    ownLearnerProfileId(supabase, user.id),
    fetchSharedWithMe(supabase, user.id),
  ]);

  // "You have no learning record" and "the list could not be read" are
  // different facts, and are said differently below.
  const mine = learnerProfileId ? await fetchMyLearningShares(supabase, learnerProfileId) : null;

  const shares: ShareView[] | null = !mine?.ok
    ? null
    : mine.value.map((share) => {
        const granted = when(share.grantedAt);
        const until = when(share.expiresAt);
        const ended = when(share.revokedAt);
        const lines: string[] = [];
        if (granted !== '') lines.push(t('share.granted', { date: granted }));
        if (share.status === 'revoked') {
          if (ended !== '') lines.push(t('share.ended', { date: ended }));
        } else {
          lines.push(until === '' ? t('share.noEnd') : t('share.until', { date: until }));
        }
        return {
          id: share.shareId,
          name: share.granteeName ?? t('share.noName'),
          named: share.granteeName !== null,
          scope: t(SCOPE[share.scope]),
          status: share.status,
          statusLabel: t(STATUS[share.status]),
          lines,
        };
      });

  const words: ShareWords = {
    locale: shown.code,
    whoHeading: t('account.shareLink'),
    liveCount: t('share.liveCount'),
    nobody: t('share.nobody'),
    end: t('share.end'),
    ending: t('share.ending'),
    inviteHeading: t('share.inviteHeading'),
    inviteLede: t('share.inviteLede'),
    emailLabel: t('share.emailLabel'),
    scopeLabel: t('share.scopeLabel'),
    lengthLabel: t('share.lengthLabel'),
    scopes: {
      progress: t(SCOPE.progress),
      achievements: t(SCOPE.achievements),
      progress_and_achievements: t(SCOPE.progress_and_achievements),
    },
    lengths: Object.fromEntries(Object.entries(LENGTH).map(([days, key]) => [Number(days), t(key)])),
    lengthHelp: t('share.lengthHelp'),
    invite: t('share.invite'),
    inviting: t('share.inviting'),
    emailOff: t('share.emailOff'),
    sameAnswer: t('share.sameAnswer'),
    invited: t('share.invited'),
    invitedUntil: t('share.invitedUntil'),
    endedDone: t('share.endedDone'),
    errors: {
      signed_out: t('merge.errSignedOut'),
      email: t('share.errEmail'),
      own_address: t('share.errOwnAddress'),
      no_profile: t('share.errNoProfile'),
      no_share: t('share.errNoShare'),
      not_yours: t('share.errNotYours'),
      refused: t('merge.errRefused'),
    },
    off: t('share.off'),
    unconfirmed: t('merge.unconfirmed'),
  };

  const shared = sharedWithMe.ok ? sharedWithMe.value : [];

  return (
    <div className="container section" {...frame}>
      <p className="eyebrow">
        <Link href="/account">{t('merge.back')}</Link>
      </p>
      <h1>{t('account.shareHeading')}</h1>
      <p className="lede">{t('share.lede')}</p>

      {!learnerProfileId ? (
        <div className="notice">{t('share.noProfile')}</div>
      ) : (
        <>
          {!enabled && <div className="notice warn">{t('share.off')}</div>}
          {shares === null && (
            <div className="notice error" role="alert">
              {t('share.unreadMine')}
            </div>
          )}
          {/* Off: a share made earlier is still listed, and can still be ended. */}
          <SharingPanel words={words} enabled={enabled} emailEnabled={emailEnabled} shares={shares} />
        </>
      )}

      <section className="section-sm">
        <h2>{t('share.theirsHeading')}</h2>

        {!sharedWithMe.ok ? (
          <div className="notice error" role="alert">
            {t('share.unreadTheirs')}
          </div>
        ) : shared.length === 0 ? (
          <p className="empty">{t('share.theirsNone')}</p>
        ) : (
          shared.map((overview) => {
            const scopes = [
              ...new Set(
                overview.terms.map((term) =>
                  Object.hasOwn(SCOPE, term.scope) ? t(SCOPE[term.scope as ShareScope]) : null,
                ),
              ),
            ].filter((label): label is string => label !== null);
            const terms = [
              ...new Set(
                overview.terms.map((term) => {
                  const until = when(term.expiresAt);
                  return until === '' ? t('share.theirsNoEnd') : t('share.theirsUntil', { date: until });
                }),
              ),
            ];
            const lessonsDone = overview.progress.rows.reduce((sum, row) => sum + row.lessonsCompleted, 0);

            return (
              <div className="card" key={overview.learnerId} style={{ marginBottom: '1rem' }}>
                {/* The name on its own line: beside it, a long scope pushed a phone's screen sideways. */}
                <h3 style={{ margin: 0, overflowWrap: 'anywhere' }}>
                  {overview.learnerName ? <bdi>{overview.learnerName}</bdi> : t('share.noName')}
                </h3>
                {scopes.length > 0 && (
                  <p style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '0.4rem 0 0' }}>
                    {scopes.map((label) => (
                      <span className="badge neutral" key={label}>
                        {label}
                      </span>
                    ))}
                  </p>
                )}

                {terms.map((line) => (
                  <p className="muted" key={line} style={{ margin: '0.25rem 0 0' }}>
                    {line}
                  </p>
                ))}
                <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                  {t('share.theirsCanEnd')}
                </p>

                {overview.seesProgress && (
                  <>
                    <div className="stats">
                      <div>
                        <div className="n">{num(overview.progress.total)}</div>
                        <div className="l">{t('share.courses')}</div>
                      </div>
                      <div>
                        <div className="n">{num(lessonsDone)}</div>
                        <div className="l">{t('share.lessonsDone')}</div>
                      </div>
                    </div>

                    {overview.progress.rows.length === 0 ? (
                      <p className="empty">{t('share.noCourses')}</p>
                    ) : (
                      <ul className="lessons stacked">
                        {overview.progress.rows.map((row) => {
                          const last = when(row.lastActivityAt);
                          const state = Object.hasOwn(ENROLMENT, row.status) ? ENROLMENT[row.status] : undefined;
                          return (
                            <li key={row.enrolmentId}>
                              {state && (
                                <span className={`badge ${row.status === 'completed' ? 'ok' : 'neutral'}`}>
                                  {t(state)}
                                </span>
                              )}
                              <span className="t" style={{ display: 'block', marginTop: '0.35rem' }}>
                                <bdi>{row.courseTitle}</bdi>
                                <span className="muted" style={{ display: 'block' }}>
                                  {t('share.lessonsOf', {
                                    done: num(row.lessonsCompleted),
                                    total: num(row.lessonsTotal),
                                  })}
                                </span>
                                {last !== '' && (
                                  <span className="muted" style={{ display: 'block' }}>
                                    {t('share.lastActive', { date: last })}
                                  </span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {overview.progress.total > overview.progress.rows.length && (
                      <p className="muted">
                        {t('share.showing', {
                          shown: num(overview.progress.rows.length),
                          total: num(overview.progress.total),
                        })}
                      </p>
                    )}
                  </>
                )}

                {overview.seesAchievements && (
                  <>
                    <h4 style={{ margin: '1rem 0 0' }}>{t('share.scopeCertificates')}</h4>
                    {overview.achievements.rows.length === 0 ? (
                      <p className="empty">{t('share.certNone')}</p>
                    ) : (
                      <ul className="lessons stacked">
                        {overview.achievements.rows.map((row) => {
                          const issued = when(row.issuedAt);
                          // The number is letters and digits, written left to right in every language.
                          const number = `\u2068${row.certificateNumber}\u2069`;
                          return (
                            <li key={row.certificateId}>
                              <span className="t" style={{ display: 'block' }}>
                                <bdi>{row.courseTitle}</bdi>
                                <span className="muted" style={{ display: 'block' }}>
                                  {t(row.status === 'revoked' ? 'family.certRevoked' : 'family.cert', { number })}
                                </span>
                                {issued !== '' && (
                                  <span className="muted" style={{ display: 'block' }}>
                                    {t('share.certIssued', { date: issued })}
                                  </span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {overview.achievements.total > overview.achievements.rows.length && (
                      <p className="muted">
                        {t('share.showing', {
                          shown: num(overview.achievements.rows.length),
                          total: num(overview.achievements.total),
                        })}
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
