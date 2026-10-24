'use client';

import { useEffect } from 'react';
import Link from 'next/link';

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

  return (
    <div className="container section">
      <p className="eyebrow">Something broke</p>
      <h1>This page stopped working</h1>
      <p className="lede">
        That is a fault on our side, not a mistake you made. Trying again often
        works; if it does not, the reference below is what to quote when you ask
        for help.
      </p>

      {error.digest && (
        <p className="muted">
          Reference: <code>{error.digest}</code>
        </p>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <button type="button" className="btn" onClick={reset}>
          Try this page again
        </button>{' '}
        <Link className="btn secondary" href="/catalogue">
          Catalogue
        </Link>{' '}
        <Link className="btn ghost" href="/support">
          Ask for help
        </Link>
      </p>

      <div className="notice" style={{ marginTop: '1.5rem' }}>
        <strong>Check before you pay again.</strong> An order that did not finish
        is listed on <Link href="/orders">your orders</Link> with its real status
        — that page is the record, not this one. If you were watching a lesson,
        it resumes from where it last saved, which is at most a few seconds
        before the page broke.
      </div>
    </div>
  );
}
