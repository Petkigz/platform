import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { fetchModerationQueue } from '@/lib/discussion';
import { decodeDiscussionCursor } from '@/lib/discussion-queue-cursor';
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
export default async function AdminDiscussionPage({ searchParams }: { searchParams: Promise<{ after?: string | string[] }> }) {
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
  const params=await searchParams;
  const rawCursor=typeof params.after==='string' ? params.after : undefined;
  const cursor=rawCursor ? decodeDiscussionCursor(rawCursor) : null;
  const invalidCursor=params.after !== undefined && !cursor;
  const {items:queue,nextCursor} = await fetchModerationQueue(supabase,{cursor});

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
          New posts are blocked, but existing posts still need review. Before
          enabling it, settle who reviews and how quickly — this is a human
          queue on a platform that teaches faith to children.
        </div>
      )}

      {invalidCursor && <p className="notice warn">That page link is invalid. Showing the first page.</p>}
      {queue.length === 0 && (
        <p className="muted">{cursor ? 'No more posts on this page.' : 'Nothing is waiting for review.'}</p>
      )}

      {queue.length > 0 && (
        <p className="muted">
          Showing {queue.length} post{queue.length === 1 ? '' : 's'}, oldest first
          {nextCursor ? '; more are waiting' : ''}.
        </p>
      )}

      <p className="muted">The queue can change while you work. Return to the first page to check for new or changed posts.</p>
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

          {item.isReply && (item.parent ? (
            <div className="notice"><strong>Question being answered</strong>
              <p style={{ whiteSpace: 'pre-wrap' }}>{item.parent.body}</p>
              <p className="muted">Question state: {item.parent.state}.</p>
            </div>
          ) : <p className="notice warn">The question is unavailable. Review the thread before deciding.</p>)}
          {(!item.isReply || item.parent) && <ModerateForm postId={item.id} reviewedBody={item.body} reviewedState={item.visibilityState} parent={item.parent} />}
        </section>
      ))}
      <nav className="row" aria-label="Discussion queue pages">
        {cursor && <Link href="/admin/discussion">First page</Link>}
        {nextCursor && <Link href={`/admin/discussion?after=${encodeURIComponent(nextCursor)}`}>Next page</Link>}
      </nav>
    </div>
  );
}
