import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'AyahSpring',
    template: '%s · AyahSpring',
  },
  description:
    'Islamic learning for children and adults, worldwide. Qur\u2019an, Arabic, ' +
    'Fiqh, Hadith and more \u2014 taught by qualified teachers.',
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
              <span className="mark" aria-hidden="true" />
              AyahSpring
            </Link>

            <nav className="nav" aria-label="Main">
              <Link href="/catalogue">Catalogue</Link>
              <Link href="/learn">My learning</Link>
              <Link href="/family">My family</Link>
              <Link href="/teach">Teach</Link>
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
