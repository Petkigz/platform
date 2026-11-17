'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useLocaleCode, useT } from '@/lib/i18n/client';
import { fill } from '@/lib/i18n/format';
import { en, type MessageKey } from '@/lib/i18n/messages/en';
import { isUnwritten } from '@/lib/i18n/messages/held';

/**
 * When a page breaks, the site says so in its own voice.
 *
 * Until now a thrown error in a server component fell through to Next's default
 * error screen — a bare sentence with no way back and no reference. That is the
 * wrong thing to show somebody who was about to start a lesson they paid for.
 *
 * Three things this page does that the default does not:
 *
 *   1. **It takes the blame.** The reader did nothing wrong, and a page that
 *      hints otherwise makes them retype a URL that was fine.
 *   2. **It gives a reference.** `error.digest` is the server's own id for the
 *      failure, so "it broke on Tuesday" can become a log line.
 *   3. **It says where the truth is.** A payment that broke half way is not a
 *      decision about money: the order's status lives on `/orders`, and the
 *      person is sent there before they pay again. A lesson that broke is not
 *      lost progress: the resume position is written as they watch.
 *
 * **In the reader's language.** It was English for everybody. This page is
 * drawn in the browser after something has already failed, so it cannot ask a
 * server for its words: they come from what the layout handed every page
 * (`broke.ts` says what that costs). Twenty-seven languages have them. A
 * language held for review reads the page in English, whole, with the two
 * borrowed button names in English too and `lang="en"` on the wrapper, like
 * every screen written since the owner's decision of 2026-11-16.
 *
 * **What it says about a lesson is what the player does.** A place is saved
 * when playback has moved ten seconds on from the last one saved, so the
 * sentence says "about every ten seconds". It used to say "at most a few
 * seconds", which was kinder than true.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // No telemetry provider is configured, so the browser console is the only
    // place this can be recorded without inventing infrastructure. The digest
    // connects it to the server's log.
    console.error('Unhandled error on a page:', error);
  }, [error]);

  const shell = useT();
  const locale = useLocaleCode();
  // A held language has no sentence of this part, so the page is English as a
  // whole rather than English sentences between two translated buttons.
  const english = isUnwritten(locale, 'broke.heading');
  const t = english
    ? (key: MessageKey, vars?: Record<string, string | number>) => fill(en[key], vars)
    : shell;
  const wrapper = english ? ({ lang: 'en', dir: 'ltr' } as const) : {};
  // The reference comes last in every language; the id itself is not a word.
  const [quote = ''] = t('broke.reference').split('{code}');

  return (
    <div className="container section" {...wrapper}>
      <p className="eyebrow">{t('broke.eyebrow')}</p>
      <h1>{t('broke.heading')}</h1>
      <p className="lede">{t('broke.lede')}</p>

      {error.digest && (
        <p className="muted">
          {quote}
          <code dir="ltr">{error.digest}</code>
        </p>
      )}

      <div className="page-actions">
        <button type="button" className="btn" onClick={reset}>
          {t('broke.retry')}
        </button>
        <Link className="btn secondary" href="/catalogue">
          {t('home.browse')}
        </Link>
        <Link className="btn ghost" href="/support">
          {t('broke.help')}
        </Link>
      </div>

      <div className="notice" style={{ marginTop: '1.5rem' }}>
        <p style={{ margin: 0 }}>
          <strong>{t('broke.payHead')}</strong> {t('broke.pay')}
        </p>
        <p style={{ margin: '0.5rem 0 0' }}>
          <Link href="/orders">{t('broke.orders')}</Link>
        </p>
      </div>

      <p className="muted" style={{ marginTop: '1rem' }}>
        {t('broke.lesson')}
      </p>
    </div>
  );
}
