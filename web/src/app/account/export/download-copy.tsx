'use client';

import { useState, type MouseEvent } from 'react';
import { exportOutcomeOf, type ExportCode } from '@/lib/export-outcome';

/** The words a download button says, in the language of the page that draws it. */
export type CopyWords = {
  preparing: string;
  done: string;
  /** The request could not be made at all. */
  unreachable: string;
  reasons: Record<ExportCode, string>;
};

type Said = { tone: 'status' | 'alert'; text: string };

/** The name the server gave the file, or the one the link would have had. */
function fileNameOf(header: string | null, fallback: string): string {
  return /filename="([^"]+)"/u.exec(header ?? '')?.[1] ?? fallback;
}

/**
 * A button that asks for a copy and says what happened.
 *
 * It is still a link to the file, so it works with no script at all. With
 * script it asks for the file itself, because a link cannot tell a refusal
 * from a file: the eleventh press in an hour used to replace the page with a
 * line of JSON. Now a refusal is said under the button, in the reader's
 * language, and the page stays where it is.
 *
 * The message is a sibling of the link, pushed to a line of its own
 * (`order` and `flex-basis`) when the links sit in a row.
 *
 * It has no words of its own: the page hands them over.
 */
export function DownloadCopy({
  href,
  fallbackName,
  className,
  label,
  words,
}: {
  href: string;
  /** Used only if the reply names no file. */
  fallbackName: string;
  className: string;
  label: string;
  words: CopyWords;
}) {
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);

  async function ask(event: MouseEvent<HTMLAnchorElement>) {
    // A press that asks for a new tab or a saved link is the browser's.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setSaid({ tone: 'status', text: words.preparing });
    try {
      const res = await fetch(href, { cache: 'no-store' });
      const disposition = res.headers.get('content-disposition');
      if (res.ok && disposition?.startsWith('attachment')) {
        const url = URL.createObjectURL(await res.blob());
        const link = document.createElement('a');
        link.href = url;
        link.download = fileNameOf(disposition, fallbackName);
        document.body.append(link);
        link.click();
        link.remove();
        // The browser reads the address after the click returns.
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        setSaid({ tone: 'status', text: words.done });
      } else {
        const json = (await res.json().catch(() => null)) as { code?: unknown } | null;
        setSaid({ tone: 'alert', text: words.reasons[exportOutcomeOf(res.status, json?.code)] });
      }
    } catch {
      setSaid({ tone: 'alert', text: words.unreachable });
    }
    setBusy(false);
  }

  return (
    <>
      <a className={className} href={href} download onClick={ask} aria-disabled={busy || undefined}>
        {label}
      </a>
      {said && (
        <p
          className={said.tone === 'alert' ? 'notice error' : 'muted'}
          role={said.tone}
          style={{ order: 9, flexBasis: '100%', margin: '0.5rem 0 0', fontSize: '0.9rem' }}
        >
          {said.text}
        </p>
      )}
    </>
  );
}
