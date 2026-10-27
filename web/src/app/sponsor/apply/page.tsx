import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { ZAKAT_HONESTY } from '@/lib/sponsorship';
import { ApplyForm } from './apply-form';

export const dynamic = 'force-dynamic';

/**
 * Asking for a sponsored seat.
 *
 * Both lists are read through the ordinary row policies — the learner list is
 * the caller's own learners and their family's, and the course list is the
 * catalogue — so this page cannot offer a learner or a course the database would
 * refuse at submit time.
 */
export default async function ApplyForSponsorshipPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/sponsor/apply');

  const enabled = await isFlagEnabled(supabase, 'commerce.sponsorship').catch(() => false);

  if (!enabled) {
    return (
      <div className="container section">
        <p className="eyebrow">
          <Link href="/sponsor">Sponsoring</Link>
        </p>
        <h1>Ask for a sponsored seat</h1>
        <p className="lede">
          Sponsoring a seat is built and waiting to be switched on. When the owner turns it on,
          this form records a request and puts it in front of the person who decides.
        </p>
      </div>
    );
  }

  const [{ data: learnerRows }, { data: courseRows }] = await Promise.all([
    supabase
      .from('learner_profiles')
      .select('id, display_name, linked_user_id, family_id')
      .is('deleted_at', null)
      .eq('status', 'active'),
    supabase
      .from('courses')
      .select('id, title, audience')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('title'),
  ]);

  const learners = ((learnerRows ?? []) as { id: string; display_name: string }[]).map((row) => ({
    id: row.id,
    name: row.display_name,
  }));
  const courses = ((courseRows ?? []) as { id: string; title: string; audience: string }[]).map(
    (row) => ({ id: row.id, title: row.title, audience: row.audience }),
  );

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/sponsor">Sponsoring</Link>
      </p>
      <h1>Ask for a sponsored seat</h1>
      <p className="lede">
        If a course is out of reach, write a sentence about the situation. The owner or finance
        reads it and answers either way, with a reason. Asking costs nothing and obliges nobody.
      </p>

      <div className="stack" style={{ marginTop: '1.5rem' }}>
        <ApplyForm learners={learners} courses={courses} />

        <div className="notice">
          If a request is approved it appears in a list a sponsor reads. What they see is a seat
          code, the course, who the course is for and the price — never your name, your family or
          what you wrote here.
        </div>

        <p className="muted">{ZAKAT_HONESTY}</p>

        <p>
          <Link href="/account/sponsorship">What I have asked for, and what I have sponsored</Link>
        </p>
      </div>
    </div>
  );
}
