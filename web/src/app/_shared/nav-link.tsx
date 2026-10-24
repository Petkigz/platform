'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { isCurrentPath } from '@/lib/nav';

/**
 * A masthead link that says whether it is the section you are in.
 *
 * `usePathname` is available during the server render too, so the `aria-current`
 * attribute is in the HTML the server sends — no flash of an unmarked nav while
 * the page hydrates. The rule for "am I in this section" lives in `lib/nav.ts`
 * because it is the part with an edge case worth testing (`/learn` must not
 * match `/learned`).
 */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const current = isCurrentPath(usePathname(), href);

  return (
    <Link href={href} aria-current={current ? 'page' : undefined}>
      {children}
    </Link>
  );
}
