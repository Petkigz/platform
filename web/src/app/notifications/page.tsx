import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { LOCALE_COOKIE, chooseLocale, formatDateTime, formatNumber, languageShownFor, translator } from '@/lib/i18n';
import { NOTIFICATION_KINDS, describeKind, parsePreferences, type NotificationKind, type Preference } from '@/lib/notification-prefs';
import { centreOf, planNameOf, type Centre, type CentreReminder } from '@/lib/notifications';

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
 * **In the reader's language, as far as the record allows.** Everything the
 * page says itself is from the catalogue. A reminder is said whole, because
 * it arrives with the moment it is about as a value. A stored message is
 * not: its text was composed in English by the database, with an amount or
 * somebody's reason inside it. The page names what kind of message it is in
 * the reader's language, shows the stored text beneath marked as English,
 * and says once that it is doing so. In English the stored text is the
 * message, so it is shown alone: a name above it would say it twice.
 *
 * **Not read is said, not drawn as empty and not thrown.** This page used to
 * answer with an error page when either reply failed. Now a centre that
 * could not be read says so and still shows the switches; switches that
 * could not be read say so and still show the messages.
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
  const [centreReply, prefsReply] = await Promise.all([
    supabase.rpc('my_notifications', { p_limit: 50 }).then(
      (reply) => reply,
      () => ({ data: null, error: { code: 'no-answer', message: '' } }),
    ),
    supabase.rpc('my_notification_preferences').then(
      (reply) => reply,
      () => ({ data: null, error: { code: 'no-answer', message: '' } }),
    ),
  ]);

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
        <p className="lede">{t('notify.lead')}</p>
      </div>

      {centre === null && (
        <div className="notice error" role="alert" data-centre="unread">
          {t('notify.unread')}
        </div>
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
              {named && (
                <p className="muted told-english" data-in-english>
                  {t('notify.inEnglish')}
                </p>
              )}
              <ul className="card told-list">
                {recent.map((m) => {
                  const info = m.kind ? describeKind(m.kind) : null;
                  const date = when(m.createdAt);
                  return (
                    <li key={m.id} data-message={m.id} data-kind={m.kind ?? 'unnamed'} data-read={m.read ? 'yes' : 'no'}>
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
