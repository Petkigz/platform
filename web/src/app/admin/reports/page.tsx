import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchReportQueue } from '@/lib/governance';
import { decodeDiscussionCursor } from '@/lib/discussion-queue-cursor';
import { ModerateForm } from '../discussion/moderate-form';
import { ResolveForm } from './resolve-form';

export const dynamic = 'force-dynamic';

/**
 * Reports waiting on a person.
 *
 * This queue exists because moderation cannot be complete. A reviewer checks a
 * course before it is published; they cannot foresee every mistranslation, and
 * on a platform that teaches faith to children the people reading a lesson are
 * the ones who notice when something is wrong. They needed somewhere to say so,
 * and somewhere for it to arrive.
 *
 * Ordered oldest first: a report left sitting is the thing that makes the
 * button a lie.
 */
export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ after?: string | string[] }> }) {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/admin/reports');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const params=await searchParams;
  const raw=typeof params.after==='string' ? params.after : undefined;
  const cursor=raw ? decodeDiscussionCursor(raw) : null;
  const invalidCursor=params.after !== undefined && !cursor;
  const {items:reports,nextCursor} = await fetchReportQueue(supabase,{cursor});

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Admin</Link>
      </p>
      <h1>Content reports</h1>
      <p className="lede">
        Showing {reports.length} report{reports.length === 1 ? '' : 's'}{nextCursor ? '; more are waiting' : ''}.
      </p>
      <p className="muted">
        Every one of these was filed by someone reading a lesson. Closing one
        requires a written note, because a queue of silent dismissals teaches
        readers that reporting does nothing.
      </p>

      {invalidCursor && <p className="notice warn">That page link is invalid. Showing the first page.</p>}
      <p className="muted">Reports can change while you work. Return to the first page to check again.</p>
      {reports.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            {cursor ? 'No more reports on this page.' : 'Nothing waiting. When someone flags a lesson or discussion post it lands here.'}
          </p>
        </div>
      ) : (
        <ul className="lessons" style={{ display: 'grid', gap: '1rem' }}>
          {reports.map((r) => (
            <li key={r.id}>
              <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="badge neutral">{r.status}</span>
                <span className="muted">
                  {new Date(r.created_at).toLocaleString()} ·{' '}
                  {r.reporter?.display_name ?? 'someone not signed in'}
                </span>
              </div>
              {r.lesson?.title && (
                <p className="muted" style={{ margin: '0.25rem 0' }}>
                  On <span className="meta">{r.lesson.title}</span>
                </p>
              )}
              {r.discussion_post_id && (
                <div className="notice">
                  <strong>Reported discussion post</strong>
                  {r.discussionPost ? (
                    <>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{r.discussionPost.body}</p>
                      <p className="muted">Current state: {r.discussionPost.visibility_state}. Moderating the post and resolving the report are separate actions.</p>
                      {r.discussionPost.parent_id && (r.discussionPost.parent ? (
                        <div><strong>Question being answered</strong><p style={{ whiteSpace: 'pre-wrap' }}>{r.discussionPost.parent.body}</p>
                          <p className="muted">Question state: {r.discussionPost.parent.state}.</p></div>
                      ) : <p className="notice warn">The question is unavailable. Review the thread before deciding.</p>)}
                      {(!r.discussionPost.parent_id || r.discussionPost.parent) && <ModerateForm postId={r.discussion_post_id} reviewedBody={r.discussionPost.body} reviewedState={r.discussionPost.visibility_state} parent={r.discussionPost.parent} />}
                    </>
                  ) : <p className="muted">This post is no longer available to view.</p>}
                </div>
              )}
              <p style={{ margin: '0.5rem 0' }}>{r.description}</p>
              <ResolveForm reportId={r.id} category={r.report_category} />
            </li>
          ))}
        </ul>
      )}
      <nav className="row" aria-label="Content report pages">
        {cursor && <Link href="/admin/reports">First page</Link>}
        {nextCursor && <Link href={`/admin/reports?after=${encodeURIComponent(nextCursor)}`}>Next page</Link>}
      </nav>
    </div>
  );
}
