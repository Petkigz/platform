import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { DownloadsList } from './downloads-list';

export const dynamic = 'force-dynamic';

/**
 * Lessons saved to this device.
 *
 * The list is read from the app's own storage, so this page works with no network
 * — which is the entire point of it. The server is asked only whether the reader
 * is signed in, because removing a lesson has to tell the server too.
 */
export default async function DownloadsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/downloads');

  const offlineOn = await isFlagEnabled(supabase, 'learning.offline').catch(() => false);

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/learn">My learning</Link>
      </p>
      <h1>On this device</h1>
      <p className="lede">
        Lessons you saved for offline use. They live inside this app, not in your
        device&apos;s file manager, and they stop working when the plan or the date
        says so.
      </p>

      {!offlineOn && (
        <div className="notice warn">
          Saving lessons is not open yet. Anything already on this device still plays
          until it expires, and it can be removed here.
        </div>
      )}

      <section className="card">
        <DownloadsList signedIn={Boolean(user)} />
      </section>

      <p className="muted" style={{ marginTop: '1rem' }}>
        Saving needs a Plus plan. A saved lesson is not a copy you own: it lasts as
        long as the plan and then asks to be refreshed.
      </p>

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn">Back to my learning</Link>
      </p>
    </div>
  );
}
