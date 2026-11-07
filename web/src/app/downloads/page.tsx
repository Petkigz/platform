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
 * The files are stored on the device, but this server-rendered page and the
 * key request currently need a connection. This is not full offline playback.
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
        device&apos;s file manager. A connection is currently required to open this page
        and check access before each playback; the video itself is stored here.
      </p>

      {!offlineOn && (
        <div className="notice warn">
          New saves are not open right now. Existing saves can still be opened while
          their course and Plus access and their saved-copy date remain valid.
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
