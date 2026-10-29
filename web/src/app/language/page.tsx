import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';

import {
  LOCALE_COOKIE,
  chooseLocale,
  coverageOf,
  localeByCode,
  localeLabel,
  translatedLocales,
  translator,
} from '@/lib/i18n';

export const metadata: Metadata = { title: 'Language' };
export const dynamic = 'force-dynamic';

/**
 * The language the interface is shown in.
 *
 * Public, and deliberately so: the device's language decides the first render, so
 * a visitor who lands in a language they do not read must be able to fix that
 * before they have an account. This is the one settings screen that does not ask
 * anybody to sign in.
 *
 * Three things are said plainly rather than implied: this is the language of the
 * **interface**, not of the courses; the number of strings a language actually
 * translates is printed rather than called "beta"; and the choice is kept on this
 * browser, so another device asks its own device.
 */
export default async function LanguagePage() {
  const jar = await cookies();
  const hdrs = await headers();

  const { code, source } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });

  const t = translator(code);
  const current = localeByCode(code);
  const coverage = coverageOf(code);
  const locales = translatedLocales();
  // Nothing is listed until it is worth listing: with every catalogue complete
  // the list would be thirteen rows of "100%", which trains a reader to skim the
  // one number on this page that matters. The day a string is added to the
  // English catalogue and not translated, its language appears here.
  const incomplete = locales
    .map((locale) => ({ locale, coverage: coverageOf(locale.code) }))
    .filter((entry) => entry.coverage.percent < 100);

  const sourceLine =
    source === 'chosen'
      ? t('language.chosen')
      : source === 'device'
        ? t('language.device')
        : t('language.default');

  return (
    <div className="container section">
      <p className="eyebrow">{t('language.title')}</p>
      <h1>{t('language.title')}</h1>
      <p className="lede">{t('language.lede')}</p>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          {t('language.current')}
        </p>
        <p style={{ margin: '0 0 0.5rem', fontSize: '1.35rem', fontWeight: 600 }}>
          <span lang={code} dir={current.dir}>
            {current.nativeName}
          </span>
          {code !== 'en' && <span className="muted"> · {current.englishName}</span>}
        </p>
        <p className="muted" style={{ marginTop: 0 }}>
          {sourceLine}
        </p>
      </section>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <form action="/api/locale" method="post">
          <input type="hidden" name="next" value="/language" />
          <label htmlFor="locale" style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>
            {t('language.pick')}
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select
              id="locale"
              name="locale"
              defaultValue={source === 'chosen' ? code : 'device'}
              style={{ flex: '1 1 16rem' }}
            >
              {/* The first option is not a language: it hands the decision back
                  to the device, which is where it starts for everybody. */}
              <option value="device">{t('language.deviceOption')}</option>
              {locales.map((locale) => (
                <option key={locale.code} value={locale.code}>
                  {localeLabel(locale)}
                </option>
              ))}
            </select>
            <button type="submit" className="btn">
              {t('language.change')}
            </button>
          </div>
        </form>

        <p className="muted" style={{ marginBottom: 0, fontSize: '0.9rem' }}>
          {t('language.browser')}
        </p>
      </section>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <p style={{ margin: '0 0 0.5rem' }}>
          {coverage.percent === 100
            ? t('language.coverageAll')
            : t('language.coverage', {
                percent: coverage.percent,
                language: current.nativeName,
              })}
        </p>
        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          {t('language.notTranslated')}
        </p>
        {incomplete.length > 0 && (
          /* Measured from each catalogue, never estimated: a language is offered
             because its file exists, and its number is what that file holds. */
          <ul style={{ margin: '0.75rem 0 0', paddingInlineStart: '1.1rem', fontSize: '0.9rem' }}>
            {incomplete.map(({ locale, coverage: c }) => (
              <li key={locale.code}>
                <span lang={locale.code} dir={locale.dir}>{locale.nativeName}</span>
                {' — '}
                {c.percent}%
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
