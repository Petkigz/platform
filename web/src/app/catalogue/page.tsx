import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { emptyShelfMessage } from '@/lib/lesson-search';
import { fetchLessonHits } from '@/lib/lesson-search-query';
import { LessonHits } from '../_shared/lesson-hits';
import { recordEvent } from '@/lib/analytics-server';
import { createClient } from '@/lib/supabase/server';
import { countryFromHeaders } from '@/lib/geo';
import { fetchCourseCards } from '@/lib/catalogue-cards';
import { fetchCataloguePage } from '@/lib/catalogue';
import { offsetFor, pageNumber, PAGE_SIZE } from '@/lib/paging';
import { canonicalCataloguePath } from '@/lib/crawl';
import { parseLanguages, textProps } from '@/lib/language';
import { LOCALE_COOKIE, chooseLocale, translator } from '@/lib/i18n';
import { CourseShelfCard } from '../_shared/course-shelf-card';
import { ShelfPager } from '../_shared/shelf-pager';
import {
  AUDIENCE_LABEL,
  DIFFICULTY_LABEL,
  disciplines,
  displayVersion,
  fetchCatalogue,
  fetchSubjectAreas,
  languagesFor,
  subjectNames,
  type CatalogueCourse,
} from '@/lib/catalogue';

export const dynamic = 'force-dynamic';

type Search = { q?: string; subject?: string; audience?: string; lang?: string; page?: string };

