'use client';

import { useEffect, useState } from 'react';

export type CopyWords = {
  copyLink: string;
  linkCopied: string;
  copyMessage: string;
  messageCopied: string;
  refused: string;
};

/**
 * The invitation link and the two buttons that copy it.
 *
 * Everything else on the page is drawn on the server; this is the one part
 * that needs the browser, because only the browser has a clipboard. It is
 * handed its words, the path of the link and a message with a gap where the
 * link goes, and knows nothing else.
 *
 * **The address.** The server builds the link from `NEXT_PUBLIC_SITE_URL` and
 * never from the Host header of a request. Where that is unset the link used
 * to be copied as a bare path, which nobody can open. The browser knows which
 * site it is looking at, so the gap is filled from its own address bar once
 * the page is running there.
 *
 * **A clipboard that says no.** A browser that will not lend its clipboard
 * used to leave the button looking as if nothing had been pressed. It now
 * says so, and that the link is written out to select by hand.
 */
export function ReferralsPanel({
  origin,
  path,
  message,
  words,
}: {
  origin: string;
  path: string;
  /** The message to paste, with `{link}` where the link goes; none when the code's worth is unknown. */
  message: string | null;
  words: CopyWords;
}) {
  const [base, setBase] = useState(origin);
  const [said, setSaid] = useState<'link' | 'message' | 'refused' | null>(null);

  useEffect(() => {
    if (origin === '') setBase(window.location.origin);
  }, [origin]);

  const link = `${base.replace(/\/+$/u, '')}${path}`;

  async function copy(what: 'link' | 'message') {
    const value = what === 'link' ? link : (message ?? '').split('{link}').join(link);
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setSaid(what);
    } catch {
      setSaid('refused');
    }
  }

  return (
    <>
      <div className="page-actions" style={{ marginTop: '0.75rem' }}>
        <button type="button" className="btn" onClick={() => copy('link')}>
          {words.copyLink}
        </button>
        {message !== null && (
          <button type="button" className="btn secondary" onClick={() => copy('message')}>
            {words.copyMessage}
          </button>
        )}
      </div>
      <p className="meta" role="status" style={{ marginTop: '0.5rem', minHeight: '1.5em' }}>
        {said === 'link' && words.linkCopied}
        {said === 'message' && words.messageCopied}
        {said === 'refused' && words.refused}
      </p>
      <p className="muted" dir="ltr" data-referral-link style={{ overflowWrap: 'anywhere', textAlign: 'start' }}>
        {link}
      </p>
    </>
  );
}
