import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { LOCALE_COOKIE, chooseLocale, languageShownFor, translator } from '@/lib/i18n';
import { DownloadsList, type DownloadsWords } from './downloads-list';
import { OfflineDevices, type DeviceWords } from './offline-devices';

export const dynamic = 'force-dynamic';

async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'downloads') };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('downloads.title') };
}

/**
 * Lessons saved to this device.
 *
 * The files are stored on the device, but this server-rendered page and the
 * key request currently need a connection. This is not full offline playback.
 *
 * **In the reader's language** since 2026-11-27 (`messages/downloads.ts`).
 * Nearly everything here is said by the browser, about a list only the
 * browser can read, so the page hands the two parts their words and the
 * language to count in; neither has a sentence of its own. A lesson's title,
 * its course's and a device's name are shown as they were written.
 *
 * The switch is read three ways. Off is the notice that new saves are closed.
 * Unreadable is no notice at all: until 2026-11-27 a failed read was said as
 * "New saves are not open right now", which is a statement about the switch
 * that nobody had read. Nothing else on the page depends on it.
 */
export default async function DownloadsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/downloads');

  const [{ locale, shown }, offlineOn] = await Promise.all([
    readerLanguage(),
    isFlagEnabled(supabase, 'learning.offline').catch(() => null),
  ]);
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const listWords: DownloadsWords = {
    storageRefused: t('downloads.storageRefused'),
    looking: t('downloads.looking'),
    empty: t('downloads.empty'),
    count: t('downloads.count'),
    space: t('downloads.space'),
    closePlayer: t('downloads.closePlayer'),
    badgeLapsed: t('downloads.badgeLapsed'),
    badgeSaved: t('downloads.badgeSaved'),
    lapsed: t('downloads.lapsed'),
    daysLeft: t('downloads.daysLeft'),
    play: t('downloads.play'),
    opening: t('downloads.opening'),
    remove: t('downloads.remove'),
    removing: t('downloads.removing'),
    removeLocal: t('downloads.removeLocal'),
    gone: t('downloads.gone'),
    openFailed: t('downloads.openFailed'),
    needConnection: t('downloads.needConnection'),
    notAllowed: t('downloads.notAllowed'),
    removedCopy: t('downloads.removedCopy'),
    signIn: t('downloads.signIn'),
    removeUnconfirmed: t('downloads.removeUnconfirmed'),
    removeLocalFailed: t('downloads.removeLocalFailed'),
    confirmLocal: t('downloads.confirmLocal'),
    localRemoved: t('downloads.localRemoved'),
    localFailed: t('downloads.localFailed'),
  };
  const deviceWords: DeviceWords = {
    title: t('downloads.devTitle'),
    lede: t('downloads.devLede'),
    loading: t('downloads.devLoading'),
    unread: t('downloads.devUnread'),
    refresh: t('downloads.devRefresh'),
    none: t('downloads.devNone'),
    unnamed: t('downloads.devUnnamed'),
    saved: t('downloads.devSaved'),
    seen: t('downloads.devSeen'),
    remove: t('downloads.devRemove'),
    removing: t('downloads.removing'),
    confirm: t('downloads.devConfirm'),
    unconfirmed: t('downloads.devUnconfirmed'),
    removed: t('downloads.devRemoved'),
    removedUnrefreshed: t('downloads.devRemovedUnrefreshed'),
  };

  return (
    <div className="container section" {...frame}>
      <p className="eyebrow">
        <Link href="/learn">{t('nav.learn')}</Link>
      </p>
      <h1>{t('downloads.title')}</h1>
      <p className="lede">{t('downloads.lede')}</p>

      {offlineOn === false && <div className="notice warn">{t('downloads.paused')}</div>}

      <section className="card">
        <DownloadsList locale={shown.code} words={listWords} />
      </section>

      <OfflineDevices locale={shown.code} words={deviceWords} />

      <p className="muted" style={{ marginTop: '1rem' }}>
        {t('downloads.plusNote')}
      </p>

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn">{t('downloads.back')}</Link>
      </p>
    </div>
  );
}
