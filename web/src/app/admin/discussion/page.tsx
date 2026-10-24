import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { fetchModerationQueue } from '@/lib/discussion';
import { ModerateForm } from './moderate-form';

export const dynamic = 'force-dynamic';

/**
 * The moderation queue.
 *
 * This is the human half of the moderation rule, and the half that decides
 * whether the feature is safe to turn on. A learner's post is held until
 * someone approves it, so this queue is what stands between "peers may answer
 * each other" and unreviewed religious instruction appearing on a platform used
 * by children.
 *
 * That is why the queue is shown with its size, and why the page says plainly
 * that it is a real cost. The flag register's own precondition for
 * `platform.moderation` is "Policy before feature. Sectarian/contentious threads
 * on fiqh topics; who reviews; escalation" — the queue being empty today is not
 * evidence that it will stay manageable.
 */
export default async function AdminDiscussionPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/discussion');

  const { data: privileged } = await supabase.rpc('is_privileged', {
    p_user_id: user.id,
  });
  if (privileged !== true) redirect('/');

  const enabled = await isFlagEnabled(supabase, 'learning.discussion');
  const queue = enabled ? await fetchModerationQueue(supabase) : [];

  return (
    <div className="page wide">
      <nav className="crumbs">
        <Link href="/admin">Admin</Link>
        <span aria-hidden>›</span>
        <span>Discussion queue</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Moderation</p>
        <h1>Discussion queue</h1>
        <p className="muted">
          Every question and every peer answer a learner writes is held here
          until a person decides. Posts by the course author and by staff appear
          without review.
        </p>
      </div>

      {!enabled && (
        <div className="notice warn">
          <strong>
            <code>learning.discussion</code> is off.
          </strong>{' '}
          Nothing can be posted, so the queue is empty by construction rather
          than because it is being worked. Before enabling it, settle who
          reviews and how quickly — this is a human queue on a platform that
          teaches faith to children, and contentious fiqh threads are exactly
          where it will get hard.
        </div>
      )}

      {enabled && queue.length === 0 && (
        <p className="muted">Nothing is waiting for review.</p>
      )}

      {enabled && queue.length > 0 && (
        <p className="muted">
          {queue.length} post{queue.length === 1 ? '' : 's'} waiting, oldest
          first.
        </p>
      )}

      {queue.map((item) => (
        <section className="card" key={item.id}>
          <p className="eyebrow">
            {item.lessonTitle}
            {item.isReply ? ' · reply' : ' · question'}
            {' · '}
            {new Date(item.createdAt).toLocaleString()}
          </p>
          <blockquote style={{ margin: '0.5rem 0 1rem' }}>
            <p>{item.body}</p>
            <footer className="muted">— {item.authorName}</footer>
          </blockquote>

          <ModerateForm postId={item.id} />
        </section>
      ))}
    </div>
  );
}
