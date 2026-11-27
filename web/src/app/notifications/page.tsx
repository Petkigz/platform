import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { LOCALE_COOKIE, chooseLocale, formatDateTime, formatDay, formatNumber, languageShownFor, translator } from '@/lib/i18n';
import { NOTIFICATION_KINDS, describeKind, parsePreferences, type NotificationKind, type Preference } from '@/lib/notification-prefs';
import { formatMinor } from '@/lib/money';
import { askRole } from '@/lib/auth';
import { isFlagEnabled } from '@/lib/flags';
import { centreOf, ownerLeadFor, planNameOf, type Centre, type CentreReminder, type MessageFacts } from '@/lib/notifications';
import { changedSince } from '@/lib/policy-notice';

import { Ending } from '../_shared/ending';
import { MarkAllRead } from './notification-actions';
import { NotificationPreferences, type PreferenceWords } from './preferences';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'notify');
  return { locale, shown };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('footer.notifications') };
}

/**
 * The in-app notification centre.
 *
 * Two sections, because they are two different things. "Coming up" is computed
 * from rows that already say what is about to happen, so it is never stale and
 * is not something you read and dismiss. "Recent" is what happened, and it can
 * be marked read.
 *
 * **In the reader's language.** Everything the page says itself is from the
 * catalogue. A reminder is said whole, because it arrives with the moment
 * it is about as a value. A kept message is said from what it is made of
 * (`facts`: an amount, a reference, a title, a moment, somebody's reason),
 * in every language, English included: the amount is then said as money
 * and the moment in the reader's own way of writing a date.
 *
 * **An older message is English, and the page says so.** A message written
 * before facts were kept has only the two English sentences the database
 * composed. The page names what kind of message it is in the reader's
 * language, shows the stored text beneath marked as English, and says once
 * that older messages are shown that way. In English the stored text is
 * the message, so it is shown alone.
 *
 * **A reason is shown as written.** What staff typed about a payout, what a
 * teacher typed about a class and what the encoder reported are not
 * translated by anything.
 *
 * **Not read is said, not drawn as empty and not thrown.** This page used to
 * answer with an error page when either reply failed. Now a centre that
 * could not be read says so and still shows the switches; switches that
 * could not be read say so and still show the messages.
 *
 * **A document that changed is listed first.** The owner's rule
 * (2026-11-23) is that a change of policy is told at the next opening or by
 * a notification. This is the notification: each document the reader agreed
 * to whose version in force is no longer the one they agreed to, read from
 * what the database holds now (`my_policy_standing()`), so it is there for
 * as long as it is true and gone once they agree. It is not a kept message:
 * it cannot be marked read, and nothing writes one row for each person when
 * the owner publishes. If that read fails the section is left out and the
 * rest of the page is drawn; the document's page and the account page say
 * the same thing.
 *
 * **Only an address inside this site is followed** (`internalHrefOf`).
 *
 * What it never does is claim something was emailed or texted.
 */
