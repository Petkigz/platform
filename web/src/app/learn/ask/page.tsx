import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { AskForm } from './ask-form';

export const metadata = { title: 'Ask about a lesson' };
export const dynamic = 'force-dynamic';

/**
 * Ask about what you are studying.
 *
 * The assistant is retrieval-only, and this page says so before anybody types
 * anything: it can point at a lesson, it cannot issue a ruling, and a question that
 * asks for one goes to a teacher. Saying that up front is the difference between a
 * boundary and an apology.
 *
 * While `learning.ai_support` is off the page still exists and still explains
 * itself — a learner who was told the feature exists should not find a 404 and
 * conclude it was taken away.
 */
export default async function AskPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/learn/ask');

  const open = await isFlagEnabled(supabase, 'learning.ai_support').catch(() => false);

  return (
    <div className="page narrow">
      <nav className="crumbs">
        <Link href="/learn">Learning</Link>
        <span aria-hidden>›</span>
        <span>Ask</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Study help</p>
        <h1>Ask about a lesson</h1>
      </div>

      <div className="notice">
        <strong>It points, it does not rule.</strong> An answer here is a lesson from
        your courses — the title, where it sits, and a line of the text you can already
        read. Nothing on this page writes an answer of its own, and a question asking
        for a religious ruling goes to a teacher instead, as a support case where the
        help desk is open.
      </div>

      {open ? (
        <AskForm />
      ) : (
        <div className="notice warn" style={{ marginTop: '1rem' }}>
          <strong>The study assistant is not switched on yet.</strong> Ask your teacher
          in the lesson, or <Link href="/support">open a support case</Link>.
        </div>
      )}

      <p className="muted" style={{ marginTop: '1.5rem' }}>
        <Link href="/support">Open a support case instead</Link>
        {' · '}
        <Link href="/learn">Back to learning</Link>
      </p>
    </div>
  );
}
