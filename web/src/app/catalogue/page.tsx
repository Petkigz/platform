import Link from 'next/link';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { recordEvent } from '@/lib/analytics-server';
import { createClient } from '@/lib/supabase/server';
import { countryFromHeaders } from '@/lib/geo';
import { fetchCourseCards } from '@/lib/catalogue-cards';
import { CourseShelfCard } from '../_shared/course-shelf-card';
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

export const metadata: Metadata = { title: 'Catalogue' };
export const dynamic = 'force-dynamic';

type Search = { q?: string; subject?: string; audience?: string };

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { q, subject, audience } = await searchParams;
  const supabase = await createClient();

  const [subjects, courses, doors] = await Promise.all([
    fetchSubjectAreas(supabase),
    fetchCatalogue(supabase, { q, subject, audience }),
    // The two doors, once the owner opens them. A door nobody can see is not a
    // door, and the catalogue is where everybody arrives first.
    isFlagEnabled(supabase, 'learning.audience_sections').catch(() => false),
  ]);

  // A course is only shelf-ready if it has a published version. RLS may show
  // us a version an author can see in draft; the catalogue must not.
  const visible = courses.filter((c) => displayVersion(c) !== null);
  const tops = disciplines(subjects);

  // One call for the whole shelf: what each course contains and what it would
  // cost this visitor. The country is a display hint — the database prefers the
  // account's recorded country when there is one.
  const cards = await fetchCourseCards(
    supabase,
    visible.map((c) => c.id),
    countryFromHeaders(await headers()),
  );

  // What people look for is the whole point of search analytics, and the query
  // is already in hand here. A signed-out search records nothing.
  if (q && q.trim()) {
    await recordEvent(supabase, 'search.performed', {
      properties: { query: q.trim().slice(0, 200), results: visible.length },
    });
  }

  const qs = (over: Partial<Search>): string => {
    const p = new URLSearchParams();
    const merged = { q, subject, audience, ...over };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== 'all') p.set(k, v);
    }
    const s = p.toString();
    return s ? `/catalogue?${s}` : '/catalogue';
  };

  return (
    <div className="container section">
      <p className="eyebrow">Catalogue</p>
      <h1>Find a course</h1>
      <p className="lede">
        Every course is reviewed before publication. Browse by subject, or
        search for a course, a subject or a teacher.
      </p>

      {doors && (
        <div className="row" style={{ gap: '0.4rem', flexWrap: 'wrap', margin: '1rem 0' }}>
          <Link className="badge" href="/young" style={{ padding: '0.35rem 0.7rem' }}>
            Learning is for a child
          </Link>
          <Link className="badge" href="/adults" style={{ padding: '0.35rem 0.7rem' }}>
            Learning is for me
          </Link>
        </div>
      )}

      <form method="get" action="/catalogue" className="search">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder={'Search courses, subjects, teachers\u2026'}
          aria-label="Search courses"
        />
        <select name="audience" defaultValue={audience ?? 'all'} aria-label="Audience">
          <option value="all">All ages</option>
          <option value="child">Young learners</option>
          <option value="adult">Adults</option>
        </select>
        <button type="submit" className="btn">Search</button>
      </form>

      <div className="chips">
        <Link href={qs({ subject: undefined })} className="chip" aria-current={subject ? undefined : 'true'}>
          All subjects
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

      {visible.length === 0 ? (
        <p className="empty">
          {q && q.trim().length > 0
            ? `Nothing matched \u201c${q.trim()}\u201d. Try a subject, or a teacher\u2019s name.`
            : 'No courses yet. Once a teacher publishes one it will appear here — nothing is shown until it has passed review.'}
        </p>
      ) : (
        <div className="grid cols-2">
          {visible.map((c) => (
            <CourseShelfCard key={c.id} course={c} card={cards.get(c.id) ?? null} />
          ))}
        </div>
      )}
    </div>
  );
}
