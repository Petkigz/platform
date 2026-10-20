import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchMediaModerationQueue, MEDIA_STATUS_LABEL } from '@/lib/media';
import { ModerateForm } from './moderate-form';

export const dynamic = 'force-dynamic';

function readableSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KiB', 'MiB', 'GiB', 'TiB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}

/**
 * Uploaded masters, and the two things staff can do about one.
 *
 * Quarantining holds a file for review and withdraws every rendition derived
 * from it, because playback requires the master to be available. Withdrawing is
 * a soft delete per D7: the row is tombstoned and the object survives, so a
 * rights request can still be matched to the exact bytes later.
 *
 * Both need a reason in writing, and the database refuses without one — the
 * audit trail for a takedown used to record who and when but not why.
 */
export default async function AdminMediaPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/media');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const queue = await fetchMediaModerationQueue(supabase);

  return (
    <main className="page">
      <nav className="crumbs">
        <Link href="/admin">Admin</Link>
        <span aria-hidden>›</span>
        <span>Uploaded media</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Content</p>
        <h1>Uploaded media</h1>
        <p className="muted">
          Every master anybody has uploaded. Quarantining holds one for review
          and stops every copy derived from it; withdrawing ends its use but
          keeps the object, because a rights request may have to be matched to
          it later. Both need a written reason, and both are recorded in the
          governance audit trail.
        </p>
      </div>

      {queue.length === 0 && <p className="muted">Nothing has been uploaded yet.</p>}

      {queue.map((asset) => (
        <section className="card" key={asset.id}>
          <p className="eyebrow">
            {MEDIA_STATUS_LABEL[asset.status]} · {asset.mimeType} ·{' '}
            {readableSize(asset.byteSize)}
            {asset.durationSeconds !== null && ` · ${Math.round(asset.durationSeconds / 60)} min`}
            {' · uploaded '}
            {new Date(asset.createdAt).toLocaleDateString()}
          </p>

          <p className="muted" style={{ fontSize: '0.9rem' }}>
            {asset.uploader ? `Uploaded by ${asset.uploader}` : 'Uploader unknown'}
            {' · '}
            {asset.renditions.length === 0
              ? 'no renditions encoded yet'
              : `${asset.renditions.length} rendition${asset.renditions.length === 1 ? '' : 's'}: ${asset.renditions
                  .map((r) => `${r.profile} (${r.status})`)
                  .join(', ')}`}
          </p>

          {asset.status === 'deleted' ? (
            <p className="muted">
              Withdrawn. The row is tombstoned and the object survives per the
              retention schedule.
            </p>
          ) : (
            <ModerateForm assetId={asset.id} />
          )}
        </section>
      ))}

      <p className="muted">
        No byte is transferred by this screen, and nothing here makes a file
        available — confirmation stays with the ingest path, so an uploader
        cannot promote their own.
      </p>
    </main>
  );
}
