import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cookies, headers } from 'next/headers';

import { A11Y_BOOT } from '@/lib/a11y';
import {
  LOCALE_COOKIE, chooseLocale, directionOf, localeByCode, messagesFor, translator,
} from '@/lib/i18n';
import { I18nProvider } from '@/lib/i18n/client';
import Link from 'next/link';
import { siteOrigin } from '@/lib/site';
import { organisationJsonLd, websiteJsonLd } from '@/lib/structured-data';
import { JsonLdScript } from './_shared/json-ld';
import { BrandMark } from './_shared/brand-mark';
import { MastheadActions } from './_shared/masthead-actions';
import { NavLink } from './_shared/nav-link';
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

/**
 * The card a chat client shows, in the language the page is in.
 *
 * `og:locale` was fixed at `'en'` while everything around it was translated. A
 * link shared into an Arabic group would preview in English — the one piece of
 * the page whose language a reader cannot change after the fact.
 */
export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const hdrs = await headers();
  const { code } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const t = translator(code);

  return {
    ...baseMetadata,
    openGraph: { ...baseMetadata.openGraph, locale: code, description: t('footer.tagline') },
    description: t('footer.tagline'),
  };
}

const baseMetadata: Metadata = {
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
    // Overridden by `generateMetadata`, which knows the reader's language. This
    // is the value a crawler sees, and English is what a crawler is asking for.
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

/**
 * The language of the interface, decided here rather than on each page.
 *
 * (The masthead stays auth-agnostic — `MastheadActions` asks `/api/session` after
 * mount — so this layout never needs the session itself.)
 *
 * `chooseLocale` reads the cookie a person set, then `Accept-Language`, then
 * English — and the answer sets `lang` and `dir` on the document, which is the
 * whole of what a screen reader and a bidi algorithm need. That is also why every
 * page now renders per request: the alternative is to send English and swap it in
 * the browser, which shows the wrong language to exactly the reader this exists
 * for.
 *
 * Nothing here translates a course. A teacher's title stays in its author's
 * language, with the `lang`/`dir` handling in `lib/arabic.ts` — the interface and
 * the content choose their languages independently, which is the only way a
 * French reader can study an Arabic course.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const jar = await cookies();
  const hdrs = await headers();

  const { code } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });

  const t = translator(code);
  const locale = localeByCode(code);

  return (
    <html lang={code} dir={directionOf(code)}>
      <body>
        {/*
          Reading preferences are applied before the first paint. The script is
          tiny, inline and reads one cookie; a person who needs larger text must
          never see a flash of the small one. It sets the same attributes the
          account page writes, from the same list — see lib/a11y.ts.
        */}
        <script dangerouslySetInnerHTML={{ __html: A11Y_BOOT }} />
        <a href="#main" className="sr-only" style={srOnly}>{t('skip.toContent')}</a>

        <header className="masthead">
          <div className="container masthead-inner">
            <Link href="/" className="brand">
              <BrandMark className="mark" />
              AyahSpring
            </Link>

            <nav className="nav" aria-label={t('nav.main')}>
              <NavLink href="/catalogue">{t('nav.catalogue')}</NavLink>
              <NavLink href="/learn">{t('nav.learn')}</NavLink>
              <NavLink href="/family">{t('nav.family')}</NavLink>
              <NavLink href="/plans">{t('nav.plans')}</NavLink>
              <NavLink href="/subscriptions">{t('nav.subscriptions')}</NavLink>
              <NavLink href="/teach">{t('nav.teach')}</NavLink>
              <NavLink href="/review">{t('nav.review')}</NavLink>
              <NavLink href="/certificates">{t('nav.certificates')}</NavLink>
            </nav>

            {/* Auth-agnostic on the server, refined after hydration: see
                `_shared/masthead-actions.tsx`. */}
            <MastheadActions
              labels={{
                signIn: t('action.signIn'),
                getStarted: t('action.getStarted'),
                signOut: t('action.signOut'),
                area: t('footer.area'),
              }}
            />
          </div>
        </header>

        {/* The one catalogue the reader needs, handed to every client
            component below: a form is in the same language as the page that
            opened it, and no other language is shipped to their browser. */}
        <main id="main">
          <I18nProvider locale={code} messages={messagesFor(code)}>
            {children}
          </I18nProvider>
        </main>

        <footer>
          <div className="container">
            <span>{t('footer.rights', { year: new Date().getFullYear() })}</span>
            <span>{t('footer.tagline')}</span>
            {/* Help lives in the footer rather than the masthead: the nav is
                already eight links wide on a phone, and nobody looks for
                support in the primary navigation until they need it. */}
            <Link href="/about">{t('footer.about')}</Link>
            {/* The terms belong where a person looks for them, not only on the
                screen they are forced to open. It is public and it is short. */}
            <Link href="/policies">{t('footer.terms')}</Link>
            <Link href="/support">{t('footer.help')}</Link>
            {/* The one door a stranger needs: an employer or a school holding a
                printed certificate has a number and nothing else, and there is
                no account for them to sign into. It sits in the footer because
                the people who need it are not the people browsing a catalogue. */}
            <Link href="/verify">{t('footer.verify')}</Link>
            {/* The way back to your own area once you are signed in. It is a
                redirect rather than a page, so it costs nothing to link from a
                static footer. */}
            <Link href="/dashboard">{t('footer.area')}</Link>
            {/* Messages are in-app only while no delivery provider exists, so
                the way in sits beside the way to your area rather than in the
                masthead, which is deliberately auth-agnostic. */}
            <Link href="/notifications">{t('footer.notifications')}</Link>
            {/* The language sits in the footer rather than the masthead: it is
                changed once, by the few people the device guessed wrong for, and
                the nav is already eight links wide on a phone. It is public, so
                somebody who cannot read the page can fix that before signing up. */}
            <Link href="/language" lang={code} dir={locale.dir}>
              {t('language.title')}
            </Link>
          </div>
        </footer>

      {/* The platform, named, and the site it lives on. Two separate nodes
          because they answer two different questions: what this is, and where
          it is. `origin` is null on an unconfigured deployment, and both graphs
          then omit their URL rather than invent one. */}
      <JsonLdScript data={organisationJsonLd(origin)} />
      <JsonLdScript data={websiteJsonLd(origin)} />

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
