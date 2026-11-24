'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  accountLabel, mastheadActions, NOBODY,
  type MastheadLabels, type SessionSummary,
} from '@/lib/session';

import { sessionOnce } from './session-once';

/**
 * The two buttons at the right of the masthead.
 *
 * They start signed out — which is what the server rendered, so hydration
 * agrees with the HTML — and ask `/api/session` once after mount
 * (`sessionOnce`, which the notice about changed documents shares). An answer that
 * arrives too late to apply, or a request that fails, leaves the header exactly
 * as it was: the worst outcome here is a header that is slightly stale, never
 * one that offers a signed-in learner a sign-in button again.
 */
export function MastheadActions({ labels }: { labels?: MastheadLabels } = {}) {
  const [session, setSession] = useState<SessionSummary>(NOBODY);

  useEffect(() => {
    let here = true;
    // The same answer the notice about changed documents waits for.
    void sessionOnce().then((answer) => {
      if (here && answer.signedIn) setSession(answer);
    });
    return () => {
      here = false;
    };
  }, []);

  return (
    <div className="masthead-actions">
      {mastheadActions(session, labels).map((action) => {
        const className = action.emphasis === 'primary' ? 'btn' : 'btn ghost';
        // Who is signed in goes in the accessible name only. The button keeps
        // its own short words, so the header fits a phone in every language.
        const name =
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
          <Link
            key={action.href}
            href={action.href}
            className={className}
            aria-label={name === action.label ? undefined : name}
          >
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}
