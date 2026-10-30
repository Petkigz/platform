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
import { LOCALE_COOKIE, chooseLocale, translator } from '@/lib/i18n';
import { CourseShelfCard } from '../_shared/course-shelf-card';
import { ShelfPager } from '../_shared/shelf-pager';

export const metadata: Metadata = {
  title: 'Adults',
  description: 'Courses written for adults, on AyahSpring.',
};

export const dynamic = 'force-dynamic';

/**
 * The Adults door — screen 4.
 *
 * The pair the inventory called "Young Learners entry" and "Adult Learners
 * entry". They are two pages rather than one page with a switch, because the
 * two audiences arrive with different questions: a parent is choosing for
 * somebody else and has to be told what a child's account is, while an adult is
 * choosing for themselves and wants to see the depth of the shelf rather than a
 * children's catalogue with a filter on it.
 *
 * **No age chips here.** There is one adult band — 18+ — so a row of one chip
 * would be a control that cannot change anything. The young learners' door has
 * four, which is why it has the row and this one does not.
 *
 * **It ships switched off**, behind the same `learning.audience_sections`
 * switch as its sibling, and redirects to the catalogue while it is off. One
 * door without the other would be worse than no doors at all.
 */
export default async function AdultsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { page: pageParam } = await searchParams;
  const page = pageNumber(pageParam);

  const supabase = await createClient();
  const on = await isFlagEnabled(supabase, 'learning.audience_sections').catch(() => false);
  if (!on) redirect('/catalogue');

  // Same rule as the children's door: the page behind the link speaks whatever
  // language the shelf it came from was speaking.
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const t = translator(locale);

  const shelf = await fetchCataloguePage(
    supabase,
    { audience: 'adult' },
    { limit: PAGE_SIZE, offset: offsetFor(page) },
  );
  const visible = shelf.courses.filter((course) => course.audience !== 'child');

  // What each card contains and what it would cost this visitor, in one call.
  const cards = await fetchCourseCards(
    supabase,
    visible.map((course) => course.id),
    countryFromHeaders(hdrs),
  );

  return (
    <div className="container section">
      <p className="eyebrow">{t('adults.eyebrow')}</p>
      <h1>{t('adults.title')}</h1>
      <p className="lede">{t('adults.lede')}</p>

      <div className="notice">{t('adults.notice')}</div>

      {visible.length === 0 ? (
        <p className="empty" style={{ marginTop: '1.5rem' }}>
          {page > 1 ? t('catalogue.emptyPage') : t('adults.empty')}
        </p>
      ) : (
        <>
          <div style={{ marginTop: '1.5rem' }}>
            <ShelfPager
              basePath="/adults"
              params={{}}
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
            basePath="/adults"
            params={{}}
            total={shelf.total}
            shown={shelf.shown}
            offset={shelf.offset}
            limit={shelf.limit}
            locale={locale}
          />
        </>
      )}

      <p className="muted" style={{ marginTop: '2rem' }}>
        {t('doors.askChild')}{' '}
        <Link href="/young">{t('doors.youngShelf')}</Link> ·{' '}
        <Link href="/catalogue">{t('doors.wholeCatalogue')}</Link>
      </p>
    </div>
  );
}
