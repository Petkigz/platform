import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { siteOrigin } from '@/lib/site';
import { BrandMark } from './_shared/brand-mark';
import './globals.css';

const description =
  'Islamic learning for children and adults, worldwide. Qur\u2019an, Arabic, ' +
  'Fiqh, Hadith and more \u2014 taught by qualified teachers.';

// A share card is only useful with an absolute address in it: a crawler has no
// page to resolve `/opengraph-image` against. The origin is the same configured
// one the certificate prints (`NEXT_PUBLIC_SITE_URL`), never the Host header —
// so an unconfigured deployment emits relative URLs and looks unstyled when
// shared, rather than trusting whatever host the requester typed.
const origin = siteOrigin();

export const metadata: Metadata = {
  ...(origin ? { metadataBase: new URL(origin) } : {}),
  title: {
    default: 'AyahSpring',
    template: '%s · AyahSpring',
  },
  description,
  applicationName: 'AyahSpring',
  openGraph: {
    type: 'website',
    siteName: 'AyahSpring',
    locale: 'en',
    title: 'AyahSpring',
    description,
    // Without a configured origin there is no absolute address to put in the
    // card, and a card that points at `localhost` is worse than no card: a chat
    // client that cannot fetch it shows a broken box. The build warns, which is
    // the reminder to set NEXT_PUBLIC_SITE_URL — the same variable the printed
    // certificate needs.
    ...(origin ? {} : { images: [] }),
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AyahSpring',
    description,
    ...(origin ? {} : { images: [] }),
  },
};

// The masthead is deliberately auth-agnostic so pages stay statically
// renderable. Anything that needs the session reads it in the page.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only" style={srOnly}>Skip to content</a>

        <header className="masthead">
          <div className="container masthead-inner">
            <Link href="/" className="brand">
              <BrandMark className="mark" />
              AyahSpring
            </Link>

            <nav className="nav" aria-label="Main">
              <Link href="/catalogue">Catalogue</Link>
              <Link href="/learn">My learning</Link>
              <Link href="/family">My family</Link>
              <Link href="/plans">Plans</Link>
              <Link href="/subscriptions">Subscriptions</Link>
              <Link href="/teach">Teach</Link>
              <Link href="/review">Review</Link>
              <Link href="/certificates">Certificates</Link>
            </nav>

            <div className="masthead-actions">
              <Link href="/sign-in" className="btn ghost">Sign in</Link>
              <Link href="/sign-up" className="btn">Get started</Link>
            </div>
          </div>
        </header>

        <main id="main">{children}</main>

        <footer>
          <div className="container">
            <span>© {new Date().getFullYear()} AyahSpring</span>
            <span>Islamic learning for children and adults, worldwide.</span>
            {/* Help lives in the footer rather than the masthead: the nav is
                already eight links wide on a phone, and nobody looks for
                support in the primary navigation until they need it. */}
            <Link href="/about">About</Link>
            <Link href="/support">Help</Link>
            {/* The one door a stranger needs: an employer or a school holding a
                printed certificate has a number and nothing else, and there is
                no account for them to sign into. It sits in the footer because
                the people who need it are not the people browsing a catalogue. */}
            <Link href="/verify">Check a certificate</Link>
            {/* The way back to your own area once you are signed in. It is a
                redirect rather than a page, so it costs nothing to link from a
                static footer. */}
            <Link href="/dashboard">Your area</Link>
            {/* Messages are in-app only while no delivery provider exists, so
                the way in sits beside the way to your area rather than in the
                masthead, which is deliberately auth-agnostic. */}
            <Link href="/notifications">Notifications</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}

const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};
