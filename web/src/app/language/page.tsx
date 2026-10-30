import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import Link from 'next/link';

import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { createClient } from '@/lib/supabase/server';
import { coverageOfReviews, parsePublished, type PublishedReview } from '@/lib/translations';

import {
  LOCALE_COOKIE,
  chooseLocale,
  coverageOf,
  formatNumber,
  localeByCode,
  localeGroups,
  regionLabel,
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
  const groups = localeGroups();
  // Nothing is listed until it is worth listing: with every catalogue complete
  // the list would be thirty-three rows of "100%", which trains a reader to skim
  // the one number on this page that matters. The day a string is added to the
  // English catalogue and not translated, its language appears here.
  const incomplete = locales
    .map((locale) => ({ locale, coverage: coverageOf(locale.code) }))
    .filter((entry) => entry.coverage.percent < 100);

  // **Who has read this, if anybody.** Read from the database rather than from a
  // flag in the register, because a review is a fact with a date and a person
  // attached rather than a boolean somebody edits. Three failure modes all end in
  // the same place, deliberately: a database that is not configured, one that
  // cannot be reached, and one that has no published reviews all mean **nobody
  // has read this**, which is the conservative claim and the true one today.
  let published = new Map<string, PublishedReview[]>();
  // Whether the correction sheet is open. Read here, not only on the sheet,
  // because a link to a closed door is a promise this page cannot keep: with the
  // switch off the sentence stays a sentence, and the reader is not sent to a
  // form that will refuse them.
  let sheetOpen = false;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const [{ data }, open] = await Promise.all([
        supabase.rpc('published_locale_reviews'),
        isFlagEnabled(supabase, 'platform.translation_reviews').catch(() => false),
      ]);
      published = parsePublished(data);
      sheetOpen = open;
    } catch {
      published = new Map();
      sheetOpen = false;
    }
  }
  const reviewers = published.get(code) ?? [];
  // Added up from the parts, not from the number of rows: three published reads of
  // three parts is progress, and it is not yet the sentence below. The register's
  // own `reviewed` flag is the other way a language can be called read, and it is
  // true for English alone.
  const parts = coverageOfReviews(reviewers);
  const readBy = parts.complete || current.reviewed;

  const claim = readBy
    ? t('language.reviewed')
    : parts.read > 0
      ? // Partly read is a different sentence, not a shorter one. Saying
        // "nobody has read this" over three named parts would be as wrong as
        // claiming the whole thing.
        t('language.partial', {
          read: formatNumber(code, parts.read),
          total: formatNumber(code, parts.total),
        })
      : t('language.unreviewed');

  // **The door.** The page states a problem — nobody who speaks this language has
  // read it — and until now it offered no way to do anything about it. The whole
  // sentence is the link, because the sentence is the invitation: the last of its
  // clauses is "if a word looks wrong to you, that is a mistake we owe you", and
  // a reader who agrees with that should not have to hunt for a form.
  //
  // Three reasons it is not always a link: the sheet has to be open (a link to a
  // closed door is a lie), English is what a translation is checked *against* so
  // there is nothing to correct, and a language somebody has read needs no
  // invitation. No new string is introduced: the link text is the sentence that
  // was already in all fifty-one catalogues.
  const invite = !readBy && sheetOpen && code !== 'en';

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
        {/* The honest half. "Translated" and "read by somebody who speaks it" are
            two different claims, and only the first is true for almost all of
            this list — so the page makes the second claim itself, per language,
            from the register rather than from a sentence typed once and forgotten. */}
        <p style={{ margin: '0 0 0.4rem', fontSize: '0.9rem' }}>
          {invite ? (
            <Link href={`/contribute?locale=${code}`} style={{ textDecoration: 'underline' }}>
              {claim}
            </Link>
          ) : (
            claim
          )}
        </p>
        {/* The attribution is a name and a date, not a sentence.
            The sentence above is already translated into all fifty-one
            catalogues; a second sentence carrying the name would have needed
            fifty-one more unreviewed translations to say the same thing, and a
            name and a date are values — like an age band, or a page number. */}
        {reviewers.length > 0 && (
          <ul style={{ margin: '0 0 0.4rem', paddingInlineStart: '0', listStyle: 'none', fontSize: '0.88rem' }}>
            {reviewers.map((review) => (
              <li key={`${review.reviewerName}-${review.publishedAt}`}>
                <strong>{review.reviewerName}</strong>
                {' · '}
                <time dateTime={review.publishedAt}>{review.publishedAt.slice(0, 10)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>{t('language.change')}</h2>
        <p className="muted" style={{ marginTop: 0 }}>{t('language.pick')}</p>
        <form action="/api/locale" method="post">
          <input type="hidden" name="next" value="/language" />
          <div className="locale-blocks">
            {/* Not a language, and first: it hands the decision back to the
                device, which is where it starts for everybody. */}
            <div className="locale-block">
              <div className="locale-choices">
                <button
                  type="submit"
                  name="locale"
                  value="device"
                  className="locale-choice"
                  aria-current={source === 'device' ? 'true' : undefined}
                >
                  {t('language.deviceOption')}
                </button>
                {/* English outside the blocks: it is the source of every string
                    on this page and the language a reader falls back to. */}
                <button
                  type="submit"
                  name="locale"
                  value="en"
                  className="locale-choice"
                  aria-current={code === 'en' ? 'true' : undefined}
                >
                  <span className="locale-choice-name" lang="en" dir="ltr">
                    English
                  </span>
                </button>
              </div>
            </div>

            {groups.map((group) => (
              <div className="locale-block" key={group.region}>
                <h3 className="locale-block-title">{t(regionLabel(group.region))}</h3>
                <div className="locale-choices">
                  {group.locales.map((locale) => (
                    <button
                      type="submit"
                      name="locale"
                      value={locale.code}
                      className="locale-choice"
                      key={locale.code}
                      aria-current={code === locale.code ? 'true' : undefined}
                    >
                      <span className="locale-choice-name" lang={locale.code} dir={locale.dir}>
                        {locale.nativeName}
                      </span>
                      <span className="locale-choice-en">{locale.englishName}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
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
