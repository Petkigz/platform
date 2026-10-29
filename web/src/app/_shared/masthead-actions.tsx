'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  accountLabel, mastheadActions, NOBODY, parseSession,
  type MastheadLabels, type SessionSummary,
} from '@/lib/session';

/**
 * The two buttons at the right of the masthead.
 *
 * They start signed out — which is what the server rendered, so hydration
 * agrees with the HTML — and ask `/api/session` once after mount. An answer that
 * arrives too late to apply, or a request that fails, leaves the header exactly
 * as it was: the worst outcome here is a header that is slightly stale, never
 * one that offers a signed-in learner a sign-in button again.
 */
export function MastheadActions({ labels }: { labels?: MastheadLabels } = {}) {
  const [session, setSession] = useState<SessionSummary>(NOBODY);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch('/api/session', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) return;
        setSession(parseSession(await response.json()));
      } catch {
        // Aborted or offline: keep the signed-out pair.
      }
    })();

    return () => controller.abort();
  }, []);

  return (
    <div className="masthead-actions">
      {mastheadActions(session, labels).map((action) => {
        const className = action.emphasis === 'primary' ? 'btn' : 'btn ghost';
        const label =
          action.href === '/dashboard' ? accountLabel(session, labels?.area) : action.label;

        if (action.method === 'post') {
          return (
            <form key={action.href} action={action.href} method="post" style={{ display: 'inline' }}>
              <button type="submit" className={className}>
                {action.label}
              </button>
            </form>
          );
        }

        return (
          <Link key={action.href} href={action.href} className={className}>
            {label}
          </Link>
        );
      })}
    </div>
  );
}
