import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import Link from 'next/link';
import { LOCALE_COOKIE, chooseLocale, languageShownFor, translator } from '@/lib/i18n';

/**
 * The language this page is written in for this reader.
 *
 * Twenty-seven languages have it (`missing.ts`); the rest read it in English,
 * whole, under one `lang`, like every screen written since the owner's
 * decision of 2026-11-16.
 */
async function reading() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'missing');
  return { locale, shown, t: translator(shown.code) };
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await reading();
  return { title: t('missing.title') };
}

/**
 * The 404.
 *
 * Two different people arrive here. One mistyped a link; one followed a course
 * that has been retired, or a lesson from a version that is no longer current.
 * The page says both out loud instead of "page not found", because the second
 * person has not made a mistake and telling them they have is how a platform
 * loses their trust at the exact moment they were looking for something they
 * paid for.
 *
 * The catalogue is the first way out, not the home page: somebody who was
 * reading a course wants another course, not a marketing hero.
 *
 * **In the reader's language.** It was English for everybody, which is the
 * wrong moment for it: a reader who follows an Arabic menu to a withdrawn
 * course was told so in a language they may not read. The name of the learning
 * page inside the long sentence is the navigation's own word, so it is the
 * word they have already seen in the menu.
 *
 * **It is sent with every page**, as the thing to show if that page turns out
 * not to exist, so what it reads here is what the layout has already read.
 */
export default async function NotFound() {
  const { locale, shown, t } = await reading();
  // English inside another language's frame says that it is English.
  const wrapper = shown.code === locale ? {} : ({ lang: shown.code, dir: shown.dir } as const);
  // The sentence names the learning page where its grammar wants it.
  const [before = '', after = ''] = t('missing.lede').split('{learn}');

  return (
    <div className="container section" {...wrapper}>
      <p className="eyebrow">
        <bdi>404</bdi>
      </p>
      <h1>{t('missing.heading')}</h1>
      <p className="lede">
        {before}
        <Link href="/learn">{t('nav.learn')}</Link>
        {after}
      </p>

      <div className="page-actions">
        <Link className="btn" href="/catalogue">
          {t('home.browse')}
        </Link>
        <Link className="btn secondary" href="/">
          {t('missing.home')}
        </Link>
        <Link className="btn ghost" href="/support">
          {t('missing.help')}
        </Link>
      </div>

      <p className="muted" style={{ marginTop: '2rem' }}>
        {t('missing.fault')} <Link href="/support">{t('missing.tell')}</Link>
      </p>
    </div>
  );
}
