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
 * The word is `console.nav`, read by the layout on the server and handed in,
 * because this component runs in the browser and the console's sentences
 * are not sent there. `mark` is given only when the word is not in the
 * language of the page around it (a language held for review is shown the
 * English), so that a screen reader says it in the right voice.
 */
export function StaffNavLink({
  label,
  mark,
}: {
  label: string;
  mark?: { lang: string; dir: 'ltr' | 'rtl' };
}) {
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

  const link = staffNavLink(session, label);
  if (!link) return null;

  return (
    <Link
      href={link.href}
      {...(mark ?? {})}
      aria-current={isCurrentPath(pathname, link.href) ? 'page' : undefined}
    >
      {link.label}
    </Link>
  );
}
