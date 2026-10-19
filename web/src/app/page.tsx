import Link from 'next/link';
import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { disciplines, fetchSubjectAreas } from '@/lib/catalogue';
import { isFlagEnabled } from '@/lib/flags';

export const dynamic = 'force-dynamic';

const PILLARS = [
  {
    title: 'Two audiences, one platform',
    body:
      'Separate experiences for young learners and adults, under one account ' +
      'for the family. A parent sees their children\u2019s progress without ' +
      'the children needing an email address.',
  },
  {
    title: 'Taught, not just hosted',
    body:
      'Courses come from qualified teachers and are reviewed before ' +
      'publication. An author cannot approve their own work, and every ' +
      'publication is recorded.',
  },
  {
    title: 'Built to last',
    body:
      'Certificates stay verifiable even if a course is later withdrawn. ' +
      'Payment history is never rewritten. Your progress belongs to you.',
  },
];

export default async function Home() {
  const configured = isSupabaseConfigured();
  const supabase = configured ? await createClient() : null;
  const [subjects, learningPathsEnabled] = supabase
    ? await Promise.all([
        fetchSubjectAreas(supabase).then(disciplines),
        isFlagEnabled(supabase, 'learning.paths'),
      ])
    : [[], false];

  return (
    <>
      <section className="hero">
        <div className="container">
          <p className="eyebrow">Islamic learning, worldwide</p>
          <h1>Learn your deen, at the pace that suits you.</h1>
          <p className="lede">
            Qur&rsquo;an, Arabic, Fiqh, Hadith and more — taught by qualified
            teachers to children and adults, wherever you are.
          </p>

          <div className="hero-actions">
            <Link href="/catalogue" className="btn">Browse the catalogue</Link>
            <Link href="/sign-up" className="btn secondary">Create a free account</Link>
            {learningPathsEnabled && (
              <Link href="/paths" className="btn secondary">Explore learning paths</Link>
            )}
          </div>

          {!configured && (
            <div className="notice warn" style={{ marginTop: '1.5rem' }}>
              <strong>Supabase is not configured.</strong> Copy{' '}
              <code>web/.env.example</code> to <code>web/.env.local</code>, set
              your project URL and anon key, then restart the dev server. The
              catalogue below is empty until then.
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>What you can study</h2>
          {subjects.length > 0 ? (
            <div className="chips">
              {subjects.map((s) => (
                <Link
                  key={s.id}
                  href={`/catalogue?subject=${encodeURIComponent(s.code)}`}
                  className="chip"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">
              Subjects appear here once the database is connected.
            </p>
          )}

          <div className="grid cols-3" style={{ marginTop: '1rem' }}>
            {PILLARS.map((p) => (
              <div key={p.title} className="card">
                <h3 style={{ marginTop: 0 }}>{p.title}</h3>
                <p className="muted" style={{ fontSize: '0.92rem', marginBottom: 0 }}>
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