export default async function NotificationsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/notifications');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};
  const when = (iso: string) => formatDateTime(shown.code, iso, 'UTC') || null;
  const num = (value: number) => formatNumber(shown.code, value);

  // Each reply on its own: one failing must not take the other with it.
  const [centreReply, prefsReply, standingReply, emailOn] = await Promise.all([
    supabase.rpc('my_notifications', { p_limit: 50 }).then(
      (reply) => reply,
      () => ({ data: null, error: { code: 'no-answer', message: '' } }),
    ),
    supabase.rpc('my_notification_preferences').then(
      (reply) => reply,
      () => ({ data: null, error: { code: 'no-answer', message: '' } }),
    ),
    supabase.rpc('my_policy_standing').then(
      (reply) => reply,
      () => ({ data: null, error: { code: 'no-answer', message: '' } }),
    ),
    isFlagEnabled(supabase, 'delivery.notifications').catch(() => false),
  ]);

  // With email on, one reader is emailed something that is also shown here:
  // the owner, when a board post is reported. The page's first sentence says
  // nothing is emailed, so the owner is given a true one. See `OWNER_LEAD`.
  const owner = emailOn
    ? await askRole(() => supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' })).catch(() => false)
    : false;
  const ownerLead = ownerLeadFor(emailOn, owner);

  // The documents that changed since this reader agreed to them. Not read is
  // not drawn: the page is about messages, and this is said elsewhere too.
  const changed = (standingReply.error ? null : changedSince(standingReply.data)) ?? [];
  if (standingReply.error) console.error('[notifications] changed documents unread:', standingReply.error.code);
  // The documents are the owner's words, in English, whatever the page is in.
  const written = shown.code === 'en' ? {} : { lang: 'en', dir: 'ltr' as const };

  let centre: Centre | null = null;
  if (centreReply.error) {
    console.error('[notifications] centre unread:', centreReply.error.code);
  } else {
    centre = centreOf(centreReply.data);
    if (centre === null) console.error('[notifications] centre unread: reply not understood');
  }

  // A page that shows a feed and hides the switches that shape it is a page
  // somebody has to leave to use. The switches sit below the feed because the
  // feed is what a person came for.
  let preferences: Preference[] | null = null;
  if (prefsReply.error) {
    console.error('[notifications] preferences unread:', prefsReply.error.code);
  } else {
    try {
      preferences = parsePreferences(prefsReply.data);
    } catch (error) {
      // A kind this code has no name for, or no list. Not drawn as "no switches".
      console.error('[notifications] preferences unread:', error instanceof Error ? error.message : 'not understood');
    }
  }

  const reminders = centre?.reminders ?? [];
  const recent = centre?.recent ?? [];
  const unreadIds = recent.filter((m) => !m.read).map((m) => m.id);
  // The stored text is English. To a reader of another language it is named
  // and set apart; to a reader of English it is simply the message.
  const named = shown.code !== 'en';
  const storedClass = named ? 'told-stored' : 'told-text';

  /**
   * A kept message said from what it is made of: its heading and its lines.
   *
   * Every sentence ends in its value, after a colon, so no language has to
   * inflect an amount or a name. A class's moment is said in the zone the
   * class was scheduled in, which is the one its teacher and its learners
   * were told.
   */
  const said = (f: MessageFacts): { heading: string; lines: ReactNode[] } => {
    const amount = (minor: string, currency: string) => (
      <Ending words={t('sponsor.amount')} gap="amount" value={formatMinor(minor, currency)} ltr />
    );
    const reason = (value: string) => <Ending words={t('notify.mReason')} gap="reason" value={value} />;
    const moment = (words: string, iso: string, zone: string) => {
      const date = formatDateTime(shown.code, iso, zone);
      return date ? <Ending words={words} gap="date" value={date} /> : null;
    };
    const theClass = (title: string) => <Ending words={t('notify.mClass')} gap="title" value={title} />;
    switch (f.kind) {
      case 'payout_paid':
        return {
          heading: t('notify.kPayoutPaid'),
          lines: [amount(f.amountMinor, f.currency), <Ending key="r" words={t('sponsor.reference')} gap="reference" value={f.reference} ltr />],
        };
      case 'payout_failed':
        return { heading: t('notify.kPayoutFailed'), lines: [amount(f.amountMinor, f.currency), reason(f.reason), t('notify.mStillOwed')] };
      case 'payout_cancelled':
        return { heading: t('notify.kPayoutCancelled'), lines: [amount(f.amountMinor, f.currency), t('notify.mCancelledBy')] };
      case 'media_encode_failed':
        return {
          // The two readers can do different things about it, and are told which they are.
          heading: f.part === 'author' ? t('notify.mLessonEmpty') : t('notify.kMediaFailed'),
          lines: [
            f.name ? <Ending key="n" words={t('notify.mRecording')} gap="name" value={f.name} /> : null,
            t('notify.mNotPlayable'),
            // What a program printed: read left to right whatever the page's direction.
            <Ending key="e" words={t('notify.mEncoder')} gap="reason" value={f.reason} ltr />,
          ],
        };
      case 'live_cancelled':
        return {
          heading: t('notify.kLiveCancelled'),
          lines: [theClass(f.title), moment(t('notify.mWasAt'), f.startsAt, f.zone), reason(f.reason)],
        };
      case 'live_recording_ready':
        return { heading: t('notify.kRecordingReady'), lines: [theClass(f.title), moment(t('notify.mHeldAt'), f.startsAt, f.zone)] };
      case 'teaching_answered':
        // The outcome in the words the application page uses for it. What the
        // owner wrote is not in the message; the page it links to shows it.
        return {
          heading: t('notify.kTeachAnswered'),
          lines: [t(f.outcome === 'approved' ? 'tapply.approved' : 'tapply.declined'), t('notify.mTeachNote')],
        };
    }
  };

  const kinds = Object.fromEntries(
    NOTIFICATION_KINDS.map((k) => [k.kind, { label: t(k.labelKey), description: t(k.descriptionKey) }]),
  ) as Record<NotificationKind, { label: string; description: string }>;
  const cut = (words: string, gap: string) => (words.split(`{${gap}}`)[0] ?? '').trimEnd();
  const preferenceWords: PreferenceWords = {
    title: t('notify.prefsTitle'),
    body: t('notify.prefsBody'),
    sumAllOn: t('notify.sumAllOn'),
    sumAllOff: t('notify.sumAllOff'),
    sumOff: cut(t('notify.sumOff'), 'count'),
    always: t('notify.always'),
    notInUse: t('notify.notInUse'),
    locked: t('notify.prefLocked'),
    failed: t('notify.prefFailed'),
    unsure: t('notify.prefUnsure'),
    kinds,
  };

  /** A reminder, said from the catalogue when its kind is one this code knows. */
  const reminderLines = (r: CentreReminder) => {
    const date = when(r.happensAt);
    if (r.kind === 'class_starting') {
      return (
        <>
          <strong>{t('notify.kClassStarting')}</strong>
          <p className="told-name">
            <bdi>{r.title}</bdi>
          </p>
          {date && (
            <p>
              <Ending words={t('notify.classAt')} gap="date" value={date} />
            </p>
          )}
        </>
      );
    }
    if (r.kind === 'plan_renewing') {
      const plan = planNameOf(r.title);
      return (
        <>
          <strong>{t('notify.kPlanRenewing')}</strong>
          {plan && (
            <p className="told-name">
              <Ending words={t('notify.planNamed')} gap="name" value={plan} />
            </p>
          )}
          {date && (
            <p>
              <Ending words={t('notify.renewsOn')} gap="date" value={date} />
            </p>
          )}
          <p className="muted">{t('notify.renewCancel')}</p>
        </>
      );
    }
    // A reminder this code has no sentence for: what the database wrote, as written.
    return (
      <div className={storedClass} lang="en">
        <p dir="auto">
          <strong>{r.title}</strong>
        </p>
        <p dir="auto">{r.body}</p>
      </div>
    );
  };

  return (
    <div className="page told-page" {...frame}>
      <div className="page-head">
        <p className="eyebrow">
          <Link href="/account">{t('merge.back')}</Link>
        </p>
        <h1>{t('footer.notifications')}</h1>
        {ownerLead ? (
          <p className="lede" lang="en" dir="ltr">{ownerLead}</p>
        ) : (
          <p className="lede">{t('notify.lead')}</p>
        )}
      </div>

      {centre === null && (
        <div className="notice error" role="alert" data-centre="unread">
          {t('notify.unread')}
        </div>
      )}

      {changed.length > 0 && (
        <section className="told-section" data-changed={changed.length}>
          <h2>{t('notify.policyHead')}</h2>
          <p className="muted told-english">{t('notify.policyLead')}</p>
          <ul className="card told-list">
            {changed.map((doc) => {
              const day = formatDay(shown.code, doc.effectiveAt);
              return (
                <li key={doc.slug} data-changed-policy={doc.slug}>
                  <p className="told-name">
                    <bdi {...written}>{doc.title}</bdi>
                  </p>
                  <ul className="told-changed-facts">
                    <li>
                      <Ending words={t('policy.versionNo')} gap="number" value={num(doc.version)} />
                    </li>
                    {day && (
                      <li>
                        <Ending words={t('policy.inForceFrom')} gap="date" value={day} />
                      </li>
                    )}
                  </ul>
                  <p>
                    <Link href={`/policies/${doc.slug}`}>{t('policy.noticeOpen')}</Link>
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {centre !== null && reminders.length > 0 && (
        <section className="told-section" data-reminders={reminders.length}>
          <h2>{t('notify.soon')}</h2>
          <ul className="card told-list">
            {reminders.map((r) => (
              <li key={`${r.kind}-${r.happensAt}-${r.title}`} data-reminder={r.kind ?? 'unnamed'}>
                {reminderLines(r)}
                {r.href && (
                  <p>
                    <Link href={r.href}>{t('assign.open')}</Link>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {centre !== null && (
        <section className="told-section" data-centre={recent.length === 0 ? 'none' : 'list'} data-unread={centre.unreadCount}>
          <div className="told-head">
            <h2>{t('notify.recent')}</h2>
            {centre.unreadCount > 0 && (
              <span className="badge">
                <Ending words={t('notify.unreadCount')} gap="count" value={num(centre.unreadCount)} />
              </span>
            )}
          </div>

          {recent.length === 0 ? (
            <p className="empty">{t('notify.none')}</p>
          ) : (
            <>
              {named && recent.some((m) => m.facts === null) && (
                <p className="muted told-english" data-in-english>
                  {t('notify.inEnglish')}
                </p>
              )}
              <ul className="card told-list">
                {recent.map((m) => {
                  const info = m.kind ? describeKind(m.kind) : null;
                  const date = when(m.createdAt);
                  const telling = m.facts ? said(m.facts) : null;
                  return (
                    <li
                      key={m.id}
                      data-message={m.id}
                      data-kind={m.kind ?? 'unnamed'}
                      data-read={m.read ? 'yes' : 'no'}
                      data-said={telling ? 'here' : 'stored'}
                    >
                      {telling ? (
                        <>
                          <div className="told-kind">
                            <strong>{telling.heading}</strong>
                            {!m.read && <span className="badge">{t('notify.unreadMark')}</span>}
                          </div>
                          <div className="told-said">
                            {telling.lines.map((line, at) => (line === null ? null : <p key={at}>{line}</p>))}
                          </div>
                        </>
                      ) : (
                        <>
                          {((named && info) || !m.read) && (
                            <div className="told-kind">
                              {named && info && <strong>{t(info.labelKey)}</strong>}
                              {!m.read && <span className="badge">{t('notify.unreadMark')}</span>}
                            </div>
                          )}
                          <div className={storedClass} lang="en">
                            <p dir="auto">
                              <strong>{m.title}</strong>
                            </p>
                            <p dir="auto">{m.body}</p>
                          </div>
                        </>
                      )}
                      <p className="told-foot">
                        {date && <span className="muted">{date}</span>}
                        {m.href && <Link href={m.href}>{t('assign.open')}</Link>}
                      </p>
                    </li>
                  );
                })}
              </ul>
              {/* Kept when nothing is unread: it still says what the last press did. */}
              <MarkAllRead
                ids={unreadIds}
                locale={shown.code}
                words={{
                  markAll: t('notify.markAll'),
                  marked: cut(t('notify.marked'), 'count'),
                  failed: t('notify.markFailed'),
                }}
              />
            </>
          )}
        </section>
      )}

      <div id="preferences" className="told-anchor">
        {preferences === null ? (
          <section className="card told-prefs" data-preferences="unread">
            <h2>{t('notify.prefsTitle')}</h2>
            <div className="notice error" role="alert">
              {t('notify.prefsUnread')}
            </div>
          </section>
        ) : (
          <NotificationPreferences initial={preferences} words={preferenceWords} locale={shown.code} />
        )}
      </div>

      <p className="told-links">
        <Link href="/dashboard">{t('footer.area')}</Link>
      </p>
    </div>
  );
}
