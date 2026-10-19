import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { fetchSavedCourses } from '@/lib/wishlist';
import { SavedItem } from './saved-item';

export const metadata = { title: 'Saved courses' };
export const dynamic = 'force-dynamic';

/**
 * The saved list.
 *
 * Rendered whether or not `learning.wishlist` is on. Turning a feature off
 * should not confiscate what people put in it while it was on: the database lets
 * a saved row be edited and removed with the flag off, so this page has to keep
 * working too, and says plainly that saving new courses has stopped.
 *
 * There is no `where user_id = me` here. Row level security decides whose rows
 * come back, and a filter would only hide a policy mistake instead of exposing
 * it — the same contract `/learn` is held to.
 */
export default async function SavedPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/saved');

  const [open, saved] = await Promise.all([
    isFlagEnabled(supabase, 'learning.wishlist').catch(() => false),
    fetchSavedCourses(supabase, { userId: user.id }),
  ]);

  return (
    <main className="page">
      <nav className="crumbs">
        <Link href="/learn">My learning</Link>
        <span aria-hidden>›</span>
        <span>Saved</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Private to you</p>
        <h1>Saved courses</h1>
        <p className="muted">
          Courses you kept to come back to. Nobody else can see this list, and a
          note is only for you — which child it is for, or what you were waiting
          on.
        </p>
      </div>

      {!open && (
        <div className="notice warn">
          Saving new courses is switched off on this platform right now. What you
          already saved is still yours to edit or remove.
        </div>
      )}

      {saved.length === 0 ? (
        <div className="card">
          <p className="empty">Nothing saved yet.</p>
          <Link href="/catalogue" className="btn">
            Browse the catalogue
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {saved.map((s) => (
            <SavedItem key={s.id} saved={s} />
          ))}
        </div>
      )}

      <p className="muted" style={{ fontSize: '.85rem' }}>
        Saving a course does not reserve a seat or hold a price. Prices and
        availability are on the course page.
      </p>
    </main>
  );
}
