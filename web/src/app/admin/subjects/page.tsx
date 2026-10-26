import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { vocabularyLede } from '@/lib/subjects';
import { fetchSubjects } from './query';
import { SubjectEditor } from './subject-editor';

export const dynamic = 'force-dynamic';

/**
 * The subject vocabulary.
 *
 * `subject_areas` is read by the catalogue filter, the subject badges and every
 * course card, and until this screen the only way to change it was SQL against
 * production. That meant the platform owner could not maintain the vocabulary of
 * their own catalogue — a power with no screen is not a power.
 *
 * Gated on `governance_admin` or `platform_admin`, matching
 * `can_manage_subjects()` in the database. A support agent reading a ticket is
 * not owning what the catalogue is made of; the policy now says the same thing
 * the screen does, which it did not before this unit.
 *
 * Retiring is the one action with a consequence worth stating on the page: a
 * retired subject is hidden from readers, its badge disappears from every course
 * filed under it, and a published course's tags cannot be changed. So the button
 * is disabled while anything live is filed under it, and the reason is on the
 * row — the same rule `guard_subject_retirement()` enforces in the database.
 */
export default async function AdminSubjectsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/subjects');

  const [{ data: governance }, { data: platform }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'governance_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
  ]);
  if (governance !== true && platform !== true) redirect('/admin');

  const subjects = await fetchSubjects(supabase);
  const active = subjects.filter((subject) => subject.status === 'active').length;

  return (
    <div className="container section">
      <p className="eyebrow">Administration</p>
      <h1>Subjects</h1>
      <p className="lede">{vocabularyLede(active, subjects.length)}</p>

      <p className="muted">
        A course is filed under one or more subjects when its author tags it. The tags are frozen at
        publication, so this list decides what a learner can filter by — and what a badge on a course
        card is allowed to say.
      </p>

      <SubjectEditor subjects={subjects} />

      <p className="section">
        <Link href="/admin">← Back to what is waiting</Link>
      </p>
    </div>
  );
}
