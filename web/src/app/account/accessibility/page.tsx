import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';

import { SaidList } from '@/app/family/said-list';
import { Say } from '@/components/say';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { A11Y_COOKIE, parsePreferences } from '@/lib/a11y';
import { LOCALE_COOKIE, chooseLocale, languageShownFor, translator } from '@/lib/i18n';
import { formatNumber } from '@/lib/i18n/format';
import { DEFAULT_LOCALE, LOCALES, isOfferedLocale } from '@/lib/i18n/locales';
import { ReadingPreferences, type ReadingWords } from './preferences';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'reading');
  return { locale, shown };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('reading.title') };
}

/** Whether somebody is signed in. Never a reason to turn a reader away from this page. */
async function signedIn(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}

/**
 * Reading settings.
 *
 * One page with three settings and no save button. It exists because the
 * platform is for young children and adults worldwide, and "readable" is not one
 * size: a five-year-old on a tablet, a grandmother on an old phone in bright
 * light, and somebody who has asked their operating system for less motion all
 * get the same pages today.
 *
 * **Open to everybody.** The settings are a cookie on this browser and have
 * nothing to do with an account, and the page used to send a signed-out reader
 * to sign in: somebody who needed larger text to read the sign-in form could
 * not get it. Being signed in changes only the way back.
 *
 * **Every sentence is one somebody can check.** It used to say that every
 * input has a label and that no control is reachable only by a mouse, which
 * nobody had measured, and that thirty-three languages were "all complete",
 * which was false. It now says what is built, what an automatic test
 * measures, and what nobody has tested. The number of languages and the list
 * of right-to-left ones are counted from the register when the page is drawn,
 * so neither can go stale.
 *
 * What this page does not pretend: it does not change the language, and it is
 * stored per browser rather than per account; each of those is said here
 * rather than left to be discovered.
 *
 * **The second half, 2026-11-27** (`messages/ease.ts`). A fourth setting, the
 * shape of the letters: OpenDyslexic, under the SIL Open Font License, for
 * Latin and Cyrillic text only, offered as a choice and not as a remedy. And
 * the page now says that a lesson can be read aloud by the device's own
 * voice, where it used to say that nothing reads a lesson aloud.
 */
export default async function AccessibilityPage() {
  const jar = await cookies();
  const prefs = parsePreferences(jar.get(A11Y_COOKIE)?.value ?? null);
  const member = await signedIn();

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const words: ReadingWords = {
    now: t('reading.now'),
    saved: t('reading.saved'),
    notKept: t('reading.notKept'),
    reset: t('reading.reset'),
    text: {
      legend: t('reading.textLegend'),
      choices: {
        normal: { label: t('reading.textNormal'), note: t('reading.textNormalNote') },
        large: { label: t('reading.textLarge'), note: t('reading.textLargeNote') },
        larger: { label: t('reading.textLargest'), note: t('reading.textLargestNote') },
      },
    },
    contrast: {
      legend: t('reading.contrastLegend'),
      choices: {
        normal: { label: t('reading.contrastNormal'), note: t('reading.contrastNormalNote') },
        high: { label: t('reading.contrastHigh'), note: t('reading.contrastHighNote') },
      },
    },
    motion: {
      legend: t('reading.motionLegend'),
      choices: {
        system: { label: t('reading.motionSystem'), note: t('reading.motionSystemNote') },
        reduce: { label: t('reading.motionReduce'), note: t('reading.motionReduceNote') },
      },
    },
    letters: {
      legend: t('ease.lettersLegend'),
      choices: {
        normal: { label: t('ease.lettersNormal'), note: t('ease.lettersNormalNote') },
        dyslexic: { label: t('ease.lettersDyslexic'), note: t('ease.lettersDyslexicNote') },
      },
    },
  };

  // Counted from the register, not typed: a language a reader can choose,
  // English aside. A withheld language is in the register and in no picker.
  const offered = LOCALES.filter((entry) => entry.code !== DEFAULT_LOCALE && isOfferedLocale(entry.code));
  const rightToLeft = offered.filter((entry) => entry.dir === 'rtl');

  const already = [
    ['reading.keyboard', 'reading.keyboardNote'],
    ['reading.device', 'reading.deviceNote'],
    ['reading.colours', 'reading.coloursNote'],
    ['reading.names', 'reading.namesNote'],
    ['reading.arabic', 'reading.arabicNote'],
    ['reading.mixed', 'reading.mixedNote'],
    // 2026-11-27: read by the device's own voice, from the lesson page.
    ['ease.speech', 'ease.speechNote'],
  ] as const;
  // Until 2026-11-27 this list was "no text-to-speech" and "no
  // dyslexia-friendly font". Both are built now; what is left is what nobody
  // has done, not what nobody has made.
  const missing = [['ease.untested', 'ease.untestedNote']] as const;

  return (
    <div className="page narrow" {...frame}>
      <nav className="crumbs">
        {member && (
          <>
            <Link href="/account">{t('auth.accountSettings')}</Link>
            <span aria-hidden>›</span>
          </>
        )}
        <span>{t('reading.crumb')}</span>
      </nav>

      <div className="page-head">
        <h1>{t('reading.title')}</h1>
        <p className="muted">{t('reading.lede')}</p>
      </div>

      <ReadingPreferences initial={prefs} words={words} />

      <h2 style={{ marginTop: '2rem' }}>{t('reading.trueHeading')}</h2>
      <section className="card">
        <ul className="lessons stacked">
          {already.map(([name, note]) => (
            <li key={name}>
              <strong>{t(name)}</strong>
              <div className="muted">{t(note)}</div>
            </li>
          ))}
        </ul>
      </section>

      <h2 style={{ marginTop: '2rem' }}>{t('reading.langHeading')}</h2>
      <section className="card">
        <ul className="lessons stacked">
          <li>
            <strong>{t('reading.offered')}</strong>
            <div className="muted">
              {t('reading.offeredNote', { count: formatNumber(shown.code, offered.length) })}
            </div>
          </li>
          <li>
            <strong>{t('reading.rtl')}</strong>
            <div className="muted">
              <Say
                text={t('reading.rtlNote')}
                parts={{
                  languages: (
                    <SaidList
                      code={shown.code}
                      items={rightToLeft.map((entry) => (
                        <bdi key={entry.code} lang={entry.code}>
                          {entry.nativeName}
                        </bdi>
                      ))}
                    />
                  ),
                }}
              />
            </div>
          </li>
          <li>
            <strong>{t('reading.browser')}</strong>
            <div className="muted">{t('reading.browserNote')}</div>
          </li>
          <li>
            <strong>{t('reading.unreviewed')}</strong>
            <div className="muted">{t('reading.unreviewedNote')}</div>
          </li>
        </ul>
        {/* The link is in the reader's own language even when the page around
            it is not: the name of the language page is part of the frame. */}
        <p style={{ marginBottom: 0 }} lang={locale} dir={LOCALES.find((entry) => entry.code === locale)?.dir}>
          <Link href="/language">{translator(locale)('language.title')}</Link>
        </p>
      </section>

      <h2 style={{ marginTop: '2rem' }}>{t('reading.missingHeading')}</h2>
      <section className="card">
        <ul className="lessons stacked">
          {missing.map(([name, note]) => (
            <li key={name}>
              <strong>{t(name)}</strong>
              <div className="muted">{t(note)}</div>
            </li>
          ))}
        </ul>
      </section>

      {member && (
        <div className="page-actions">
          <Link href="/account" className="btn secondary">
            {t('reading.back')}
          </Link>
        </div>
      )}
    </div>
  );
}
