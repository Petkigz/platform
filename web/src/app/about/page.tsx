import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';

import { Say } from '@/components/say';
import {
  LOCALE_COOKIE, chooseLocale, formatNumber, languageShownFor, translatedLocales, translator, withheldLocales,
} from '@/lib/i18n';
import { languageName } from '@/lib/i18n/language-name';
import { HELD_FOR_REVIEW, WHOLE_LANGUAGE } from '@/lib/i18n/messages/held';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'about') };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  const t = translator(shown.code);
  return { title: t('footer.about'), description: t('about.description') };
}

/**
 * About the platform — screen 2.
 *
 * The landing page says what you can study. This page answers the question a
 * parent asks before trusting a site with a child: *who decides what is
 * taught here, and what happens to my child's data?*
 *
 * **It describes rules, not switches.** The page reads no database, no flag and
 * no session, which is why it renders on a deployment where the catalogue is
 * still empty — the state a first visitor could otherwise mistake for a broken
 * site. But a page that cannot see a switch must not describe one: an earlier
 * version of this page said the young learners' and adults' doors "are separate
 * pages rather than a filter on one list", which was true only while
 * `learning.audience_sections` was on.
 *
 * The rule that replaced it: **every sentence here is either enforced for
 * everybody, or written in the conditional** — "when a teacher publishes a page",
 * "where the platform allows it". Nothing on this page asserts the current state
 * of an optional surface, because nothing here can know it. If a claim cannot be
 * written that way, it does not go on the page. (It said until 2026-11-27 that a
 * child never has a login of their own. A guardian has been able to give one to
 * a child of twelve or older since 2026-11-24, behind a switch, so that sentence
 * is now two: what holds for every child, and what a guardian may do where the
 * platform allows it.)
 *
 * **In the reader's language** since 2026-11-27 (`messages/about.ts`): the
 * sentences are in the catalogue and none is written here. The numbers of
 * languages are counted from the register each time the page is drawn; they
 * were spelled out in the text, and a test had to catch them going stale.
 * There is no link inside a sentence, because where a link's words sit, and in
 * what case, is not the same in every language: a link follows its paragraph.
 */
export default async function AboutPage() {
  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};
  const num = (value: number) => formatNumber(shown.code, value);

  // Counted, not written: the languages on offer, the ones written and not
  // offered, and the ones with their companion screens held back.
  const offered = translatedLocales().length;
  const whole = withheldLocales().map((held) => languageName(shown.code, held.code) ?? held.englishName);
  const partly = Object.values(HELD_FOR_REVIEW).filter((parts) => parts && !parts.includes(WHOLE_LANGUAGE)).length;
  let wholeList = whole.join(', ');
  try {
    wholeList = new Intl.ListFormat(shown.code, { style: 'long', type: 'conjunction' }).format(whole);
  } catch {
    // A runtime with no list rules for this language: the names with commas.
  }

  const HEAD = { marginTop: '2.5rem' } as const;
  // The two halves of the name are the name: Latin letters in every language.
  const half = (word: string) => (
    <strong>
      <bdi lang="en" dir="ltr">{word}</bdi>
    </strong>
  );

  return (
    <div className="page" {...frame}>
      <p className="eyebrow">{t('footer.about')}</p>
      <h1>{t('about.title')}</h1>
      <p className="lede">
        <Say text={t('about.lede')} parts={{ ayah: half('Ayah'), spring: half('Spring') }} />
      </p>

      <p className="muted" style={{ marginTop: '1rem' }}>{t('about.bar')}</p>

      <h2 style={HEAD}>{t('about.catTitle')}</h2>
      <p className="muted">{t('about.catAudience')}</p>
      <p className="muted">{t('about.catAges')}</p>

      <h2 style={HEAD}>{t('about.howTitle')}</h2>
      <ol className="stack" style={{ marginTop: '0.75rem' }}>
        <li className="card">
          <strong>{t('about.how1Lead')}</strong> <span className="muted">{t('about.how1')}</span>
        </li>
        <li className="card">
          <strong>{t('about.how2Lead')}</strong> <span className="muted">{t('about.how2')}</span>
        </li>
        <li className="card">
          <strong>{t('about.how3Lead')}</strong> <span className="muted">{t('about.how3')}</span>
        </li>
      </ol>

      <h2 style={HEAD}>{t('about.childTitle')}</h2>
      <div className="notice">{t('about.childNotice')}</div>
      <p className="muted" style={{ marginTop: '0.75rem' }}>{t('about.childLogin')}</p>
      <p className="muted">{t('about.childBand')}</p>
      <p className="muted">{t('about.childConsent')}</p>

      <h2 style={HEAD}>{t('about.langTitle')}</h2>
      <p>
        <strong>
          <Say text={t('about.langOffered')} parts={{ count: <bdi>{num(offered)}</bdi> }} />
        </strong>
      </p>
      <p>{t('about.langWritten')}</p>
      <p>{t('about.langHeld')}</p>
      <ul className="stack">
        <li>
          <Say text={t('about.langWhole')} parts={{ languages: <bdi>{wholeList}</bdi> }} />
        </li>
        <li>
          <Say text={t('about.langPartly')} parts={{ count: <bdi>{num(partly)}</bdi> }} />
        </li>
      </ul>
      <p>{t('about.langFix')}</p>
      <p>
        <Link href="/contribute">{t('about.langSheet')}</Link>
      </p>

      <h2 style={HEAD}>{t('about.teachTitle')}</h2>
      <p className="muted">{t('about.teachAppoint')}</p>
      <p className="muted">{t('about.teachAsk')}</p>
      <p>
        <Link href="/teach/apply">{t('account.teachLink')}</Link>
      </p>
      <p className="muted">{t('about.teachPage')}</p>

      <h2 style={HEAD}>{t('about.keptTitle')}</h2>
      <p className="muted">{t('about.keptProgress')}</p>
      <p className="muted">{t('about.keptPayment')}</p>

      <p className="muted" style={{ marginTop: '1.75rem' }}>{t('about.cost')}</p>

      <p style={{ marginTop: '1.5rem' }}>
        <Link className="btn" href="/catalogue">
          {t('home.browse')}
        </Link>{' '}
        <Link className="btn secondary" href="/verify">
          {t('footer.verify')}
        </Link>{' '}
        <Link className="btn secondary" href="/sign-up">
          {t('home.createAccount')}
        </Link>
      </p>
    </div>
  );
}
