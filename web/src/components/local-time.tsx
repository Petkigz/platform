'use client';

import { useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/i18n/format';

/**
 * A moment in the reader's own time zone.
 *
 * The server does not know where the reader is, so it prints the moment in
 * UTC and says "UTC". Once the page is running in a browser this replaces it
 * with the same moment on the reader's clock, with their zone named. Both are
 * true; the second is the one a person can act on.
 *
 * The first paint in the browser is the server's text on purpose: a component
 * that printed local time straight away would disagree with the HTML it was
 * given, which React reports as an error and repairs by drawing the page
 * again. `new Date(x).toLocaleString()` in a client component does exactly
 * that, and on a server page it prints UTC without saying so.
 */
export function LocalTime({ iso, locale }: { iso: string; locale: string }) {
  const [text, setText] = useState(() => formatDateTime(locale, iso, 'UTC'));
  useEffect(() => {
    setText(formatDateTime(locale, iso));
  }, [iso, locale]);
  // A server and a browser can spell the same UTC moment differently ("UTC"
  // and "GMT", or a different space before "PM"), because each has its own
  // copy of the language data. That difference is harmless and is replaced a
  // moment later anyway, so React is told not to treat it as an error.
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}
