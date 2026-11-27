'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { isCurrentPath } from '@/lib/nav';
import { NOBODY, staffNavLink, type SessionSummary } from '@/lib/session';

import { sessionOnce } from './session-once';

/**
 * "Admin" in the main navigation, for the people the console opens for.
 *
 * It draws nothing until the masthead's one question has been answered, and
 * nothing at all for anybody who is not staff, so the page a stranger is sent
 * is the page it always was. Why it exists is on `staffNavLink()`.
 *
 * `lang="en"` because the word is English in every header, as the console is.
 */
export function StaffNavLink() {
  const [session, setSession] = useState<SessionSummary>(NOBODY);
  const pathname = usePathname();

  useEffect(() => {
    let here = true;
    void sessionOnce().then((answer) => {
      if (here && answer.signedIn) setSession(answer);
    });
    return () => {
      here = false;
    };
  }, []);

  const link = staffNavLink(session);
  if (!link) return null;

  return (
    <Link
      href={link.href}
      lang="en"
      dir="ltr"
      aria-current={isCurrentPath(pathname, link.href) ? 'page' : undefined}
    >
      {link.label}
    </Link>
  );
}
