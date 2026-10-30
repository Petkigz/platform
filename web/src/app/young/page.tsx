import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { fetchCataloguePage } from '@/lib/catalogue';
import { offsetFor, pageNumber, PAGE_SIZE } from '@/lib/paging';
import { countryFromHeaders } from '@/lib/geo';
import { fetchCourseCards } from '@/lib/catalogue-cards';
import { AGE_BANDS, isAgeBand, type AgeBand } from '@/lib/audience';
import { LOCALE_COOKIE, chooseLocale, translator } from '@/lib/i18n';
import { CourseShelfCard } from '../_shared/course-shelf-card';
import { ShelfPager } from '../_shared/shelf-pager';

export const metadata: Metadata = {
  title: 'Young learners',
  description: 'Courses written to be taught to children, on AyahSpring.',
};

export const dynamic = 'force-dynamic';

/**
 * The Young Learners door — screen 3.
 *
 * The catalogue has had an audience filter since it was built, which is a
 * *filter*: a parent who does not already know that the platform has two
 * audiences will not reach for it. This is the same shelf with the decision
 * already made, and it is a door rather than a filter because a five-year-old
 * and a forty-year-old should not be looking at the same page alongside one
 * another and working out which half is theirs.
 *
 * **It ships switched off.** `learning.audience_sections` is the switch, and
 * while it is off this route redirects to the catalogue — a page that suddenly
 * appeared for one audience and not the other would be worse than no page.
 *
 * **Children are not accounts.** Nothing here reads a learner, a child or a
 * family; it reads courses. A child does not browse this page with a login of
 * their own — a parent or a teacher does, and the guardian machinery is what
 * stands between an account and a child's learning.
 */
export default async function YoungLearnersPage({
  searchParams,
}: {
  searchParams: Promise<{ band?: string; page?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const on = await isFlagEnabled(supabase, 'learning.audience_sections').catch(() => false);
  if (!on) redirect('/catalogue');

  const bandsOn = await isFlagEnabled(supabase, 'learning.age_bands').catch(() => false);

  // The door is translated like the catalogue behind it: a parent who chose
  // Yoruba on the shelf must not meet an English page at the end of the link.
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const t = translator(locale);

  const { band, page: pageParam } = await searchParams;
  const chosen: AgeBand | null = bandsOn && isAgeBand(band) ? band : null;
  const page = pageNumber(pageParam);

  // The band is filtered in SQL, alongside the audience, so the total the pager
  // reports is the number of courses this door actually holds — filtering a
  // twenty-four course page in TypeScript would make the count a lie.
  const shelf = await fetchCataloguePage(
    supabase,
    { audience: 'child', band: chosen ?? undefined },
    { limit: PAGE_SIZE, offset: offsetFor(page) },
  );
  const visible = shelf.courses.filter((course) => course.audience !== 'adult');

  // What each card contains and what it would cost this parent. One call for
  // the shelf; a door that hides the price makes a parent open every card.
  const cards = await fetchCourseCards(
    supabase,
    visible.map((course) => course.id),
    countryFromHeaders(await headers()),
  );

  return (
    <div className="container section">
      <p className="eyebrow">{t('young.eyebrow')}</p>
      <h1>{t('young.title')}</h1>
      <p className="lede">{t('young.lede')}</p>

      <div className="notice">{t('young.notice')}</div>

      {bandsOn && (
        <div className="row" style={{ gap: '0.4rem', flexWrap: 'wrap', margin: '1.25rem 0' }}>
          <Link
            className={`badge${chosen === null ? '' : ' neutral'}`}
            href="/young"
            style={{ padding: '0.35rem 0.7rem' }}
          >
            {t('young.everyAge')}
          </Link>
          {AGE_BANDS.filter((b) => b !== '18+').map((b) => (
            <Link
              key={b}
              className={`badge${chosen === b ? '' : ' neutral'}`}
              href={`/young?band=${encodeURIComponent(b)}`}
              style={{ padding: '0.35rem 0.7rem' }}
            >
              {b}
            </Link>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="empty">
          {page > 1
            ? t('catalogue.emptyPage')
            : chosen
              ? t('young.emptyBand', { band: chosen })
              : t('young.empty')}
        </p>
      ) : (
        <>
          <div style={{ marginTop: '1rem' }}>
            <ShelfPager
              basePath="/young"
              params={{ band: chosen ?? undefined }}
              total={shelf.total}
              shown={shelf.shown}
              offset={shelf.offset}
              limit={shelf.limit}
              locale={locale}
            />
          </div>
          <div className="grid cols-2">
            {visible.map((course) => (
              <CourseShelfCard
                key={course.id}
                course={course}
                card={cards.get(course.id) ?? null}
                locale={locale}
              />
            ))}
          </div>
          <ShelfPager
            basePath="/young"
            params={{ band: chosen ?? undefined }}
            total={shelf.total}
            shown={shelf.shown}
            offset={shelf.offset}
            limit={shelf.limit}
            locale={locale}
          />
        </>
      )}

      <p className="muted" style={{ marginTop: '2rem' }}>
        {t('doors.askAdult')}{' '}
        <Link href="/adults">{t('doors.adultsShelf')}</Link> ·{' '}
        <Link href="/catalogue">{t('doors.wholeCatalogue')}</Link>
      </p>
    </div>
  );
}