/**
 * What a crawler is told about this page, and under which address.
 *
 * Two rules, and both matter more than they look.
 *
 * **A search result is a query, not a page.** `?q=anything` is an unbounded set
 * of addresses a crawler can generate for itself, each with a thin, different
 * list on it. Those are not indexed; the links inside them are still followed,
 * so a course reached through a search is still discoverable.
 *
 * **A filtered shelf is a page.** `?subject=quran` is a real, useful landing
 * page and stays indexable — but under a canonical address that keeps only the
 * parameters that change the shelf. `?subject=quran&utm_source=whatsapp` and
 * `?subject=quran` are the same shelf, and one of them is what the index
 * should hold. `page=1` is the plain catalogue, because `pageHref()` already
 * refuses to write it.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<Metadata> {
  const { q, subject, audience, lang, page } = await searchParams;
  const searching = typeof q === 'string' && q.trim().length > 0;

  return {
    title: searching ? `Search: ${q.trim().slice(0, 60)}` : 'Catalogue',
    alternates: { canonical: canonicalCataloguePath({ q, subject, audience, lang, page }) },
    ...(searching ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { q, subject, audience, lang, page: pageParam } = await searchParams;
  const searching = typeof q === 'string' && q.trim().length > 0;
  const supabase = await createClient();

  // The shelf is read in the language the reader is reading the site in. The
  // courses themselves are not — a title, a description and a teacher's name
  // stay exactly as their author wrote them, which is the whole point of the
  // `lang`/`dir` handling inside the card.
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const t = translator(locale);

  // The page number is a request, not a fact: a stale link or a hand-typed
  // address is clamped here, and the offset sent to the database is always a
  // whole page.
  const page = pageNumber(pageParam);

  const [subjects, shelf, doors, languageChips, languageOn] = await Promise.all([
    fetchSubjectAreas(supabase),
    fetchCataloguePage(supabase, { q, subject, audience, language: lang }, {
      limit: PAGE_SIZE,
      offset: offsetFor(page),
    }),
    // The two doors, once the owner opens them. A door nobody can see is not a
    // door, and the catalogue is where everybody arrives first.
    isFlagEnabled(supabase, 'learning.audience_sections').catch(() => false),
    // The languages somebody has actually written in, not the whole register:
    // a row of chips where eleven return an empty shelf makes the site look
    // empty. `course_languages()` already applies that rule.
    supabase.rpc('course_languages').then(({ data }) => parseLanguages(data), () => []),
    isFlagEnabled(supabase, 'learning.multi_language').catch(() => false),
  ]);

  // A course is only shelf-ready if it has a published version. RLS may show
  // us a version an author can see in draft; the catalogue must not. The
  // database already excludes those now, so this is a belt on a belt — it costs
  // one filter and it keeps the guarantee local to the page that renders the
  // cards.
  const visible = shelf.courses.filter((c) => displayVersion(c) !== null);
  const tops = disciplines(subjects);

  // One call for the whole shelf: what each course contains and what it would
  // cost this visitor. The country is a display hint — the database prefers the
  // account's recorded country when there is one.
  const cards = await fetchCourseCards(
    supabase,
    visible.map((c) => c.id),
    countryFromHeaders(hdrs),
  );

  // Lessons that match, when the flag is on. A second list rather than a second
  // search: `search_lessons()` matches the lesson's own words, and who may see
  // which words is decided inside it.
  const lessonSearchOn = searching
    ? await isFlagEnabled(supabase, 'learning.lesson_search').catch(() => false)
    : false;
  const lessonHits = lessonSearchOn ? await fetchLessonHits(supabase, q ?? '') : [];

  // What people look for is the whole point of search analytics, and the query
  // is already in hand here. A signed-out search records nothing.
  if (q && q.trim()) {
    await recordEvent(supabase, 'search.performed', {
      properties: { query: q.trim().slice(0, 200), results: visible.length },
    });
  }

  // A chip is a filter change, so it always returns to the first page: staying
  // on page four of a different subject would show nothing and look broken.
  const qs = (over: Partial<Search>): string => {
    const p = new URLSearchParams();
    const merged = { q, subject, audience, lang, ...over, page: undefined };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== 'all') p.set(k, v);
    }
    const text = p.toString();
    return text ? `/catalogue?${text}` : '/catalogue';
  };

  return (
    <div className="container section">
      <p className="eyebrow">{t('nav.catalogue')}</p>
      <h1>{t('catalogue.title')}</h1>
      <p className="lede">{t('catalogue.lede')}</p>

      {doors && (
        <div className="row" style={{ gap: '0.4rem', flexWrap: 'wrap', margin: '1rem 0' }}>
          <Link className="badge" href="/young" style={{ padding: '0.35rem 0.7rem' }}>
            {t('catalogue.doorChild')}
          </Link>
          <Link className="badge" href="/adults" style={{ padding: '0.35rem 0.7rem' }}>
            {t('catalogue.doorAdult')}
          </Link>
        </div>
      )}

      <form method="get" action="/catalogue" className="search">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          // The box says what it searches. When lesson search is on, that is a
          // second kind of result, and a placeholder that promised only courses
          // would make the lesson list look like a mistake.
          placeholder={
            lessonSearchOn
              ? t('catalogue.searchPlaceholderLessons')
              : t('catalogue.searchPlaceholder')
          }
          aria-label={
            lessonSearchOn ? t('catalogue.searchLabelLessons') : t('catalogue.searchLabel')
          }
        />
        <select name="audience" defaultValue={audience ?? 'all'} aria-label={t('catalogue.audience')}>
          <option value="all">{t('audience.both')}</option>
          <option value="child">{t('audience.child')}</option>
          <option value="adult">{t('audience.adult')}</option>
        </select>
        <button type="submit" className="btn">{t('catalogue.search')}</button>
      </form>

      <div className="chips">
        <Link href={qs({ subject: undefined })} className="chip" aria-current={subject ? undefined : 'true'}>
          {t('catalogue.allSubjects')}
        </Link>
        {tops.map((s) => (
          <Link
            key={s.id}
            href={qs({ subject: s.code })}
            className="chip"
            aria-current={subject === s.code ? 'true' : undefined}
          >
            {s.name}
          </Link>
        ))}
      </div>

      {languageOn && languageChips.length > 1 && (
        // The language chips are only worth a row when there is a choice to
        // make: one language is a label, not a filter.
        <div className="chips" aria-label={t('catalogue.languageRow')}>
          <Link
            href={qs({ lang: undefined })}
            className="chip"
            aria-current={!lang || lang === 'all' ? 'true' : undefined}
          >
            {t('catalogue.anyLanguage')}
          </Link>
          {languageChips.map((language) => (
            <Link
              key={language.code}
              href={qs({ lang: language.code })}
              className="chip"
              aria-current={lang === language.code ? 'true' : undefined}
            >
              {/* The chip shows the name in its own script, with its own name
                  alongside — a reader of Arabic should not have to find
                  "Arabic" in English to filter by it. */}
              <span {...textProps(language.code)}>{language.nativeName}</span>
            </Link>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="empty">
          {emptyShelfMessage(
            { page, query: q ?? null, lessonHits: lessonHits.length },
            locale,
          )}
        </p>
      ) : (
        <>
          <ShelfPager
            basePath="/catalogue"
            params={{ q, subject, audience, lang }}
            total={shelf.total}
            shown={shelf.shown}
            offset={shelf.offset}
            limit={shelf.limit}
            locale={locale}
          />
          <div className="grid cols-2">
            {visible.map((c) => (
              <CourseShelfCard
                key={c.id}
                course={c}
                card={cards.get(c.id) ?? null}
                locale={locale}
              />
            ))}
          </div>
          {/* Repeated under the grid, because after reading twelve cards the
              top of the page is a long way up. */}
          <ShelfPager
            basePath="/catalogue"
            params={{ q, subject, audience, lang }}
            total={shelf.total}
            shown={shelf.shown}
            offset={shelf.offset}
            limit={shelf.limit}
            locale={locale}
          />
        </>
      )}

      {/* Under the shelf, and under the empty state too: a search that matched
          no course but three lessons must not end in "nothing matched". */}
      <LessonHits hits={lessonHits} courseCount={visible.length} />
    </div>
  );
}
