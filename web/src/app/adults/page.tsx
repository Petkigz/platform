import Link from 'next/link';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { fetchCataloguePage } from '@/lib/catalogue';
import { offsetFor, pageNumber, PAGE_SIZE } from '@/lib/paging';
import { countryFromHeaders } from '@/lib/geo';
import { fetchCourseCards } from '@/lib/catalogue-cards';
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
    countryFromHeaders(await headers()),
  );

  return (
    <div className="container section">
      <p className="eyebrow">Adults</p>
      <h1>Study it properly.</h1>
      <p className="lede">
        Courses written for adults — Arabic grammar, fiqh, tafsir, tajweed at
        depth. Every one of them has passed scholarly review before it appears
        here, and each one you buy is your own: one purchase, one learner.
      </p>

      <div className="notice">
        This is your own account, not a child&rsquo;s. If a child also learns in
        your family, the learner switcher moves between you without mixing the
        two.
      </div>

      {visible.length === 0 ? (
        <p className="empty" style={{ marginTop: '1.5rem' }}>
          {page > 1
            ? 'There is nothing on this page. It may be past the end of the shelf.'
            : 'No courses for adults have been published yet. Everything here has to pass review first.'}
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
            />
          </div>
          <div className="grid cols-2">
            {visible.map((course) => (
              <CourseShelfCard key={course.id} course={course} card={cards.get(course.id) ?? null} />
            ))}
          </div>
          <ShelfPager
            basePath="/adults"
            params={{}}
            total={shelf.total}
            shown={shelf.shown}
            offset={shelf.offset}
            limit={shelf.limit}
          />
        </>
      )}

      <p className="muted" style={{ marginTop: '2rem' }}>
        Choosing for a child? The <Link href="/young">young learners&rsquo; shelf</Link>{' '}
        is next door, and the <Link href="/catalogue">whole catalogue</Link> has both.
      </p>
    </div>
  );
}
