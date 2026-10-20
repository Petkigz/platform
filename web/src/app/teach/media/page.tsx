import Link from 'next/link';
import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/env';
import { MEDIA_STATUS_LABEL, fetchMediaAssets, readableByteSize } from '@/lib/media';
import { createClient } from '@/lib/supabase/server';

import { UploadMedia } from './upload-form';

export const dynamic = 'force-dynamic';

/**
 * A teacher's own uploads.
 *
 * The list is whatever `media_assets_read` returns — `uploaded_by =
 * current_user_id() OR is_privileged()` — so there is no filter here, because a
 * second filter would be a second opinion about who may see what.
 *
 * Uploading and publishing are separate acts and this page says so. A file lands
 * as `pending`, and only a staff verification makes it `available`; only an
 * available file can be attached to a lesson. That split exists because letting
 * an uploader mark their own file as ready is how unreviewed material reaches a
 * child.
 */
export default async function TeachMediaPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/teach/media');

  const assets = await fetchMediaAssets(supabase);
  const usable = assets.filter((asset) => asset.status === 'available').length;

  return (
    <main className="page narrow">
      <nav className="crumbs">
        <Link href="/teach">Teaching</Link>
        <span aria-hidden>›</span>
        <span>Media library</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Teaching</p>
        <h1>Media library</h1>
        <p className="muted">
          Everything you have uploaded, and what state each file is in. A file is
          usable in a lesson once it has been verified; {String(usable)} of{' '}
          {String(assets.length)} {assets.length === 1 ? 'is' : 'are'} ready now.
        </p>
      </div>

      <UploadMedia />

      <section className="card">
        <h2>Your files</h2>

        {assets.length === 0 ? (
          <p className="muted">Nothing uploaded yet.</p>
        ) : (
          <ul className="lessons">
            {assets.map((asset) => (
              <li key={asset.id}>
                <span className="n">{MEDIA_STATUS_LABEL[asset.status]}</span>
                <span className="t" style={{ minWidth: 0, flex: 1 }}>
                  <strong>{asset.displayName}</strong>
                  <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
                    {asset.mimeType} · {readableByteSize(asset.byteSize)}
                    {asset.durationSeconds !== null &&
                      ` · ${String(Math.round(asset.durationSeconds / 60))} min`}
                  </span>
                  {asset.status === 'pending' && (
                    <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
                      Waiting for verification. It cannot be attached to a lesson until a staff
                      member has confirmed the file arrived.
                    </span>
                  )}
                  {asset.status === 'quarantined' && (
                    <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
                      Held for review, and every copy derived from it has been withdrawn.
                    </span>
                  )}
                </span>
                {asset.status === 'available' && <span className="badge">Ready</span>}
              </li>
            ))}
          </ul>
        )}

        <p className="muted" style={{ fontSize: '0.9rem', marginTop: '0.75rem' }}>
          Only platform staff can withdraw a file, and they need a written reason
          to do it. If something here has to come down,{' '}
          <Link href="/support">contact support</Link>.
        </p>
      </section>
    </main>
  );
}
