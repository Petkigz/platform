'use client';

import { useEffect } from 'react';

import { AGREED_EVENT, SIGNUP_KEY, readSignupAgreement } from '@/lib/policy-notice';
import { sessionOnce } from './session-once';

/**
 * Records what was ticked on the sign-up page, once there is an account to
 * record it against. It draws nothing.
 *
 * The box on the sign-up page keeps the documents and the versions it named
 * on this device (`SIGNUP_KEY`), because at that moment nobody is signed in
 * and `accept_policy()` needs an account. This is under every page, so the
 * first one opened signed in records them through the policies route, one
 * request for each document.
 *
 * Signed out, nothing is asked and what is kept stays kept for the hour it
 * lasts. Signed in, it ends whatever the answer: recorded, or refused because
 * the document was replaced since. In that case nothing is recorded, and the
 * account page asks for the version now in force. A request that could not be
 * made is tried again on the next page.
 */
export function SignupAgreement() {
  useEffect(() => {
    void record();
  }, []);
  return null;
}

function kept(): string | null {
  try {
    return window.localStorage.getItem(SIGNUP_KEY);
  } catch {
    return null;
  }
}
function forget(): void {
  try {
    window.localStorage.removeItem(SIGNUP_KEY);
  } catch {
    // Nothing was kept in the first place.
  }
}

async function record(): Promise<void> {
  const raw = kept();
  if (raw === null) return;
  const items = readSignupAgreement(raw, Date.now());
  if (items === null) {
    // Not readable, or too old to be anybody's agreement: it is not kept on.
    forget();
    return;
  }
  const session = await sessionOnce();
  if (!session.signedIn) return;

  for (const item of items) {
    let res: Response;
    try {
      res = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: item.slug, version: item.version }),
      });
    } catch {
      return;
    }
    // The session ended between the two questions: kept, for the hour.
    if (res.status === 401) return;
    if (res.ok) window.dispatchEvent(new CustomEvent(AGREED_EVENT, { detail: item.slug }));
  }
  forget();
}
